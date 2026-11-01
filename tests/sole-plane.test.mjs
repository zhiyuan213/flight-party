import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Drive the actual local roll handler with a controllable animation promise.
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const handler=app.slice(app.indexOf('async function roll(auto=false)'),app.indexOf('async function chooseLocal('));
function fixture(legal){
 const moves=[];let settle;let timers=0;
 const game={phase:'roll',current:{type:'human'},roll(){this.phase='choose';return 4;},legal(){return legal;}};
 const context=vm.createContext({onlineMode:false,game,screen:'play',diceBusy:false,epoch:1,clock:null,seconds:0,fx:{unlock(){},roll(){}},die:{rollTo:()=>new Promise(resolve=>settle=resolve)},clearInterval(){},setInterval(){timers++;return 1;},syncDieLabel(){},render(){},updateClock(){},drawDie(){},chooseLocal:async piece=>{moves.push(piece);game.phase='animating';}});
 return {context,moves,roll:vm.runInContext('('+handler+')',context),settle:()=>settle(),timers:()=>timers};
}
test('sole remaining plane moves after the die settles without opening another choice timer',async()=>{
 const f=fixture([1]);const rolling=f.roll();assert.deepEqual(f.moves,[]);assert.equal(f.context.diceBusy,true);
 f.settle();await rolling;assert.deepEqual(f.moves,[1]);assert.equal(f.timers(),0);
});
test('canceling during the die animation cannot move a plane in a newer game',async()=>{
 const f=fixture([0]);const rolling=f.roll();f.context.epoch++;f.settle();await rolling;assert.deepEqual(f.moves,[]);
});
test('two legal planes still wait for the human to choose',async()=>{
 const f=fixture([0,1]);const rolling=f.roll();f.settle();await rolling;assert.deepEqual(f.moves,[]);assert.equal(f.timers(),1);
});
