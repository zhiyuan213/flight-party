import {poolTargets,settlePool,STATE_SIZE,PENALTY_VISIT} from './pool-rules.js?v=20261106-penalty';
import {pocketIndex,resolveCushion} from './pool-geometry.js';
export function poolStart(){const cells=Array(STATE_SIZE).fill(0);cells[0]=2500;cells[1]=2500;cells[2]=1;const rack=[1,9,2,10,8,3,4,11,5,12,6,13,7,14,15];let k=0;for(let col=0;col<5;col++)for(let row=0;row<=col;row++){const n=rack[k++];cells[n*3]=6500+col*282;cells[n*3+1]=2500+Math.round((row-col*.5)*326);cells[n*3+2]=1;}return{game:'pool',cells,turn:1,winner:0,over:false,moves:0,fen:'',history:[]};}
// Velocities use the original 8ms unit; 2ms quarter-steps retain damping per second and 16ms replay samples.
export function simulateCueShot(cells,command,ballCount=16,radius=16){const spinCode=Math.floor(command/363600),shot=command%363600,power=Math.floor(shot/3600),angle=shot%3600;if(!Number.isInteger(command)||command<0||spinCode>8||power<1||power>100)throw Error('shot');const side=[0,0,Math.SQRT1_2,1,Math.SQRT1_2,0,-Math.SQRT1_2,-1,-Math.SQRT1_2][spinCode],follow=[0,1,Math.SQRT1_2,0,-Math.SQRT1_2,-1,-Math.SQRT1_2,0,Math.SQRT1_2][spinCode];let spinLife=1,contactSpin=false;const c=cells.slice(),x=[],y=[],vx=Array(ballCount).fill(0),vy=Array(ballCount).fill(0),alive=[];for(let i=0;i<ballCount;i++){x[i]=c[i*3]/10;y[i]=c[i*3+1]/10;alive[i]=c[i*3+2]===1;}vx[0]=Math.cos(angle*Math.PI/1800)*power*.48;vy[0]=Math.sin(angle*Math.PI/1800)*power*.48;const audioEvents=[],history=[],frame=()=>x.flatMap((v,i)=>[Math.round(v*10),Math.round(y[i]*10),alive[i]?1:0]).join(',');let pocket=0,scratch=false,black=false,firstContact=0;const potted=[];
 for(let step=0;step<4800;step++){let speed=0;for(let i=0;i<ballCount;i++)if(alive[i]){x[i]+=vx[i]*.25;y[i]+=vy[i]*.25;
  const holeIndex=pocketIndex(x[i],y[i]);
  if(holeIndex>=0){
   audioEvents.push({time:step*2,kind:'pocket',strength:Math.min(1,Math.hypot(vx[i],vy[i])/40),vx:vx[i],vy:vy[i],holeIndex,id:i,key:'pocket:'+i});
   alive[i]=false;potted.push(i);vx[i]=vy[i]=0;if(i===0)scratch=true;else if(i===8)black=true;else pocket++;continue;
  }
  // Only the real cushion surfaces rebound; the pocket approach remains playable.
  const rail=resolveCushion(x[i],y[i],vx[i],vy[i],radius),railSpeed=rail.normalSpeed;
  x[i]=rail.x;y[i]=rail.y;vx[i]=rail.vx;vy[i]=rail.vy;
  if(rail.hit&&i===0&&side){const magnitude=Math.hypot(vx[i],vy[i]);vx[i]-=rail.ny*railSpeed*side*.32*spinLife;vy[i]+=rail.nx*railSpeed*side*.32*spinLife;const scale=magnitude/Math.hypot(vx[i],vy[i]);vx[i]*=scale;vy[i]*=scale;}
  if(railSpeed>.12)audioEvents.push({time:step*2,kind:'rail',strength:Math.min(1,railSpeed/40),id:i,key:'rail:'+i});
  vx[i]*=Math.pow(.991,.25);vy[i]*=Math.pow(.991,.25);if(Math.hypot(vx[i],vy[i])<.035)vx[i]=vy[i]=0;speed+=Math.hypot(vx[i],vy[i]);}
 for(let i=0;i<ballCount;i++)for(let j=i+1;j<ballCount;j++)if(alive[i]&&alive[j]){const dx=x[j]-x[i],dy=y[j]-y[i],d=Math.hypot(dx,dy);if(d>0&&d<radius*2){const nx=dx/d,ny=dy/d,overlap=(radius*2-d)/2;x[i]-=nx*overlap;y[i]-=ny*overlap;x[j]+=nx*overlap;y[j]+=ny*overlap;const impulse=(vx[i]-vx[j])*nx+(vy[i]-vy[j])*ny;if(impulse>0){if(impulse>.12)audioEvents.push({time:step*2,kind:'ball',strength:Math.min(1,impulse/32),key:i+':'+j});if(i===0&&!firstContact)firstContact=j;const incomingX=vx[i],incomingY=vy[i],incomingSpeed=Math.hypot(incomingX,incomingY);vx[i]-=impulse*nx;vy[i]-=impulse*ny;vx[j]+=impulse*nx;vy[j]+=impulse*ny;if(i===0&&!contactSpin&&spinCode){
 // Convert a finite spin budget once, scaled by the actual incoming speed and contact thickness.
 // Use the incoming direction after any cushion rebound; never accelerate beyond that speed.
 if(incomingSpeed>1e-9){const spinSpeed=Math.min(power*.48*spinLife,incomingSpeed)*Math.min(1,impulse/incomingSpeed),forward=spinSpeed*.36*follow,lateral=spinSpeed*.18*side,limit=Math.min(incomingSpeed,Math.sqrt(vx[0]*vx[0]+vy[0]*vy[0]+forward*forward+lateral*lateral));vx[0]+=(incomingX*forward-incomingY*lateral)/incomingSpeed;vy[0]+=(incomingY*forward+incomingX*lateral)/incomingSpeed;const outgoing=Math.hypot(vx[0],vy[0]);if(outgoing>limit){vx[0]*=limit/outgoing;vy[0]*=limit/outgoing;}}contactSpin=true;}}}}spinLife*=Math.pow(.997,.25);if(step%8===0&&history.length<600)history.push(frame());if(speed<.04&&step>1)break;}
 // Always expose the pocket transition before cue-ball respawn, even between replay samples.
 if(scratch){if(history.at(-1)?.split(',')[2]!=='0')history.push(frame());alive[0]=true;outer:for(let xx=180;xx<=420;xx+=30)for(let yy=80;yy<450;yy+=30){if(x.every((v,i)=>i===0||!alive[i]||Math.hypot(xx-v,yy-y[i])>=33)){x[0]=xx;y[0]=yy;break outer;}}}for(let i=0;i<ballCount;i++){c[i*3]=Math.round(x[i]*10);c[i*3+1]=Math.round(y[i]*10);c[i*3+2]=alive[i]?1:0;}history.push(frame());return {c,potted,firstContact,history,audioEvents,black,pocket};}
export function poolMove(s,actor,command){
 if(s.over||s.turn!==actor)throw Error('turn');
 const cells=Array.from({length:STATE_SIZE},(_,i)=>s.cells[i]||0);
 const {c,potted,firstContact,history,audioEvents,black,pocket}=simulateCueShot(cells,command);
 const result=settlePool(s.cells,c,actor,potted,firstContact);const over=result.over||s.moves+1>=200,winner=result.over?result.winner:over?(c[48]===c[49]?0:c[48]>c[49]?1:2):0;if(over)c[PENALTY_VISIT]=0;return{game:'pool',cells:c,turn:result.turn,winner,over,moves:s.moves+1,fen:result.foul?'犯规：'+result.foulReason:black?'8号球落袋':'本杆落袋 '+pocket+' 颗',history,audioEvents,shotCommand:command};}
export function poolBot(s){const c=s.cells;let target=8,best=Infinity;for(const i of poolTargets(c,s.turn)){const d=Math.hypot(c[i*3]-c[0],c[i*3+1]-c[1]);if(d<best){target=i;best=d;}}const a=(Math.round(Math.atan2(c[target*3+1]-c[1],c[target*3]-c[0])*1800/Math.PI)+3600)%3600;return 75*3600+a;}
export {renderPool} from './pool-view.js?v=20261107-power-50';
