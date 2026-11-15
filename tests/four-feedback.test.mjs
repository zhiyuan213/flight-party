import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {start,move} from '../dist/table/grid-rules.js';
import {analyzeFourConnections,attachFourFeedback} from '../dist/table/four-feedback.js';

const horizontal=[0,6,1,6,2,5,3];
const vertical=[0,1,0,1,0,1,0];
const diagonal=[0,1,1,2,4,2,2,3,4,3,5,3,3];
const play=columns=>columns.reduce((state,column)=>move(state,state.turn,column),start('four'));
const ordered=values=>[...values].sort((a,b)=>a-b);

test('two and three consecutive own counters light only their connected cells',()=>{
  const two=analyzeFourConnections(play([0,6,1]));
  assert.equal(two.chains.length,42);assert.equal(two.chains[35],2);assert.equal(two.chains[36],2);
  assert.equal(two.chains[41],0,'an isolated opposing counter does not become a chain');
  assert.deepEqual(two.winningCells,[]);
  const three=analyzeFourConnections(play([0,6,1,6,2]));
  for(const index of [35,36,37])assert.equal(three.chains[index],3);
  for(const index of [34,41])assert.equal(three.chains[index],2);
  assert.deepEqual(three.winningCells,[],'three in a row is not a win');
});

test('legal horizontal, vertical and both diagonal wins highlight the authoritative winning run',()=>{
  for(const [columns,expected] of [
    [horizontal,[35,36,37,38]],
    [vertical,[14,21,28,35]],
    [diagonal,[17,23,29,35]],
    [diagonal.map(column=>6-column),[17,25,33,41]]
  ]){
    const state=play(columns),before=JSON.stringify(state);
    assert.equal(state.winner,1);assert.equal(state.over,true);
    Object.freeze(state.cells);Object.freeze(state);
    const result=analyzeFourConnections(state);
    assert.deepEqual(ordered(result.winningCells),expected);
    assert.ok(result.lines.some(line=>line.player===1&&ordered(line.cells).join(',')===expected.join(',')));
    assert.equal(JSON.stringify(state),before,'visual analysis cannot change the actual game state');
  }
});

test('row edges never wrap and no visual pattern invents a game result',()=>{
  const state=start('four');state.cells[6]=state.cells[7]=1;
  assert.deepEqual(analyzeFourConnections(state).lines,[],'adjacent array entries across rows are not neighbours');
  state.cells.fill(0);for(const index of [35,36,37,38,39])state.cells[index]=1;
  const open=analyzeFourConnections(state);assert.equal(open.chains[37],5);
  assert.deepEqual(open.winningCells,[],'the renderer waits for the rules to report a win');
  assert.deepEqual(analyzeFourConnections({...state,over:true,winner:0}).winningCells,[],'a draw stays a draw');
  assert.deepEqual(analyzeFourConnections({...state,over:true,winner:2}).winningCells,[],'the losing color never receives the win halo');
  assert.deepEqual(ordered(analyzeFourConnections({...state,over:true,winner:1}).winningCells),[35,36,37,38,39]);
});

test('intersecting runs keep the longest strength without mixing player colors',()=>{
  const state=start('four');for(const index of [23,30,35,36,37])state.cells[index]=1;
  state.cells[38]=2;state.cells[39]=2;
  const result=analyzeFourConnections(state);
  assert.equal(result.chains[37],3);assert.equal(result.lines.filter(line=>line.player===1&&line.cells.length===3).length,2);
  assert.equal(result.chains[38],2);assert.equal(result.chains[39],2);
  assert.deepEqual(result.winningCells,[]);
});

function dom(reduced=false){
  const priorMedia=globalThis.matchMedia,priorResize=globalThis.ResizeObserver;
  globalThis.matchMedia=()=>({matches:reduced});
  const observers=[];
  globalThis.ResizeObserver=class {constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}};
  function element(tag='div',bounds={x:0,y:0,width:400,height:330}){
    const classes=new Set(),listeners=new Map(),attributes=new Map(),children=[];
    const node={tag,dataset:{},children,parentNode:null,ownerDocument:null,
      classList:{add:(...names)=>names.forEach(name=>classes.add(name)),remove:(...names)=>names.forEach(name=>classes.delete(name)),
        contains:name=>classes.has(name),toggle(name,on){if(on===undefined)on=!classes.has(name);on?classes.add(name):classes.delete(name);return on;}},
      style:{setProperty(){}},setAttribute:(name,value)=>attributes.set(name,String(value)),
      getAttribute:name=>attributes.get(name)??null,
      append(...nodes){for(const child of nodes){child.parentNode=node;children.push(child);}},
      replaceChildren(...nodes){children.splice(0);node.append(...nodes);},
      remove(){if(node.parentNode){const siblings=node.parentNode.children;siblings.splice(siblings.indexOf(node),1);node.parentNode=null;}},
      getBoundingClientRect:()=>({...bounds,left:bounds.x,top:bounds.y,right:bounds.x+bounds.width,bottom:bounds.y+bounds.height}),
      addEventListener(name,fn){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},
      removeEventListener(name,fn){listeners.get(name)?.delete(fn);},
      emit(name,detail){for(const fn of listeners.get(name)||[])fn({detail});},
      listenerCount:name=>listeners.get(name)?.size||0};
    Object.defineProperty(node,'className',{get:()=>[...classes].join(' '),set:value=>{classes.clear();String(value).split(/\s+/).filter(Boolean).forEach(name=>classes.add(name));}});
    return node;
  }
  const doc=Object.assign(element('document'),{hidden:false,createElement:tag=>element(tag),createElementNS:(_ns,tag)=>element(tag)});
  const board=element(),panel=element();board.ownerDocument=doc;panel.ownerDocument=doc;
  let cells=[];board.querySelectorAll=()=>cells;
  function render(state){cells=state.cells.map((value,index)=>{const cell=element('button',{x:30+index%7*44,y:30+Math.floor(index/7)*44,width:36,height:36});cell.dataset.value=String(value);return cell;});}
  return {board,panel,doc,observers,render,get cells(){return cells;},
    linked:()=>cells.flatMap((cell,index)=>cell.classList.contains('four-linked')?[index]:[]),
    winning:()=>cells.flatMap((cell,index)=>cell.classList.contains('four-winning')?[index]:[]),
    restore(){if(priorMedia===undefined)delete globalThis.matchMedia;else globalThis.matchMedia=priorMedia;if(priorResize===undefined)delete globalThis.ResizeObserver;else globalThis.ResizeObserver=priorResize;}};
}

test('the final counter cannot glow or celebrate before its actual settled event',()=>{
  const env=dom(),wins=[];try{
    const update=attachFourFeedback(env.board,env.panel,{onWin:result=>wins.push(result)});
    const prior=play(horizontal.slice(0,-1)),finished=play(horizontal);
    env.render(prior);update(prior,true,'match-1');
    assert.deepEqual(env.linked().filter(index=>prior.cells[index]===1),[35,36,37]);
    env.render(finished);env.board._fourDropAnimating=true;update(finished,true,'match-1');
    assert.deepEqual(env.winning(),[]);assert.equal(wins.length,0);
    assert.equal(env.cells[38].classList.contains('four-linked'),false,'the still-falling final counter stays unlit');
    env.board.emit('four:settled',{state:prior});assert.equal(wins.length,0,'stale settled events are ignored');
    env.board._fourDropAnimating=false;env.board.emit('four:settled',{state:finished});
    assert.deepEqual(env.winning(),[35,36,37,38]);assert.equal(wins.length,1);
    assert.equal(env.board.classList.contains('four-victory'),true);
    assert.deepEqual(ordered(wins[0].cells),[35,36,37,38]);
    env.render(finished);update(finished,true,'match-1');env.board.emit('four:settled',{state:finished});
    assert.equal(wins.length,1,'DOM rebuilds and duplicate notifications never replay the celebration');
    assert.deepEqual(env.winning(),[35,36,37,38]);
    update(finished,false,'match-1');
    assert.deepEqual(env.winning(),[]);assert.deepEqual(env.linked(),[]);
    assert.ok(env.panel.children.every(layer=>layer.children.length===0));
    update.dispose();assert.equal(env.panel.children.length,0);assert.equal(env.board.listenerCount('four:settled'),0);
    assert.equal(env.doc.listenerCount('visibilitychange'),0);
    assert.ok(env.observers.every(observer=>observer.disconnected));
  }finally{env.restore();}
});

test('an initially finished snapshot highlights quietly and reset prevents stale celebrations',()=>{
  const env=dom(),wins=[];try{
    const update=attachFourFeedback(env.board,env.panel,{onWin:result=>wins.push(result)}),finished=play(vertical);
    env.render(finished);update(finished,true,'reconnected');env.board.emit('four:settled',{state:finished});
    assert.deepEqual(env.winning(),[14,21,28,35]);assert.equal(wins.length,0);
    const celebration=env.panel.children.find(node=>node.classList.contains('four-celebration'));
    assert.equal(celebration.children.length,0,'reconnect does not fire a particle burst');
    update.reset();env.board.emit('four:settled',{state:finished});assert.equal(wins.length,0);assert.deepEqual(env.winning(),[]);
    env.render(start('four'));update(start('four'),true,'new-match');assert.deepEqual(env.winning(),[]);
    update.dispose();
  }finally{env.restore();}
});

test('reduced motion keeps the winning highlight and callback without confetti animation',()=>{
  const env=dom(true),wins=[];try{
    const update=attachFourFeedback(env.board,env.panel,{onWin:result=>wins.push(result)});
    const prior=play(vertical.slice(0,-1)),finished=play(vertical);
    env.render(prior);update(prior);env.render(finished);update(finished);
    assert.deepEqual(env.winning(),[14,21,28,35]);assert.equal(wins.length,1);
    assert.equal(env.panel.children.find(node=>node.classList.contains('four-celebration')).children.length,0);
    update.dispose();
  }finally{env.restore();}
});

test('returning from a hidden tab settles a cancelled drop once and never a reset match',()=>{
  const env=dom(),wins=[];try{
    const update=attachFourFeedback(env.board,env.panel,{onWin:result=>wins.push(result)});
    const prior=play(horizontal.slice(0,-1)),finished=play(horizontal);
    env.render(prior);update(prior);env.render(finished);env.board._fourDropAnimating=true;update(finished);
    env.doc.hidden=true;env.board._fourDropAnimating=false;env.doc.emit('visibilitychange');
    assert.equal(wins.length,0);assert.deepEqual(env.winning(),[]);
    env.doc.hidden=false;env.doc.emit('visibilitychange');env.doc.emit('visibilitychange');
    assert.equal(wins.length,1);assert.deepEqual(env.winning(),[35,36,37,38]);
    update.reset();env.render(start('four'));update(start('four'),true,'new-match');env.doc.emit('visibilitychange');
    assert.equal(wins.length,1);assert.deepEqual(env.winning(),[]);
    update.dispose();
  }finally{env.restore();}
});

test('a final game update received while hidden preserves its one celebration until visible',()=>{
  const env=dom(),wins=[];try{
    const update=attachFourFeedback(env.board,env.panel,{onWin:result=>wins.push(result)});
    const prior=play(vertical.slice(0,-1)),finished=play(vertical);
    env.render(prior);update(prior,true,'background-match');
    env.doc.hidden=true;env.render(finished);
    update(finished,true,'background-match');update(finished,true,'background-match');
    assert.equal(wins.length,0,'a hidden final update does not consume or play the result callback');
    assert.equal(env.panel.children.find(node=>node.classList.contains('four-celebration')).children.length,0);
    env.doc.hidden=false;env.doc.emit('visibilitychange');
    assert.equal(wins.length,1);assert.deepEqual(env.winning(),[14,21,28,35]);
    update(finished,true,'background-match');env.doc.emit('visibilitychange');
    assert.equal(wins.length,1,'repeat render and visibility events cannot replay the result');
    update.dispose();
  }finally{env.restore();}
});

test('local Four results use a per-game sound key and show the settled board for 1600ms',()=>{
  const table=readFileSync(new URL('../dist/table/table.js',import.meta.url),'utf8');
  const shell=readFileSync(new URL('../dist/table/pool-shell.js',import.meta.url),'utf8');
  for(const source of [table,shell]){
    assert.match(source,/'local-four-'\s*\+\s*options\.generation/,
      'same-length wins in consecutive local games need different result sound keys');
    assert.match(source,/options\.room\?\.id\s*\|\|\s*localKey/,
      'online results continue using their authoritative room identity');
  }
  assert.match(table,/const options=\{[^}]*\bgeneration\b/);
  assert.match(table,/if\(usesOpening\)updateFourResult\(options\)/);
  assert.match(shell,/previewDuration\s*=\s*connectFour\s*\?\s*1600\s*:\s*3000/);
  const revealStart=shell.indexOf('const reveal=now=>');
  const reveal=shell.slice(revealStart,shell.indexOf('\nfunction chatRoomKey',revealStart));
  assert.ok(reveal.indexOf('_fourDropAnimating')<reveal.indexOf('celebrationStartedAt=now'),
    'the result pause starts only after the real drop is no longer animating');
  assert.match(reveal,/now-celebrationStartedAt<previewDuration/);
});
