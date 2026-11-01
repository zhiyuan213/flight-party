"""Run on the server against an existing, genuine test webhook. Prints no payload or secrets."""
import hashlib
import hmac
import json
import pathlib
import subprocess
import urllib.request
import urllib.error

settings = dict(line.split('=', 1) for line in pathlib.Path('/opt/joyflock/flight-party/deploy/.env').read_text().splitlines() if '=' in line)
assert settings.get('CREEM_LIVE') == 'false', 'This check is sandbox only'
payload = subprocess.check_output(['sudo', 'docker', 'exec', 'deploy-postgres-1', 'psql', '-U', 'flightparty', '-d', 'flightparty', '-Atc', "select payload from creem_webhook_inbox where event_type='subscription.paid' order by received_at desc limit 1"]).rstrip(b'\n')
assert json.loads(payload)['object']['mode'] in ('test', 'sandbox')
secret = settings['CREEM_WEBHOOK_SECRET'].encode()

def send(body, signature):
    request = urllib.request.Request('https://flight.joyflock.com/api/billing/creem/webhook', data=body, headers={'Content-Type': 'application/json', 'creem-signature': signature})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code

signature = hmac.new(secret, payload, hashlib.sha256).hexdigest()
assert send(payload, signature) == 200
assert send(payload, signature) == 200
assert send(payload, '0' * 64) == 401
changed = payload + b' '
assert send(changed, hmac.new(secret, changed, hashlib.sha256).hexdigest()) == 409
print('PASS: genuine provider event replay accepted twice; invalid signature rejected; same event ID with changed content rejected')
