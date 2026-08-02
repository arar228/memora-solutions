#!/usr/bin/env bash
set -euo pipefail

backup_dir=/opt/memora-backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$backup_dir/memora-$stamp.dump"

install -d -o root -g root -m 700 "$backup_dir"
docker exec memora-postgres pg_dump -U memora -d memora -Fc >"$target"
test "$(stat -c %s "$target")" -gt 1024
find "$backup_dir" -maxdepth 1 -type f -name 'memora-*.dump' -mtime +14 -delete
