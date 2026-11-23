#!/usr/bin/env python3
"""Select retained Creem credentials with CREEM_LIVE; never print secrets."""
import argparse
import datetime
import json
import os
import pathlib
import shutil
import subprocess
import time
import urllib.request

SUFFIXES = ('API_KEY', 'WEBHOOK_SECRET', 'MONTHLY_PRODUCT_ID', 'ANNUAL_PRODUCT_ID')

def read_env(path):
    result = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            result[key.strip()] = value.strip()
    return result

def verify_selected(env, live):
    prefix = 'CREEM_' + ('PROD_' if live else 'TEST_')
    values = {suffix: env.get(prefix + suffix, '') for suffix in SUFFIXES}
    if not all(values.values()):
        raise RuntimeError('Selected Creem configuration is incomplete')
    if live == values['API_KEY'].startswith('creem_test_'):
        raise RuntimeError('Selected API key does not match CREEM_LIVE')
    base = 'https://api.creem.io' if live else 'https://test-api.creem.io'
    for suffix, price, period in [('MONTHLY_PRODUCT_ID', 900, 'every-month'), ('ANNUAL_PRODUCT_ID', 5900, 'every-year')]:
        response = subprocess.run(['curl', '-fsS', '--max-time', '25', '-H', 'x-api-key: ' + values['API_KEY'],
                                   base + '/v1/products?product_id=' + values[suffix]], capture_output=True, text=True)
        if response.returncode:
            raise RuntimeError('Provider verification failed for ' + suffix)
        product = json.loads(response.stdout)
        modes = ('prod', 'live') if live else ('test', 'sandbox')
        if not (product.get('mode') in modes and product.get('status') == 'active'
                and product.get('currency') == 'USD' and product.get('price') == price
                and product.get('billing_type') == 'recurring' and product.get('billing_period') == period):
            raise RuntimeError('Provider product attributes do not match ' + suffix)
    print('Selected products verified:', 'production' if live else 'test', 'USD 9/month and USD 59/year')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--live', action='store_true')
    mode.add_argument('--test', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--root', default='/opt/joyflock/flight-party')
    parser.add_argument('--image', help='Optional already-built backend image for a release')
    args = parser.parse_args()
    root = pathlib.Path(args.root).resolve()
    env_path = root / 'deploy/.env'
    env = read_env(env_path)
    for prefix in ('CREEM_PROD_', 'CREEM_TEST_'):
        if not all(env.get(prefix + suffix) for suffix in SUFFIXES):
            raise RuntimeError('Both complete configurations must be retained before switching')
    verify_selected(env, args.live)
    if args.dry_run:
        print('DRY RUN OK: no configuration or running service changed')
        return
    docker = (['sudo', '-n'] if os.geteuid() else []) + ['docker']
    before = json.loads(subprocess.check_output(docker + ['inspect', 'deploy-backend-1']))[0]
    files = before['Config']['Labels']['com.docker.compose.project.config_files'].split(',')
    if not all(pathlib.Path(f).is_file() for f in files):
        raise RuntimeError('Running Compose file set is incomplete')
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    release = pathlib.Path('/opt/joyflock/releases') / ('creem-mode-' + stamp)
    release.mkdir(mode=0o700)
    os.chmod(release, 0o700)
    shutil.copyfile(env_path, release / 'env.before')
    (release / 'backend-before.private.json').write_text(json.dumps(before))
    current = dict(item.split('=', 1) for item in before['Config']['Env'])
    image = args.image or before['Config']['Image']
    selected = current.copy()
    for prefix in ('CREEM_PROD_', 'CREEM_TEST_'):
        for suffix in SUFFIXES:
            selected[prefix + suffix] = env[prefix + suffix]
    for suffix in SUFFIXES:
        selected['CREEM_' + suffix] = ''  # Retired shared credentials must not shadow either set.
    selected['CREEM_LIVE'] = '${CREEM_LIVE:-false}'
    for name, tag, values in [('release', image, selected), ('rollback', before['Config']['Image'], current)]:
        p = release / (name + '.private.json')
        p.write_text(json.dumps({'services': {'backend': {'image': tag, 'environment': values}}}))
    for p in release.iterdir():
        os.chmod(p, 0o600)
    subprocess.run(['sh', str(root / 'deploy/backup.sh')], check=True)
    compose = docker + ['compose', '-p', 'deploy', '--env-file', str(env_path)]
    for f in files:
        compose += ['-f', f]
    def switch(name):
        subprocess.run(compose + ['-f', str(release / (name + '.private.json')), 'up', '-d', '--no-build', '--no-deps', '--force-recreate', 'backend'], check=True)
    try:
        # Only the flag changes. Keep both credential sets and all other lines.
        lines = env_path.read_text().splitlines()
        lines = [line for line in lines if not line.startswith('CREEM_LIVE=')]
        lines.append('CREEM_LIVE=' + str(args.live).lower())
        env_path.write_text('\n'.join(lines) + '\n')
        os.chmod(env_path, 0o600)
        switch('release')
        for attempt in range(45):
            try:
                urllib.request.urlopen('http://127.0.0.1:8080/api/csrf', timeout=3).read()
                break
            except Exception:
                if attempt == 44:
                    raise RuntimeError('Backend did not recover') from None
                time.sleep(1)
        after = json.loads(subprocess.check_output(docker + ['inspect', 'deploy-backend-1']))[0]
        actual = dict(item.split('=', 1) for item in after['Config']['Env'])
        expected = selected.copy()
        expected['CREEM_LIVE'] = str(args.live).lower()
        if any(actual.get(k) != v for k, v in expected.items()):
            raise RuntimeError('Effective environment differs from selected configuration')
    except Exception:
        shutil.copyfile(release / 'env.before', env_path)
        switch('rollback')
        raise
    (release / 'mode.txt').write_text('CREEM_LIVE=' + str(args.live).lower() + '\n')
    print('Switched CREEM_LIVE=' + str(args.live).lower() + '; both sets retained; backend healthy')
    print('Private rollback directory:', release)

if __name__ == '__main__':
    main()
