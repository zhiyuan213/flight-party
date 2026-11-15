import test from 'node:test';
import assert from 'node:assert/strict';
import {poolStart,poolMove,renderPool} from '../dist/table/pool.js';
import {move as gridMove} from '../dist/table/grid-rules.js';
import {TABLE_WIDTH,TABLE_HEIGHT,TABLE_PAD} from '../dist/table/pool-table.js';
import {
  PLACE_BASE,PLACE_LIMIT,CUE_MIN,CUE_MAX_X,CUE_MAX_Y,encodePoolPlace,decodePoolPlace,
  isPoolPlace,poolCueInHand,legalCueSpot,clampCueSpot,
} from '../dist/table/pool-place.js';
import {drawGlovedHand,GLOVE_IDLE_ALPHA,GLOVE_DRAG_ALPHA} from '../dist/table/pool-glove.js';

const SCRATCH_SHOT=100*3600+2250;
const scratched=()=>poolMove(poolStart(),1,SCRATCH_SHOT);
const rms=a=>Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);

test('the place command is reversible, distinct from every shot, and fits a Java int',()=>{
  for(const [x,y] of [[CUE_MIN,CUE_MIN],[3000,2000],[CUE_MAX_X,CUE_MAX_Y]]){
    const command=encodePoolPlace(x,y);
    assert.ok(Number.isSafeInteger(command)&&command<2**31);
    assert.ok(command>=PLACE_BASE&&command<PLACE_BASE+PLACE_LIMIT);
    assert.deepEqual(decodePoolPlace(command),{x,y});
    assert.equal(isPoolPlace(command),true);
  }
  assert.equal(isPoolPlace(SCRATCH_SHOT),false,'ordinary shots never become placements');
  assert.equal(isPoolPlace(PLACE_BASE-1),false);
  assert.equal(isPoolPlace(PLACE_BASE+PLACE_LIMIT),false);
  assert.equal(decodePoolPlace(1.5),null);
  assert.equal(decodePoolPlace(PLACE_BASE-1),null);
  for(const bad of [-1,0,3599,363600,9*363600+3600,1.5,NaN,Infinity])
    assert.throws(()=>poolMove(poolStart(),1,bad),'old shot validation is unchanged');
});

test('a scratch opens ball in hand; a shot closes it',()=>{
  const start=poolStart(),s=scratched();
  assert.equal(s.fen,'犯规：白球落袋');
  assert.equal(s.turn,2);
  assert.equal(s.cells[2],1);
  assert.equal(s.cells[52],1);
  assert.equal(poolCueInHand(start),false);
  assert.equal(poolCueInHand(s),true);
  const shot=poolMove(s,2,65*3600+0);
  assert.equal(poolCueInHand(shot),false,'the hand disappears once the opponent shoots');
});

test('a spot must be on the bed, outside the mouths, and clear of every ball',()=>{
  const s=scratched(),c=s.cells;
  assert.equal(legalCueSpot(c,1800,800),true,'the automatic respot itself is placeable');
  assert.equal(legalCueSpot(c,CUE_MIN-1,2500),false);
  assert.equal(legalCueSpot(c,CUE_MAX_X+1,2500),false);
  assert.equal(legalCueSpot(c,2500,CUE_MIN-1),false);
  assert.equal(legalCueSpot(c,2500,CUE_MAX_Y+1),false);
  assert.equal(legalCueSpot(c,0,0),false,'corner pocket mouth');
  assert.equal(legalCueSpot(c,5000,0),false,'middle pocket mouth');
  assert.equal(legalCueSpot(c,6500,2500),false,'on top of the rack');
  assert.equal(legalCueSpot(c,4000,4000),true,'an open part of the bed');
  assert.equal(clampCueSpot(c,99999,99999,{x:1800,y:800}).x,CUE_MAX_X);
  assert.equal(clampCueSpot(c,99999,99999,{x:1800,y:800}).y,CUE_MAX_Y,'clamped corner is usually legal');
  const slid=clampCueSpot(c,6500,2500,{x:1800,y:800});
  assert.ok(slid&&legalCueSpot(c,slid.x,slid.y),'slides to the last legal point before the rack');
  assert.ok(Math.hypot(slid.x-6500,slid.y-2500)>=330,'never enters the rack');
});

test('placing is authoritative, keeps the turn and move count, and can be repeated',()=>{
  const s=scratched(),first=encodePoolPlace(3000,2000),second=encodePoolPlace(4200,900);
  const a=poolMove(s,2,first),b=poolMove(a,2,second);
  assert.deepEqual(a.cells.slice(0,3),[3000,2000,1]);
  assert.deepEqual(b.cells.slice(0,3),[4200,900,1]);
  assert.equal(a.turn,2);assert.equal(b.turn,2,'no turn is consumed');
  assert.equal(a.moves,s.moves);assert.equal(b.moves,s.moves,'no phantom move is recorded');
  assert.equal(a.fen,s.fen);assert.equal(a.history.length,0,'no replay frames are fabricated');
  assert.equal(poolCueInHand(a),true);assert.equal(poolCueInHand(b),true,'still adjustable');
  assert.deepEqual(a.cells.slice(3),s.cells.slice(3),'only the cue-ball coordinates change');
  assert.equal(gridMove(s,2,first).cells[0],3000,'grid-rules routes the same command');
  // The following shot really starts from the chosen spot.
  const shot=poolMove(b,2,65*3600+0),frame=shot.history[0].split(',').map(Number);
  assert.ok(Math.abs(frame[0]-4200)<200,'cue ball begins at the placed x');
  assert.equal(frame[1],900,'cue ball begins at the placed y');
  assert.equal(shot.moves,s.moves+1);
});

test('illegal placements are rejected instead of teleporting the ball',()=>{
  const s=scratched();
  assert.throws(()=>poolMove(s,2,encodePoolPlace(6500,2500)),/place/,'onto the rack');
  assert.throws(()=>poolMove(s,2,encodePoolPlace(0,0)),/place/,'into a pocket');
  assert.throws(()=>poolMove(s,2,encodePoolPlace(99999,99999)),/place/,'off the bed');
  assert.throws(()=>poolMove(poolStart(),1,encodePoolPlace(3000,2000)),/place/,'without a foul');
  assert.throws(()=>poolMove(s,1,encodePoolPlace(3000,2000)),/turn/,'by the wrong seat');
});

test('the gloved hand is drawn at the offered ball with idle/drag opacity',()=>{
  const alphas=[],paths=[];
  const ctx=new Proxy({},{
    get:(o,k)=>k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}})
      :k==='beginPath'?()=>paths.push(1):(o[k]??(()=>{})),
    set:(o,k,v)=>{if(k==='globalAlpha')alphas.push(v);o[k]=v;return true;},
  });
  drawGlovedHand(ctx,180,80);
  assert.equal(alphas.at(-1),GLOVE_IDLE_ALPHA);
  assert.ok(GLOVE_IDLE_ALPHA>.5&&GLOVE_IDLE_ALPHA<1,'idle glove stays translucent but visible');
  assert.equal(GLOVE_DRAG_ALPHA,1);
  assert.ok(paths.length>=7,'a real glove outline is drawn, not a placeholder');
  drawGlovedHand(ctx,180,80,GLOVE_DRAG_ALPHA);
  assert.equal(alphas.at(-1),GLOVE_DRAG_ALPHA);
});

test('the redrawn glove is curved, shaded and stitched - not a few straight bars',()=>{
  const calls={};
  const ctx=new Proxy({},{
    get:(o,k)=>{
      if(k==='createLinearGradient'||k==='createRadialGradient')
        return ()=>{calls[k]=(calls[k]||0)+1;return {addColorStop(){}};};
      if(k==='beginPath')return ()=>{calls.beginPath=(calls.beginPath||0)+1;};
      return ()=>{calls[k]=(calls[k]||0)+1;};
    },
    set:(o,k,v)=>{o[k]=v;return true;}
  });
  drawGlovedHand(ctx,180,80,GLOVE_DRAG_ALPHA);
  assert.ok(calls.bezierCurveTo>=20,'curved digits and palm');
  assert.ok(calls.bezierCurveTo>=20,'rounded cuff and curved finger seams');
  assert.equal(calls.createLinearGradient,1,'one volumetric glove gradient');
  assert.ok(calls.beginPath>=7&&calls.stroke>=7,'glove silhouette, cuff and finger seams are drawn');
});

/** A DOM harness close enough for renderPool to install its pointer handlers. */
function handHarness(state){
  const alphas=[],translates=[];
  const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{
    get:(o,k)=>k==='translate'?(x,y)=>{translates.push([x,y]);}:(o[k]||(()=>{})),
    set:(o,k,v)=>{if(k==='globalAlpha')alphas.push(v);o[k]=v;return true;},
  });
  const rect={left:0,top:0,width:TABLE_WIDTH,height:TABLE_HEIGHT};
  const canvas={width:2464,height:1288,getContext:()=>context,getBoundingClientRect:()=>rect,
    setPointerCapture(){},releasePointerCapture(){}};
  const relay={dataset:{},hidden:true,type:'button',clicks:0,setAttribute(){},
    click(){this.clicks++;}};
  const button={dataset:{}},input={value:'65',style:{setProperty(){}}};
  const nodes={canvas,'.pool-place':relay,'.pool-shoot':button,input,output:{},
    '.pool-controls output':{},'.pool-note':{},'.pool-score':{},'.pool-sound':{},
    '.pool-table-canvas':canvas,'.pool-spot':canvas,'.pool-spot-reset':{},
    '.pool-power-meter':{setAttribute(){},style:{setProperty(){}}},
    '.pool-power-value':{},'.pool-countdown':{querySelector:()=>({})}};
  const host={isConnected:true,querySelector:s=>nodes[s],_spin:0,_power:0,_angle:0,
    _roll:Array(16).fill(0),_heading:Array(16).fill(0),_table:{},_animationToken:0,
    ownerDocument:{body:{dataset:{screen:'play'}},createElement:()=>relay},append(){}};
  const oldFrame=globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame=()=>0;
  try{renderPool(host,state,true);}finally{globalThis.requestAnimationFrame=oldFrame;}
  return {host,canvas,relay,alphas,translates};
}
const press=(x,y)=>({button:0,clientX:TABLE_PAD+x,clientY:TABLE_PAD+y,pointerId:1,preventDefault(){}});
const drag=(x,y)=>({clientX:TABLE_PAD+x,clientY:TABLE_PAD+y,pointerId:1});
const release=()=>({pointerId:1});

test('press / drag / release moves the hand from 85% to 100% and back, and can repeat',()=>{
  const s=scratched(),{host,canvas,relay,alphas}=handHarness(s);
  assert.equal(host._inHand,true);
  assert.deepEqual(host._cuePlace,{x:s.cells[0],y:s.cells[1]});
  const note=host.querySelector('.pool-note');
  assert.match(note.textContent,/拖动白手套/,'the player is told the ball can be placed');

  // Idle render shows a half-transparent glove.
  host._paint(s.cells,0,performance.now());
  assert.ok(alphas.includes(GLOVE_IDLE_ALPHA),'idle hand is 85% opaque');

  canvas.onpointerdown(press(s.cells[0]/10,s.cells[1]/10));
  assert.ok(host._placing,'pressing the offered ball starts a placement drag');
  alphas.length=0;
  host._paint(s.cells,0,performance.now());
  assert.ok(alphas.includes(GLOVE_DRAG_ALPHA),'the hand is fully opaque while dragging');

  canvas.onpointermove(drag(300,200));
  assert.deepEqual(host._cuePlace,{x:3000,y:2000});
  canvas.onpointerup(release());
  assert.equal(host._placing,null);
  assert.equal(relay.clicks,1,'one command is committed on release');
  assert.equal(Number(relay.dataset.position),encodePoolPlace(3000,2000));
  alphas.length=0;
  host._paint(s.cells,0,performance.now());
  assert.ok(alphas.includes(GLOVE_IDLE_ALPHA),'opacity returns to 85% after release');

  // A second drag starts from the new spot and commits another command.
  canvas.onpointerdown(press(300,200));
  assert.ok(host._placing,'the ball can be picked up again');
  canvas.onpointermove(drag(420,90));
  canvas.onpointerup(release());
  assert.equal(relay.clicks,2);
  assert.equal(Number(relay.dataset.position),encodePoolPlace(4200,900));
  assert.deepEqual(host._cuePlace,{x:4200,y:900});

  // Pressing away from the ball still aims normally (no placement drag).
  canvas.onpointerdown(press(800,400));
  assert.equal(host._placing,null);
  assert.equal(host._locked,true,'ordinary aiming is untouched');
});

test('the glove and its hint wait until the balls stop rolling and it is my turn',()=>{
  const s=scratched(),{host,canvas,alphas,translates}=handHarness(s);
  const note=host.querySelector('.pool-note');
  assert.match(note.textContent,/拖动白手套/,'on my turn with no replay the hint is shown');

  // A historical frame from the opponent's replay: the cue ball is still at
  // (700,300), well away from the automatic respot at (180,80).
  const frame=s.cells.slice();frame[0]=7000;frame[1]=3000;
  host._animating=true;host._update();
  assert.match(note.textContent,/球正在滚动/,'the hint waits for the replay');
  assert.doesNotMatch(note.textContent,/拖动白手套/);
  alphas.length=0;translates.length=0;
  host._paint(frame,0,performance.now());
  assert.ok(!alphas.includes(GLOVE_IDLE_ALPHA),'no glove while balls are still rolling');
  assert.ok(translates.some(([x,y])=>x===700&&y===300),
    'the replay frame keeps its own cue-ball position instead of being pinned to the respot');

  // Replay ends: the hint and the half-transparent glove appear together.
  host._animating=false;host._update();
  assert.match(note.textContent,/拖动白手套/);
  alphas.length=0;translates.length=0;
  host._paint(s.cells,0,performance.now());
  assert.ok(alphas.includes(GLOVE_IDLE_ALPHA),'the glove appears once the balls stop');
  assert.ok(translates.some(([x,y])=>x===s.cells[0]/10&&y===s.cells[1]/10),
    'the settled cue ball is drawn at the offered spot');
  canvas.onpointerdown(press(s.cells[0]/10,s.cells[1]/10));
  assert.ok(host._placing,'dragging still works after the replay');
  canvas.onpointerup(release());

  // The authoritative state still says ball in hand, but it is the opponent's
  // turn: no glove, no placement hint, and no placement drag.
  host._can=false;host._update();
  assert.match(note.textContent,/等待对手/);
  assert.doesNotMatch(note.textContent,/拖动白手套/);
  alphas.length=0;
  host._paint(s.cells,0,performance.now());
  assert.ok(!alphas.includes(GLOVE_IDLE_ALPHA),'the glove is only offered on my turn');
  canvas.onpointerdown(press(s.cells[0]/10,s.cells[1]/10));
  assert.equal(host._placing,null,'the opponent cannot move my offered ball');

  // Strikes, the opponent's cue and a finished game also suppress the glove.
  host._can=true;
  for(const key of ['_striking','_opponentCue']){
    host[key]=true;host._update();alphas.length=0;
    host._paint(s.cells,0,performance.now());
    assert.ok(!alphas.includes(GLOVE_IDLE_ALPHA),`${key} must finish first`);
    host[key]=key==='_opponentCue'?null:false;
  }
  host._current={...s,over:true};host._update();alphas.length=0;
  host._paint(s.cells,0,performance.now());
  assert.ok(!alphas.includes(GLOVE_IDLE_ALPHA),'a finished game shows no glove');
});

test('a blocked spot keeps the last legal position instead of jumping through a ball',()=>{
  const s=scratched(),{host,canvas}=handHarness(s);
  canvas.onpointerdown(press(s.cells[0]/10,s.cells[1]/10));
  canvas.onpointermove(drag(650,250));       // centre of the rack
  assert.equal(legalCueSpot(s.cells,host._cuePlace.x,host._cuePlace.y),true,'the blocked drag stays legal');
  assert.ok(Math.hypot(host._cuePlace.x-6500,host._cuePlace.y-2500)>330,'it stops before the rack');
  assert.notDeepEqual(host._cuePlace,{x:6500,y:800},'it does not jump sideways to a far rail');
  canvas.onpointermove(drag(300,200));
  assert.deepEqual(host._cuePlace,{x:3000,y:2000});
});

