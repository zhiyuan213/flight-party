import test from 'node:test';
import assert from 'node:assert/strict';
import {FlightTrails} from '../dist/flight-trails.js';
import {renderVictory} from '../dist/victory-effects.js';
test('cosmetic samples are bounded, fade, preserve inputs and clear for reduced motion',()=>{
 const trail=new FlightTrails(),p={x:0,y:1,z:0};
 trail.emit('none','0',p,0);assert.equal(trail.points.length,0);
 for(let i=0;i<200;i++)trail.emit(['star','rainbow','cloud'][i%3],'0',{...p,x:i},i*50);
 assert.equal(trail.points.length,96);assert.deepEqual(p,{x:0,y:1,z:0});
 const c=new Proxy({},{get:()=>()=>{},set:()=>true});
 trail.draw(c,p=>({x:p.x,y:p.y}),50,10000);assert.ok(trail.points.length<20);
 trail.draw(c,p=>p,50,11000);assert.equal(trail.points.length,0);
 trail.emit('star','0',{x:999,y:1,z:0},12000);trail.draw(c,p=>p,50,12050,true);assert.equal(trail.points.length,0);assert.equal(trail.last.size,0);
});
test('victory style requires an eligible winner, supports static reduced mode, and restores trophy',()=>{
 const old=globalThis.document,host={innerHTML:'',textContent:'',append(){}};globalThis.document={createElement:()=>({})};
 try{const root={dataset:{},querySelector:()=>host};
 renderVictory(root,{member:false,victoryEffect:'gold'});assert.equal(root.dataset.victoryEffect,'none');assert.equal(host.textContent,'🏆');
 renderVictory(root,{member:true,victoryEffect:'gold',color:0},{reduced:true});assert.equal(root.dataset.victoryEffect,'gold');assert.ok(host.innerHTML.includes('victory-static'));assert.ok(host.innerHTML.includes('avatar-0'));
 renderVictory(root,{member:true,victoryEffect:'none'});assert.equal(root.dataset.victoryEffect,'none');
 }finally{globalThis.document=old;}
});
