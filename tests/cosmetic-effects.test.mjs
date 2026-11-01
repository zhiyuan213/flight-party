import test from 'node:test';
import assert from 'node:assert/strict';
import {FlightTrails,rainbowTube,trailEnvelope} from '../dist/flight-trails.js';
import {renderVictory} from '../dist/victory-effects.js';
test('cosmetic samples are bounded, fade, preserve inputs and clear for reduced motion',()=>{
 const trail=new FlightTrails(),p={x:0,y:1,z:0};
 trail.emit('none','0',p,0);assert.equal(trail.points.length,0);
 for(let i=0;i<200;i++)trail.emit(['star','rainbow','cloud'][i%3],'0',{...p,x:i},i*50);
 assert.equal(trail.points.length,96);assert.deepEqual(p,{x:0,y:1,z:0});
 const c=new Proxy({},{get:(_,key)=>key.startsWith('create')?()=>({addColorStop(){}}):()=>{},set:()=>true});
 trail.draw(c,p=>({x:p.x,y:p.y}),50,10000);assert.ok(trail.points.length<32);
 trail.draw(c,p=>p,50,11600);assert.equal(trail.points.length,0);assert.equal(trail.last.size,0);
 trail.emit('star','0',{x:999,y:1,z:0},12000);trail.draw(c,p=>p,50,12050,true);assert.equal(trail.points.length,0);assert.equal(trail.last.size,0);
});

test('a long tail survives the whole move, tapers continuously and disappears after stopping',()=>{
 const trail=new FlightTrails(),gradients=[];
 const c=new Proxy({createLinearGradient(){const stops=[];gradients.push(stops);return{addColorStop:(_,color)=>stops.push(color)};}},{get:(target,key)=>target[key]||(()=>{}),set:()=>true});
 for(let i=0;i<=25;i++)trail.emit('rainbow','pilot:1',{x:i*.12,y:1,z:0},i*40);
 trail.draw(c,p=>({x:p.x*50,y:p.y*50+p.z*50}),50,1200);
 assert.equal(trail.points.length,26,'the full one-second flight must remain visible beyond the former 850 ms cutoff');
 assert.ok(gradients.length>0);
 assert.ok(gradients.every(stops=>stops.length===2&&Number(stops[0].match(/,([\d.]+)\)$/)[1])<Number(stops[1].match(/,([\d.]+)\)$/)[1])),'each older end must be more transparent than its newer end');
 assert.deepEqual(trailEnvelope(1),{width:0,alpha:0});assert.deepEqual(trailEnvelope(0),{width:1,alpha:1});
 assert.ok(trailEnvelope(.9).width<trailEnvelope(.3).width);
 trail.draw(c,p=>({x:p.x,y:p.y}),50,2600);assert.equal(trail.points.length,0);assert.equal(trail.last.size,0);
});

test('tail segments never connect different planes or teleport over the board',()=>{
 for(const [key,x] of [['other',.1],['same',8]]){
  const trail=new FlightTrails();let fills=0;
  trail.emit('rainbow','same',{x:0,y:1,z:0},0);trail.emit('rainbow',key,{x,y:1,z:0},50);
  const c=new Proxy({fill(){fills++;}},{get:(target,key)=>target[key]||(()=>{}),set:()=>true});
  trail.draw(c,p=>({x:p.x,y:p.y}),50,100);assert.equal(fills,0);
 }
});
test('victory style requires an eligible winner, supports static reduced mode, and restores trophy',()=>{
 const old=globalThis.document,host={innerHTML:'',textContent:'',append(){}};globalThis.document={createElement:()=>({})};
 try{const root={dataset:{},querySelector:()=>host};
 renderVictory(root,{member:false,victoryEffect:'gold'});assert.equal(root.dataset.victoryEffect,'none');assert.equal(host.textContent,'🏆');
 renderVictory(root,{member:true,victoryEffect:'gold',color:0},{reduced:true});assert.equal(root.dataset.victoryEffect,'gold');assert.ok(host.innerHTML.includes('victory-static'));assert.ok(host.innerHTML.includes('avatar-0'));
 renderVictory(root,{member:true,victoryEffect:'none'});assert.equal(root.dataset.victoryEffect,'none');
 }finally{globalThis.document=old;}
});

test('rainbow volume has finite raised faces without changing movement coordinates',()=>{
 const p={x:0,y:1,z:0},q={x:1,y:1,z:1},before=JSON.stringify([p,q]);
 const faces=rainbowTube(p,q);
 assert.ok(faces.length>0);
 assert.ok(faces.flatMap(f=>f.vertices).every(v=>Object.values(v).every(Number.isFinite)));
 assert.ok(faces.some(f=>f.vertices.some(v=>v.y>1)));
 assert.ok(faces.some(f=>f.vertices.some(v=>v.y<1)));
 assert.equal(JSON.stringify([p,q]),before);
 assert.deepEqual(rainbowTube(p,p),[]);
});
