#!/usr/bin/env bash
set -euo pipefail

exec 9>/run/lock/memora-update.lock
flock -n 9 || exit 0

app_dir=/opt/memora-solutions
current=$(runuser -u memora -- git -C "$app_dir" rev-parse HEAD)
runuser -u memora -- git -C "$app_dir" fetch origin master
target=$(runuser -u memora -- git -C "$app_dir" rev-parse origin/master)

if [[ "$current" == "$target" ]]; then
  exit 0
fi

runuser -u memora -- git -C "$app_dir" merge --ff-only origin/master
runuser -u memora -- npm --prefix "$app_dir" ci
runuser -u memora -- npm --prefix "$app_dir" run build
systemctl restart memora-solutions.service
curl --fail --silent --show-error --max-time 10 http://127.0.0.1:3020/health >/dev/null
