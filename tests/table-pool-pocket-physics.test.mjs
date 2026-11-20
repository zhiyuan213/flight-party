import test from 'node:test';
import assert from 'node:assert/strict';
import {poolStart,poolMove} from '../dist/table/pool.js';
import {pocketIndex,resolveCushion} from '../dist/table/pool-geometry.js';
import {replayImpacts} from '../dist/table/pool-audio.js';

function clearTable(x,y){
  const state=poolStart();
  for(let id=1;id<16;id++)state.cells[id*3+2]=0;
  state.cells[0]=x*10;state.cells[1]=y*10;return state;
}
const frames=result=>result.history.map(f=>f.split(',').map(Number));
const shoot=(state,power,angle)=>poolMove(state,1,power*3600+angle);

test('a ball passing tangentially across either middle mouth stays on the table in both directions',()=>{
  for(const y of [16,484])for(const [x,angle,sign] of [[400,0,1],[600,1800,-1]]){
    const result=shoot(clearTable(x,y),5,angle),trace=frames(result);
    assert.ok(trace.some(f=>sign*(f[0]/10-500)>30),'shot must actually cross the whole mouth');
    assert.ok(trace.every(f=>f[2]===1),'a tangential pass must not disappear or scratch');
    assert.ok(trace.every(f=>Math.abs(f[1]/10-y)<.2),'a pass clear of the jaws must not be pulled into the pocket');
    assert.ok(!result.audioEvents.some(e=>e.kind==='pocket'));
  }
});

test('stationary balls in front of a middle well are not captured by its old circular proximity radius',()=>{
  for(const y of [0,8,492,500]){
    const state=clearTable(250,250);state.cells[3]=5000;state.cells[4]=y*10;state.cells[5]=1;
    const result=shoot(state,5,0);
    assert.equal(result.cells[5],1,`stationary target at y=${y} remains live`);
    assert.equal(result.cells[3],5000);assert.equal(result.cells[4],y*10);
    assert.ok(!result.audioEvents.some(e=>e.kind==='pocket'&&e.id===1));
  }
});

test('normal entry into all six wells captures only after the ball center crosses the drawn opening',()=>{
  const entries=[[50,50,2250,0],[500,60,2700,1],[950,50,3150,2],[50,450,1350,3],[500,440,900,4],[950,450,450,5]];
  for(const power of [5,30,100])for(const [x,y,angle,hole] of entries){
    const result=shoot(clearTable(x,y),power,angle),trace=frames(result),dead=trace.findIndex(f=>f[2]===0);
    assert.ok(dead>0,`power ${power}, hole ${hole}: visible approach before capture`);
    const at=trace[dead];assert.equal(pocketIndex(at[0]/10,at[1]/10),hole,`power ${power}, hole ${hole}: center must be inside the well`);
    assert.equal(trace[dead-1][2],1);
    assert.equal(result.audioEvents.filter(e=>e.kind==='pocket'&&e.id===0).length,1);
    assert.equal(result.cells[2],1,'cue ball respawns only after its pocket transition is recorded');
  }
});

test('rounded middle jaws reflect incoming balls with bounded energy and symmetric response',()=>{
  const inputs=[[479,8,-1,-1],[521,8,1,-1],[479,492,-1,1],[521,492,1,1]];
  const results=inputs.map(([x,y,vx,vy])=>resolveCushion(x,y,vx,vy));
  for(const r of results){
    assert.ok(r.hit,'a graze overlapping the jaw must resolve');
    assert.ok(r.normalSpeed>0);
    assert.ok(Math.hypot(r.vx,r.vy)<=Math.SQRT2+1e-9,'cushion cannot add collision energy');
    assert.equal(pocketIndex(r.x,r.y),-1,'jaw contact is not an automatic pocket');
  }
  const [a,b,c,d]=results,near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);
  near(a.x,1000-b.x);near(a.y,b.y);near(a.vx,-b.vx);near(a.vy,b.vy);
  near(a.x,c.x);near(a.y,500-c.y);near(a.vx,c.vx);near(a.vy,-c.vy);
  near(a.x,1000-d.x);near(a.y,500-d.y);
});

test('real middle-jaw impacts use the muffled rail event and retain contact-strength differences',()=>{
  // 30% stronger strokes: 5/10/25 keep the first contact on the middle
  // jaw and preserve the light/medium/hard strength ladder.
  const strengths=[5,10,25].map(power=>{
    const result=shoot(clearTable(500,50),power,2400),trace=frames(result);
    const impact=result.audioEvents[0];
    assert.equal(impact.kind,'rail','the cloth-covered jaw must use the cushion sound bank');
    assert.equal(impact.id,0);assert.ok(impact.strength>0&&impact.strength<=1);
    const nearImpact=trace[Math.min(trace.length-1,Math.ceil(impact.time/16))];
    assert.ok(nearImpact[0]>4600&&nearImpact[0]<5400&&nearImpact[1]<400,'first contact must occur at the middle jaw');
    assert.ok(trace.every(f=>f[2]===1),'this grazing fixture rebounds without entering a well');
    assert.ok(!result.audioEvents.some(e=>e.kind==='pocket'),'no bag or return sound before a real capture');
    assert.ok(result.audioEvents.every(e=>e.kind==='rail'),'an empty-table jaw rebound emits no ball or rubbing impact');
    return impact.strength;
  });
  assert.ok(strengths[1]>strengths[0]*2,'medium contact must be audibly stronger than light');
  assert.ok(strengths[2]>strengths[1]*2,'hard contact must be stronger than medium');
  // An oblique hit is quieter than an equally fast head-on contact.
  const oblique=resolveCushion(479,8,-1,0),headOn=resolveCushion(479,8,-13/Math.hypot(13,8),-8/Math.hypot(13,8));
  assert.ok(oblique.hit&&headOn.hit);assert.ok(oblique.normalSpeed<headOn.normalSpeed);
});

test('pocket approaches at low and maximum power stay finite and within the physical table envelope',()=>{
  for(const power of [1,20,100])for(const angle of [0,150,450,900,1350,1800,2250,2700,3150]){
    const result=shoot(clearTable(500,250),power,angle);
    for(const f of frames(result)){
      assert.ok(f.every(Number.isFinite));
      if(f[2]){
        assert.ok(f[0]>=-700&&f[0]<=10700,'live ball must not escape left/right table frame');
        assert.ok(f[1]>=-700&&f[1]<=5700,'live ball must not escape top/bottom table frame');
      }
    }
  }
});

test('server replay recognizes sideways jaw rebounds without mistaking a pass or ball contact for a cushion',()=>{
  const replay=(state,result)=>{
    const trace=[state.cells.slice(0,48),...frames(result)],events=[];
    for(let k=2;k<trace.length;k++)for(const e of replayImpacts(trace[k-2],trace[k-1],trace[k]))events.push({...e,time:k*16});
    return events;
  };
  const strengths=[];
  for(const power of [7,20]){
    const state=clearTable(500,50),result=shoot(state,power,2500),events=replay(state,result);
    const first=result.audioEvents.find(e=>e.kind==='rail'),detected=events.find(e=>e.kind==='rail');
    assert.ok(detected,'a jaw can reverse horizontal speed while continuing upward');
    assert.ok(Math.abs(detected.time-first.time)<=48,'sampled audio must accompany the first jaw contact, not only a later rebound');
    assert.ok(!events.some(e=>e.kind==='pocket'));
    strengths.push(detected.strength);
  }
  assert.ok(strengths[1]>strengths[0]*2);
  for(const y of [16,484]){
    const state=clearTable(400,y);
    assert.ok(!replay(state,shoot(state,5,0)).some(e=>e.kind==='rail'),'a tangent pass makes no cushion impact');
  }
  const still=clearTable(480,16).cells.slice(0,48);
  assert.deepEqual(replayImpacts(still,still,still),[],'resting contact cannot repeat');
  const before=Array(48).fill(0),prev=before.slice(),next=before.slice();
  for(const f of [before,prev,next]){f[2]=f[5]=1;f[0]=f[3]=3000;f[4]=160;}
  before[1]=680;prev[1]=480;next[1]=480;next[4]=0;
  const contact=replayImpacts(before,prev,next);
  assert.ok(contact.some(e=>e.kind==='ball'),'fixture must resolve a ball collision near the rail');
  assert.ok(!contact.some(e=>e.kind==='rail'),'ball collision alone cannot synthesize a cushion hit');
});
