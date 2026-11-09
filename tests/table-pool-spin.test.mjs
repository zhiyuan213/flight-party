import test from 'node:test';
import assert from 'node:assert/strict';
import {poolStart,poolMove} from '../dist/table/pool.js';
import {POOL_HOLES} from '../dist/table/pool-geometry.js';

const unit=363600;
test('all eight cue spots produce bounded deterministic trajectories with server fixtures',()=>{
  // Matching golden cue positions are asserted in PoolRulesTest.java.
  const cue=[[2029,4760],[1800,800],[1967,2965],[1855,3492],[2859,3479],[1855,1508],[3299,1198],[2971,1417]];
  for(let spot=1;spot<=8;spot++){
    const command=spot*unit+234000,a=poolMove(poolStart(),1,command),b=poolMove(poolStart(),1,command);
    assert.deepEqual(a.cells,b.cells);assert.deepEqual(a.cells.slice(0,2),cue[spot-1]);
    for(let i=0;i<16;i++)if(a.cells[i*3+2]){assert.ok(a.cells[i*3]>=160&&a.cells[i*3]<=9840);assert.ok(a.cells[i*3+1]>=160&&a.cells[i*3+1]<=4840);}
    assert.ok(a.history.length<=601);assert.equal(a.moves,1);
  }
});
test('cue spin affects cushion rebound without adding a scoring input',()=>{
  const center=poolMove(poolStart(),1,65*3600+1800),left=poolMove(poolStart(),1,7*unit+65*3600+1800),right=poolMove(poolStart(),1,3*unit+65*3600+1800);
  assert.notEqual(left.cells[1],center.cells[1]);assert.notEqual(right.cells[1],center.cells[1]);assert.deepEqual(left.cells.slice(48,50),[0,0]);
});
test('pool rejects missing power, noninteger commands and out-of-range spots',()=>{
  for(const command of [-1,0,3599,unit,unit+3599,9*unit+3600,1.5,NaN,Infinity])assert.throws(()=>poolMove(poolStart(),1,command));
});

test('Doubled-speed shots transfer momentum on direct and thin contacts without crossing cushions',()=>{
  for(const offset of [0,31]){
    const s=poolStart();for(let i=2;i<16;i++)s.cells[i*3+2]=0;
    s.cells[0]=1000;s.cells[1]=2500;s.cells[3]=1800;s.cells[4]=(250+offset)*10;
    const result=poolMove(s,1,360000);
    assert.ok(result.audioEvents.some(e=>e.key==='0:1'),'actual contact impulse must be resolved');
    assert.ok(result.history.some(frame=>Math.abs(Number(frame.split(',')[3])-1800)>10),'target receives momentum');
  }
  for(const angle of [0,150,450,900,1350,1800,2250,2700,3150]){
    const result=poolMove(poolStart(),1,360000+angle);
    for(const text of result.history){const frame=text.split(',').map(Number);for(let i=0;i<16;i++)if(frame[i*3+2]){
      const x=frame[i*3]/10,y=frame[i*3+1]/10;
      assert.ok((x>=15&&x<=985&&y>=15&&y<=485)||POOL_HOLES.some(([hx,hy])=>Math.hypot(x-hx,y-hy)<65),'live ball stays on the bed or a real pocket approach');
    }}
  }
});

test('a near-pocket scratch between replay samples remains visible before cue respawn',()=>{
  const s=poolStart();for(let i=1;i<16;i++)s.cells[i*3+2]=0;
  s.cells[0]=400;s.cells[1]=400;
  const result=poolMove(s,1,360000+2250),frames=result.history.map(f=>f.split(',').map(Number));
  assert.equal(frames[0][2],1);assert.equal(frames.at(-1)[2],1);
  const dead=frames.findIndex(f=>f[2]===0);assert.ok(dead>0&&dead<frames.length-1);
  assert.equal(frames.filter(f=>f[2]===0).length,1);
  assert.equal(result.cells[2],1);assert.equal(result.turn,2);
});


test('full-power free-flight speed is increased by 50% while replay cadence stays 16ms',()=>{
  const s=poolStart();for(let id=1;id<16;id++)s.cells[id*3+2]=0;
  const frames=poolMove(s,1,360000).history.map(f=>f.split(',').map(Number));
  const distance=(frames[1][0]-frames[0][0])/10;
  assert.ok(distance>94&&distance<96,'16ms free-flight travel should be about 95 units, formerly about 63');
  assert.equal(frames[0][2],1);
});

// Controlled layouts isolate spin from rack randomness and shared scoring state.
function spinScene(cueX=250,targetX=0,offset=0){
 const s=poolStart();for(let id=1;id<16;id++)s.cells[id*3+2]=0;
 s.cells[0]=cueX*10;s.cells[1]=2500;
 if(targetX){s.cells[3]=targetX*10;s.cells[4]=(250+offset)*10;s.cells[5]=1;}
 return s;
}
const spinShot=(s,spot,power=25,angle=0)=>poolMove(s,1,spot*unit+power*3600+angle);
test('same shot has visible follow, draw and opposing side-spin outcomes',()=>{
 const spots=[0,1,5,3,7],positions=[[4188,2500],[6728,2500],[1648,2500],[4188,3751],[4188,1249]];
 for(let i=0;i<spots.length;i++){
  const result=spinShot(spinScene(250,450),spots[i]);
  assert.deepEqual(result.cells.slice(0,2),positions[i]);
  assert.deepEqual(result.cells.slice(3,6),[8201,2500,1],'object-ball momentum is unchanged');
  assert.equal(result.audioEvents.filter(e=>e.key==='0:1').length,1,'one real contact, no repeated spin impulse');
 }
});
test('spin does not invent a curve before any contact',()=>{
 const center=spinShot(spinScene(),0,5);
 for(let spot=1;spot<=8;spot++)assert.deepEqual(spinShot(spinScene(),spot,5).history,center.history);
});
test('follow and draw use the incoming direction after a cushion',()=>{
 const center=spinShot(spinScene(800,600),0,20),follow=spinShot(spinScene(800,600),1,20),draw=spinShot(spinScene(800,600),5,20);
 assert.deepEqual(center.cells.slice(0,2),[6320,2500]);
 assert.deepEqual(follow.cells.slice(0,2),[5888,2500]);
 assert.deepEqual(draw.cells.slice(0,2),[6752,2500]);
 assert.ok(follow.cells[0]<center.cells[0]&&draw.cells[0]>center.cells[0]);
});
test('left and right cushion kicks are stronger, mirrored and do not add speed',()=>{
 const center=spinShot(spinScene(),0,25,1800);
 assert.deepEqual(center.cells.slice(0,2),[6109,2500]);
 for(const spot of [3,7]){
  const a=spinShot(spinScene(),spot,25,1800),b=spinShot(spinScene(750),10-spot,25,0);
  assert.ok(Math.abs(a.cells[1]-center.cells[1])>1700,'visible cushion deflection at the same power');
  assert.equal(a.cells[0]+b.cells[0],10000);assert.equal(a.cells[1],b.cells[1]);
  assert.deepEqual(a.cells.slice(0,2),spot===3?[5835,4284]:[5835,716]);
 }
});
test('thin and late contacts keep spin within the finite incoming-speed energy budget',()=>{
 for(const target of [450,700])for(const offset of [0,28,31])for(let spot=1;spot<=8;spot++){
  const s=spinScene(250,target,offset),r=spinShot(s,spot,30),frames=r.history.map(t=>t.split(',').map(Number));
  const contact=frames.findIndex(f=>f[3]!==s.cells[3]||f[4]!==s.cells[4]);
  assert.ok(contact>2,'the object ball must actually be hit');
  const speed=(a,b,id)=>Math.hypot(b[id*3]-a[id*3],b[id*3+1]-a[id*3+1])/20;
  const before=speed(frames[contact-3],frames[contact-2],0),cue=speed(frames[contact+1],frames[contact+2],0),targetSpeed=speed(frames[contact+1],frames[contact+2],1);
  assert.ok(cue<=before+.1,'cue speed never exceeds its approach speed');
  assert.ok(cue*cue+targetSpeed*targetSpeed<=before*before*1.14+.4,'at most 13% extra stored rotational energy, with frame-rounding allowance');
 }
});
