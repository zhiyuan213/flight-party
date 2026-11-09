set -eu
cd /opt/joyflock/flight-party/deploy
sudo -n docker tag deploy-backend joyflock-backend:before-pool-mouse
sudo -n docker exec deploy-postgres-1 pg_dump -U flightparty -d flightparty -Fc > /opt/joyflock/before-pool-mouse-20261104.dump
cd /opt/joyflock/table-release
sudo -n docker build -f Dockerfile.table -t deploy-backend . > /opt/joyflock/pool-mouse-image-build.log 2>&1
cd /opt/joyflock/flight-party/deploy
sudo -n docker compose -f compose.yaml -f compose.production.yaml up -d --no-deps --force-recreate backend
ok=0
for attempt in $(seq 1 30); do
 if curl -sf http://127.0.0.1:8081/api/csrf > /dev/null; then ok=1; break; fi
 sleep 1
done
if [ "$ok" -ne 1 ]; then
 sudo -n docker tag joyflock-backend:before-pool-mouse deploy-backend
 sudo -n docker compose -f compose.yaml -f compose.production.yaml up -d --no-deps --force-recreate backend
 echo 'New backend failed health check; previous image restored.'
 exit 1
fi
sudo -n docker exec deploy-postgres-1 psql -U flightparty -d flightparty -tAc 'select version from flyway_schema_history order by installed_rank desc limit 3'
echo 'Table backend healthy.'
