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

Public Creem purchases remain disabled pending merchant approval and live credentials. Sandbox checkout is enabled only for the account IDs in `CREEM_TEST_ACCOUNTS`; sandbox entitlements use `TEST_ACTIVE` and never authorize real score recording. Set `CREEM_CHECKOUT_ENABLED`, `CREEM_LIVE`, product IDs, API key, signing secret and success URL in the ignored server environment. Do not put secrets in Git.

The current private GitHub repository is pushed from the local machine. Releases are transferred with `git archive` over SSH; no GitHub credential has been installed on the server. A push alone does not deploy. Deploy the reviewed commit, preserve `deploy/.env`, run the Compose command above, and verify HTTPS/API/WSS after the update.

`deploy/backup.sh` creates PostgreSQL and Redis backups under `/opt/joyflock/backups`. The server cron runs it daily at 03:17 server time. These copies remain on the same host; offsite copies, retention automation and a restoration drill are still required. Keep private environment configuration separately backed up with restricted access.
