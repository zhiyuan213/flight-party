import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';

const ROOT = new URL('../dist/', import.meta.url);
const text = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const KEY = '&unlock=20261120-audiounlock1';

function htmlFiles(dir = ROOT) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const url = new URL(entry, dir);
    if (statSync(url).isDirectory()) out.push(...htmlFiles(new URL(entry + '/', dir)));
    else if (entry.endsWith('.html')) out.push(url);
  }
  return out;
}

test('the shared audio gate resumes every registered context inside a gesture', () => {
  const s = text('dist/site-audio.js');
  assert.match(s, /function unlockOutputs\(\)/);
  assert.match(s, /o\.ctx\.resume\(\)/);
  assert.match(s, /unlock:unlockOutputs/);
  assert.match(s, /addEventListener\('click',function\(\)\{unlockOutputs\(\);setMuted\(!muted\);\}/);
  assert.match(s, /\['pointerdown','mousedown','touchend','keydown','click'\]/);
  assert.match(s, /window\.addEventListener\(type,unlockOutputs,\{capture:true,passive:true\}\)/);
});

test('hover sfx resumes its context on the very first gesture', () => {
  const s = text('dist/site-hover-sfx.js');
  const m = s.match(/function onGesture\(\)\{[\s\S]{0,400}?broadcast\(\);/);
  assert.ok(m, 'onGesture body must be present');
  assert.match(m[0], /ctx\.resume\(\)/);
});

test('all shipped audio script URLs carry the fresh unlock cache key', () => {
  const files = htmlFiles();
  let audio = 0, hover = 0;
  for (const file of files) {
    const s = readFileSync(file, 'utf8');
    for (const m of s.matchAll(/site-audio\.js\?[^"']*/g)) {
      assert.ok(m[0].includes(KEY), file.pathname + ' -> ' + m[0]);
      audio++;
    }
    for (const m of s.matchAll(/site-hover-sfx\.js\?[^"']*/g)) {
      assert.ok(m[0].includes(KEY), file.pathname + ' -> ' + m[0]);
      hover++;
    }
  }
  assert.ok(audio >= 30, 'site-audio.js must be referenced across the shell pages');
  assert.ok(hover >= 10, 'site-hover-sfx.js must be referenced across the shell pages');
  assert.match(text('scripts/build-game-seo.mjs'), new RegExp('site-audio\\.js\\?[^"\']*' + KEY.replace('&', '\\&')));
});
