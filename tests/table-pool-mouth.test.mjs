import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POCKET_VISUAL_EXPAND,expandPocketPoint,tracePocketBack,tracePocket,
  pocketVisualContext,pocketIndex
} from '../dist/table/pool-geometry.js';
import {pocketPath,pocketEntryPath,TABLE_PAD,TABLE_HOLES} from '../dist/table/pool-table.js';

// A recording context that captures every coordinate of a pocket path.
function recorder(){
  const calls=[];
  return {calls,beginPath(){calls.push(['begin']);},closePath(){calls.push(['close']);},
    moveTo(x,y){calls.push(['M',x,y]);},lineTo(x,y){calls.push(['L',x,y]);},
    bezierCurveTo(...a){calls.push(['B',...a]);}};
}
function points(calls){const out=[];for(const c of calls)for(let i=1;i<c.length;i+=2)out.push([c[i],c[i+1]]);return out;}

test('the drawn mouth is widened by exactly 2 units along the outward radial',()=>{
  assert.equal(POCKET_VISUAL_EXPAND,2);
  for(const [middle,probe] of [[true,[0,-54]],[false,[-43,-34]]]){
    const [x,y]=expandPocketPoint(...probe,middle);
    assert.ok(Math.abs(Math.hypot(x-probe[0],y-probe[1])-2)<1e-9,'expansion distance is exactly 2');
    assert.deepEqual(expandPocketPoint(...probe,middle,0),probe,'a zero expansion is the identity');
  }
  assert.deepEqual(expandPocketPoint(0,-54,true),[0,-56],'the middle arch apex moves 2 units outward');
});

test('every contour endpoint and Bezier control point is widened, not just the apex',()=>{
  for(const middle of [false,true]){
    const plain=recorder(),wide=recorder();
    tracePocketBack(plain,middle);tracePocketBack(pocketVisualContext(wide,middle),middle);
    const a=points(plain.calls),b=points(wide.calls);
    assert.equal(a.length,b.length,'the same number of control points');
    for(let i=0;i<a.length;i++){
      const d=Math.hypot(b[i][0]-a[i][0],b[i][1]-a[i][1]);
      assert.ok(Math.abs(d-2)<1e-6,`point ${i} must move 2 units, moved ${d}`);
    }
    if(middle)assert.ok(b.some(([,y])=>y<=-55.9),'the middle arch apex reaches -56');
    else assert.ok(b.some(([x])=>x<=-55),'the corner arch moves out along the diagonal');
  }
  const full=recorder();tracePocket(pocketVisualContext(full,true),true);
  assert.ok(points(full.calls).some(([,y])=>y<=-55.9),'the dark well uses the same widened arch');
});

test('the physical capture polygon stays untouched: a visually widened point is still cloth',()=>{
  // The drawn middle arch now reaches y=-56 while capture still ends at -54.
  assert.equal(pocketIndex(500,-55),-1,'the 2-unit visual band must not create a new pot');
  assert.equal(pocketIndex(500,-50),1,'a ball centre inside the original well is still captured');
  assert.equal(pocketIndex(500,10),-1,'the open cloth in front of the jaw is not a pocket');
  assert.equal(pocketIndex(-17,-40),0,'corner wells keep their original boundary');
  assert.deepEqual(TABLE_HOLES,[[0,0],[500,0],[1000,0],[0,500],[500,500],[1000,500]]);
  assert.equal(TABLE_PAD,72);
});

test('entry and well silhouettes still build complete closed paths after widening',()=>{
  for(const middle of [false,true]){
    for(const draw of [ctx=>pocketPath(ctx,middle),ctx=>pocketEntryPath(ctx,middle)]){
      const r=recorder();draw(r);
      assert.equal(r.calls[0][0],'begin','a path starts');
      assert.equal(r.calls.at(-1)[0],'close','a path closes');
      assert.ok(points(r.calls).every(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)),'no NaN control point');
      assert.ok(r.calls.length>=4,'the contour is not empty');
    }
  }
});
