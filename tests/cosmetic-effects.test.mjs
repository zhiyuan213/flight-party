import test from 'node:test';
import assert from 'node:assert/strict';
import {FlightTrails,rainbowRibbon,trailEnvelope,RAINBOW_COLORS,previewTrailProjection,startTrailPreview} from '../dist/flight-trails.js';
import {groundPoint,groundScale,GROUND_CENTER,AIRPORT_SIZE} from '../dist/ground-projection.js';
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

const sample=(x,z,time)=>({x,y:.4,z,time,key:'pilot:1',style:'rainbow'});
const area=vertices=>Math.abs(vertices.reduce((sum,p,i)=>{const q=vertices[(i+1)%vertices.length];return sum+p.x*q.y-q.x*p.y;},0))/2;
const gameProject=scale=>p=>{const ground=groundPoint(p.x,p.z);return{x:(ground.u-GROUND_CENTER.u)*AIRPORT_SIZE.width*scale,y:(ground.v-GROUND_CENTER.v)*AIRPORT_SIZE.height*scale-p.y*scale*groundScale(p.z)};};

test('seven saturated rainbow bands remain distinct for horizontal and vertical flights on mobile and in preview',()=>{
 for(const vertical of [false,true])for(const project of [gameProject(25),gameProject(60),previewTrailProjection]){
  const samples=Array.from({length:6},(_,i)=>sample(vertical?0:i*.4,vertical?i*.4:0,i*55)),before=JSON.stringify(samples);
  const ribbon=rainbowRibbon(samples,project,350),head=ribbon.at(-1);
  assert.equal(head.bands.length,7);assert.deepEqual(head.bands.map(band=>band.color),RAINBOW_COLORS);
  assert.ok(head.bands.every(band=>area(band.vertices)>3),'each band must occupy visible screen area instead of collapsing onto the purple band');
  const section=head.to;for(let i=1;i<section.edges.length;i++)assert.ok(Math.hypot(section.edges[i].x-section.edges[i-1].x,section.edges[i].y-section.edges[i-1].y)>.9,'all seven bands must retain visible width even at phone scale');
  assert.ok(ribbon.flatMap(segment=>segment.bands).flatMap(band=>band.vertices).every(point=>Object.values(point).every(Number.isFinite)));
  assert.equal(JSON.stringify(samples),before);
 }
 assert.notEqual(previewTrailProjection({x:0,y:0,z:0}).y,previewTrailProjection({x:0,y:0,z:1}).y,'preview projection must retain the world lateral axis');
});

test('rainbow ribbon shares adjacent band and curve edges with a transparent tapered tail',()=>{
 const samples=[sample(0,0,0),sample(.5,0,50),sample(1,0,100),sample(1,.5,150),sample(1,1,200)];
 const ribbon=rainbowRibbon(samples,previewTrailProjection,300);
 assert.equal(ribbon[0].from.alpha,0);assert.deepEqual(ribbon[0].from.edges[0],ribbon[0].from.edges[7]);
 assert.ok(ribbon.at(-1).to.alpha>.8);
 for(let i=0;i<ribbon.length;i++)for(let band=0;band<7;band++){
  const vertices=ribbon[i].bands[band].vertices;
  if(band<6){assert.deepEqual(vertices[2],ribbon[i].bands[band+1].vertices[1]);assert.deepEqual(vertices[3],ribbon[i].bands[band+1].vertices[0]);}
  if(i+1<ribbon.length){assert.deepEqual(vertices[1],ribbon[i+1].bands[band].vertices[0]);assert.deepEqual(vertices[2],ribbon[i+1].bands[band].vertices[3]);}
 }
 assert.deepEqual(rainbowRibbon([sample(0,0,0),sample(0,0,40)],previewTrailProjection,50),[]);
});

test('account preview runs the same seven-color renderer as gameplay',()=>{
 const oldRAF=globalThis.requestAnimationFrame,oldPerformance=globalThis.performance,frames=[],stops=[];
 const c=new Proxy({createLinearGradient(){return{addColorStop:(_,color)=>stops.push(color)};}},{get:(target,key)=>target[key]||(()=>{}),set:()=>true});
 const canvas={isConnected:true,getContext:()=>c,closest:selector=>selector==='dialog'?{open:true}:{hidden:false}};
 try{
  globalThis.performance={now:()=>0};globalThis.requestAnimationFrame=fn=>frames.push(fn);
  startTrailPreview(canvas,'rainbow',false,true);
  for(let frame=0;frame<22;frame++)frames.shift()(frame*50);
  for(const color of RAINBOW_COLORS){const rgb=color.slice(1).match(/../g).map(v=>parseInt(v,16)).join(',');assert.ok(stops.some(stop=>stop.startsWith(`rgba(${rgb},`)),`preview must render ${color} through the shared trail draw`);}
 }finally{globalThis.requestAnimationFrame=oldRAF;globalThis.performance=oldPerformance;}
});

test('trail preview draws the selected playable bitmap and independent rotor, with reduced motion and loading fallback',()=>{
 const oldRAF=globalThis.requestAnimationFrame,oldPerformance=globalThis.performance,oldImage=globalThis.Image;
 try{
  for(const [reduced,missing] of [[false,false],[true,false],[false,true]]){
   const frames=[],images=[],draws=[],rotations=[],rotorColors=[],hubColors=[];
   const c=new Proxy({drawImage:(image,...bounds)=>draws.push({image,bounds}),rotate:angle=>rotations.push(angle),createLinearGradient:()=>({addColorStop:(offset,color)=>{if(offset===.35)rotorColors.push(color);}}),createRadialGradient:()=>({addColorStop:(_,color)=>hubColors.push(color)})},{get:(target,key)=>target[key]||(()=>{}),set:()=>true});
   globalThis.performance={now:()=>0};globalThis.requestAnimationFrame=fn=>frames.push(fn);
   globalThis.Image=class{constructor(){images.push(this);this.naturalWidth=1312;this.naturalHeight=1199;}set src(value){this.url=value;if(missing&&value.endsWith('plane-vip-cloud-body.png'))this.onerror();else this.onload();}};
   const canvas={isConnected:true,getContext:()=>c,closest:selector=>selector==='dialog'?{open:true}:{hidden:false}};
   startTrailPreview(canvas,'rainbow',reduced,true,'cloud2d');frames.shift()(1000);
   assert.equal(images.length,2,'one selected bitmap and one classic fallback are cached for this run');
   assert.ok(draws[0].image.url.endsWith(missing?'plane-blue-body.png':'plane-vip-cloud-body.png'));
   assert.deepEqual(draws[0].bounds,[-22,-44*1199/1312*.91,44,44*1199/1312],'the preview shares the game body registration');
   assert.ok(rotorColors.includes(missing?'#3487ec':'#55b4dc'));
   assert.ok(hubColors.includes(missing?'#ffe145':'#dae9f5'));
   if(reduced){assert.equal(frames.length,0,'reduced mode stops scheduling animation');assert.ok(rotations.includes(0));assert.ok(!rotations.includes(5));}
   else{assert.ok(rotations.includes(5),'the independent rotor advances at the shared game speed');frames.shift()(1050);assert.ok(rotations.includes(5.25));assert.equal(images.length,2,'animation frames reuse loaded sprites');}
  }
 }finally{globalThis.requestAnimationFrame=oldRAF;globalThis.performance=oldPerformance;globalThis.Image=oldImage;}
});
