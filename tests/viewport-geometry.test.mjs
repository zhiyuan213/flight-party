import test from 'node:test';
import assert from 'node:assert/strict';
import {CanvasBoard} from '../dist/fallback.js';
import {Game,TRACK,HOMES} from '../dist/engine.js';

const sizes=[[947,864],[1162,868],[1334,1008],[1423,888],[949,696],[390,398],[1780,720]];
function viewport(w,h){
 const b=Object.create(CanvasBoard.prototype);
 b.wrap={clientWidth:w,clientHeight:h};b.canvas={};b.ctx={setTransform(){}};
 b.anims=[];b.generation=0;
 globalThis.devicePixelRatio=1;b.resize();
 b.setGame(new Game(Array.from({length:4},(_,i)=>({name:`P${i}`,type:i<2?'human':'bot'}))));
 return b;
}
test('the complete island keeps breathing room and the same camera aspect at every viewport size',()=>{
 let referenceAspect;
 for(const [w,h] of sizes){
  const b=viewport(w,h),r=b.worldRect(),label=`${w}x${h}`;
  assert.ok(r.x>=w*.02&&r.y>=h*.02,`${label}: island needs space above and to the left`);
  assert.ok(r.x+r.width<=w*.98&&r.y+r.height<=h*.98,`${label}: island needs space below and to the right`);
  const aspect=r.width/r.height;
  if(referenceAspect===undefined)referenceAspect=aspect;
  else assert.ok(Math.abs(aspect-referenceAspect)<1e-10,`${label}: resizing must not stretch the airport`);
 }
});
test('board ground corners and side edges follow the measured road interior',()=>{
 const corners=[
  [-5.725,-5.725,145,105],[5.725,-5.725,1109,105],
  [5.725,5.725,1128,1076],[-5.725,5.725,124,1076],
 ];
 // Independent measurements on the 1254px airport artwork, not imported projection constants.
 const sides=[[-5.725,[143,214],[126,979]],[5.725,[1111,214],[1126,980]]];
 for(const [w,h] of sizes){
  const b=viewport(w,h),r=b.worldRect(),label=`${w}x${h}`;
  const assetPoint=p=>({x:(p.x-r.x)/r.width*1254,y:(p.y-r.y)/r.height*1254});
  for(const [x,z,u,v] of corners){
   const p=b.project({x,y:0,z});
   const q=assetPoint(p);
   assert.ok(Math.hypot(q.x-u,q.y-v)<2,`${label}: ground corner no longer meets the road interior`);
  }
  for(const [x,a,c] of sides)for(const z of [-4,-2,0,2,4]){
   const p=assetPoint(b.project({x,y:0,z})),dx=c[0]-a[0],dy=c[1]-a[1];
   const distance=Math.abs((p.x-a[0])*dy-(p.y-a[1])*dx)/Math.hypot(dx,dy);
   assert.ok(distance<2,`${label}: side deviates ${distance.toFixed(3)}px from the measured road edge`);
  }
 }
});
test('the ground keeps its calibrated perspective and normalized shape when resized',()=>{
 let reference;
 for(const [w,h] of sizes){
  const b=viewport(w,h),r=b.worldRect(),far=b.depth(-5.725),near=b.depth(5.725);
  assert.ok(Number.isFinite(far)&&far>0&&far<near,'the far side must be smaller than the near side');
  const sample=[[-5.725,-5.725],[5.725,-5.725],[5.725,5.725],[-5.725,5.725],[0,0],[2.5,-1.5]].map(([x,z])=>{
   const p=b.project({x,y:0,z});return [(p.x-r.x)/r.width,(p.y-r.y)/r.height];
  });
  const current=[far/near,...sample.flat()];
  if(!reference)reference=current;
  else current.forEach((value,i)=>assert.ok(Math.abs(value-reference[i])<1e-10,`${w}x${h}: resizing changed the calibrated ground shape`));
 }
});
test('ground lines remain straight and object height rises above the same ground location',()=>{
 for(const [w,h] of sizes){
  const b=viewport(w,h);
  for(const [a,c] of [[[-4,-4],[4,4]],[[-4,2],[3,-3]],[[-3,-4],[-3,4]]]){
   const start=b.project({x:a[0],y:0,z:a[1]}),end=b.project({x:c[0],y:0,z:c[1]});
   const dx=end.x-start.x,dy=end.y-start.y;
   for(const t of [.2,.4,.6,.8]){
    const p=b.project({x:a[0]+(c[0]-a[0])*t,y:0,z:a[1]+(c[1]-a[1])*t});
    const distance=Math.abs((p.x-start.x)*dy-(p.y-start.y)*dx)/Math.hypot(dx,dy);
    assert.ok(distance<1e-6,'projecting a straight route must not bend its path');
   }
  }
  for(const z of [-4,0,4]){
   const ground=b.project({x:2,y:0,z}),raised=b.project({x:2,y:1,z});
   assert.ok(Math.abs(ground.x-raised.x)<1e-9,'raising a plane must not change its ground x position');
   assert.ok(raised.y<ground.y,'raised geometry must appear above its receiving surface');
  }
 }
});
test('all routes, complete platform and parked aircraft remain visible with the pulled-back camera',()=>{
 for(const [w,h] of sizes){
  const b=viewport(w,h),inside=(p,label)=>assert.ok(p.x>=0&&p.x<=w&&p.y>=0&&p.y<=h,`${w}x${h}: ${label} clipped at ${p.x},${p.y}`);
  for(const [x,z] of [...TRACK,...HOMES.flat()])inside(b.project({x:(x-7)*.72,y:.39,z:(z-7)*.72}),'route');
  for(const x of [-5.725,5.725])for(const z of [-5.725,5.725])inside(b.project({x,y:-.16,z}),'platform');
  for(const p of b.planes){const a=b.project(p),k=b.depth(p.z),pw=1.43*b.scale*k,ph=pw*1.05;inside({x:a.x-pw/2,y:a.y-ph*.91},'plane top-left');inside({x:a.x+pw/2,y:a.y+ph*.09},'plane bottom-right');}
 }
});
