#!/usr/bin/env bash
set -eEuo pipefail

# Test mode is restricted to a disposable directory owned by a non-root caller.
prefix=${MEMORA_DEPLOY_TEST_ROOT:-}
if [[ -n "$prefix" ]]; then
  [[ $EUID -ne 0 && "$prefix" == /tmp/memora-release-test.* && ! -L "$prefix" ]]
  [[ "$(realpath "$prefix")" == "$prefix" && "$(stat -c %u "$prefix")" == "$EUID" ]]
else
  [[ $EUID -eq 0 ]] || { echo 'Run the updater as root' >&2; exit 1; }
  export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
fi
[[ $# -le 2 ]] || exit 1
requested=${1:-}
environment_patch=${2:-}
recover_only=0
if [[ "$requested" == --recover-only && -z "$environment_patch" ]]; then recover_only=1; requested=; fi
[[ -z "$requested" || "$requested" =~ ^[a-f0-9]{40}$ ]] || exit 1

app_dir="$prefix/opt/memora-solutions"
backup_root="$prefix/opt/memora-release-backups"
state_dir="$prefix/var/lib/memora-deploy"
environment_file="$prefix/etc/memora-solutions.env"
caddy_file="$prefix/etc/caddy/Caddyfile"
install -d -m 0700 "$state_dir" "$backup_root"
transaction="$state_dir/transaction-v1"
exec 9>"$prefix/run/lock/memora-update.lock"
flock -w 60 9 || exit 1

as_app() { if [[ -n "$prefix" ]]; then "$@"; else runuser -u memora -- "$@"; fi; }
own_app() { if [[ -z "$prefix" ]]; then chown -R memora:memora "$1"; fi; }
install_env() {
  if [[ -n "$prefix" ]]; then install -m 0640 "$1" "$environment_file";
  else install -o root -g memora -m 0640 "$1" "$environment_file"; fi
}
healthy() {
  for _ in {1..20}; do
    if systemctl is-active --quiet memora-solutions.service \
      && curl --fail --silent --show-error --max-time 2 http://127.0.0.1:3020/health >/dev/null; then return 0; fi
    sleep 0.5
  done
  return 1
}

sync_feeds() {
  local repository=$1 destination=$2
  # Backward-compatible with releases that predate the independent data branch.
  [[ -f "$repository/scripts/travel-feed-branch.mjs" ]] || return 0
  if as_app git -C "$repository" fetch --no-tags origin travel-data:refs/remotes/origin/travel-data \
    && (cd "$repository" && as_app node scripts/travel-feed-branch.mjs install "$destination"); then
    return 0
  fi
  echo 'Travel data refresh failed; retaining the last available snapshot' >&2
  return 1
}

# A prepared transaction survives SIGKILL/power loss. Recover it before reading
# the active checkout; the directory may be between its two rename operations.
recover() {
  [[ -f "$transaction" ]] || return 0
  local record recovery_backup recovery_stage recovery_target
  mapfile -t record < "$transaction"
  [[ ${#record[@]} -eq 3 ]] || return 1
  recovery_backup=${record[0]}; recovery_stage=${record[1]}; recovery_target=${record[2]}
  [[ "$recovery_backup" == "$backup_root"/release-* && ! -L "$recovery_backup" \
    && "$(realpath "$recovery_backup")" == "$recovery_backup" \
    && "$recovery_stage" == "$prefix/opt/memora-release-staging."* \
    && "$recovery_target" =~ ^[a-f0-9]{40}$ ]] || return 1
  [[ -s "$recovery_backup/environment" && -s "$recovery_backup/Caddyfile" ]] || return 1
  systemctl stop memora-solutions.service || return 1
  if [[ -d "$recovery_backup/app" ]]; then
    if [[ -e "$app_dir" ]]; then
      local failed
      failed=$(mktemp -d "$recovery_backup/failed.XXXXXX") || return 1
      mv -- "$app_dir" "$failed/app" || return 1
    fi
    mv -- "$recovery_backup/app" "$app_dir" || return 1
  fi
  [[ -d "$app_dir" && ! -L "$app_dir" ]] || return 1
  install_env "$recovery_backup/environment" || return 1
  install -m 0644 "$recovery_backup/Caddyfile" "$caddy_file" || return 1
  systemctl reload caddy || return 1
  systemctl start memora-solutions.service || return 1
  healthy || { echo 'Rollback health check failed; transaction retained for recovery' >&2; return 1; }
  printf '%s\n' "$recovery_target" > "$state_dir/failed-commit" || return 1
  rm -- "$transaction" || return 1
  sync -f "$state_dir" || return 1
  echo "Application and runtime configuration restored; evidence: $recovery_backup"
}
recover
if [[ "$recover_only" == 1 ]]; then exit 0; fi

[[ -d "$app_dir/.git" && ! -L "$app_dir" ]] || exit 1
current=$(as_app git -C "$app_dir" rev-parse HEAD)
deployed=$current
[[ ! -s "$app_dir/.deployed-commit" ]] || deployed=$(<"$app_dir/.deployed-commit")
[[ "$current" == "$deployed" ]] || { echo 'HEAD differs from deployed marker; operator review required' >&2; exit 1; }
[[ -z "$(as_app git -C "$app_dir" status --porcelain --untracked-files=no)" ]] \
  || { echo 'Tracked production changes require review' >&2; exit 1; }
as_app git -C "$app_dir" fetch origin master
target=${requested:-$(as_app git -C "$app_dir" rev-parse origin/master)}
as_app git -C "$app_dir" merge-base --is-ancestor "$target" origin/master
if [[ "$deployed" != "$target" ]] && as_app git -C "$app_dir" merge-base --is-ancestor "$target" "$deployed"; then
  echo "A newer release is already deployed; skipping stale target $target"
  exit 0
fi
as_app git -C "$app_dir" merge-base --is-ancestor "$deployed" "$target"
if [[ "$deployed" == "$target" && -z "$environment_patch" ]]; then
  sync_feeds "$app_dir" "$app_dir/dist"
  exit 0
fi
if [[ -z "$requested" && -s "$state_dir/failed-commit" && "$(<"$state_dir/failed-commit")" == "$target" ]]; then
  echo 'Previous release failed; explicit reviewed retry required' >&2; exit 1
fi

changed_files=$(as_app git -C "$app_dir" diff --name-only "$deployed" "$target")
# Bot feed commits have [skip ci]. This exact four-file allowlist cannot change
# executable code. Code releases below always require both workflows on the SHA.
if [[ -z "$environment_patch" && -n "$changed_files" ]] \
  && ! grep -Evq '^public/(flights|hot-deals|radar|tours)\.json$' <<< "$changed_files"; then
  for feed in flights hot-deals radar tours; do
    [[ "$(as_app git -C "$app_dir" ls-tree "$target" -- "public/$feed.json" | awk '{print $1}')" == 100644 ]]
    as_app git -C "$app_dir" show "$target:public/$feed.json" | node -e '
      let input=""; process.stdin.on("data", chunk => input += chunk);
      process.stdin.on("end", () => JSON.parse(input));'
  done
  as_app git -C "$app_dir" merge --ff-only "$target"
  for feed in flights hot-deals radar tours; do
    install -m 0644 "$app_dir/public/$feed.json" "$app_dir/dist/$feed.json.next"
    mv -- "$app_dir/dist/$feed.json.next" "$app_dir/dist/$feed.json"
  done
  printf '%s\n' "$target" > "$app_dir/.deployed-commit"
  exit 0
fi

for workflow in ci.yml deploy-assets.yml; do
  workflow_checked=0
  # The runner and VPS can briefly receive different cached API statuses.
  # Retry bounded fresh reads; every attempt still verifies the exact SHA.
  for attempt in {1..6}; do
    if curl --fail --silent --show-error --connect-timeout 5 --max-time 15 \
      -H 'Cache-Control: no-cache' \
      "https://api.github.com/repos/arar228/memora-solutions/actions/workflows/$workflow/runs?head_sha=$target&per_page=10&verification=$(date +%s)-$attempt" \
      | node -e '
      let input=""; process.stdin.on("data", chunk => input += chunk);
      process.stdin.on("end", () => {
        const runs=JSON.parse(input).workflow_runs || [];
        const run=runs.find(r => r.head_sha === process.argv[1] && r.head_branch === "master"
          && ["push", "workflow_dispatch"].includes(r.event));
        if (!run || run.status !== "completed" || run.conclusion !== "success") {
          console.error("Exact-commit workflow has not passed"); process.exitCode=1;
        }
      });' "$target"; then
      workflow_checked=1
      break
    fi
    if [[ "$attempt" -lt 6 ]]; then
      echo "Waiting for a fresh successful $workflow status (attempt $attempt/6)"
      sleep 5
    fi
  done
  [[ "$workflow_checked" == 1 ]] || { echo "Exact-commit $workflow gate failed after 6 checks" >&2; exit 1; }
done
as_app git -C "$app_dir" fetch origin +cdn:refs/remotes/origin/cdn
cdn_commit=$(as_app git -C "$app_dir" log -100 --format='%H %s' origin/cdn \
  | awk -v marker="assets: $target" 'substr($0,42)==marker && !found {print $1; found=1}')
[[ "$cdn_commit" =~ ^[a-f0-9]{40}$ ]] || { echo 'Exact-commit assets are missing' >&2; exit 1; }

on_failure() {
  local status=${1:-$?}
  trap - ERR INT TERM
  if [[ -f "$transaction" ]]; then
    echo 'Release interrupted; restoring the previous application' >&2
    recover || echo 'Automatic recovery needs operator attention; transaction retained' >&2
  else
    printf '%s\n' "$target" > "$state_dir/failed-commit"
    echo 'Release preparation failed; active application preserved, explicit retry required' >&2
  fi
  exit "$status"
}
trap on_failure ERR
trap 'on_failure 130' INT
trap 'on_failure 143' TERM
available_kb=$(df -Pk "$prefix/opt" | awk 'NR==2 {print $4}')
required_kb=$(du -sk "$app_dir" | awk '{print $1 * 2 + 524288}')
[[ "$available_kb" -gt "$required_kb" ]] || { echo 'Insufficient space for a protected release' >&2; on_failure 1; }
stage=$(mktemp -d "$prefix/opt/memora-release-staging.XXXXXX")
chmod 0750 "$stage"
own_app "$stage"
origin=$(as_app git -C "$app_dir" remote get-url origin)
as_app git clone --no-local --no-checkout "$app_dir" "$stage/app"
as_app git -C "$stage/app" remote set-url origin "$origin"
# A clone transfers local branch history; the candidate can exist only in the
# source's remote-tracking refs. Explicitly fetch the checked target into staging.
as_app git -C "$stage/app" fetch origin "$target"
as_app git -C "$stage/app" checkout -B master "$target"
# Carry the fetched CDN cache into the next checkout instead of downloading its
# retained asset history from GitHub again on every subsequent release.
as_app git -C "$stage/app" fetch "$app_dir" +refs/remotes/origin/cdn:refs/remotes/origin/cdn
# npm lifecycle scripts receive a clean environment, never runtime credentials.
if [[ -n "$prefix" ]]; then as_app env -i PATH="$PATH" MEMORA_DEPLOY_TEST_ROOT="$prefix" npm --prefix "$stage/app" ci;
else env -i PATH="$PATH" /usr/sbin/runuser -u memora -- timeout 600 npm --prefix "$stage/app" ci; fi
as_app mkdir "$stage/app/dist"
as_app git -C "$app_dir" archive "$cdn_commit" | as_app tar -x -C "$stage/app/dist"
# Preserve the latest published data through a code release, even if the data
# remote is temporarily unreachable. Never modify tracked source snapshots.
for feed in flights hot-deals radar tours; do
  if [[ -f "$app_dir/dist/$feed.json" && ! -L "$app_dir/dist/$feed.json" ]]; then
    as_app cp -- "$app_dir/dist/$feed.json" "$stage/app/dist/$feed.json"
  fi
done
sync_feeds "$stage/app" "$stage/app/dist" || echo 'Using retained travel data for this code release'
asset_path=$(grep -oE '<meta name="memora-entry" content="[^"]+"' "$stage/app/dist/index.html" \
  | sed -E 's/.*content="([^"]+)"/\1/' | head -n 1)
[[ "$asset_path" =~ ^/?static/[a-zA-Z0-9_-]+\.js$ && -s "$stage/app/dist/${asset_path#/}" ]] \
  || { echo 'Release entry bundle is missing or invalid' >&2; on_failure 1; }
as_app node --check "$stage/app/server.js"
for source in "$stage/app"/server/*.js; do as_app node --check "$source"; done
if [[ -f "$app_dir/server/payment-journal.js" && ! -f "$stage/app/server/payment-journal.js" ]]; then
  echo 'Journal-incompatible downgrade requires payment shutdown and operator review' >&2; on_failure 1
fi
caddy validate --config "$stage/app/deploy/vps/memora-solutions.caddy" --adapter caddyfile

backup=$(mktemp -d "$backup_root/release-$(date -u +%Y%m%dT%H%M%SZ)-${target:0:12}.XXXXXX")
chmod 0700 "$backup"
install -m 0600 "$environment_file" "$backup/environment"
install -m 0600 "$caddy_file" "$backup/Caddyfile"
install -m 0600 "$environment_file" "$backup/next-environment"
if [[ -n "$environment_patch" ]]; then
  [[ -f "$environment_patch" && ! -L "$environment_patch" && "$(stat -c %a "$environment_patch")" == 600 \
    && "$(stat -c %u "$environment_patch")" == "$EUID" ]] || on_failure 1
  # Validate keys before merging; values are neither logged nor shell-evaluated.
  awk -F= 'NF<2 || $1 !~ /^(TRAVELPAYOUTS_TOKEN|TRAVELPAYOUTS_MARKER|TRAVELPAYOUTS_TRS|YOOKASSA_SHOP_ID|YOOKASSA_EXPECTED_SHOP_ID|YOOKASSA_SECRET_KEY|YOOKASSA_RECEIPTS_ENABLED|YOOKASSA_VAT_CODE)$/ {exit 1}' "$environment_patch"
  awk -F= 'NR==FNR {keys[$1]=1;next} !($1 in keys)' "$environment_patch" "$environment_file" > "$backup/next-environment"
  cat "$environment_patch" >> "$backup/next-environment"
fi
printf '%s\n' "$deployed" > "$backup/previous-commit"
printf '%s\n' "$target" > "$stage/app/.deployed-commit"
sync -f "$stage"
printf '%s\n%s\n%s\n' "$backup" "$stage" "$target" > "$transaction.next"
chmod 0600 "$transaction.next"
sync -f "$transaction.next"
mv -- "$transaction.next" "$transaction"
sync -f "$state_dir"

# No database restore: live financial records must survive either app version.
systemctl stop memora-solutions.service
mv -- "$app_dir" "$backup/app"
mv -- "$stage/app" "$app_dir"
install_env "$backup/next-environment"
install -m 0644 "$app_dir/deploy/vps/memora-solutions.caddy" "$caddy_file"
systemctl reload caddy
systemctl start memora-solutions.service
healthy
rm -- "$transaction"
sync -f "$state_dir"
trap - ERR INT TERM
echo "Deployed checked commit $target; full previous application: $backup"
