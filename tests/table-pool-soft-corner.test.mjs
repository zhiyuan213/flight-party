import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cushionContour,CUSHION_SOFT_RADIUS} from '../dist/table/pool-table.js';

const table=readFileSync(new URL('../dist/table/pool-table.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');

// The exact six cushion footprints makeTable() draws (post blue-tip trim).
const CUSHIONS=[
  [[18,-20],[472,-20],[470,0],[38,0]],
  [[528,-20],[982,-20],[962,0],[530,0]],
  [[18,520],[472,520],[470,500],[38,500]],
  [[528,520],[982,520],[962,500],[530,500]],
  [[-20,18],[0,38],[0,462],[-20,482]],
  [[1020,18],[1000,38],[1000,462],[1020,482]]
];
function recorder(){
  const calls=[];
  return {calls,beginPath(){calls.push(['begin']);},closePath(){calls.push(['close']);},
    moveTo(x,y){calls.push(['M',x,y]);},lineTo(x,y){calls.push(['L',x,y]);},
    quadraticCurveTo(...a){calls.push(['Q',...a]);},
    bezierCurveTo(...a){calls.push(['B',...a]);}};
}
const near=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-6,`${msg}: ${a} vs ${b}`);
const unit=(from,to)=>{const dx=to[0]-from[0],dy=to[1]-from[1],len=Math.hypot(dx,dy);return [dx/len,dy/len];};

test('one small tunable radius softens every blue cushion corner',()=>{
  assert.equal(CUSHION_SOFT_RADIUS,3,'the softness is deliberately tiny');
  assert.match(table,/export const CUSHION_SOFT_RADIUS=3;/);
  assert.match(table,/const softRadius=CUSHION_SOFT_RADIUS\*q;/,'scales with the preview pocket scale');
  assert.equal((table.match(/cushionContour\(ctx,points,index,rounded,softRadius\)/g)||[]).length,3,
    'shadow clip, shadow fill and top-face clip all use the same contour');
});

test('each fillet is tangent to the ORIGINAL edges at exactly the radius',()=>{
  for(const [index,points] of CUSHIONS.entries()){
    const r=recorder();cushionContour(r,points,index);
    const ms=r.calls.filter(c=>c[0]==='M'),ls=r.calls.filter(c=>c[0]==='L'),qs=r.calls.filter(c=>c[0]==='Q');
    const n=points.length;
    qs.forEach((q,i)=>{
      const p=points[i];
      assert.deepEqual([q[1],q[2]],p,`cushion ${index} keeps vertex ${i} as control point`);
      const uOut=unit(p,points[(i+1)%n]),uIn=unit(p,points[(i+n-1)%n]);
      near(q[3],p[0]+uOut[0]*CUSHION_SOFT_RADIUS,`cushion ${index} exit x`);
      near(q[4],p[1]+uOut[1]*CUSHION_SOFT_RADIUS,`cushion ${index} exit y`);
      const entry=i===0?ms[0]:ls[i-1];
      near(entry[1],p[0]+uIn[0]*CUSHION_SOFT_RADIUS,`cushion ${index} entry x`);
      near(entry[2],p[1]+uIn[1]*CUSHION_SOFT_RADIUS,`cushion ${index} entry y`);
    });
    // Every straight edge stays on its original line, and the fillet never
    // eats more than a small fraction of even the shortest 20-unit mitre.
    ls.forEach((l,i)=>{
      const a=points[i],b=points[i+1];
      const cross=(b[0]-a[0])*(l[2]-a[1])-(b[1]-a[1])*(l[1]-a[0]);
      near(cross,0,`cushion ${index} edge ${i} stays straight`);
    });
    assert.ok(CUSHION_SOFT_RADIUS<20*.25,'the fillet stays a small part of the mitre');
  }
});

test('the radius is a single knob and the A/B preview keeps its old Bezier nose',()=>{
  const wide=recorder();cushionContour(wide,CUSHIONS[0],0,false,6);
  const q0=wide.calls.find(c=>c[0]==='Q');
  near(q0[3],18+6,'doubling the radius doubles the tangent distance along the long edge');
  for(const index of [0,1,2,3]){
    const old=recorder();cushionContour(old,CUSHIONS[index],index,true);
    assert.ok(old.calls.some(c=>c[0]==='B'),`A/B column ${index} still shows the old nose`);
    assert.ok(!old.calls.some(c=>c[0]==='Q'),`A/B column ${index} is not softened`);
  }
});

test('grey lip, dark well and pocket physics are untouched by the fillet',()=>{
  assert.match(table,/function middleBack\(/);
  assert.match(table,/ctx\.rect\(-50\*q,-70\*q,100\*q,50\*q\);ctx\.clip\(\);/);
  assert.match(table,/ctx\.beginPath\(\);middleBack\(ctx,q\);ctx\.stroke\(\);/);
  assert.match(table,/const CUSHION_TIP_TRIM=2,CUSHION_MITRE_LEAN=2;/,'the previous blue trim survives');
  assert.doesNotMatch(table,/middleLip|expandPocketPoint/,'no experimental grey-lip change');
  assert.match(table,/paintPocketWell\(ctx,x===500,q\)/);
});
