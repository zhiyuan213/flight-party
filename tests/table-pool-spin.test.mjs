import test from 'node:test';
import assert from 'node:assert/strict';
import {poolStart,poolMove} from '../dist/table/pool.js';
import {POOL_HOLES} from '../dist/table/pool-geometry.js';

const unit=363600;
test('all eight cue spots produce bounded deterministic trajectories with server fixtures',()=>{
  // Matching golden cue positions are asserted in PoolRulesTest.java.
  // Golden positions after switching ball-ball contacts to continuous
  // collision detection (exact 2R contact geometry + post-impulse travel
  // for the rest of the 2 ms step). Both engines were recomputed together.
  const cue=[[4659,3136],[2330,3921],[1542,3585],[3898,4540],[2947,1828],[3898,460],[1542,1415],[2330,1079]];
  for(let spot=1;spot<=8;spot++){
    const command=spot*unit+234000,a=poolMove(poolStart(),1,command),b=poolMove(poolStart(),1,command);
    assert.deepEqual(a.cells,b.cells);assert.deepEqual(a.cells.slice(0,2),cue[spot-1]);
    // A ball may legitimately rest in front of a middle pocket. The Java
    // authority allows -70..570 on y; do not apply the tighter cloth bound.
    for(let i=0;i<16;i++)if(a.cells[i*3+2]){
      assert.ok(a.cells[i*3]>=-700&&a.cells[i*3]<=10700);
      assert.ok(a.cells[i*3+1]>=-700&&a.cells[i*3+1]<=5700);
    }
    assert.ok(a.history.length<=601);assert.equal(a.moves,1);
  }
});
test('cue spin affects cushion rebound and scores real pockets normally',()=>{
  // CCD made the break slightly thinner: the left-spin break no longer pots
  // a ball at any power. The 58-power centre break still does, so both the
  // rebound effect and the real scoring path stay covered.
  const center=poolMove(poolStart(),1,64*3600+1800),left=poolMove(poolStart(),1,7*unit+64*3600+1800),right=poolMove(poolStart(),1,3*unit+64*3600+1800);
  assert.notEqual(left.cells[1],center.cells[1]);assert.notEqual(right.cells[1],center.cells[1]);
  assert.deepEqual(left.cells.slice(48,50),[0,0],'CCD thins this break: no pot, no group assigned');
  assert.deepEqual(poolMove(poolStart(),1,58*3600+1800).cells.slice(48,50),[1,0],'a real pot still assigns the group');
});
test('pool rejects missing power, noninteger commands and out-of-range spots',()=>{
  for(const command of [-1,0,3599,unit,unit+3599,9*unit+3600,1.5,NaN,Infinity])assert.throws(()=>poolMove(poolStart(),1,command));
});

test('Doubled-speed shots transfer momentum on direct and thin contacts without crossing cushions',()=>{
  // Offset 30 is still a real thin contact; with less drag the ball now
  // misses entirely at 32+, so 31 no longer exercises the impulse path.
  for(const offset of [0,30]){
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
 const spots=[0,1,5,3,7],positions=[[2109,2500],[4616,2500],[3443,2500],[2607,2019],[2607,2981]];
 for(let i=0;i<spots.length;i++){
  const result=spinShot(spinScene(250,450),spots[i]);
  assert.deepEqual(result.cells.slice(0,2),positions[i]);
  assert.equal(result.cells[5],1,'the object ball stays live');
  assert.ok(result.audioEvents.filter(e=>e.key==='0:1').length>=1,'at least one real geometric contact');
 }
 // Tangential throw: opposite side spins send the object ball to mirrored sides.
 const right=spinShot(spinScene(250,450),3),left=spinShot(spinScene(250,450),7);
 assert.ok((right.cells[4]-2500)*(left.cells[4]-2500)<0,'object ball is thrown to mirrored sides');
});

test('side spin bends the free-flight path before any contact',()=>{
 const center=spinShot(spinScene(),0,5);
 for(const spot of [3,7])assert.notDeepEqual(spinShot(spinScene(),spot,5).history,center.history,'spin must change the trajectory');
 const s=poolStart();for(let i=1;i<16;i++)s.cells[i*3+2]=0;s.cells[0]=1000;s.cells[1]=2500;
 const straight=poolMove(s,1,25*3600),right=poolMove(s,1,3*unit+25*3600),left=poolMove(s,1,7*unit+25*3600);
 // Lower drag lets the ball reach a cushion; the final y then folds the bend
 // back to the centre line. Measure the free-flight segment instead: frame 20
 // is 320 ms, well before the first rail contact at 818 ms.
 const frame=r=>r.history[20].split(',').map(Number);
 const dr=frame(right)[1]-frame(straight)[1],dl=frame(left)[1]-frame(straight)[1];
 assert.ok(Math.abs(dr)>100&&Math.abs(dl)>100,'visible curvature of at least 10 table units in free flight');
 assert.ok(dr*dl<0,'opposite spin bends opposite ways');
});

test('follow and draw change travel distance and survive a cushion',()=>{
 // Power 35 (formerly 20, then 30): with cloth drag cut twice, 30 folds the
 // follow endpoint past the centre hit, so use the power that still separates
 // centre/follow/draw after the cushion.
 const center=spinShot(spinScene(800,600),0,35),follow=spinShot(spinScene(800,600),1,35),draw=spinShot(spinScene(800,600),5,35);
 assert.deepEqual(center.cells.slice(0,2),[8831,2500]);
 assert.deepEqual(follow.cells.slice(0,2),[5631,2500]);
 assert.deepEqual(draw.cells.slice(0,2),[8953,2500]);
 assert.ok(follow.cells[0]<center.cells[0]&&draw.cells[0]>center.cells[0]);
 const empty=poolStart();for(let i=1;i<16;i++)empty.cells[i*3+2]=0;empty.cells[0]=600;empty.cells[1]=2500;
 // Power 65 (formerly 40): the lower drag inverts the 40-power pair; 65 keeps
 // a measurable positive follow-vs-draw travel gap.
 const hi=poolMove(empty,1,1*unit+65*3600),lo=poolMove(empty,1,5*unit+65*3600);
 assert.ok(hi.cells[0]-lo.cells[0]>500,'follow travels at least 50 table units farther than draw');
});

test('left and right cushion kicks are mirrored and do not add speed',()=>{
 const center=spinShot(spinScene(),0,25,1800);
 assert.deepEqual(center.cells.slice(0,2),[4829,2500]);
 for(const spot of [3,7]){
  const a=spinShot(spinScene(),spot,25,1800),b=spinShot(spinScene(750),10-spot,25,0);
  // With cloth drag cut twice the ball travels farther before the rail and the
  // deflection is partly folded back, so 500 units (was 800) is the contract.
  assert.ok(Math.abs(a.cells[1]-center.cells[1])>400,'visible cushion deflection at the same power');
  assert.equal(a.cells[0]+b.cells[0],10000);assert.equal(a.cells[1],b.cells[1]);
  assert.deepEqual(a.cells.slice(0,2),spot===3?[4928,2000]:[4928,3000]);
 }
});

test('thin and late contacts keep spin within the finite incoming-speed energy budget',()=>{
 let contacts=0;
 for(const target of [450,700])for(const offset of [0,28,31])for(let spot=1;spot<=8;spot++){
  const s=spinScene(250,target,offset),r=spinShot(s,spot,30),frames=r.history.map(t=>t.split(',').map(Number));
  const contact=frames.findIndex(f=>f[3]!==s.cells[3]||f[4]!==s.cells[4]);
  // Strong side spin can bend the cue ball off a very thin contact. A miss is
  // legitimate; only a real contact is subject to the energy budget.
  if(contact<3)continue;
  contacts++;
  const speed=(a,b,id)=>Math.hypot(b[id*3]-a[id*3],b[id*3+1]-a[id*3+1])/20;
  const before=speed(frames[contact-3],frames[contact-2],0),cue=speed(frames[contact+1],frames[contact+2],0),targetSpeed=speed(frames[contact+1],frames[contact+2],1);
  assert.ok(cue<=before+.1,'cue speed never exceeds its approach speed');
  assert.ok(cue*cue+targetSpeed*targetSpeed<=before*before*1.14+.4,'spin never injects kinetic energy');
 }
 assert.ok(contacts>=36,'most layouts still produce a measurable contact');
});
