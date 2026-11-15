import test from 'node:test';
import assert from 'node:assert/strict';
import {syncSnookerCollection,collectionPosition,collectionImpactTime,collectionActive,drawSnookerCollectionTrack,COLLECTION,COLLECTION_REBOUND_MS} from '../dist/table/snooker-collection.js';
import {radius} from '../dist/table/snooker.js';

const rack=()=>Array.from({length:66},(_,i)=>i%3===2?1:0);
const remove=(cells,...ids)=>{for(const id of ids)cells[id*3+2]=0;return cells;};

test('only absent object balls are collected; scratches and respotted colours are excluded',()=>{
  const cells=remove(rack(),0,7,8);
  const entries=syncSnookerCollection([],cells,200,{animate:true,ids:[0,1,5,7,8]});
  assert.deepEqual(entries.map(e=>e.id),[7,8]);
  assert.equal(entries[0].start,200);
  assert.ok(entries[1].start>entries[0].start);
});

test('authoritative re-spot removes a collected colour and repeated snapshots never duplicate balls',()=>{
  const cells=remove(rack(),1,6,7);
  let entries=syncSnookerCollection([],cells,0);
  assert.deepEqual(entries.map(e=>e.id),[1,6,7]);
  entries=syncSnookerCollection(entries,cells,100,{animate:true});
  assert.equal(entries.length,3);
  cells[6*3+2]=1; // Tied-frame black is placed back on the table by the rules.
  entries=syncSnookerCollection(entries,cells,200);
  assert.deepEqual(entries.map(e=>e.id),[1,7]);
  assert.equal(collectionActive(entries,200),false);
  assert.deepEqual(syncSnookerCollection(entries,rack(),300),[]);
});

test('replay only reveals the captured IDs, even when its final board contains later pots',()=>{
  const finalCells=remove(rack(),7,8,9);
  let entries=syncSnookerCollection([],finalCells,500,{animate:true,ids:[8]});
  assert.deepEqual(entries.map(e=>e.id),[8]);
  entries=syncSnookerCollection(entries,finalCells,700,{animate:true,ids:[7]});
  assert.deepEqual(entries.map(e=>e.id),[8,7]);
  entries=syncSnookerCollection(entries,finalCells,900,{animate:true,ids:[9]});
  assert.deepEqual(entries.map(e=>e.id),[8,7,9]);
});

test('collection rolls along one continuous route, waits for pocket drop and finishes at its slot',()=>{
  const entry={id:7,start:600};
  const impactAt=collectionImpactTime(entry,0);
  assert.equal(collectionPosition(entry,0,599).visible,false);
  let previous=collectionPosition(entry,0,600);
  for(let now=601;now<1800;now++){
    const p=collectionPosition(entry,0,now);
    assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
    if(now<=impactAt)assert.ok(p.distance>=previous.distance);
    assert.ok(Math.hypot(p.x-previous.x,p.y-previous.y)<=COLLECTION.speed+1e-7);
    previous=p;
  }
  assert.equal(previous.x,COLLECTION.x);
  assert.equal(previous.y,COLLECTION.bottom);
  assert.equal(previous.settled,true);
  assert.equal(collectionActive([entry],600),true);
  assert.equal(collectionActive([entry],1800),false);
});

test('a complete clearance fits in the track without overlaps during or after collection',()=>{
  const cells=remove(rack(),...Array.from({length:21},(_,i)=>i+1));
  const entries=syncSnookerCollection([],cells,0,{animate:true});
  assert.equal(entries.length,21);
  for(let now=0;now<8000;now+=2){
    const positions=entries.map((entry,slot)=>collectionPosition(entry,slot,now));
    for(let i=1;i<positions.length;i++){
      const a=positions[i-1],b=positions[i];
      if(a.visible&&b.visible)assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=2*radius-1e-8,'eleven-unit balls remain separated during rebounds');
    }
  }
  const top=collectionPosition(entries.at(-1),20,9000);
  assert.equal(top.settled,true);
  assert.ok(top.y>COLLECTION.entryY+COLLECTION.bend+8);
});

test('a bottom impact reverses direction, makes one smaller rebound and settles without crossing the floor',()=>{
  const entry={id:7,start:0},impactAt=collectionImpactTime(entry,0);
  const before=collectionPosition(entry,0,impactAt-1),contact=collectionPosition(entry,0,impactAt);
  const after=collectionPosition(entry,0,impactAt+1);
  assert.ok(before.y<contact.y,'incoming ball travels down to the floor');
  assert.equal(contact.y,COLLECTION.bottom);
  assert.ok(after.y<contact.y,'the impact immediately sends the ball upward');
  const first=collectionPosition(entry,0,impactAt+80);
  const second=collectionPosition(entry,0,impactAt+205);
  assert.ok(contact.y-first.y>=5,'the first rebound is visible');
  assert.ok(contact.y-second.y>0&&contact.y-second.y<(contact.y-first.y)/3,'second bounce loses most of its height');
  for(let age=0;age<=COLLECTION_REBOUND_MS;age++){
    const p=collectionPosition(entry,0,impactAt+age);
    assert.ok(p.y<=COLLECTION.bottom+1e-8,'the ball cannot penetrate its support');
  }
  assert.equal(collectionActive([entry],impactAt+80),true,'requestAnimationFrame continues through recoil');
  assert.equal(collectionActive([entry],impactAt+COLLECTION_REBOUND_MS),false);
  assert.equal(collectionPosition(entry,0,impactAt+COLLECTION_REBOUND_MS).y,COLLECTION.bottom);
});

test('an arriving ball touches an existing ball, rebounds and returns to the original spaced slot',()=>{
  const entries=[{id:7,start:-Infinity},{id:8,start:100}],impactAt=collectionImpactTime(entries[1],1);
  const lower=collectionPosition(entries[0],0,impactAt),contact=collectionPosition(entries[1],1,impactAt);
  assert.equal(lower.y-contact.y,2*radius,'contact occurs at two real ball radii, not in mid-air');
  for(let age=0;age<=COLLECTION_REBOUND_MS;age++){
    const p=collectionPosition(entries[1],1,impactAt+age);
    assert.ok(lower.y-p.y>=2*radius-1e-8,'recoil never goes through the existing ball');
  }
  const apex=collectionPosition(entries[1],1,impactAt+80);
  assert.ok(contact.y-apex.y>6,'ball-on-ball contact produces clear upward recoil');
  const final=collectionPosition(entries[1],1,impactAt+COLLECTION_REBOUND_MS);
  assert.equal(final.y,COLLECTION.bottom-COLLECTION.spacing);
  assert.equal(final.phase,'settled');
});

test('reconnecting or reduced motion paints absent balls at rest immediately',()=>{
  const entries=syncSnookerCollection([],remove(rack(),2,7,8),1000);
  assert.equal(collectionActive(entries,1000),false);
  entries.forEach((entry,slot)=>{
    const p=collectionPosition(entry,slot,1000);
    assert.equal(p.visible,true);assert.equal(p.settled,true);
    assert.equal(p.y,COLLECTION.bottom-slot*COLLECTION.spacing);
  });
});

test('the compact brass entrance leaves a complete ball clear along the existing rolling route',()=>{
  // Inspect the real drawing contour, not a second hand-authored geometry.
  let path=[],trough;
  const ctx=new Proxy({
    beginPath(){path=[];},moveTo(...v){path.push(['M',...v]);},lineTo(...v){path.push(['L',...v]);},
    quadraticCurveTo(...v){path.push(['Q',...v]);},arc(...v){path.push(['A',...v]);},closePath(){path.push(['Z']);},
    fill(){trough??=path.slice();},createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};}
  },{get:(target,key)=>target[key]??(()=>{})});
  drawSnookerCollectionTrack(ctx);
  const points=[];let previous;
  for(const [op,...v] of trough){
    if(op==='M'){previous=v;points.push(v);continue;}
    if(op==='Z')continue; // The left end is open where the trough enters the table.
    const from=previous;
    for(let i=1;i<=160;i++){
      const t=i/160,u=1-t;
      const p=op==='L'?[from[0]*u+v[0]*t,from[1]*u+v[1]*t]
        :op==='Q'?[from[0]*u*u+2*v[0]*u*t+v[2]*t*t,from[1]*u*u+2*v[1]*u*t+v[3]*t*t]
        :[v[0]+v[2]*Math.cos(v[3]+(v[4]-v[3])*t),v[1]+v[2]*Math.sin(v[3]+(v[4]-v[3])*t)];
      points.push(p);previous=p;
    }
  }
  assert.equal(points.at(-1)[1]-points[0][1],28,'the former 41-unit funnel is now a compact opening');
  const entry={id:7,start:0};
  for(let now=0;now<=200;now++){
    const p=collectionPosition(entry,0,now);
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
      const t=length?Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/length)):0;
      assert.ok(Math.hypot(p.x-a[0]-t*dx,p.y-a[1]-t*dy)>=13-.001,'eight-unit ball clears the five-unit brass rim');
    }
  }
  assert.equal(COLLECTION.x,1189);assert.equal(COLLECTION.bottom,578);
});
