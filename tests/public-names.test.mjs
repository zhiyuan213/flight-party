import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('authoritative game view prefers public nicknames for self and other players',()=>{
 const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('function authoritativeView('),source.indexOf('async function applyOnlineSnapshot('));
 const context=vm.createContext({Game:class {}});vm.runInContext(fn,context);
 const state={players:[{seat:0,planes:[57,57],rank:3},{seat:1,planes:[57,57],rank:1},{seat:2,planes:[2,5],rank:4}],ranking:[1,0,2],turn:0,phase:'OVER'};
 const view=context.authoritativeView(state,{yourSeat:0,seats:[{index:0,displayName:'大卫',member:true,annualMember:true},{index:1,displayName:'Other <pilot>',member:false,annualMember:true},{index:2,bot:true}]});
 assert.equal(view.players[0].name,'大卫');assert.equal(view.players[1].name,'Other <pilot>');assert.equal(view.players[2].name,'Pilot 3');
 assert.equal(view.players[view.ranking[1]].name,'大卫');
 assert.equal(view.players[0].annualMember,true);
 assert.equal(view.players[1].annualMember,false,'an annual flag cannot grant access without active membership');
});

test('same-version room updates immediately remove annual eligibility without rebuilding game state',async()=>{
 const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('async function applyOnlineSnapshot('),source.indexOf("onlineSession.addEventListener('snapshot'"));
 const player={color:0,name:'大卫',member:true,annualMember:true,planeStyle:'obsidian2d'},game={players:[player]};let renders=0;
 const context=vm.createContext({onlineRoomId:'room',onlineVersion:4,game,screen:'play',render:()=>renders++});vm.runInContext(fn,context);
 await context.applyOnlineSnapshot({gameVersion:4,game:{players:[{}]},room:{roomId:'room',phase:'PLAYING',yourSeat:0,seats:[{index:0,displayName:'大卫',member:true,annualMember:false,planeStyle:'classic'}]}});
 assert.equal(game.players[0],player);assert.equal(player.member,true);assert.equal(player.annualMember,false);assert.equal(player.planeStyle,'classic');assert.equal(renders,1);
});
