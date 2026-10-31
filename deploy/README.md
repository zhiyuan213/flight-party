# JoyFlock deployment

Target: `flight.joyflock.com`, Ubuntu server `43.153.70.181`.
The root and www hosts temporarily redirect to the game; a platform homepage can replace this later.

Production startup from the repository root:

```sh
umask 077
# Create deploy/.env on the server only, with a unique random value:
# FLIGHTPARTY_DB_PASSWORD=<random password>
docker compose --env-file deploy/.env -f deploy/compose.yaml -f deploy/compose.production.yaml up -d --build
```

Point A records `@`, `www`, and `flight` at the server. Allow TCP 80/443 for HTTP/TLS and TCP 22 for restricted SSH access. Caddy obtains and renews certificates once DNS and reachability work. PostgreSQL and Redis have no published ports; backend and web ports bind to loopback only. Persistent named volumes must be retained during upgrades. Never run `down -v` on production.

Check `docker compose --env-file deploy/.env -f deploy/compose.yaml -f deploy/compose.production.yaml ps` and logs, then verify HTTPS, account cookies, room membership, WebSocket updates and a completed match. Back up PostgreSQL and Redis before upgrades. This configuration does not establish tested player capacity or replace recovery/load acceptance.

Creem purchases remain disabled until merchant approval and subscription processing have been completed and tested. Do not put secrets in Git.
