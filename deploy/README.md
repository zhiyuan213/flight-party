# JoyFlock deployment

完整操作与注意事项见 [生产部署手册](../docs/PRODUCTION-DEPLOYMENT.md)，包含静态发布、后端／迁移、备份、回滚、缓存与验证步骤。

支付配置、正式/测试切换、会员状态与验收边界统一见 [Creem 支付手册](../docs/CREEM-PAYMENTS.md)；[沙盒说明](../docs/CREEM-SANDBOX.md) 和 [会员契约](../docs/MEMBERSHIP-CONTRACT.md) 已同步为双配置方案。不要照历史单套配置替换密钥。

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

Creem keeps two independent credential sets on the server: `CREEM_PROD_API_KEY`, `CREEM_PROD_WEBHOOK_SECRET`, `CREEM_PROD_MONTHLY_PRODUCT_ID`, `CREEM_PROD_ANNUAL_PRODUCT_ID`, and the matching four `CREEM_TEST_*` variables. `CREEM_LIVE=true` selects production; `false` selects test. Checkout, signature validation, subscription settlement and cancellation all share this selector. Missing or wrong-mode selected credentials fail closed; no cross-mode fallback. All gameplay and eligible signed-in score recording stay free. Sandbox entitlements never become paid entitlements.

After initial migration, change only `CREEM_LIVE` in private `deploy/.env`, then recreate the backend using its existing Compose file set (including the final private release override). That override resolves `CREEM_LIVE` from `.env` instead of freezing it. The supported helper performs the flag update, validates selected product mode/USD prices/periods, backs up data/environment, preserves unrelated settings and recreates only backend with rollback on failure:

```sh
sudo python3 deploy/set-creem-mode.py --test --dry-run
sudo python3 deploy/set-creem-mode.py --test
sudo python3 deploy/set-creem-mode.py --live
```

Both sets remain intact after either command. Keep `CREEM_CHECKOUT_ENABLED=true`; test availability is controlled separately by `CREEM_TEST_ACCOUNTS` (`*` allows all signed-in accounts). Legacy shared `CREEM_API_KEY` etc. are supported only for older installations with no grouped credentials. `switch-to-live.sh` is the historical one-time migration path and refuses to run once dual configuration is installed. Never commit or print actual secrets.

The current private GitHub repository is pushed from the local machine. Releases are transferred with `git archive` over SSH; no GitHub credential has been installed on the server. A push alone does not deploy. Deploy the reviewed commit, preserve `deploy/.env`, run the Compose command above, and verify HTTPS/API/WSS after the update.

`deploy/backup.sh` creates PostgreSQL and Redis backups under `/opt/joyflock/backups`. The server cron runs it daily at 03:17 server time. These copies remain on the same host; offsite copies, retention automation and a restoration drill are still required. Keep private environment configuration separately backed up with restricted access.

Dedicated Redis integration checks (no production connections or published ports): `docker compose -p joyflock-qa -f deploy/compose.qa.yaml up --build --abort-on-container-exit --exit-code-from tests`. Clean up with `docker compose -p joyflock-qa -f deploy/compose.qa.yaml down`. The integration image uses the same build stage and an offline copy of the Maven dependency cache.
