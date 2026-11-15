import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extraAvatars, renderExtraAvatar} from '../scripts/build-extra-avatars.mjs';

test('six additional hairstyles ship reproducible vector art and the original shared face base', () => {
  assert.deepEqual(extraAvatars.map(x => x.id), [
    'avatar-bob', 'avatar-ponytail', 'avatar-buns', 'avatar-waves', 'avatar-blossom', 'avatar-beret'
  ]);
  for (const avatar of extraAvatars) {
    const source = readFileSync(new URL(`../dist/assets/shop/avatars-v4/${avatar.id}.svg`, import.meta.url), 'utf8');
    assert.equal(source, renderExtraAvatar(avatar), `${avatar.id} is reproducible`);
    assert.match(source, /<rect x="16" y="16" width="224" height="224" rx="27" fill="#F3D2AD"\/>/);
    assert.match(source, /aria-labelledby="title desc"/);
    assert.doesNotMatch(source, /<image|https?:\/\/(?!www\.w3\.org)|<script|<animate/,
      'standalone static vector faces do not require remote or animated resources');
  }
  assert.equal(new Set(extraAvatars.map(x => x.hair)).size, 6, 'each hairstyle is distinct');
});
