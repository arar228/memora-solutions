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

# Build beside the active release. Visitors keep receiving the complete current
# bundle until the replacement is ready.
rm -rf -- "$next_dist"
# Keep the application shell and its versioned assets on one origin. This avoids
# a third-party CDN becoming a mandatory part of the initial application boot.
runuser -u memora -- env VITE_ASSET_BASE=/ \
  npm --prefix "$app_dir" run build -- --outDir "$next_dist"

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
