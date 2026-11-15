import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const exists = p => existsSync(resolve(root, p));

const fx = read('dist/site-plane-fx.js');
const shop = read('dist/site-shop.js');
const points = read('dist/site-points.js');
const trails = read('dist/flight-trails.js');
const account = read('dist/live-account-ui.js');
const membership = read('dist/membership.html');
const version = points.match(/var VERSION='([^']+)'/)?.[1];

test('the three standalone flight trails are still shipped', () => {
  assert.ok(exists('dist/flight-trails.js'), 'the trail renderer is present');
  assert.ok(exists('dist/flight-trails.js.bak'), 'the trail backup is present');
  assert.match(trails, /\['star','rainbow','cloud'\]/,
    'Starlight / Rainbow / Cloud are the three selectable trail styles');
  assert.match(trails, /export class FlightTrails/);
  assert.match(trails, /export function startTrailPreview/);
  assert.match(trails, /RAINBOW_COLORS/, 'the seven-band rainbow ribbon survives');
  assert.match(trails, /p\.style==='cloud'/, 'the cloud wisps survive');
  assert.match(trails, /drawRainbow\(/, 'the rainbow renderer survives');
  assert.ok(account.includes("[['star','Starlight','星光尾迹'],['rainbow','Rainbow','彩虹尾迹'],['cloud','Cloud','云朵尾迹'],['none','Off','关闭']]"),
    'the account dialog still offers all three trails plus Off');
  assert.match(account, /data-effect-trail/, 'the trail selector is wired');
  assert.match(account, /startTrailPreview\(/, 'the trail preview canvas is wired');
  assert.match(membership, /飞行尾迹/, 'membership still advertises trail cosmetics');
});

test('aircraft previews neither draw nor promise a bundled flight trail', () => {
  assert.ok(!/drawTrail\(|trailPath\(|ribbon\(|trail:\s*\[/.test(fx),
    'the aircraft renderer has no trail geometry or trail palette');
  assert.match(fx, /No trail is drawn here/);
  assert.match(fx, /drawPropeller\(/, 'the spinning propeller is kept');
  assert.match(fx, /drawGlow\(/, 'the membership glow is kept');
  const planes = [...shop.matchAll(/\{id:'plane-[a-z0-9]+'[^\n]*\}/g)].map(m => m[0]);
  assert.equal(planes.length, 6, 'all six aircraft are checked');
  for (const line of planes) {
    assert.ok(!/trail|拖尾|尾迹/i.test(line), `no trail is advertised on ${line.slice(0, 60)}`);
  }
  assert.match(shop, /Flight trails are separate items, not part of an aircraft/);
  assert.match(shop, /飞行拖尾为独立道具，不包含在飞机内/);
  assert.match(shop, /trails sold separately/);
  assert.match(shop, /拖尾为独立道具/, 'the section subtitle says the same in Chinese');
});

test('the three trails are now standalone shop products, still never bundled into an aircraft', () => {
  assert.match(shop, /kind:'trail'/, 'trails are real catalogue items');
  assert.match(shop, /section\('plane'\)\+section\('trail'\)\+section\('cursor'\)\+section\('avatar'\)/,
    'four sections: the trail row is separate from aircraft');
  assert.match(shop, /shop-grid--trails/);
  assert.match(shop, /trailStage\(/);
  assert.match(points, /data-shop-trail/, 'the equipped trail is published for the in-game renderer');
  assert.match(points, /var DEFAULT_TRAIL='trail-none'/, 'the free baseline is NO trail');
  assert.ok(!/data-trail-style/.test(fx), 'the AIRCRAFT renderer still has no trail stage');
  const planes = [...shop.matchAll(/\{id:'plane-[a-z0-9]+'[^\n]*\}/g)].map(m => m[0]);
  for (const line of planes)
    assert.ok(!/trail|拖尾|尾迹/i.test(line), `no trail is bundled into ${line.slice(0, 50)}`);
});

test('the aircraft renderer and the catalogue share one cache key', () => {
  assert.ok(version, 'the wallet declares a cache key');
  assert.equal(fx.match(/var VERSION='([^']+)'/)?.[1], version);
  assert.equal(shop.match(/var VERSION='([^']+)'/)?.[1], version);
  const page = read('dist/shop.html');
  assert.match(page, new RegExp('site-plane-fx\\.js\\?v=' + version));
  assert.match(page, new RegExp('site-trail-fx\\.js\\?v=' + version), 'the trail renderer loads');
  assert.match(page, new RegExp('site-trail\\.css\\?v=' + version), 'the trail stage layout loads');
  assert.equal(read('dist/site-trail-fx.js').match(/var VERSION='([^']+)'/)?.[1], version);
  assert.ok(!/20261111-cursorusable1|20261111-ownedequip1/.test(page), 'the old key is gone');
});
