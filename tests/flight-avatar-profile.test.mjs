import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const helper=source.slice(source.indexOf('function playerAvatarProfile('),source.indexOf('\nfunction render(){'));
function profile(player,{online=false,seat=0,account=null}={}){
  const sandbox={onlineMode:online,onlineSession:{room:{yourSeat:seat},identity:{account}},player};
  return runInNewContext(helper+'\nplayerAvatarProfile(player);',sandbox);
}

test('only the actual online seat can read the local signed-in avatar selection',()=>{
  const player=Object.freeze({color:2,type:'human',avatarUrl:'/api/avatars/system/0',avatarId:'avatar-bear'});
  const own=profile(player,{online:true,seat:2,account:{id:'viewer'}});
  assert.equal(own.isSelf,true);assert.equal(own.signedIn,true);assert.equal(own.avatarId,'avatar-bear');
  const other=profile(player,{online:true,seat:1,account:{id:'viewer'}});
  assert.equal(other.isSelf,false);assert.equal(other.signedIn,true);
  assert.equal(player.isSelf,undefined,'render metadata never mutates the authoritative player');
  assert.equal(profile(player,{online:true,seat:2}).signedIn,false,'anonymous own seat cannot use a stale equipped avatar');
});

test('local practice marks seat zero, not every human player, as the viewer',()=>{
  assert.equal(profile({color:0,type:'human'},{account:{id:'viewer'}}).isSelf,true);
  assert.equal(profile({color:1,type:'human'},{account:{id:'viewer'}}).isSelf,false);
  assert.equal(profile({color:2,type:'bot'},{account:{id:'viewer'}}).isSelf,false);
});
