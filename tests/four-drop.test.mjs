import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../dist/table/four-drop.js',import.meta.url),'utf8')
  .replace(/^import .*;\r?\n/gm,'').replace(/export function /g,'function ');
const empty=()=>({game:'four',cells:Array(42).fill(0),moves:0,turn:1,over:false,winner:0});
function add(state,index,player=state.turn){
  const next={...state,cells:state.cells.slice(),moves:state.moves+1,turn:3-player};next.cells[index]=player;return next;
}
function harness({reduced=false}={}){
  let nextFrame=1;const frames=new Map(),animations=[],sounds=[],events=[],decorated=[];
  const media={matches:reduced,handlers:new Set(),addEventListener(_,fn){this.handlers.add(fn);},removeEventListener(_,fn){this.handlers.delete(fn);}};
  function eventTarget(){const handlers=new Map();return {
    addEventListener(type,fn){if(!handlers.has(type))handlers.set(type,new Set());handlers.get(type).add(fn);},
    removeEventListener(type,fn){handlers.get(type)?.delete(fn);},
    dispatchEvent(event){for(const fn of handlers.get(event.type)||[])fn(event);return true;}
  };}
  function element(tag='div',index=null){
    const classes=new Set(),ownAnimations=[];
    return {...eventTarget(),tag,dataset:{value:'0',position:String(index%7)},children:[],hidden:false,isConnected:true,
      classList:{add:value=>classes.add(value),remove:value=>classes.delete(value),contains:value=>classes.has(value),
        toggle(value,force){if(force)classes.add(value);else classes.delete(value);}},
      style:{setProperty(name,value){this[name]=value;}},setAttribute(){},append(...children){this.children.push(...children);},remove(){this.removed=true;},
      getBoundingClientRect(){return index===null?{left:0,top:tag==='board'?100:0,width:280,height:240}:
        {left:(index%7)*40,top:100+Math.floor(index/7)*40,width:40,height:40};},
      getAnimations:()=>ownAnimations.filter(a=>!a.cancelled),
      animate(keyframes,options){
        let resolve,reject;const finished=new Promise((a,b)=>{resolve=a;reject=b;});
        const animation={keyframes,options,finished,currentTime:null,cancelled:false,
          cancel(){this.cancelled=true;reject(Error('cancelled'));},complete(){this.currentTime=options.duration;resolve();}};
        // Hand animations are intentionally not awaited by the real code.
        finished.catch(()=>{});ownAnimations.push(animation);animations.push(animation);return animation;
      }};
  }
  const board=element('board'),panel=element(),document={...eventTarget(),hidden:false,createElement:element};
  board.cellList=Array.from({length:42},(_,i)=>element('cell',i));board.querySelectorAll=()=>board.cellList;
  const dispatch=board.dispatchEvent;board.dispatchEvent=event=>{events.push(event);return dispatch(event);};
  const window={...eventTarget()};
  let observer;
  const sandbox={document,window,matchMedia:()=>media,CustomEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}},
    ResizeObserver:class{constructor(fn){this.fn=fn;observer=this;}observe(){}disconnect(){this.disconnected=true;}},
    requestAnimationFrame:fn=>{const id=nextFrame++;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
    decoratePiece:(node,player)=>{decorated.push({node,player});node.dataset.cosmetic='retained';},prepareFourAudio(){},
    createFourDropSound(){
      const calls=[];const sound={calls,cancelled:false,
        release(){if(!this.cancelled)calls.push('release');},land(){if(!this.cancelled)calls.push('land');},
        settle(){if(!this.cancelled)calls.push('settle');},cancel(){this.cancelled=true;}};sounds.push(sound);return sound;
    }};
  runInNewContext(source+'\nglobalThis.attach=attachFourDrop;',sandbox);
  const update=sandbox.attach(board,panel);
  const paint=(state,allowed=true,playing=true,{rebuild=false}={})=>{
    if(rebuild)board.cellList=Array.from({length:42},(_,i)=>element('cell',i));
    board.cellList.forEach((cell,i)=>{cell.dataset.value=String(state.cells[i]);});update(state,allowed,playing);
  };
  const flight=()=>animations.findLast(a=>a.keyframes.length===4&&!a.cancelled);
  const frame=time=>{
    const active=flight();if(active)active.currentTime=time;
    const work=[...frames.values()];frames.clear();for(const fn of work)fn(12345678);
  };
  return {board,panel,document,window,media,sounds,events,decorated,animations,frames,observer,update,paint,flight,frame,
    eventNames:()=>events.map(event=>event.type),reduce(){media.matches=true;for(const fn of media.handlers)fn();}};
}

test('sound and events follow first-contact and bounce endpoints on the actual animation clock',async()=>{
  const h=harness(),start=empty(),state=add(start,38);h.paint(start);h.paint(state);
  const done=h.board._fourDropDone,flight=h.flight(),duration=flight.options.duration;
  const contact=flight.keyframes[1].offset*duration;
  assert.equal(h.board._fourDropAnimating,true);assert.deepEqual(h.sounds[0].calls,[]);
  h.frame(null);assert.deepEqual(h.sounds[0].calls,[],'pending animation does not play early');
  h.frame(0);assert.deepEqual(h.sounds[0].calls,['release']);
  h.frame(contact-.001);h.frame(contact-.001);
  assert.deepEqual(h.eventNames(),['four:release'],'paused animation cannot land via wall-clock time');
  h.frame(contact);assert.deepEqual(h.sounds[0].calls,['release','land']);
  assert.equal(h.board._fourDropAnimating,true,'first contact still has a rebound to finish');
  assert.equal(h.board.cellList[38].classList.contains('four-drop-hidden'),true);
  h.paint({...state,cells:state.cells.slice()},true,true,{rebuild:true});
  assert.equal(h.board.cellList[38].classList.contains('four-drop-hidden'),true,'same polling snapshot keeps the newly rendered settled cell hidden');
  h.frame(duration-.001);assert.deepEqual(h.eventNames(),['four:release','four:land']);
  h.frame(duration);const result=await done;
  assert.deepEqual(h.sounds[0].calls,['release','land','settle']);
  assert.deepEqual(h.eventNames(),['four:release','four:land','four:settled']);
  assert.equal(result.cancelled,false);assert.equal(h.board._fourDropAnimating,false);
  assert.equal(h.board.cellList[38].classList.contains('four-drop-hidden'),false);
  assert.equal(h.events[1].detail.index,38);assert.equal(h.events[1].detail.player,1);
  assert.deepEqual(Array.from(h.events[2].detail.state.cells),state.cells);
  state.cells[38]=2;assert.equal(h.events[2].detail.state.cells[38],1,'event snapshot is independent of mutable caller state');
  assert.ok(h.decorated.some(({player})=>player===1),'dropping pieces retain cosmetic decoration');
});

test('first snapshot, unchanged snapshots and multi-move reconnects never replay historical drops',()=>{
  const h=harness(),first=add(add(empty(),35),36);h.paint(first);h.paint({...first,cells:first.cells.slice()});
  const skipped=add(add(first,37),38);h.paint(skipped);h.paint(skipped);
  assert.equal(h.sounds.length,0);assert.deepEqual(h.eventNames(),[]);
  const next=add(skipped,39);h.paint(next);assert.equal(h.sounds.length,1);
  h.frame(0);h.paint(next);h.frame(0);assert.deepEqual(h.sounds[0].calls,['release']);
});

test('reset resolves the old drop, restores the counter and never fires late contacts',async()=>{
  const h=harness(),start=empty();h.paint(start);h.paint(add(start,35));h.frame(0);
  const done=h.board._fourDropDone,old=h.flight();h.paint(empty());
  assert.equal((await done).cancelled,true);assert.equal(h.board._fourDropAnimating,false);
  assert.equal(h.board.cellList[35].classList.contains('four-drop-hidden'),false);
  old.complete();h.frame(9999);await Promise.resolve();
  assert.deepEqual(h.eventNames(),['four:release']);assert.equal(h.sounds[0].cancelled,true);
  h.paint(add(start,36));assert.equal(h.sounds.length,2,'reset establishes a fresh empty baseline');
});

test('leaving, hiding or detaching cancels without a settlement and cannot strand the awaiter',async()=>{
  for(const cause of ['leave','hidden','detached','dispose']){
    const h=harness(),state=add(empty(),35);h.paint(empty());h.paint(state);h.frame(0);
    const done=h.board._fourDropDone;
    if(cause==='leave')h.paint(state,false,false);
    if(cause==='hidden'){h.document.hidden=true;h.document.dispatchEvent({type:'visibilitychange'});}
    if(cause==='detached'){h.board.isConnected=false;h.frame(250);}
    if(cause==='dispose')h.update.dispose();
    assert.equal((await done).cancelled,true,cause);assert.equal(h.board._fourDropAnimating,false,cause);
    assert.deepEqual(h.eventNames(),['four:release'],cause);assert.equal(h.frames.size,0,cause);
    if(cause==='dispose')assert.equal(h.observer.disconnected,true);
  }
});

test('reduced motion settles a new counter immediately with exactly one contact sound',async()=>{
  const h=harness({reduced:true}),state=add(empty(),35);h.paint(empty());h.paint(state);
  assert.deepEqual(h.eventNames(),['four:land','four:settled']);assert.deepEqual(h.sounds[0].calls,['land']);
  assert.equal(h.board._fourDropAnimating,false);assert.equal((await h.board._fourDropDone).cancelled,false);
  assert.equal(h.animations.length,0);h.paint(state);assert.equal(h.sounds.length,1);
});

test('turning on reduced motion finishes an active drop without scheduling a phantom rebound',async()=>{
  const h=harness();h.paint(empty());h.paint(add(empty(),35));h.frame(0);h.reduce();
  assert.deepEqual(h.sounds[0].calls,['release','land']);
  assert.deepEqual(h.eventNames(),['four:release','four:land','four:settled']);
  assert.equal((await h.board._fourDropDone).cancelled,false);assert.equal(h.frames.size,0);
});

test('a replacement or a skipped board cancels the stale flight without assigning it the newer result',async()=>{
  const h=harness(),one=add(empty(),35);h.paint(empty());h.paint(one);h.frame(0);const done=h.board._fourDropDone;
  const three=add(add(one,36),37);h.paint(three);
  assert.equal((await done).cancelled,true);assert.equal(h.sounds.length,1);
  assert.deepEqual(h.eventNames(),['four:release']);assert.equal(h.board._fourDropAnimating,false);
});
