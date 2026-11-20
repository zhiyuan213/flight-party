/* Reference-style snooker table — pure Canvas 2D, presentation only.
 *
 * The reference art is not a flat green rectangle with six black dots: the
 * wooden surround has long horizontal grain and a lit inner bevel, the raised
 * cushion band is a shaded strip that rounds INTO every pocket, and each mouth
 * is a recessed well with a warm wooden collar, a dark inner wall and a faint
 * lip highlight. The band also casts a soft shadow onto the baize. A pocket
 * mouth is left OPEN: six separate noses end inside the wells. Cushion fills,
 * shadows and highlights share those same curves, leaving the approach clear.
 *
 * Everything is drawn in table coordinates: the playing surface is
 * 0..1000 / 0..500, the cushion band occupies -16..0 / 1000..1016, and the
 * wooden surround runs from -69 to 1069 (the physical TABLE_PAD stays 72 so
 * pointer mapping and the replay frames need no change). No pearl sights,
 * no watermark. The live view can attach its own right-side ball collector.
 *
 * Pool never imports this module; its makeTable() stays byte-for-byte intact.
 */
import {TABLE_WIDTH,TABLE_HEIGHT,TABLE_PAD} from './pool-table.js';
import {snookerPockets,SNOOKER_POCKET_SCALE} from './pool-geometry.js?v=20261114-pocketdepth1&power=20261120-poolpower30';
import {SNOOKER_LIGHT} from './snooker-light.js?v=20261113-reboundlight1';
import {paintFrameFinish} from './billiard-materials.js?v=20261113-materials1';

const TAU=Math.PI*2;
export const SNOOKER_CUSHION_WIDTH=16; // 20% slimmer; the playing-surface nose stays fixed.
const OUT={x:-69,y:-69,w:1138,h:638,r:46};
const COLOUR_SPOTS=[[260,330],[260,170],[260,250],[500,250],[752,250],[918,250]];

function rect(ctx,b){ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,b.r);}
function woodGrain(ctx){
  ctx.save();rect(ctx,OUT);ctx.clip();
  // Quiet, flowing heartwood figure rather than a regular crosshatched pattern.
  for(let i=0;i<230;i++){
    const y=-82+i*3,phase=i*.71;
    ctx.strokeStyle=i%4 ? 'rgba(49,18,9,.065)' : 'rgba(222,146,90,.07)';
    ctx.lineWidth=i%9===0?2.6:.6;
    ctx.beginPath();ctx.moveTo(-69,y);
    ctx.bezierCurveTo(210,y+Math.sin(phase)*12,630,y-Math.cos(phase)*16,1069,y+Math.sin(i*.21)*8);
    ctx.stroke();
  }
  ctx.restore();
}

export function snookerCloth(skin){
  const canvas=document.createElement('canvas');canvas.width=2080;canvas.height=1080;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(2080,1080),d=pixels.data;
  const base=skin?.cloth||[32,101,41];let seed=735127;
  for(let y=0;y<1080;y++)for(let x=0;x<2080;x++){
    seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    // Match Pool's diagonal woven fibres, keeping snooker's green dye and lamp.
    const noise=((seed>>>0)/4294967296-.5)*6;
    const nap=.18*Math.sin((x+y)*.031);
    const fibre=Math.sin((x-y)*.92+nap)*2.8
      +Math.sin((x-y)*1.84+.35*Math.sin(y*.043))*1.15+Math.sin((x+y)*1.31)*.75;
    const lamp=Math.exp(-((x-2*(SNOOKER_LIGHT.x+20))**2/1200000+(y-2*(SNOOKER_LIGHT.y+20))**2/390000));
    const k=(y*2080+x)*4;
    d[k]=base[0]+18*lamp+noise+fibre;
    d[k+1]=base[1]+38*lamp+noise+fibre;
    d[k+2]=base[2]+16*lamp+noise+fibre;d[k+3]=255;
  }
  ctx.putImageData(pixels,0,0);return canvas;
}

/* Arc from (fx,fy) to (tx,ty) on the circle (cx,cy,R), sweeping past (ax,ay).
 * The pocket contours all wrap a hole, so picking the sweep by hand for six
 * mirrored holes is error-prone; the apex decides the direction instead. */
function arcAround(ctx,cx,cy,R,fx,fy,tx,ty,ax,ay){
  const f=Math.atan2(fy-cy,fx-cx),t=Math.atan2(ty-cy,tx-cx),a=Math.atan2(ay-cy,ax-cx);
  const norm=x=>((x-f)%TAU+TAU)%TAU;
  ctx.arc(cx,cy,R,f,t,norm(a)>norm(t));
}
/* The wooden rail's inner boundary follows the cushion width; at
 * every pocket it arches AROUND the hole (a circular cutout a little wider
 * than the well). This is what makes the mouth read as carved into the rail
 * instead of a disc glued in front of it. The same path is the cloth clip,
 * the outer edge of the cushion band and the lit wood/rubber boundary. */
function bandOuterPath(ctx,holes){
  const edge=SNOOKER_CUSHION_WIDTH;
  const cr=holes[0].r+4,mr=holes[1].r+4,c=-holes[0].x,my=-holes[1].y,S=Math.SQRT1_2;
  const cd=Math.sqrt(cr*cr-(edge-c)**2),md=Math.sqrt(mr*mr-(my-edge)**2);
  ctx.moveTo(-c+cd,-edge);
  ctx.lineTo(500-md,-edge);
  arcAround(ctx,500,-my,mr,500-md,-edge,500+md,-edge,500,-my-mr);
  ctx.lineTo(1000+c-cd,-edge);
  arcAround(ctx,1000+c,-c,cr,1000+c-cd,-edge,1000+edge,-c+cd,1000+c+cr*S,-c-cr*S);
  ctx.lineTo(1000+edge,500+c-cd);
  arcAround(ctx,1000+c,500+c,cr,1000+edge,500+c-cd,1000+c-cd,500+edge,1000+c+cr*S,500+c+cr*S);
  ctx.lineTo(500+md,500+edge);
  arcAround(ctx,500,500+my,mr,500+md,500+edge,500-md,500+edge,500,500+my+mr);
  ctx.lineTo(-c+cd,500+edge);
  arcAround(ctx,-c,500+c,cr,-c+cd,500+edge,-edge,500+c-cd,-c-cr*S,500+c+cr*S);
  ctx.lineTo(-edge,-c+cd);
  arcAround(ctx,-c,-c,cr,-edge,-c+cd,-c+cd,-edge,-c-cr*S,-c-cr*S);
  ctx.closePath();
}
/* Six separate cushion noses. Every path ends INSIDE its adjacent wells,
 * leaving a clear corridor between the two jaws of each pocket. The same
 * curves define the cushion fill, its shadow and its highlight. */
export function snookerCushionNoses(holes){
  const edge=SNOOKER_CUSHION_WIDTH;
  const c=holes[0],m=holes[1],corner=32;
  // The two edges meet at each cloth-covered tip, on the outer rail boundary.
  // Small well-hidden connectors keep the six paths independent and open.
  const tip=c.x+Math.sqrt((c.r+4)**2-(-edge-c.y)**2);
  const midTip=Math.sqrt((m.r+4)**2-(-edge-m.y)**2);
  // The middle end is the corner end reflected along the same rail: equal
  // shoulder length and tangent, rather than a short, nearly vertical hook.
  const mouth=midTip+corner-tip;
  const top=[['M',c.x,c.y],['L',tip,-edge],['C',tip+8,-edge*.4,corner-12,0,corner,0],
    ['L',m.x-mouth,0],['C',m.x-mouth+12,0,m.x-midTip-8,-edge*.4,m.x-midTip,-edge],['L',m.x,m.y]];
  const side=[['M',c.x,c.y],['L',-edge,tip],['C',-edge*.4,tip+8,0,corner-12,0,corner],
    ['L',0,500-corner],['C',0,500-corner+12,-edge*.4,500-tip-8,-edge,500-tip],['L',c.x,500-c.y]];
  const map=(path,flipX,flipY)=>path.map(([op,...xy])=>[op,...xy.map((n,i)=>i%2?(flipY?500-n:n):(flipX?1000-n:n))]);
  return [top,map(top,true,false),side,map(side,true,false),map(top,false,true),map(top,true,true)];
}
function traceNose(ctx,path,start=true){
  for(const [op,...p] of path){
    if(op==='M'){if(start)ctx.moveTo(...p);else ctx.lineTo(...p);}
    else if(op==='L')ctx.lineTo(...p);
    else ctx.bezierCurveTo(...p);
  }
}
function reverseNose(path){
  const out=[['M',...path.at(-1).slice(-2)]];
  for(let i=path.length-1;i>0;i--){
    const cmd=path[i],end=path[i-1].slice(-2);
    out.push(cmd[0]==='C'?['C',...cmd.slice(3,5),...cmd.slice(1,3),...end]:['L',...end]);
  }
  return out;
}
function nosePath(ctx,holes){
  const p=snookerCushionNoses(holes);
  // Join only at well centres, behind the visible hole, to clip the open bed.
  [p[0],reverseNose(p[1]),p[3],p[5],reverseNose(p[4]),reverseNose(p[2])]
    .forEach((path,i)=>traceNose(ctx,path,i===0));
  ctx.closePath();
}
function bandPath(ctx,holes){
  const edge=SNOOKER_CUSHION_WIDTH;
  ctx.beginPath();
  snookerCushionNoses(holes).forEach((path,i)=>{
    traceNose(ctx,path);
    const start=path[0].slice(-2),end=path.at(-1).slice(-2);
    if(i===2||i===3){const x=i===2?-edge:1000+edge;ctx.lineTo(x,end[1]);ctx.lineTo(x,start[1]);}
    else {const y=i<2?-edge:500+edge;ctx.lineTo(end[0],y);ctx.lineTo(start[0],y);}
    ctx.closePath();
  });
}
function noseLinePath(ctx,holes){
  for(const path of snookerCushionNoses(holes))traceNose(ctx,path);
}

function paintStrip(ctx,strip,stops){
  const [x0,y0,x1,y1,rx,ry,rw,rh]=strip;
  const g=ctx.createLinearGradient(x0,y0,x1,y1);
  for(const [at,colour] of stops)g.addColorStop(at,colour);
  ctx.fillStyle=g;ctx.fillRect(rx,ry,rw,rh);
}

/* Keep the cloth-covered upper band clear: only a soft shoulder highlight,
 * never a dark gradient inside it. The separate cushionShadow layer supplies
 * the shadow outside the band, on the receiving baize. */
function cushionLight(ctx,holes){
  const edge=SNOOKER_CUSHION_WIDTH;
  ctx.save();ctx.beginPath();bandOuterPath(ctx,holes);ctx.clip();bandPath(ctx,holes);ctx.clip();
  const strips=[
    [0,-edge,0,0,-25,-25,1050,30],
    [0,500+edge,0,500,-25,495,1050,30],
    [-edge,0,0,0,-25,-25,30,550],
    [1000+edge,0,1000,0,995,-25,30,550]
  ];
  for(const s of strips)paintStrip(ctx,s,[
    [0,'rgba(147,209,120,.20)'],
    [.38,'rgba(147,209,120,.07)'],
    [1,'rgba(147,209,120,0)']
  ]);
  ctx.restore();
}
/* The cushion sits above the baize: a crisp dark contact edge plus a blurred
 * falloff that fades into the cloth. Clipping to the bed keeps the shadow on
 * the cloth side only, so the rubber never looks like a black outline. */
function cushionShadow(ctx,holes){
  // Isolated cached shadow layer lets the entrance stay completely clear,
  // without changing the same baize texture or its central lighting.
  const layer=document.createElement('canvas');layer.width=TABLE_WIDTH*2;layer.height=TABLE_HEIGHT*2;
  const c=layer.getContext('2d');c.scale(2,2);c.translate(TABLE_PAD,TABLE_PAD);
  c.save();c.beginPath();nosePath(c,holes);c.clip();
  c.beginPath();noseLinePath(c,holes);
  c.strokeStyle='rgba(0,16,5,.48)';c.lineWidth=6;
  c.shadowColor='rgba(0,12,4,.75)';c.shadowBlur=14;c.shadowOffsetY=1;c.stroke();c.restore();
  c.globalCompositeOperation='destination-out';
  for(const p of holes){
    const ux=p.middle?0:(p.x<500?1:-1)*Math.SQRT1_2;
    const uy=(p.y<250?1:-1)*(p.middle?1:Math.SQRT1_2);
    c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(uy,ux));
    const clear=c.createLinearGradient(0,-18,0,18);
    clear.addColorStop(0,'rgba(0,0,0,0)');clear.addColorStop(.18,'#000');
    clear.addColorStop(.82,'#000');clear.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=clear;c.fillRect(0,-18,p.r+65,36);c.restore();
  }
  ctx.drawImage(layer,-TABLE_PAD,-TABLE_PAD,TABLE_WIDTH,TABLE_HEIGHT);
}
/* The rear wooden half of each opening has a bevel and a dark vertical wall.
 * The forward half stays bare cloth all the way to the well, with no ring. */
function pocketCollars(ctx,holes,skin=null){
  const edge=SNOOKER_CUSHION_WIDTH;
  for(const p of holes){
    const sx=p.x>500?-1:1,sy=p.y>250?-1:1;
    const cx=p.middle?500:(sx<0?1000-p.x:p.x),cy=sy<0?500-p.y:p.y,R=p.r+4;
    // Ends meet the straight wood/cloth boundary exactly, rather than a
    // freestanding half-ring with exposed blunt ends.
    const a=Math.asin((-edge-cy)/R);
    // The middle collar overlaps the 1.8-unit green seam at either end.
    // Carrying the same wood bevel over the join removes the pale exposed
    // tips; the black well and the cloth-facing opening keep their contours.
    const seam=p.middle?1.4/R:0;
    const start=(p.middle?Math.PI-a:Math.acos((-edge-cx)/R))-seam;
    const end=TAU+a+seam;
    ctx.save();ctx.translate(sx<0?1000:0,sy<0?500:0);ctx.scale(sx,sy);
    const bevel=ctx.createRadialGradient(cx,cy,p.r,cx,cy,R);
    bevel.addColorStop(0,skin?.frame[3]||'#392014');bevel.addColorStop(.45,skin?.frame[2]||'#5e321e');
    bevel.addColorStop(.85,skin?.frame[0]||'#9a603b');bevel.addColorStop(1,skin?.rim||'#a56b42');
    ctx.beginPath();ctx.arc(cx,cy,R,start,end);ctx.arc(cx,cy,p.r,end,start,true);ctx.closePath();
    ctx.fillStyle=bevel;ctx.fill();
    // Inner shadow where the collar drops into the well, then a bright crest
    // on the raised top of the bevel — both give the collar a read of depth.
    ctx.beginPath();ctx.arc(cx,cy,p.r+.2,start,end);
    ctx.strokeStyle='rgba(20,8,4,.38)';ctx.lineWidth=.7;ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,p.r+(R-p.r)*.55,start,end);
    ctx.strokeStyle='rgba(255,214,150,.24)';ctx.lineWidth=.6;ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,R-.2,start,end);
    ctx.strokeStyle='rgba(210,143,87,.2)';ctx.lineWidth=.55;ctx.stroke();ctx.restore();
  }
}
function drawPockets(ctx,holes){
  for(const p of holes){
    ctx.save();
    // A recessed well, not a flat disc: the centre falls deepest while the
    // rim catches a little of the overhead lamp, so the hole reads as a hole
    // with depth instead of a black sticker.
    const depth=ctx.createRadialGradient(p.x,p.y-p.r*.08,p.r*.1,p.x,p.y,p.r);
    depth.addColorStop(0,'#040504');
    depth.addColorStop(.55,'#090c09');
    depth.addColorStop(.85,'#11150e');
    depth.addColorStop(1,'#1a1f15');
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.fillStyle=depth;ctx.fill();
    // Lit rim: a thin bright ring where the mouth meets the wooden collar.
    ctx.beginPath();ctx.arc(p.x,p.y,p.r-.4,0,TAU);
    ctx.strokeStyle='rgba(224,240,190,.17)';ctx.lineWidth=.8;ctx.stroke();
    // Faint reflected light on the far inner wall, to hint at the well depth.
    ctx.beginPath();ctx.arc(p.x,p.y,p.r*.74,Math.PI*.12,Math.PI*.88);
    ctx.strokeStyle='rgba(140,180,120,.12)';ctx.lineWidth=.7;ctx.stroke();
    ctx.restore();
  }
}

function drawMarkings(ctx){
  ctx.strokeStyle='#e6f4d38a';ctx.lineWidth=1.35;
  ctx.beginPath();ctx.moveTo(260,0);ctx.lineTo(260,500);ctx.stroke();
  ctx.beginPath();ctx.arc(260,250,80,Math.PI/2,Math.PI*1.5);ctx.stroke();
  for(const [x,y] of COLOUR_SPOTS){
    ctx.fillStyle='#08250f55';ctx.beginPath();ctx.arc(x,y+.4,3.3,0,TAU);ctx.fill();
    ctx.fillStyle='#eaf6d47a';ctx.beginPath();ctx.arc(x,y,2.5,0,TAU);ctx.fill();
  }
}

export function makeSnookerTable(ctx,options={}){
  const scale=options.pocketScale??SNOOKER_POCKET_SCALE;
  const holes=snookerPockets(scale);
  const cloth=snookerCloth(options.skin||null);
  ctx.clearRect(0,0,TABLE_WIDTH,TABLE_HEIGHT);
  ctx.save();ctx.translate(TABLE_PAD,TABLE_PAD);

  // --- wooden surround -------------------------------------------------
  const wood=ctx.createLinearGradient(0,OUT.y,0,OUT.y+OUT.h);
  const w=options.skin&&options.skin.snookerWood;
  wood.addColorStop(0,w?w[0]:'#8c4b2d');wood.addColorStop(.28,w?w[1]:'#804027');
  wood.addColorStop(.62,w?w[2]:'#703820');wood.addColorStop(1,w?w[3]:'#89472a');
  rect(ctx,OUT);ctx.fillStyle=wood;ctx.fill();
  if(options.skin)paintFrameFinish(ctx,OUT,options.skin);else woodGrain(ctx);
  ctx.strokeStyle='#3b2110';ctx.lineWidth=3;rect(ctx,OUT);ctx.stroke();
  ctx.strokeStyle='#bc79513b';ctx.lineWidth=3;
  ctx.beginPath();ctx.roundRect(-64,-64,1128,628,42);ctx.stroke();
  // Wooden recesses carved around every pocket, with the rail's groove and
  // bevel continuing around the arches. Covers the straight rail lines near
  // each hole, so the wood visibly wraps the mouth.

  // --- baize and raised cushions --------------------------------------
  // The cloth edge arches around each pocket cutout, exposing the collars.
  ctx.save();ctx.beginPath();bandOuterPath(ctx,holes);ctx.clip();
  ctx.drawImage(cloth,-20,-20,1040,540);
  ctx.restore();

  cushionShadow(ctx,holes);
  cushionLight(ctx,holes);

  // Each cloth-covered cushion is a closed solid, including the rounded ends.
  // Clip outlines to their own material, so they never trace a ring around a hole.
  ctx.save();ctx.beginPath();bandOuterPath(ctx,holes);ctx.clip();
  bandPath(ctx,holes);ctx.strokeStyle='rgba(144,202,119,.5)';ctx.lineWidth=1.7;ctx.stroke();
  bandPath(ctx,holes);ctx.clip();
  ctx.beginPath();noseLinePath(ctx,holes);ctx.strokeStyle='rgba(126,192,105,.7)';ctx.lineWidth=1.8;ctx.stroke();
  ctx.restore();
  pocketCollars(ctx,holes,options.skin||null);

  // --- pockets, then table markings ------------------------------------
  drawPockets(ctx,holes);
  drawMarkings(ctx);
  ctx.restore();
}
