import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const block=source.slice(source.indexOf('/* COMPUTER-GAME-LIFECYCLE'),source.indexOf('/* END COMPUTER-GAME-LIFECYCLE */'));
assert.ok(block.includes('function askLeave'),'lifecycle block is present in app.js');

function harness({screen='play',onlineMode=false,voteOpen=false}={}){
 const calls=[],nodes=new Map();
 const $=id=>{
  if(!nodes.has(id))nodes.set(id,{id,open:id==='vote-dialog'?voteOpen:false,disabled:true,textContent:'Match again',
   classList:{add:c=>calls.push(['classAdd',id,c]),contains:()=>false,toggle(){},remove(){}},
   showModal(){this.open=true;calls.push(['showModal',id]);},
   close(){this.open=false;calls.push(['close',id]);}});
  return nodes.get(id);
 };
 const context=vm.createContext({
  $,screen,onlineMode,game:{players:[],round:9},seats:[{type:'off'}],party:true,
  voteQueue:[1,2],votes:{peace:1},voteIndex:1,seconds:4,
  onlineTimer:123,onlineVersion:7,onlineRoomId:'room-1',
  roomSnapshot:null,hostedResult:false,localStorage:{removeItem:()=>calls.push('roomHintCleared')},
  flightRoomKey:()=>'joyflock.online.room.flight',clearNoScoreNotice:()=>calls.push('noScoreCleared'),
  social:{viewer:{name:'Tester'},setResult:v=>calls.push(['setResult',v]),liveResult:{status:'PENDING'}},
  onlineSession:{close:()=>calls.push('sessionClose'),leave:()=>{calls.push('sessionLeave');return Promise.resolve();}},
  cancel:()=>calls.push('cancel'),drawDie:(n,has)=>calls.push(['drawDie',n,has]),
  show:id=>calls.push(['show',id]),start:()=>calls.push('start'),
  t:(en)=>en,clearInterval:()=>calls.push('clearInterval')
 });
 vm.runInContext(block,context);
 return {context,calls,$};
}
const has=(calls,...values)=>calls.some(c=>Array.isArray(c)&&values.every((v,i)=>c[i]===v)||c===values[0]&&values.length===1);

test('a computer flight ends immediately on leave, with no confirmation and no leftover match',()=>{
 const {context,calls,$}=harness({voteOpen:true});
 context.askLeave();
 assert.ok(!has(calls,'showModal'),'no "keep flying?" prompt against computers');
 assert.ok(has(calls,'cancel'));
 assert.ok(has(calls,'show','welcome'));
 assert.equal(context.game,null,'the finished game object is dropped');
 assert.deepEqual(Array.from(context.voteQueue),[]);assert.deepEqual({...context.votes},{});assert.equal(context.voteIndex,0);assert.equal(context.seconds,15);
 assert.ok(has(calls,'close','vote-dialog'),'an in-progress vote dialog is closed');
 assert.ok(has(calls,'setResult',null));assert.equal(context.social.liveResult,null);
 assert.ok(has(calls,'drawDie',1,false),'the die is reset');
 assert.equal($('rematch').disabled,false);assert.equal($('rematch').textContent,'Fly again ↗');
 assert.ok(has(calls,'classAdd','result-save-panel','hidden'));
});

test('online matches still confirm before leaving; confirming closes and discards the room',()=>{
 const {context,calls}=harness({onlineMode:true});
 context.askLeave();
 assert.ok(has(calls,'showModal','confirm-dialog'),'real opponents still get a confirmation');
 assert.ok(!has(calls,'cancel'));assert.notEqual(context.game,null);
 context.leaveFlight();
 assert.ok(calls.includes('sessionClose'));assert.ok(has(calls,'clearInterval'));
 assert.equal(context.onlineMode,false);assert.equal(context.onlineVersion,-1);assert.equal(context.onlineRoomId,null);
 assert.ok(has(calls,'cancel'));assert.ok(has(calls,'show','welcome'));assert.equal(context.game,null);
});

test('leaving from results or the crew screen also discards the local flight',()=>{
 for(const screen of ['results','lobby']){
  const {context,calls}=harness({screen});
  context.askLeave();
  assert.ok(!has(calls,'showModal'));assert.ok(has(calls,'show','welcome'));assert.equal(context.game,null);
 }
});

test('Play computer always builds a fresh 1-human + 3-computer game',()=>{
 const {context,calls}=harness();
 for(let round=1;round<=2;round++){
  context.seats=[{type:'off'}];context.party=true;context.game={players:[],round:99};
  context.playComputer();
  assert.deepEqual(Array.from(context.seats,s=>s.type),['human','bot','bot','bot']);
  assert.equal(context.seats[0].name,'Tester');assert.equal(context.party,false);
  assert.equal(calls.filter(c=>c==='start').length,round,'every entry starts a new game');
  assert.ok(has(calls,'setResult',null),'previous result is cleared before the new game');
 }
 assert.match(source,/function start\(\)\{[^]*?game=new Game\(/, 'start() constructs a brand-new Game');
});

test('leaving is wired through one lifecycle handler, with no duplicate binding',()=>{
 assert.match(source,/\$\('confirm-leave'\)\.onclick=leaveFlight;/);
 assert.equal((source.match(/\$\('confirm-leave'\)\.onclick=/g)||[]).length,1,'only one leave handler');
 assert.match(source,/\$\('leave'\)\.onclick=askLeave;/);
 assert.match(source,/\$\('practice'\)\.onclick=playComputer;/);
 assert.ok(!source.includes("$('confirm-dialog').close();cancel();show('welcome');"),'old local-only leave handler is gone');
 assert.match(source,/const result=await onlineSession\.result\(\);\s*\/\*[^*]*\*\/\s*if\(!game\|\|generation!==epoch/,'a pending result cannot write into a discarded game');
});
