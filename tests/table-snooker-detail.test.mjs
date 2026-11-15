import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {radius} from '../dist/table/snooker.js?v=20261110-dotblack1';
import {pocketIndex,SNOOKER_POCKET_SCALE,snookerPockets} from '../dist/table/pool-geometry.js';

import {snookerCushionNoses} from '../dist/table/snooker-table.js';
const ball=readFileSync(new URL('../dist/table/pool-ball.js',import.meta.url),'utf8');
const view=readFileSync(new URL('../dist/table/snooker-view.js',import.meta.url),'utf8');

function sampleNose(path){
  const points=[];let previous;
  for(const [op,...v] of path){
    if(op==='M'){previous=v;points.push(v);continue;}
    const end=v.slice(-2);
    for(let i=1;i<=100;i++){
      const t=i/100,u=1-t;
      points.push(op==='L' ? previous.map((x,j)=>x*u+end[j]*t)
        : previous.map((x,j)=>x*u*u*u+3*v[j]*u*u*t+3*v[j+2]*u*t*t+end[j]*t*t*t));
    }
    previous=end;
  }
  return points;
}
const same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<1e-8;
const endpoints=path=>[path[0].slice(-2),path.at(-1).slice(-2)];

test('six independent cushion noses meet in pairs inside the six wells',()=>{
  const holes=snookerPockets(SNOOKER_POCKET_SCALE),paths=snookerCushionNoses(holes);
  assert.equal(paths.length,6);
  for(const path of paths){
    assert.equal(path[0][0],'M');
    assert.ok(path.slice(1).every(c=>c[0]==='L'||c[0]==='C'),'each rail is an open path');
    for(const end of endpoints(path))assert.ok(holes.some(p=>same(end,[p.x,p.y])),'jaw ends at a recessed well centre');
  }
  for(const p of holes){
    const touching=paths.filter(path=>endpoints(path).some(end=>same(end,[p.x,p.y])));
    assert.equal(touching.length,2,'every well is flanked by exactly two independent rails');
  }
});

test('both ends of every cushion share the same broad reflected shoulder',()=>{
  for(const scale of [.35,SNOOKER_POCKET_SCALE,.75,1]){
    const paths=snookerCushionNoses(snookerPockets(scale));
    for(const path of paths){
      const first=[path[1].slice(-2),...Array.from({length:3},(_,i)=>path[2].slice(1+i*2,3+i*2))];
      const last=[path[4].slice(-2),path[4].slice(3,5),path[4].slice(1,3),path[3].slice(-2)];
      const along=Math.abs(first[0][0]-last[0][0])>Math.abs(first[0][1]-last[0][1])?0:1;
      const across=1-along;
      for(let i=0;i<4;i++){
        assert.ok(Math.abs((first[i][along]-first[0][along])+(last[i][along]-last[0][along]))<1e-8,
          'corner and middle shoulders have the same reflected horizontal reach');
        assert.ok(Math.abs(first[i][across]-last[i][across])<1e-8,
          'both ends share the same height profile and tangent');
      }
    }
  }
});

test('sampled corner and middle jaws never bridge the incoming centreline outside the well',()=>{
  const holes=snookerPockets(SNOOKER_POCKET_SCALE),paths=snookerCushionNoses(holes);
  for(const p of holes){
    const sy=p.y<0?1:-1,sx=p.x<500?1:-1;
    const ux=p.middle?0:sx*Math.SQRT1_2,uy=p.middle?sy:sy*Math.SQRT1_2;
    const signs=[];
    for(const path of paths.filter(path=>endpoints(path).some(end=>same(end,[p.x,p.y])))){
      const offsets=sampleNose(path).filter(([x,y])=>Math.hypot(x-p.x,y-p.y)>p.r)
        .map(([x,y])=>ux*(y-p.y)-uy*(x-p.x));
      assert.ok(offsets.length>0);
      const sign=Math.sign(offsets[0]);
      assert.notEqual(sign,0);
      assert.ok(offsets.every(offset=>offset*sign>1e-6),'jaw stays on its own side until it enters the well');
      signs.push(sign);
    }
    assert.equal(signs[0],-signs[1],'two jaws flank the entry rather than crossing it');
  }
});

test('each open mouth leaves an eleven-unit ball clear along its approach',()=>{
  const holes=snookerPockets(SNOOKER_POCKET_SCALE),paths=snookerCushionNoses(holes);
  const samples=paths.map(sampleNose);
  function segmentDistance(x,y,a,b){
    const dx=b[0]-a[0],dy=b[1]-a[1],q=dx*dx+dy*dy;
    const t=q?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/q)):0;
    return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
  }
  for(const p of holes){
    const sy=p.y<0?1:-1,sx=p.x<500?1:-1;
    const ux=p.middle?0:sx*Math.SQRT1_2,uy=p.middle?sy:sy*Math.SQRT1_2;
    for(let d=p.r;d<=p.r+35;d+=1){
      const x=p.x+ux*d,y=p.y+uy*d;
      for(const points of samples)for(let i=1;i<points.length;i++){
        assert.ok(segmentDistance(x,y,points[i-1],points[i])>=radius-.05,
          'a cushion must not cross the ball-sized entrance');
      }
    }
  }
});

test('balls are back to the original soft spheres; only the cue ball has a tiny black rolling dot',()=>{
  assert.equal(radius,11);
  assert.doesNotMatch(ball,/visualRadius|#0a2313c9/,'no enlarged spheres or crisp dark rim');
  assert.match(ball,/ctx\.shadowColor='#0008'/,'Pool keeps its original soft glow');
  assert.match(ball,/if\(plain&&id===0\)for\(const side of \[1,-1\]\)/,'only the cue ball carries a rotation dot');
  assert.match(ball,/project\(0,0,side\)/,'the dot is pinned to the rolling sphere');
  assert.match(ball,/size=r\*\.15/,'the dot stays a small point, not a big disc');
  assert.match(ball,/ctx\.fillStyle='#141414'/,'the dot is black');
  assert.doesNotMatch(ball,/#e22a1f|#d12b22|rgba\(255,248,235/,'no red disc or bright ring');
  assert.match(view,/R=radius/,'the painter uses the physics radius again');
  assert.doesNotMatch(view,/BALL_R|visualRadius/);
  assert.match(view,/perp<\(R\*2\)\*\*2/,'aim assist still uses the physics radius');
  assert.match(view,/rollSphere\(orientations\[i\],dx,dy,R\)/,'rolling matches the drawn radius');
  assert.match(view,/drawSnookerPocketDrops\(ctx,returns,now,R,/,'pocket drops use the same radius');
});

test('pocket capture and the physical hole contour are unchanged by the art work',()=>{
  assert.equal(SNOOKER_POCKET_SCALE,.5);
  assert.equal(snookerPockets().length,6);
  assert.equal(pocketIndex(0,0),0);
  assert.equal(pocketIndex(500,-20),1);
  assert.equal(pocketIndex(1000,500),5);
  assert.equal(pocketIndex(500,250),-1);
});
