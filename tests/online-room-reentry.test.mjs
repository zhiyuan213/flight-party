import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const fn=source.slice(source.indexOf('async function applyOnlineSnapshot(message){'),source.indexOf("onlineSession.addEventListener('snapshot',async event=>"));
/* applyOnlineSnapshot() is loaded as an import-stripped snippet; the custody
   clock and per-game reconnect hint are supplied by the real module graph. */
const custodyStubs={roomSnapshot:null,roomReceivedAt:0,custodyTicker:null,
 startCustodyClock:()=>{},localStorage:{setItem(){}},flightRoomKey:()=>'joyflock.online.room.flight',
 reconnectTarget:(game,roomId)=>({game,roomId}),
 /* A restored online match signals presence; the snippet harness stubs it. */
 reportFlightActivity:()=>{}};
function setup(screen='play'){
 const calls={close:0,shown:[],setGame:0};
 const scene={setSelectable(){},setGame(){calls.setGame++;},sync(){}};
 const context=vm.createContext({onlineMode:true,onlineRoomId:'room',onlineVersion:8,screen,game:{players:[]},social:{roomDialog:{open:true,close(){calls.close++;this.open=false;}}},scene,
 $:()=>({replaceChildren(){},disabled:false}),authoritativeView:()=>({phase:'roll',players:[],legal:()=>[]}),cancel(){},show(value){context.screen=value;calls.shown.push(value);},ensureScene:()=>true,drawDie(){},track(){},onlineMovement:()=>null,epoch:1,render(){},clearInterval(){},setInterval:()=>1,Date,Number,party:false,onlineTimer:null,...custodyStubs});
 vm.runInContext(fn,context);return{context,calls};
}
const snapshot={room:{roomId:'room',phase:'PLAYING',seats:[],origin:'QUICK',serverNow:new Date().toISOString()},game:{players:[]},gameVersion:8};
test('reopening a running room closes its blocking lobby even at the same game version',async()=>{const {context,calls}=setup();await context.applyOnlineSnapshot(snapshot);assert.equal(calls.close,1);assert.equal(context.screen,'play');assert.equal(calls.setGame,0);});
test('returning from homepage restores the same match without requiring a newer version',async()=>{const {context,calls}=setup('welcome');await context.applyOnlineSnapshot(snapshot);assert.equal(calls.close,1);assert.equal(context.screen,'play');assert.equal(calls.setGame,1);});
test('duplicate settled snapshots close the lobby without replaying the result screen',async()=>{const {context,calls}=setup('results');await context.applyOnlineSnapshot({...snapshot,room:{...snapshot.room,phase:'SETTLED'}});assert.equal(calls.close,1);assert.equal(context.screen,'results');assert.equal(calls.setGame,0);});
