#!/usr/bin/env bash
set -euo pipefail

exec 9>/run/lock/memora-update.lock
flock -n 9 || exit 0

app_dir=/opt/memora-solutions
next_dist="$app_dir/dist.next"
previous_dist="$app_dir/dist.previous"
current=$(runuser -u memora -- git -C "$app_dir" rev-parse HEAD)
runuser -u memora -- git -C "$app_dir" fetch origin master
target=$(runuser -u memora -- git -C "$app_dir" rev-parse origin/master)

if [[ "$current" == "$target" ]]; then
  exit 0
fi

runuser -u memora -- git -C "$app_dir" merge --ff-only origin/master
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

# Pages can lag briefly behind the branch. Keep the active release until the
# entry bundle of the next release is publicly downloadable.
asset_url=$(grep -oE 'https://arar228.github.io/memora-solutions/static/index-[^" ]+\.js' "$next_dist/index.html" | head -n 1)
asset_ready=0
for _ in {1..36}; do
  if [[ -n "$asset_url" ]] && curl --fail --silent --show-error --max-time 20 --range 0-1023 "$asset_url" >/dev/null; then
    asset_ready=1
    break
  fi
  sleep 5
done

if [[ "$asset_ready" -ne 1 ]]; then
  echo "CDN entry bundle is not available: $asset_url" >&2
  rm -rf -- "$next_dist"
  exit 1
fi

rm -rf -- "$previous_dist"
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
