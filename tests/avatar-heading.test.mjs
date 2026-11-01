import test from 'node:test';
import assert from 'node:assert/strict';
import {safeAvatar,avatarStyle} from '../dist/avatar.js';
import {planeHeading} from '../dist/fallback.js';
import {coord,FINISH} from '../dist/engine.js';
test('custom avatar only accepts same-origin opaque image identifiers',()=>{
 const path='/api/avatars/12345678-1234-1234-1234-123456789abc';assert.equal(safeAvatar(path),path);assert.ok(avatarStyle(path).includes('background-size:cover'));
 for(const invalid of ['https://tracker.test/photo','javascript:alert(1)',"/api/avatars/' onerror='alert(1)",'/api/avatars/../auth'])assert.equal(avatarStyle(invalid),'');
});
test('plane heading agrees with horizontal route travel for all factions',()=>{
 for(let c=0;c<4;c++)for(let p=0;p<FINISH-1;p++){const a=coord(c,p),b=coord(c,p+1);if(a[0]!==b[0])assert.equal(planeHeading(c,0,p),b[0]<a[0]?1:0);}
});
