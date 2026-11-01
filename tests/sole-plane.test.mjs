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

test('the render path never creates a sole-plane button across roll, choose and movement frames',()=>{
 const markup=[],selected=[],nodes=new Map();
 function node(id){if(!nodes.has(id)){let html='';nodes.set(id,{disabled:false,textContent:'',get innerHTML(){return html;},set innerHTML(value){html=value;if(id==='piece-buttons')markup.push(value);}});}return nodes.get(id);}
 const player={color:0,name:'You',type:'human',pieces:[57,12]};
 const game={current:player,active:[player],round:1,party:false,phase:'roll',legal(){return this.phase==='choose'?player.pieces.map((p,i)=>p<57?i:-1).filter(i=>i>=0):[];}};
 const context=vm.createContext({game,FINISH:57,PALETTE:[0x4488ff],diceBusy:false,document:{querySelector:()=>({style:{setProperty(){}}}),querySelectorAll:()=>[]},$:node,playerCard:()=>'',reactions:{sync(){}},syncTakeoverPreview(){},t:en=>en,scene:{setSelectable:keys=>selected.push(keys)},choose(){}});
 const render=vm.runInContext('('+app.slice(app.indexOf('function render(){'),app.indexOf('function updateClock('))+')',context);
 for(const phase of ['roll','choose','animating','choose']){game.phase=phase;context.diceBusy=true;render();context.diceBusy=false;render();}
 assert.ok(markup.every(value=>value===''));assert.ok(selected.every(keys=>keys.length===0));
 player.pieces=[2,12];game.phase='choose';render();assert.equal((markup.at(-1).match(/data-piece=/g)||[]).length,2);
});
