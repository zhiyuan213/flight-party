/* Presentation only: a ball belongs here only while the authoritative board
 * says it is absent. In particular, scratched whites and re-spotted colours
 * never remain in the collector. No scoring or pocket physics live here. */
import {radius as BALL_RADIUS} from './snooker.js?v=20261110-dotblack1';
// One ball diameter plus the original two units of breathing room.
export const COLLECTION={entryX:1139,entryY:68,x:1189,bend:12,bottom:578,spacing:2*BALL_RADIUS+2,speed:.68};
export const COLLECTION_REBOUND_MS=250;
const FIRST_REBOUND_MS=160,SECOND_REBOUND_MS=COLLECTION_REBOUND_MS-FIRST_REBOUND_MS;
// A new ball reaches its higher stack position sooner. Keep enough headway
// for the preceding ball to finish rebounding, even on a full-table clearance.
const OBJECT_BALLS=21,ENTRY_GAP=COLLECTION_REBOUND_MS+COLLECTION.spacing/COLLECTION.speed+24;

function collectionRoute(slot){
  const {entryX,entryY,x,bend,bottom,spacing}=COLLECTION;
  const endY=bottom-slot*spacing,straight=x-bend-entryX,arc=Math.PI*bend/2;
  // Existing resting slots have two units of breathing room. Close that gap
  // for the actual ball-to-ball impact, then relax back to the original slot.
  const compression=slot>0?spacing-2*BALL_RADIUS:0;
  const total=straight+arc+endY+compression-entryY-bend;
  return {endY,straight,arc,total,compression};
}

export function collectionImpactTime(entry,slot){
  return Number.isFinite(entry.start)?entry.start+collectionRoute(slot).total/COLLECTION.speed:-Infinity;
}

function reboundOffset(age,slot){
  if(age<0||age>=COLLECTION_REBOUND_MS)return 0;
  const second=age>=FIRST_REBOUND_MS;
  const t=second?(age-FIRST_REBOUND_MS)/SECOND_REBOUND_MS:age/FIRST_REBOUND_MS;
  const height=second?(slot?1.35:1.05):(slot?6.5:5.5);
  // Two short ballistic arcs, with most of the energy lost on the first hit.
  // Unlike a sine overshoot this never carries the ball through its support.
  return 4*height*t*(1-t);
}

export function syncSnookerCollection(entries,cells,now,{animate=false,ids=null}={}){
  const absent=id=>Number.isInteger(id)&&id>0&&id<=OBJECT_BALLS&&cells[id*3+2]===0;
  const result=entries.filter(entry=>absent(entry.id));
  const known=new Set(result.map(entry=>entry.id));
  const candidates=ids||Array.from({length:OBJECT_BALLS},(_,i)=>i+1);
  let start=now;
  for(const entry of result)if(Number.isFinite(entry.start))start=Math.max(start,entry.start+ENTRY_GAP);
  for(const id of candidates){
    if(!absent(id)||known.has(id))continue;
    result.push({id,start:animate?start:-Infinity});known.add(id);start+=ENTRY_GAP;
  }
  return result;
}

export function collectionPosition(entry,slot,now){
  const {entryX,entryY,x,bend,speed}=COLLECTION;
  const {endY,straight,arc,total,compression}=collectionRoute(slot);
  const animated=Number.isFinite(entry.start),impactAt=collectionImpactTime(entry,slot),impactAge=now-impactAt;
  const settled=!animated||now>=impactAt+COLLECTION_REBOUND_MS;
  let distance=animated?Math.max(0,Math.min(total,(now-entry.start)*speed)):total-compression;
  if(impactAge>=0&&animated){
    const settle=Math.min(1,impactAge/COLLECTION_REBOUND_MS);
    distance-=reboundOffset(impactAge,slot)+compression*settle;
  }
  const phase=settled?'settled':impactAge>=0?'rebound':now<entry.start?'waiting':'rolling';
  if(distance<straight)return {x:entryX+distance,y:entryY,distance,heading:0,visible:now>=entry.start,settled,phase};
  if(distance<straight+arc){
    const angle=(distance-straight)/bend-Math.PI/2;
    return {x:x-bend+Math.cos(angle)*bend,y:entryY+bend+Math.sin(angle)*bend,
      distance,heading:angle+Math.PI/2,visible:true,settled,phase};
  }
  return {x,y:settled?endY:entryY+bend+distance-straight-arc,distance,
    heading:Math.PI/2,visible:true,settled,phase};
}

export const collectionActive=(entries,now)=>entries.some((entry,slot)=>!collectionPosition(entry,slot,now).settled);

function railPath(ctx){
  ctx.beginPath();ctx.moveTo(1138,54);ctx.lineTo(1189,54);
  ctx.quadraticCurveTo(1203,54,1203,68);ctx.lineTo(1203,576);
  ctx.arc(1189,576,14,0,Math.PI);
  // Compact 28-unit mouth, centred on the existing y=68 entry route. The
  // lower elbow turns upward earlier without narrowing the vertical trough.
  ctx.lineTo(1175,98);ctx.quadraticCurveTo(1175,86,1163,84);ctx.lineTo(1138,82);
}

function brassGradient(ctx,x1,y1,x2,y2){
  const g=ctx.createLinearGradient(x1,y1,x2,y2);
  for(const [at,colour] of [[0,'#5c3511'],[.12,'#a36925'],[.28,'#ecc471'],
    [.38,'#fff6ce'],[.49,'#f5d990'],[.6,'#c08b3c'],[.8,'#704117'],[1,'#bd8435']])g.addColorStop(at,colour);
  return g;
}

function straightMetal(ctx,x1,y1,x2,y2){
  const length=Math.hypot(x2-x1,y2-y1);
  let nx=(y2-y1)/length,ny=-(x2-x1)/length;
  if(ny<0){nx=-nx;ny=-ny;}
  ctx.strokeStyle=brassGradient(ctx,x1-nx*4,y1-ny*4,x1+nx*4,y1+ny*4);
  ctx.lineWidth=8;ctx.lineCap='butt';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
}

export function drawSnookerCollectionTrack(ctx){
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  // Open black trough between two narrow, polished brass rails.
  railPath(ctx);ctx.closePath();
  ctx.fillStyle='#080c0c';ctx.fill();
  railPath(ctx);ctx.shadowColor='#0009';ctx.shadowBlur=6;ctx.shadowOffsetY=3;
  ctx.strokeStyle='#41280f';ctx.lineWidth=10;ctx.stroke();
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.strokeStyle=brassGradient(ctx,1170,0,1208,0);ctx.lineWidth=8;ctx.stroke();
  // Each straight tube gets its own cylindrical cross-section, rather than a
  // single wide gradient that flattens both rails into a yellow outline.
  straightMetal(ctx,1175,98,1175,576);straightMetal(ctx,1203,68,1203,576);
  straightMetal(ctx,1138,54,1189,54);straightMetal(ctx,1138,82,1163,84);
  ctx.lineCap='round';
  ctx.save();ctx.translate(2,1.7);railPath(ctx);ctx.strokeStyle='#643b1599';ctx.lineWidth=.9;ctx.stroke();ctx.restore();
  ctx.save();ctx.translate(-.85,-.95);railPath(ctx);ctx.strokeStyle='#fff7d3ba';ctx.lineWidth=.95;ctx.stroke();ctx.restore();
  const gleam=ctx.createLinearGradient(0,96,0,576);
  gleam.addColorStop(0,'#fffce500');gleam.addColorStop(.17,'#fffce5b8');
  gleam.addColorStop(.54,'#fffce529');gleam.addColorStop(.88,'#fffce59c');gleam.addColorStop(1,'#fffce500');
  ctx.strokeStyle=gleam;ctx.lineWidth=.65;
  for(const x of [1175,1203]){ctx.beginPath();ctx.moveTo(x-1.05,100);ctx.lineTo(x-1.05,566);ctx.stroke();}
  for(const x of [1175,1203])for(const y of [108,568]){
    ctx.fillStyle=brassGradient(ctx,x-5,y,x+5,y);ctx.strokeStyle='#56310e';ctx.lineWidth=.8;
    ctx.beginPath();ctx.roundRect(x-5,y-5,10,10,2);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#fff0b0b3';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x-3,y-4);ctx.lineTo(x+3,y-4);ctx.stroke();
    ctx.strokeStyle='#6c3f14';ctx.beginPath();ctx.moveTo(x-3,y+4);ctx.lineTo(x+3,y+4);ctx.stroke();
    const rivet=ctx.createRadialGradient(x-.5,y-.6,.1,x,y,1.8);
    rivet.addColorStop(0,'#fff6c6');rivet.addColorStop(.35,'#cf9e4c');rivet.addColorStop(1,'#603610');
    ctx.fillStyle=rivet;ctx.beginPath();ctx.arc(x,y,1.7,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

export function drawSnookerCollectedBalls(ctx,entries,now,radius,drawBall){
  for(let slot=0;slot<entries.length;slot++){
    const entry=entries[slot],p=collectionPosition(entry,slot,now);
    if(!p.visible)continue;
    drawBall(ctx,entry.id,p.x,p.y,radius,p.distance/radius,p.heading,null);
  }
}
