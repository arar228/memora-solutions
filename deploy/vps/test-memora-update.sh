#!/usr/bin/env bash
set -euo pipefail
# Uses real Git/filesystem operations and fake network, npm, Caddy and systemd.
# Run as a regular Linux user. No production service, credential or API is used.
updater=${1:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/memora-update.sh}
updater=$(realpath "$updater")
base_path=$PATH
real_mv=$(command -v mv)
fixture() {
  export MEMORA_DEPLOY_TEST_ROOT
  MEMORA_DEPLOY_TEST_ROOT=$(mktemp -d /tmp/memora-release-test.XXXXXX)
  root=$MEMORA_DEPLOY_TEST_ROOT
  export PATH=$base_path
  mkdir -p "$root"/{bin,opt,etc/caddy,run/lock,source,cdn}
  export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
  git init -q -b master "$root/source"
  git -C "$root/source" config user.name Fixture
  git -C "$root/source" config user.email fixture@example.invalid
  mkdir -p "$root/source"/{server,deploy/vps,public}
  printf 'export {};\n' > "$root/source/server.js"
  printf 'export {};\n' > "$root/source/server/payment-journal.js"
  printf 'export const version="old";\n' > "$root/source/server/version.js"
  printf '/node_modules\n/dist\n/.deployed-commit\n' > "$root/source/.gitignore"
  printf 'old-config\n' > "$root/source/deploy/vps/memora-solutions.caddy"
  for feed in flights hot-deals radar tours; do printf '{}\n' > "$root/source/public/$feed.json"; done
  git -C "$root/source" add .
  git -C "$root/source" commit -qm baseline
  base=$(git -C "$root/source" rev-parse HEAD)
  git clone -q --bare "$root/source" "$root/origin.git"
  git -C "$root/source" remote add origin "$root/origin.git"
  git clone -q "$root/origin.git" "$root/opt/memora-solutions"
  app="$root/opt/memora-solutions"
  mkdir -p "$app/node_modules" "$app/dist/static"
  printf 'old-dependencies\n' > "$app/node_modules/version"
  printf 'old-bundle\n' > "$app/dist/static/entry.js"
  printf '<meta name="memora-entry" content="/static/entry.js">\n' > "$app/dist/index.html"
  printf '%s\n' "$base" > "$app/.deployed-commit"
  printf 'TRAVELPAYOUTS_MARKER=old\n' > "$root/etc/memora-solutions.env"
  printf 'old-config\n' > "$root/etc/caddy/Caddyfile"
  printf 'active\n' > "$root/service"
  printf 'export const version="new";\n' > "$root/source/server/version.js"
  printf 'new-config\n' > "$root/source/deploy/vps/memora-solutions.caddy"
  git -C "$root/source" commit -qam candidate
  target=$(git -C "$root/source" rev-parse HEAD)
  printf '%s\n' "$target" > "$root/target"
  git -C "$root/source" push -q origin master
  git init -q -b cdn "$root/cdn"
  git -C "$root/cdn" config user.name Fixture
  git -C "$root/cdn" config user.email fixture@example.invalid
  mkdir "$root/cdn/static"
  printf '<meta name="memora-entry" content="/static/entry.js">\n' > "$root/cdn/index.html"
  printf 'new-bundle\n' > "$root/cdn/static/entry.js"
  git -C "$root/cdn" add .
  git -C "$root/cdn" commit -qm "assets: $target"
  git -C "$root/cdn" remote add origin "$root/origin.git"
  git -C "$root/cdn" push -q origin cdn
  cat > "$root/bin/curl" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
root=$MEMORA_DEPLOY_TEST_ROOT
if [[ "$*" == *api.github.com* ]]; then
  conclusion=success
  [[ ! -f "$root/ci-fails" ]] || conclusion=failure
  printf '{"workflow_runs":[{"head_sha":"%s","head_branch":"master","event":"push","status":"completed","conclusion":"%s"}]}' "$(<"$root/target")" "$conclusion"
else
  [[ ! -f "$root/health-always-fails" ]] || exit 1
  [[ ! -f "$root/health-fails" ]] || ! grep -q 'new' "$root/opt/memora-solutions/server/version.js"
fi
MOCK
  cat > "$root/bin/npm" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
root=$MEMORA_DEPLOY_TEST_ROOT
[[ ! -f "$root/npm-fails" ]]
[[ -z "${YOOKASSA_SECRET_KEY:-}" ]] || exit 1
mkdir -p "$2/node_modules"
printf 'new-dependencies\n' > "$2/node_modules/version"
MOCK
  cat > "$root/bin/systemctl" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
root=$MEMORA_DEPLOY_TEST_ROOT
printf '%s\n' "$*" >> "$root/service-calls"
case "$1" in
  stop) printf 'inactive\n' > "$root/service" ;;
  start) printf 'active\n' > "$root/service" ;;
  is-active) [[ "$(<"$root/service")" == active ]] ;;
  reload) [[ ! -f "$root/reload-fails" ]] || ! grep -q new-config "$root/etc/caddy/Caddyfile" ;;
  *) exit 1 ;;
esac
MOCK
  printf '#!/usr/bin/env bash\nexit 0\n' > "$root/bin/caddy"
  printf '#!/usr/bin/env bash\nexit 0\n' > "$root/bin/sleep"
  cat > "$root/bin/mv" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
"$MEMORA_TEST_REAL_MV" "$@"
if [[ -f "$MEMORA_DEPLOY_TEST_ROOT/kill-after-move" && "$*" == *"$MEMORA_DEPLOY_TEST_ROOT/opt/memora-solutions "* ]]; then
  kill -KILL "$PPID"
fi
MOCK
  chmod +x "$root/bin"/*
  export MEMORA_TEST_REAL_MV=$real_mv PATH="$root/bin:$base_path"
  fingerprint > "$root/before"
}
fingerprint() {
  git -C "$app" rev-parse HEAD
  sha256sum "$app/server/version.js" "$app/node_modules/version" "$app/dist/static/entry.js" \
    "$app/.deployed-commit" "$root/etc/memora-solutions.env" "$root/etc/caddy/Caddyfile"
}
unchanged() { fingerprint > "$root/after"; cmp "$root/before" "$root/after"; }
expect_failure() { if bash "$updater" "$target" "$@" > "$root/release.log" 2>&1; then cat "$root/release.log"; exit 1; fi; }

fixture
touch "$root/ci-fails"
expect_failure
unchanged
[[ ! -f "$root/service-calls" ]]
echo 'PASS: failed CI leaves the active release untouched'

fixture
printf '%s\n' "$base" > "$root/target"
expect_failure
unchanged
[[ ! -f "$root/service-calls" ]]
echo 'PASS: successful CI for a different SHA cannot authorize this release'

fixture
touch "$root/npm-fails"
expect_failure
unchanged
[[ ! -f "$root/service-calls" ]]
echo 'PASS: dependency failure happens outside the active application'

fixture
printf '<meta name="memora-entry" content="/static/missing.js">\n' > "$root/cdn/index.html"
git -C "$root/cdn" commit -qam "assets: $target"
git -C "$root/cdn" push -q origin cdn
expect_failure
unchanged
echo 'PASS: missing bundle prevents switching'

fixture
touch "$root/health-fails"
printf 'TRAVELPAYOUTS_MARKER=new\n' > "$root/environment-patch"
chmod 0600 "$root/environment-patch"
expect_failure "$root/environment-patch"
unchanged
[[ ! -f "$root/var/lib/memora-deploy/transaction-v1" && "$(<"$root/service")" == active ]]
echo 'PASS: failed health restores code, dependencies, assets, marker and configuration'

fixture
touch "$root/health-always-fails"
expect_failure
[[ -f "$root/var/lib/memora-deploy/transaction-v1" ]]
rm "$root/health-always-fails"
bash "$updater" --recover-only > "$root/recovery.log" 2>&1
unchanged
[[ ! -f "$root/var/lib/memora-deploy/transaction-v1" ]]
echo 'PASS: failed rollback retains its transaction until recovery health is confirmed'

fixture
touch "$root/reload-fails"
expect_failure
unchanged
echo 'PASS: failed Caddy reload restores the previous application and configuration'

fixture
touch "$root/kill-after-move"
expect_failure
[[ -f "$root/var/lib/memora-deploy/transaction-v1" && ! -e "$app" ]]
rm "$root/kill-after-move"
bash "$updater" --recover-only > "$root/recovery.log" 2>&1
unchanged
echo 'PASS: SIGKILL between directory moves is recovered on the next invocation'

fixture
printf 'TRAVELPAYOUTS_MARKER=new\n' > "$root/environment-patch"
chmod 0600 "$root/environment-patch"
YOOKASSA_SECRET_KEY=fixture-runtime-secret bash "$updater" "$target" "$root/environment-patch" > "$root/release.log" 2>&1
[[ "$(git -C "$app" rev-parse HEAD)" == "$target" && "$(<"$app/.deployed-commit")" == "$target" ]]
grep -q new-dependencies "$app/node_modules/version"
grep -q new-bundle "$app/dist/static/entry.js"
grep -q new-config "$root/etc/caddy/Caddyfile"
grep -q MARKER=new "$root/etc/memora-solutions.env"
[[ ! -f "$root/var/lib/memora-deploy/transaction-v1" ]]
echo 'PASS: successful release switches the complete application and preserves a private rollback copy'

fixture
printf 'UNEXPECTED_SECRET=fixture\n' > "$root/environment-patch"
chmod 0600 "$root/environment-patch"
if bash "$updater" "$target" "$root/environment-patch" > "$root/release.log" 2>&1; then exit 1; fi
unchanged
echo 'PASS: unapproved environment keys cannot enter a release'
