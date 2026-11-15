import test from 'node:test';
import assert from 'node:assert/strict';
import {TABLE_PAD,TABLE_HOLES} from '../dist/table/pool-table.js';
import {pocketMotion,pocketPosition,POCKET_DURATION} from '../dist/table/pool-return.js';
import {poolStart,poolMove} from '../dist/table/pool.js';

// Six pockets expressed in one local frame: (lx, ly) always points into the
// cloth from the pocket, so a mirrored stroke is literally the same input.
const NAMES=['LT','MT','RT','LB','MB','RB'];
const CORNERS=[0,2,3,5],MIDDLES=[1,4];
function frame(hx,hy){return {sx:hx===1000?-1:1,sy:hy===500?-1:1,middle:hx===500};}
function shotXY(x,y,angle,power){
  const s=poolStart();for(let i=1;i<16;i++)s.cells[i*3+2]=0;
  s.cells[0]=x*10;s.cells[1]=y*10;
  const r=poolMove(s,1,power*3600+angle),cap=r.audioEvents.find(e=>e.kind==='pocket');
  if(!cap)return null;
  const f=r.history.map(v=>v.split(',').map(Number)).find(v=>!v[2]);if(!f)return null;
  return {...cap,id:3,start:0,scratch:true,shotPower:power,x:f[0]/10+TABLE_PAD,y:f[1]/10+TABLE_PAD};
}
function shotDir(gx,gy,dir,power){
  const deg=(Math.atan2(dir[1],dir[0])*180/Math.PI+360)%360;
  return shotXY(gx,gy,Math.round(deg*10),power);
}
function classify(item){
  const m=pocketMotion(item);
  return {m,branch:m.rattle?'rattle':m.rebound?'rebound':'plain',
    count:m.rebound?m.rebound.bounces:(m.rattle?Number(m.rattle.turns.toFixed(2)):0)};
}
// Local polar sweep: approach the well from `angle` off its inward normal,
// with a small aiming offset, from three distances. All six pockets get the
// exact same set of local inputs; only the world mirror transform differs.
const ANGLES=[-60,-45,-30,-15,0,15,30,45,60],OFFSETS=[-18,-9,0,9,18],DISTANCES=[120,200,280];
function sweep(power){
  const table=new Map();
  for(let idx=0;idx<6;idx++){
    const [hx,hy]=TABLE_HOLES[idx],{sx,sy,middle}=frame(hx,hy);
    const center=middle?[0,-26]:[-17,-17],base=middle?[0,1]:[Math.SQRT1_2,Math.SQRT1_2],rows=[];
    for(const adeg of ANGLES)for(const e of OFFSETS)for(const L of DISTANCES){
      const a=adeg*Math.PI/180,cs=Math.cos(a),sn=Math.sin(a);
      const d=[base[0]*cs-base[1]*sn,base[0]*sn+base[1]*cs],tangent=[-d[1],d[0]];
      const start=[center[0]+d[0]*L+tangent[0]*e,center[1]+d[1]*L+tangent[1]*e];
      const target=[center[0]+tangent[0]*e*.35,center[1]+tangent[1]*e*.35];
      let v=[target[0]-start[0],target[1]-start[1]],length=Math.hypot(...v);v=v.map(q=>q/length);
      const gx=hx+start[0]*sx,gy=hy+start[1]*sy;
      if(gx<25||gx>975||gy<25||gy>475)continue;
      const item=shotDir(gx,gy,[v[0]*sx,v[1]*sy],power);
      if(!item||item.holeIndex!==idx)continue;
      const {m,branch,count}=classify(item);
      let worst=0;
      for(let i=1;i<m.samples.length;i++){
        const u=m.samples[i-1],w=m.samples[i];
        worst=Math.max(worst,Math.hypot(w.x-u.x,w.y-u.y));
      }
      rows.push({key:`${adeg}/${e}/${L}`,branch,count,drop:m.dropAt,worst,contacts:m.contacts.length});
    }
    table.set(idx,rows);
  }
  return table;
}
const full=sweep(100);

test('a full-power pot is animated on every pocket and every approach angle',()=>{
  let total=0;
  for(let idx=0;idx<6;idx++){
    const rows=full.get(idx);
    assert.ok(rows.length>=30,`${NAMES[idx]} has enough sampled pots`);
    total+=rows.length;
    for(const r of rows){
      assert.notEqual(r.branch,'plain',`${NAMES[idx]} ${r.key} must not drill straight in`);
      assert.ok(r.contacts>0,`${NAMES[idx]} ${r.key} must produce a wall contact`);
      assert.ok(r.drop>0&&r.drop<POCKET_DURATION,`${NAMES[idx]} ${r.key} drops within the animation`);
      assert.ok(r.worst<=2.3,`${NAMES[idx]} ${r.key} stays continuous: ${r.worst}`);
    }
  }
  assert.ok(total>250,'the sweep covers a few hundred full-power pots');
});

test('the four corners match each other, and the two middle pockets match each other',()=>{
  for(const [name,ids] of [['corners',CORNERS],['middles',MIDDLES]]){
    const keys=new Set(ids.flatMap(i=>full.get(i).map(r=>r.key)));
    assert.ok(keys.size>=30);
    for(const key of keys){
      const seen=ids.map(i=>full.get(i).find(r=>r.key===key)).filter(Boolean);
      if(seen.length<2)continue;
      const signature=r=>`${r.branch}:${r.count}`;
      const first=signature(seen[0]);
      for(const r of seen.slice(1))assert.equal(signature(r),first,`${name} ${key} is symmetric`);
    }
  }
});

test('drive scales the effect: one soft contact, a short medium orbit, eight full-power hits',()=>{
  const diagonal=p=>classify(shotXY(200,400,3069,p));
  const straight=p=>classify(shotXY(500,100,2700,p));
  const soft=straight(30);
  assert.equal(soft.branch,'plain');
  assert.equal(soft.m.contacts.length,1,'a gentle pot still has exactly one muted contact');

  const medium=diagonal(60),hard=diagonal(100);
  assert.equal(medium.branch,'rattle');
  assert.equal(hard.branch,'rattle');
  assert.ok(medium.count>0&&medium.count<hard.count,'a softer graze turns fewer laps');
  assert.ok(medium.count<1.2&&hard.count>1.5,'medium is a short lap, full power is about two');
  assert.ok(medium.m.dropAt<hard.m.dropAt,'and it drops sooner');

  assert.equal(straight(100).count,8,'full power still gives eight rebounds');
  assert.ok(straight(55).count<=2,'a firm straight pot only gets a couple');
});

test('the ball stays visible for the whole effect instead of being clipped by the closing lip',()=>{
  const item=shotXY(200,400,3069,100),m=pocketMotion(item);
  assert.ok(m.rattle);
  for(let t=0;t<m.rattle.end;t+=20){
    const p=pocketPosition(item,t);
    assert.ok(p.depth<.2,`the orbit is still on the near side of the lip at ${t} ms`);
  }
  assert.equal(pocketPosition(item,m.dropAt+80).depth,1,'it sinks normally after the final contact');
  assert.equal(pocketPosition(item,POCKET_DURATION).visible,false);
});
