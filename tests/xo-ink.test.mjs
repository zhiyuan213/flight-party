import test from 'node:test';
import assert from 'node:assert/strict';
import {xoWinningLine} from '../dist/table/xo-view.js';
test('winning stroke joins the correct centres for all eight authoritative wins',()=>{
 const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
 for(const winner of [1,2])for(const cells of lines){
  const board=Array(9).fill(0);cells.forEach(i=>board[i]=winner);
  const line=xoWinningLine(board,winner);assert.deepEqual(line.cells,cells);
  for(const [point,i] of [[line.from,cells[0]],[line.to,cells[2]]])assert.deepEqual(point,{x:i%3*100+50,y:Math.floor(i/3)*100+50});
 }
});
test('draws, incomplete lines and missing authoritative winner draw no victory stroke',()=>{
 assert.equal(xoWinningLine([1,1,1,0,2,0,2,0,0],0),null);
 assert.equal(xoWinningLine([1,1,0,0,2,0,2,0,0],1),null);
 assert.equal(xoWinningLine([1,1,1,0,2,0,2,0,0],2),null);
});
import {renderXo} from '../dist/table/xo-view.js';
function host(){
 const node=()=>({dataset:{},writes:0,classList:{items:new Set(),toggle(k,on){on?this.items.add(k):this.items.delete(k);}},setAttribute(){},set innerHTML(v){this.mark=v;this.writes++;}});
 return {ownerDocument:{defaultView:{matchMedia:()=>({matches:false})}},set innerHTML(v){this.buttons=Array.from({length:9},node);},querySelectorAll(){return this.buttons||[];},querySelector(){return null;}};
}
test('unchanged polls preserve stroke nodes; only new moves animate and rematches clear',()=>{
 const h=host(),s={cells:[1,0,0,0,0,0,0,0,0],over:false};
 renderXo(h,s,{can:true,key:'a'});const first=h.buttons[0];assert.equal(first.writes,1);
 renderXo(h,s,{can:false,key:'a'});assert.equal(h.buttons[0],first);assert.equal(first.writes,1);
 s.cells[4]=2;renderXo(h,s,{can:true,key:'a'});assert.equal(first.writes,1);assert.equal(h.buttons[4].writes,1);
 renderXo(h,{cells:Array(9).fill(0),over:false},{can:true,key:'b'});assert.notEqual(h.buttons[0],first);assert.equal(h.buttons[0].dataset.value,'0');
});
import {decoratedMark} from '../dist/table/xo-view.js';
import {PIECE_PALETTES} from '../dist/table/personal-piece-art.js';
test('all shop X/O styles retain artwork and expose ordered stroke masks with unique IDs',()=>{
 const ids=new Set();for(const theme of ['neon','coral','jade','pearl','aurora'])for(const seat of [1,2]){
  const svg=decoratedMark(theme,seat);assert.ok(svg.includes('data:image/svg+xml,'));
  const id=svg.match(/<mask id="([^"]+)"/)[1];assert.ok(!ids.has(id));ids.add(id);
  assert.ok(svg.includes(seat===1?'xo-second':'xo-circle'));
  assert.ok(decodeURIComponent(svg).includes('stroke-width="2.4"'),'shop metal outline retained');
 }
});
test('theme changes repaint only that seat without replaying its completed stroke',()=>{
 const h=host(),s={cells:[1,2,0,0,0,0,0,0,0],over:false};
 renderXo(h,s,{can:true,key:'a',pieceThemes:['aurora','jade']});
 const a=h.buttons[0],b=h.buttons[1];renderXo(h,s,{can:true,key:'a',pieceThemes:['pearl','jade']});
 assert.equal(a.writes,2);assert.equal(b.writes,1);assert.equal(a.classList.items.has('xo-writing'),false);
});
test('decorated X isolates diagonals and preserves uncropped final artwork',()=>{
 const svg=decoratedMark('pearl',1);
 assert.equal((svg.match(/<clipPath /g)||[]).length,2);
 assert.equal((svg.match(/<mask /g)||[]).length,2);
 assert.match(svg,/xo-mask-x xo-first/);assert.match(svg,/xo-mask-x xo-second/);
 assert.match(svg,/<image class="xo-custom-final" width="100" height="100" href="data:image\/svg\+xml,/);
});
