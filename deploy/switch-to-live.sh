#!/usr/bin/env bash
# Switch JoyFlock production billing from Creem sandbox to live.
#
# This script NEVER contains credentials. Create the live values on the server
# only, with `umask 077`, in deploy/.env.live:
#
#   CREEM_API_KEY=<live key, NOT creem_test_...>
#   CREEM_WEBHOOK_SECRET=<live webhook signing secret>
#   CREEM_MONTHLY_PRODUCT_ID=<live recurring product, USD 900>
#   CREEM_ANNUAL_PRODUCT_ID=<live recurring product, USD 5900>
#
# Usage (run on the production host, from /opt/joyflock/flight-party):
#   sudo bash deploy/switch-to-live.sh --dry-run
#   sudo bash deploy/switch-to-live.sh --confirm-merchant-approved
#
# --confirm-merchant-approved attests that ALL of the following were checked in
# the Creem dashboard:
#   1. Merchant/KYB approval is granted and live checkout is enabled.
#   2. Both live products are published and set to recurring (every-month /
#      every-year), USD 900 / 5900, in LIVE mode (not test mode).
#   3. A LIVE webhook endpoint points at
#      https://flight.joyflock.com/api/billing/creem/webhook
#      and uses the NEW live signing secret above.
#   4. The live checkout page discloses recurring billing and cancellation.
#
# Refusing to run without these checks is intentional: a live flag combined
# with sandbox credentials would take real money without granting membership.

set -euo pipefail

LIVE_ROOT=/opt/joyflock/flight-party
ENVFILE="$LIVE_ROOT/deploy/.env"
LIVE_ENVFILE="$LIVE_ROOT/deploy/.env.live"
CONTAINER=deploy-backend-1
WEBHOOK_PATH=/api/billing/creem/webhook
PRODUCTS_BASE=https://api.creem.io

DRY_RUN=0
CONFIRMED=0
SKIP_PROBE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --confirm-merchant-approved) CONFIRMED=1 ;;
    --live-env) LIVE_ENVFILE="$2"; shift ;;
    --skip-provider-probe) SKIP_PROBE=1 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

die(){ echo "ABORT: $*" >&2; if declare -F rollback >/dev/null; then rollback; fi; exit 1; }
note(){ echo "[check] $*"; }

if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo -n"; fi
command -v python3 >/dev/null || die "python3 is required"
command -v curl >/dev/null || die "curl is required"

[ -f "$ENVFILE" ] || die "missing $ENVFILE"
if grep -q '^CREEM_PROD_API_KEY=.' "$ENVFILE"; then
  die "dual configuration is installed; use python3 deploy/set-creem-mode.py --live instead"
fi
[ -f "$LIVE_ENVFILE" ] || die "missing $LIVE_ENVFILE (create it on the server with umask 077)"
[ "$CONFIRMED" -eq 1 ] || [ "$DRY_RUN" -eq 1 ] || die "pass --confirm-merchant-approved after checking the 4 dashboard items above"

PERMS=$(stat -c %a "$LIVE_ENVFILE")
[ "$PERMS" = "600" ] || [ "$PERMS" = "400" ] || die "$LIVE_ENVFILE must be chmod 600 or 400 (got $PERMS)"

# Parse only the four allowed keys; refuse anything else so a stray database
# password or shell snippet can never be merged into the production env.
PARSED=$(python3 - "$LIVE_ENVFILE" <<'PY'
import sys, re
allowed = ['CREEM_API_KEY','CREEM_WEBHOOK_SECRET','CREEM_MONTHLY_PRODUCT_ID','CREEM_ANNUAL_PRODUCT_ID']
found = {}
for raw in open(sys.argv[1], encoding='utf-8'):
    line = raw.strip()
    if not line or line.startswith('#'):
        continue
    m = re.match(r'^([A-Z_]+)=(.*)$', line)
    if not m:
        sys.stderr.write('malformed line in .env.live\n'); sys.exit(3)
    key, value = m.group(1), m.group(2)
    if key not in allowed:
        sys.stderr.write('unexpected key in .env.live: %s\n' % key); sys.exit(4)
    if not value or re.search(r'\s', value):
        sys.stderr.write('empty or whitespace value for %s\n' % key); sys.exit(5)
    found[key] = value
missing = [k for k in allowed if k not in found]
if missing:
    sys.stderr.write('missing keys: %s\n' % ','.join(missing)); sys.exit(6)
for k in allowed:
    print(found[k])
PY
) || die "could not parse $LIVE_ENVFILE"
# .env.live may have been authored on Windows; a trailing CR would make a
# reused sandbox value look different and defeat the equality guards below.
PARSED=$(printf '%s' "$PARSED" | tr -d '\r')
mapfile -t LIVE_VALUES <<< "$PARSED"
[ "${#LIVE_VALUES[@]}" -eq 4 ] || die "expected 4 values from $LIVE_ENVFILE"

LIVE_KEY="${LIVE_VALUES[0]}"
LIVE_SECRET="${LIVE_VALUES[1]}"
LIVE_MONTHLY="${LIVE_VALUES[2]}"
LIVE_ANNUAL="${LIVE_VALUES[3]}"

note "reading current sandbox values"
read -r OLD_KEY OLD_SECRET OLD_MONTHLY OLD_ANNUAL < <(python3 - "$ENVFILE" <<'PY'
import sys, os
d = {}
for raw in open(sys.argv[1], encoding='utf-8'):
    line = raw.strip()
    if '=' in line and not line.startswith('#'):
        k, v = line.split('=', 1)
        d[k] = v.strip()
keys = ['CREEM_API_KEY','CREEM_WEBHOOK_SECRET','CREEM_MONTHLY_PRODUCT_ID','CREEM_ANNUAL_PRODUCT_ID']
# Binary write: print() on Windows emits CRLF and would leave a stray \r in
# the last field, breaking the product-id comparison below.
os.write(1, (' '.join(d.get(k, '') for k in keys) + '\n').encode())
PY
)
[ -n "$OLD_KEY" ] && [ -n "$OLD_MONTHLY" ] && [ -n "$OLD_ANNUAL" ] || die "current .env has incomplete Creem settings"

case "$(printf '%s' "$LIVE_KEY" | tr '[:upper:]' '[:lower:]')" in
  *test*) die "the supplied API key is a sandbox key (contains 'test'); a live key must not" ;;
esac
[ "$LIVE_KEY" != "$OLD_KEY" ] || die "live API key equals the sandbox key"
[ "$LIVE_SECRET" != "$OLD_SECRET" ] || die "live webhook secret equals the sandbox secret"
[ "$LIVE_MONTHLY" != "$LIVE_ANNUAL" ] || die "monthly and annual product IDs must differ"
[ "$LIVE_MONTHLY" != "$OLD_MONTHLY" ] || die "monthly product ID is still the sandbox product"
[ "$LIVE_ANNUAL" != "$OLD_ANNUAL" ] || die "annual product ID is still the sandbox product"
note "credentials are distinct from sandbox values"

# Provider-side proof: the live key must be able to read BOTH live products,
# and each product must match what CreemSubscriptionService enforces in the
# webhook (USD 900/5900, recurring, correct period, live mode).
probe_product(){
  local id="$1" price="$2" period="$3" label="$4"
  local body_file code
  body_file=$(mktemp) || die "cannot allocate a temporary file"
  # Write the body to a file instead of embedding a newline in curl -w: the
  # latter is not portable and can silently drop the JSON payload.
  code=$(curl -sS --max-time 30 -o "$body_file" -w '%{http_code}' \
        -H "x-api-key: $LIVE_KEY" "$PRODUCTS_BASE/v1/products?product_id=$id") \
        || { rm -f "$body_file"; die "live API request failed for $label"; }
  [ "$code" = "200" ] \
        || { rm -f "$body_file"; die "$label: GET /v1/products/$id returned HTTP $code (check live key and product ID)"; }
  python3 - "$price" "$period" "$label" "$body_file" <<'PY' \
        || { rm -f "$body_file"; die "$label: product attributes do not match"; }
import sys, json
price, period, label, body_path = int(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
try:
    with open(body_path, encoding='utf-8') as fh:
        p = json.load(fh)
except Exception as e:
    sys.stderr.write('invalid product JSON: %s\n' % e); sys.exit(1)
def g(*keys):
    for k in keys:
        if k in p and p[k] not in (None, ''):
            return p[k]
    return None
mode = g('mode')
if mode is None:
    sys.stderr.write('%s: product response has no mode field; cannot prove live mode\n' % label); sys.exit(2)
if str(mode).lower() not in ('live', 'prod'):
    sys.stderr.write('%s: product mode is %s, expected live/prod\n' % (label, mode)); sys.exit(3)
currency = str(g('currency') or '').upper()
if currency != 'USD':
    sys.stderr.write('%s: currency is %s, expected USD\n' % (label, currency)); sys.exit(4)
actual_price = g('price')
if actual_price is None or int(actual_price) != price:
    sys.stderr.write('%s: price is %s, expected %d\n' % (label, actual_price, price)); sys.exit(5)
btype = str(g('billing_type', 'billingType') or '').lower()
if btype != 'recurring':
    sys.stderr.write('%s: billing_type is %s, expected recurring\n' % (label, btype)); sys.exit(6)
bperiod = str(g('billing_period', 'billingPeriod') or '').lower()
if bperiod != period:
    sys.stderr.write('%s: billing_period is %s, expected %s\n' % (label, bperiod, period)); sys.exit(7)
print('[check] %s: live product OK (USD %d, %s)' % (label, price, period))
PY
  rm -f "$body_file"
}

if [ "$SKIP_PROBE" -eq 1 ]; then
  [ "$CONFIRMED" -eq 1 ] || [ "$DRY_RUN" -eq 1 ] || die "--skip-provider-probe requires --confirm-merchant-approved"
  echo "[warn] provider probe skipped; live key/products were NOT verified"
elif ! command -v curl >/dev/null; then
  die "curl is required for the provider probe"
else
  note "verifying live products against the Creem production API"
  probe_product "$LIVE_MONTHLY" 900  every-month "monthly"
  probe_product "$LIVE_ANNUAL"  5900 every-year  "annual"
fi

if [ "$DRY_RUN" -eq 1 ]; then
  echo "DRY RUN OK: all preconditions verified; nothing was changed."
  echo "Re-run with --confirm-merchant-approved to apply."
  exit 0
fi

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
RELEASE="/opt/joyflock/releases/live-$STAMP"
$SUDO mkdir -p "$RELEASE"
$SUDO chmod 700 "$RELEASE"
$SUDO cp -a "$ENVFILE" "$RELEASE/env.before"
$SUDO cp -a "$LIVE_ENVFILE" "$RELEASE/env.live"
$SUDO docker inspect "$CONTAINER" > "$RELEASE/backend-before.private.json"
OLD_IMAGE=$($SUDO docker inspect "$CONTAINER" --format '{{.Config.Image}}')
$SUDO docker tag "$OLD_IMAGE" "joyflock-backend:before-live-$STAMP"
$SUDO sh "$LIVE_ROOT/deploy/backup.sh"

# Previous releases may have private Compose files with literal environment
# values. Preserve the running environment and override billing LAST, rather
# than allowing an old sandbox override to silently win over .env.
python3 - "$RELEASE" "$LIVE_ENVFILE" <<'PY'
import json, pathlib, sys, os
root=pathlib.Path(sys.argv[1])
old=json.loads((root/'backend-before.private.json').read_text())[0]
env=dict(item.split('=',1) for item in old['Config']['Env'])
image=old['Config']['Image']
rollback={'services':{'backend':{'image':image,'environment':env.copy()}}}
for raw in open(sys.argv[2],encoding='utf-8'):
    line=raw.strip()
    if line and not line.startswith('#'):
        k,v=line.split('=',1);env[k]=v
env['CREEM_LIVE']='true';env['CREEM_CHECKOUT_ENABLED']='true'
release={'services':{'backend':{'image':image,'environment':env}}}
for name,value in [('rollback',rollback),('release',release)]:
    p=root/(name+'.private.json');p.write_text(json.dumps(value));os.chmod(p,0o600)
PY
echo "[backup] $RELEASE (env, container metadata, image tag joyflock-backend:before-live-$STAMP)"

# Rebuild deploy/.env in place: keep every unrelated line (DB password etc.),
# replace only the five Creem settings. Values are read from .env.live by
# python and never echoed or written to a log.
python3 - "$ENVFILE" "$LIVE_ENVFILE" <<'PY'
import sys, re, os
env_path, live_path = sys.argv[1], sys.argv[2]
repl = {}
for raw in open(live_path, encoding='utf-8'):
    line = raw.strip()
    if '=' in line and not line.startswith('#'):
        k, v = line.split('=', 1)
        repl[k] = v
repl['CREEM_LIVE'] = 'true'
repl['CREEM_CHECKOUT_ENABLED'] = 'true'
out, seen = [], set()
for raw in open(env_path, encoding='utf-8'):
    line = raw.rstrip('\r\n')
    if '=' in line and not line.lstrip().startswith('#'):
        key = line.split('=', 1)[0].strip()
        if key in repl:
            out.append('%s=%s' % (key, repl[key]))
            seen.add(key)
            continue
    out.append(line)
for key, value in repl.items():
    if key not in seen:
        out.append('%s=%s' % (key, value))
tmp = env_path + '.live-tmp'
st = os.stat(env_path)
with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(out) + '\n')
os.chmod(tmp, 0o600)
try:
    os.chown(tmp, st.st_uid, st.st_gid)
except PermissionError:
    pass
os.replace(tmp, env_path)
PY
$SUDO chmod 600 "$ENVFILE"
echo "[apply] $ENVFILE updated (CREEM_LIVE=true, live credentials)"

# Reuse the exact compose file set that is running today, so the live switch
# only recreates the backend container and leaves web/edge/postgres/redis up.
CONFIG_FILES=$($SUDO docker inspect "$CONTAINER" --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}')
[ -n "$CONFIG_FILES" ] || die "could not read compose config files from container labels"
COMPOSE_ARGS=()
IFS=',' read -ra _cf <<< "$CONFIG_FILES"
for f in "${_cf[@]}"; do
  [ -f "$f" ] || die "compose file from container labels is missing: $f"
  COMPOSE_ARGS+=(-f "$f")
done

rollback(){
  trap - ERR
  echo "[rollback] restoring previous environment and backend" >&2
  $SUDO cp -a "$RELEASE/env.before" "$ENVFILE"
  (cd "$LIVE_ROOT" && $SUDO docker compose -p deploy --env-file "$ENVFILE" \
    "${COMPOSE_ARGS[@]}" -f "$RELEASE/rollback.private.json" up -d --no-build --no-deps --force-recreate backend)
}
trap rollback ERR
(cd "$LIVE_ROOT" && $SUDO docker compose -p deploy --env-file "$ENVFILE" \
  "${COMPOSE_ARGS[@]}" -f "$RELEASE/release.private.json" up -d --no-build --no-deps --force-recreate backend)

echo "[verify] waiting for backend"
for i in $(seq 1 40); do
  if curl -fsS --max-time 5 "http://127.0.0.1:8080/api/me" >/dev/null 2>&1; then break; fi
  sleep 2
done
curl -fsS --max-time 10 "http://127.0.0.1:8080/api/me" >/dev/null || die "backend /api/me did not recover"

ACTIVE=$($SUDO docker inspect "$CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^CREEM_LIVE=' || true)
[ "$ACTIVE" = "CREEM_LIVE=true" ] || die "container env is not CREEM_LIVE=true (got: $ACTIVE)"
if $SUDO docker inspect "$CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' \
    | grep -q '^CREEM_API_KEY=.*test'; then
  die "container still holds a test API key"
fi
$SUDO docker inspect "$CONTAINER" > "$RELEASE/backend-after.private.json"
python3 - "$RELEASE/backend-after.private.json" "$RELEASE/release.private.json" <<'PY'
import json,sys
actual=json.load(open(sys.argv[1]))[0]
env=dict(item.split('=',1) for item in actual['Config']['Env'])
expected=json.load(open(sys.argv[2]))['services']['backend']['environment']
if any(env.get(k)!=v for k,v in expected.items()):
    raise SystemExit('Effective container environment mismatch; refusing completion')
print('[check] exact effective environment verified; unrelated settings preserved')
PY
trap - ERR

echo "[done] backend is running with live billing credentials."
echo
echo "MANDATORY post-switch checks (cannot be automated from this host):"
echo "  1. In the Creem dashboard, send a LIVE test webhook or inspect the first"
echo "     real event: the endpoint $WEBHOOK_PATH must validate the new secret."
echo "  2. With a signed-in account, open Account: paymentConfigured=true and"
echo "     testMode=false in /api/me; the sandbox note must be gone."
echo "  3. Perform ONE real low-value purchase and confirm subscription.paid"
echo "     creates an ACTIVE entitlement (test_mode=false, member=true)."
echo "  4. Confirm the 'Cancel auto-renewal' control works against the live API."
echo
echo "ROLLBACK: cp -a $RELEASE/env.before $ENVFILE &&"
echo "  cd $LIVE_ROOT && $SUDO docker compose -p deploy --env-file $ENVFILE ${COMPOSE_ARGS[*]} -f $RELEASE/rollback.private.json up -d --no-build --no-deps --force-recreate backend"
