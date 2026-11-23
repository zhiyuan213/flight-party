import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {createAvatar,resolveAvatar} from '../dist/avatar.js';
import {playerCard} from '../dist/table/presentation.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const boot = read('dist/table/intro-boot.js');
const presentation = read('dist/table/presentation.js');
const html = read('dist/table/index.html');
const table = read('dist/table/table.js');

/* Run the first-paint helper against a minimal DOM. The helper is a plain
   synchronous script (not a module), so a slice plus Function is the lightest
   way to exercise it without pulling in the whole boot sequence. */
function loadHelper() {
  const start = boot.indexOf('  window.__joyflockAvatar=function');
  const fn = boot.indexOf('window.__joyflockAvatar=function');
  const end = boot.indexOf('\n  };', fn);
  assert.ok(start >= 0 && fn >= start && end > fn, 'avatar helper is present in the boot script');
  const source = boot.slice(start, end + '\n  };'.length);
  const win = {__joyflockAvatarDisplay:{create:createAvatar}};
  return new Function('window', source + '\nreturn window.__joyflockAvatar;')(win);
}

function fakeElement(tag) {
  return {
    tagName: tag, className: '', alt: '', style: {}, children: [], parentNode: null, errorHandlers: [],
    append(child) { this.children.push(child); child.parentNode = this; },
    appendChild(child) { this.append(child); return child; },
    replaceChild(next, old) {
      const i = this.children.indexOf(old);
      if (i >= 0) this.children[i] = next;
      next.parentNode = this; old.parentNode = null; return old;
    },
    addEventListener(type, handler) { if (type === 'error') this.errorHandlers.push(handler); }
  };
}
const fakeDoc = {createElement: tag => fakeElement(tag)};

test('legacy system avatars and guests paint the default expression without an API request', () => {
  const avatar = loadHelper();
  for (const [index, position] of [[0, '0 0'], [1, '100% 0'], [2, '0 100%'], [3, '100% 100%']]) {
    const node = avatar(fakeDoc, '/api/avatars/system/' + index, 9);
    assert.equal(node.tagName, 'span', 'no <img> is created for a system avatar');
    assert.equal(node.className, 'seat-avatar');
    assert.match(node.style.backgroundImage, /\/assets\/shop\/avatars-v4\/avatar-starling\.svg/);
    assert.equal(node.style.backgroundSize, 'cover');
    assert.equal(node.style.backgroundPosition, 'center');
  }
  const fallback = avatar(fakeDoc, '', 6);
  assert.equal(fallback.tagName, 'span', 'missing URLs fall back to the default face');
  assert.equal(fallback.style.backgroundPosition, 'center');
});

test('custom uploads still use the API and swap to Happy Smile on error', () => {
  const avatar = loadHelper();
  const url = '/api/avatars/123e4567-e89b-12d3-a456-426614174000';
  const image = avatar(fakeDoc, url, 1);
  assert.equal(image.tagName, 'img');
  assert.equal(image.src, url);
  assert.equal(image.errorHandlers.length, 1, 'one error handler is attached');
  const shell = fakeElement('span');
  shell.append(image);
  image.errorHandlers[0]();
  assert.equal(shell.children[0].tagName, 'span');
  assert.equal(shell.children[0].style.backgroundPosition, 'center');
  assert.ok(shell.children[0].style.backgroundImage.includes(resolveAvatar()));
  assert.equal(image.parentNode, null);
});

test('room cards use each profile and only an identified signed-in self uses local equipment',()=>{
  const previous=globalThis.__joyflockShop;
  globalThis.__joyflockShop={getState:()=>({equipped:{avatar:'avatar-crown'}})};
  const image=profile=>playerCard(fakeDoc,{name:'Player',...profile},0,false).children[0].children[0].style.backgroundImage;
  try{
    assert.match(image({isSelf:true,signedIn:true}),/avatar-crown\.svg/);
    assert.match(image({isSelf:true,signedIn:false}),/avatar-starling\.svg/);
    assert.match(image({isSelf:false,signedIn:true}),/avatar-starling\.svg/);
    assert.match(image({avatarId:'avatar-cloudy',isSelf:false,signedIn:true}),/avatar-cloudy\.svg/);
  }finally{if(previous===undefined)delete globalThis.__joyflockShop;else globalThis.__joyflockShop=previous;}
});

test('the leaderboard row builder and seat cards share the helper', () => {
  assert.match(boot, /shell\.append\(window\.__joyflockAvatar\(doc,row,index\)\)/);
  assert.ok(!boot.includes("img.src=row.avatarUrl"), 'the row builder must not request the API directly');
  assert.match(presentation, /const image=createAvatar\(document,profile\)/);
  assert.match(presentation, /import \{createAvatar\} from '\.\.\/avatar\.js/);
  assert.ok(!presentation.includes('/api/avatars/system/'),'standalone hosts use the same expression resolver');
  assert.ok(html.indexOf('/avatar-display.js?')<html.indexOf('./intro-boot.js?'),'first paint loads the shared resolver first');
});

test('all shipped expression choices resolve to actual SVG files and old CSS portraits are retired', () => {
  for(const id of ['starling','cloudy','owl','bear','rocket','luna','fox','bot','octo','crown','bob','ponytail','buns','waves','blossom','beret']){
    const url=resolveAvatar({avatarId:'avatar-'+id});
    assert.ok(url.includes('/avatar-'+id+'.svg'), 'the resolver preserves the requested avatar instead of silently falling back');
    assert.match(read('dist'+url.split('?')[0]),/<svg/);
  }
  for(const path of ['dist/visual-v2.css','dist/visual-v5.css','dist/visual-v7.css','dist/reaction-preview.css']){
    const css=read(path);assert.ok(!/assets\/avatars(?:-v5)?\.png/.test(css),path);
  }
});

test('touched assets share one freshly bumped version tag', () => {
  const tags = [
    html.match(/src="table\.js\?v=([^"'&]+)/)?.[1],
    html.match(/intro-boot\.js\?v=([^"'&]+)/)?.[1],
    html.match(/table-home-clean\.css\?v=([^"'&]+)/)?.[1]
  ];
  assert.ok(tags.every(Boolean));
  assert.equal(new Set(tags).size, 1, 'table.js / intro-boot.js / standings CSS must agree');
  assert.notEqual(tags[0], '20261110-nojoin1', 'the new code needs a fresh cache key');
  assert.match(table, /presentation\.js\?v=([^"'&]+)/);
  assert.equal(table.match(/presentation\.js\?v=([^"'&]+)/)[1], tags[0]);
});
