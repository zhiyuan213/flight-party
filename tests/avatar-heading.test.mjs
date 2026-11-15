import test from 'node:test';
import assert from 'node:assert/strict';
import {safeAvatar,avatarStyle,resolveAvatar} from '../dist/avatar.js';
import {planeHeading} from '../dist/fallback.js';
import {coord,FINISH} from '../dist/engine.js';
test('custom avatar only accepts same-origin opaque image identifiers',()=>{
 const path='/api/avatars/12345678-1234-1234-1234-123456789abc';assert.equal(safeAvatar(path),path);assert.ok(avatarStyle(path).includes('background-size:cover'));
 for(const invalid of ['https://tracker.test/photo','javascript:alert(1)',"/api/avatars/' onerror='alert(1)",'/api/avatars/../auth']){
  assert.equal(safeAvatar(invalid),null);
  assert.equal(avatarStyle(invalid),avatarStyle());
 }
});

test('expression resolver keeps guests and opponents independent of local equipment',()=>{
 const previous=globalThis.__joyflockShop;
 globalThis.__joyflockShop={getState:()=>({equipped:{avatar:'avatar-crown'}})};
 try{
  const defaultUrl=resolveAvatar();
  assert.match(defaultUrl,/avatars-v4\/avatar-starling\.svg/);
  for(const value of ['/api/avatars/system/0','/api/avatars/system/3','',null])assert.equal(resolveAvatar(value),defaultUrl);
  assert.equal(resolveAvatar({isSelf:true,signedIn:false}),defaultUrl,'guest must not use a previous account selection');
  assert.equal(resolveAvatar({isSelf:true,signedIn:false,avatarId:'avatar-fox',avatarUrl:'/assets/shop/avatars-v4/avatar-crown.svg'}),defaultUrl,'logout ignores the prior profile selection');
  assert.equal(resolveAvatar({signedIn:true}),defaultUrl,'signed-in opponent must not borrow local equipment');
  assert.match(resolveAvatar({avatarId:'avatar-fox',signedIn:true}),/avatar-fox\.svg/);
  assert.match(resolveAvatar({isSelf:true,signedIn:true}),/avatar-crown\.svg/);
  assert.equal(resolveAvatar({avatarId:'avatar-invalid'}),defaultUrl);
  const uploaded='/api/avatars/12345678-1234-1234-1234-123456789abc';
  assert.equal(resolveAvatar({isSelf:true,signedIn:false,avatarUrl:uploaded}),defaultUrl,'logout also ignores a stale account upload');
  assert.equal(resolveAvatar({isSelf:true,signedIn:true,avatarUrl:uploaded}),uploaded,'real upload remains authoritative');
 }finally{if(previous===undefined)delete globalThis.__joyflockShop;else globalThis.__joyflockShop=previous;}
});
test('plane heading agrees with horizontal route travel for all factions',()=>{
 for(let c=0;c<4;c++)for(let p=0;p<FINISH-1;p++){const a=coord(c,p),b=coord(c,p+1);if(a[0]!==b[0])assert.equal(planeHeading(c,0,p),b[0]<a[0]?1:0);}
});
