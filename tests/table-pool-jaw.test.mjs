import test from 'node:test';
import assert from 'node:assert/strict';
import {cushionContour} from '../dist/table/pool-table.js';
import {pocketIndex,cushionContact,POCKET_VISUAL_EXPAND} from '../dist/table/pool-geometry.js';

// The six cushion footprints as drawn by makeTable(). Only the four ends
// facing a middle pocket (index 0-3) ever had the rounded 90-degree nose.
const CUSHIONS=[
  [[18,-20],[474,-20],[466,0],[38,0]],
  [[526,-20],[982,-20],[962,0],[534,0]],
  [[18,520],[474,520],[466,500],[38,500]],
  [[526,520],[982,520],[962,500],[534,500]],
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

test('every cushion corner gets a small soft fillet; the mitre stays a straight line',()=>{
  for(const [index,points] of CUSHIONS.entries()){
    const r=recorder();cushionContour(r,points,index);
    assert.equal(r.calls[0][0],'M','a closed contour starts with moveTo');
    assert.equal(r.calls.at(-1)[0],'close','the contour closes');
    const beziers=r.calls.filter(c=>c[0]==='B'),lines=r.calls.filter(c=>c[0]==='L'),fillets=r.calls.filter(c=>c[0]==='Q');
    assert.equal(beziers.length,0,`cushion ${index} must not use the old 90-degree Bezier nose`);
    assert.equal(fillets.length,4,`cushion ${index} softens all four corners`);
    assert.equal(lines.length,3,`cushion ${index} keeps four straight edges between the fillets`);
    // Each quadratic uses the ORIGINAL vertex as its control point, so the
    // polygon geometry itself has not shifted at all - only the joints soften.
    fillets.forEach((q,i)=>assert.deepEqual(q.slice(1,3),points[i],`corner ${i} of cushion ${index}`));
  }
});

test('roundedJaws reproduces the previous 90-degree nose for the A/B preview only',()=>{
  for(const index of [0,1,2,3]){
    const r=recorder();cushionContour(r,CUSHIONS[index],index,true);
    assert.ok(r.calls.some(c=>c[0]==='B'),`jaw ${index} keeps its old Bezier corner`);
  }
  // Side rails never had a rounded pocket nose, in either mode.
  for(const rounded of [false,true]){
    const r=recorder();cushionContour(r,CUSHIONS[4],4,rounded);
    assert.ok(!r.calls.some(c=>c[0]==='B'));
  }
});

test('this is drawing only: capture polygon, physical rails and visual expansion are unchanged',()=>{
  assert.equal(POCKET_VISUAL_EXPAND,2);
  assert.equal(pocketIndex(500,-55),-1,'the 2-unit visual band still does not create a pot');
  assert.equal(pocketIndex(500,-50),1);
  assert.equal(pocketIndex(500,10),-1);
  assert.equal(pocketIndex(-17,-40),0);
  // The physical cushion nose is still the original rounded rail, independent
  // of the straight mitre used for rendering.
  assert.ok(cushionContact(474,-18,20),'the physical rounded nose still resolves contacts');
  assert.ok(cushionContact(470,0,20),'the original inner nose at y=0 is still a rail');
});
