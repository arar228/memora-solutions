#!/usr/bin/env bash
set -euo pipefail

exec 9>/run/lock/memora-update.lock
flock -n 9 || exit 0

app_dir=/opt/memora-solutions
next_dist="$app_dir/dist.next"
previous_dist="$app_dir/dist.previous"
deployed_marker="$app_dir/.deployed-commit"
current=$(runuser -u memora -- git -C "$app_dir" rev-parse HEAD)
if [[ -s "$deployed_marker" ]]; then
  deployed=$(<"$deployed_marker")
else
  deployed="$current"
  printf '%s\n' "$deployed" > "$deployed_marker"
fi
runuser -u memora -- git -C "$app_dir" fetch origin master
target=$(runuser -u memora -- git -C "$app_dir" rev-parse origin/master)

if [[ "$deployed" == "$target" ]]; then
  exit 0
fi

changed_files=$(runuser -u memora -- git -C "$app_dir" diff --name-only "$deployed" "$target")
data_only=0
if [[ -n "$changed_files" ]] && ! grep -Evq '^public/(flights|hot-deals|radar|tours)\.json$' <<<"$changed_files"; then
  data_only=1
fi

runuser -u memora -- git -C "$app_dir" merge --ff-only origin/master

# Scheduled parsers publish data without rebuilding the React application.
# Refresh both the API source and the public snapshot in place.
if [[ "$data_only" -eq 1 ]]; then
  for feed in flights hot-deals radar tours; do
    source_file="$app_dir/public/$feed.json"
    if [[ -s "$source_file" ]]; then
      install -o memora -g memora -m 0644 "$source_file" "$app_dir/dist/$feed.json"
    fi
  done
  printf '%s\n' "$target" > "$deployed_marker"
  exit 0
fi

runuser -u memora -- npm --prefix "$app_dir" ci

# Wait for the asset workflow to publish the exact same commit. The CDN branch
# is force-updated, so fetch it with an explicit refspec and verify its marker.
cdn_ready=0
for _ in {1..72}; do
  runuser -u memora -- git -C "$app_dir" fetch origin +cdn:refs/remotes/origin/cdn
  cdn_marker=$(runuser -u memora -- git -C "$app_dir" log -1 --format=%s origin/cdn)
  if [[ "$cdn_marker" == "assets: $target" ]]; then
    cdn_ready=1
    break
  fi
  sleep 5
done

if [[ "$cdn_ready" -ne 1 ]]; then
  echo "CDN release for $target was not published in time" >&2
  exit 1
fi

# Extract the already-built CDN release beside the active one. This guarantees
# that production HTML references the same immutable files served by Pages.
rm -rf -- "$next_dist"
runuser -u memora -- mkdir -p "$next_dist"
runuser -u memora -- git -C "$app_dir" archive origin/cdn | runuser -u memora -- tar -x -C "$next_dist"

# The release carries a same-origin copy and two external fallbacks. Validate
# the local entry before swapping directories; public CDN availability is no
# longer a deployment blocker.
asset_path=$(grep -oE '<meta name="memora-entry" content="[^"]+"' "$next_dist/index.html" \
  | sed -E 's/.*content="([^"]+)"/\1/' \
  | head -n 1)

if [[ -z "$asset_path" || ! -s "$next_dist/$asset_path" ]]; then
  echo "Release entry bundle is missing: $asset_path" >&2
  rm -rf -- "$next_dist"
  exit 1
fi

rm -rf -- "$previous_dist"
printf '%s\n' "$target" > "$deployed_marker"
if [[ -e "$app_dir/dist" ]]; then
  mv -- "$app_dir/dist" "$previous_dist"
fi
mv -- "$next_dist" "$app_dir/dist"
systemctl restart memora-solutions.service

healthy=0
for _ in {1..20}; do
  if curl --fail --silent --show-error --max-time 2 http://127.0.0.1:3020/health >/dev/null; then
    healthy=1
    break
  fi
  sleep 0.5
done

if [[ "$healthy" -ne 1 ]]; then
  systemctl stop memora-solutions.service
  rm -rf -- "$app_dir/dist"
  if [[ -e "$previous_dist" ]]; then
    mv -- "$previous_dist" "$app_dir/dist"
  fi
  systemctl start memora-solutions.service
  exit 1
fi

rm -rf -- "$previous_dist"
