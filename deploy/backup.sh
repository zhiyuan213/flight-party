#!/bin/sh
set -eu
umask 077
cd /opt/joyflock/flight-party
mkdir -p /opt/joyflock/backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
archive=/opt/joyflock/backups/$stamp
mkdir "$archive"
docker exec deploy-postgres-1 pg_dump -U flightparty -d flightparty -Fc > "$archive/postgres.dump.partial"
mv "$archive/postgres.dump.partial" "$archive/postgres.dump"
docker exec deploy-redis-1 redis-cli --rdb /tmp/joyflock-backup.rdb
docker cp deploy-redis-1:/tmp/joyflock-backup.rdb "$archive/redis.rdb"
printf '%s\n' 'Backups are local to this server; copy offsite and test restoration separately.' > "$archive/README.txt"
echo "Backup complete: $archive"
