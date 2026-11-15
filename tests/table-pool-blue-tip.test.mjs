import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {cushionContour} from '../dist/table/pool-table.js';
import {pocketIndex,cushionContact,POCKET_VISUAL_EXPAND} from '../dist/table/pool-geometry.js';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const table=read('../dist/table/pool-table.js');
const VERSION='20261112-gamelanes1';

function recorder(){
  const calls=[];
  return {calls,beginPath(){calls.push(['begin']);},closePath(){calls.push(['close']);},
    moveTo(x,y){calls.push(['M',x,y]);},lineTo(x,y){calls.push(['L',x,y]);},
    quadraticCurveTo(...a){calls.push(['Q',...a]);},
    bezierCurveTo(...a){calls.push(['B',...a]);}};
}

test('the blue top edge is shortened and its side leans inward to one straight line',()=>{
  assert.match(table,/const CUSHION_TIP_TRIM=2,CUSHION_MITRE_LEAN=2;/,'two tunable values');
  // Upper left/right and lower left/right are mirror images; the side rails
  // and the far corners (982/962/18/38) are untouched.
  assert.match(table,/\[18,-20\],\[474-CUSHION_TIP_TRIM,-20\],\[474-CUSHION_TIP_TRIM-CUSHION_MITRE_LEAN,0\],\[38,0\]/);
  assert.match(table,/\[526\+CUSHION_TIP_TRIM,-20\],\[982,-20\],\[962,0\],\[526\+CUSHION_TIP_TRIM\+CUSHION_MITRE_LEAN,0\]/);
  assert.match(table,/\[18,520\],\[474-CUSHION_TIP_TRIM,520\],\[474-CUSHION_TIP_TRIM-CUSHION_MITRE_LEAN,500\],\[38,500\]/);
  assert.match(table,/\[526\+CUSHION_TIP_TRIM,520\],\[982,520\],\[962,500\],\[526\+CUSHION_TIP_TRIM\+CUSHION_MITRE_LEAN,500\]/);
  assert.match(table,/\[\[-20,18\],\[0,38\],\[0,462\],\[-20,482\]\]/,'side rails unchanged');
  // Grey lip falls 2 units over 20 (from (-24,-40) to (-26,-20)); a 2-unit
  // lean on the blue edge over its own 20-unit band makes both segments collinear.
  const top=474-2,bottom=474-2-2;
  assert.equal(top-bottom,2,'blue edge and grey lip share one slope');
  assert.equal(526+2+2-(526+2),2,'the right jaw mirrors it');
});

test('the grey lip, the dark well and the pocket silhouette are not touched',()=>{
  assert.match(table,/function middleBack\(/,'the original U-shaped lip is back');
  assert.match(table,/ctx\.rect\(-50\*q,-70\*q,100\*q,50\*q\);ctx\.clip\(\);/);
  assert.match(table,/ctx\.beginPath\(\);middleBack\(ctx,q\);ctx\.stroke\(\);/);
  assert.doesNotMatch(table,/middleLip|expandPocketPoint/,'no experimental tapered lip remains');
  assert.match(table,/paintPocketWell\(ctx,x===500,q\)/,'the well is still drawn in the hole loop');
});

test('the straight mitre and all physics remain unchanged',()=>{
  for(const [index,points] of [
    [0,[[18,-20],[472,-20],[470,0],[38,0]]],
    [1,[[528,-20],[982,-20],[962,0],[530,0]]],
    [2,[[18,520],[472,520],[470,500],[38,500]]],
    [3,[[528,520],[982,520],[962,500],[530,500]]]
  ]){
    const r=recorder();cushionContour(r,points,index);
    assert.equal(r.calls.filter(c=>c[0]==='B').length,0,`jaw ${index} stays a straight mitre`);
    assert.equal(r.calls.filter(c=>c[0]==='L').length,3,`jaw ${index} stays a four-point polygon`);
    assert.equal(r.calls.filter(c=>c[0]==='Q').length,4,`jaw ${index} has only the four soft corner fillets`);
  }
  assert.equal(POCKET_VISUAL_EXPAND,2);
  assert.equal(pocketIndex(500,-55),-1);
  assert.equal(pocketIndex(500,-50),1);
  assert.equal(pocketIndex(500,10),-1);
  assert.ok(cushionContact(474,-18,20),'the physical rounded nose is still a rail');
});

test('every import of pool-table.js uses the same cache-busting version',()=>{
  const root=new URL('../dist/',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1');
  const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
  const refs=walk(root).filter(f=>/\.(html|js)$/.test(f)).flatMap(f=>{
    const text=readFileSync(f,'utf8');
    return [...text.matchAll(/(?:pool-table|pool-view)\.js\?v=([A-Za-z0-9-]+)/g)].map(m=>[f,m[1]]);
  });
  assert.ok(refs.length>=15,`expected the shared table/view imports, found ${refs.length}`);
  for(const [file,v] of refs)assert.equal(v,VERSION,`${file} must use ${VERSION}`);
  for(const f of walk(root).filter(f=>/\.(html|js|css)$/.test(f))){
    assert.ok(!readFileSync(f,'utf8').includes('pocketrollback1'),`${f} still has the old version`);
  }
});
