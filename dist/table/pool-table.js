import {tracePocket,tracePocketBack} from './pool-geometry.js';
// Shared cloth and pocket silhouettes. Geometry is presentation-only; table units stay unchanged.
export const TABLE_WIDTH=1232,TABLE_HEIGHT=644,TABLE_PAD=72;
export const TABLE_HOLES=[[0,0],[500,0],[1000,0],[0,500],[500,500],[1000,500]];
function cornerBack(ctx){tracePocketBack(ctx,false);}
function cornerGuard(ctx){
  // Both padded lips retain the same width where they meet the straight black rails.
  ctx.beginPath();ctx.moveTo(18,-20);ctx.lineTo(18,-29);ctx.lineTo(4,-43);
  ctx.bezierCurveTo(-13,-60,-39,-54,-49,-39);
  ctx.bezierCurveTo(-63,-21,-52,-2,-38,11);ctx.lineTo(-29,18);ctx.lineTo(-20,18);
  ctx.lineTo(-33,7);ctx.bezierCurveTo(-45,-5,-54,-19,-43,-34);
  ctx.bezierCurveTo(-34,-47,-16,-53,-3,-40);ctx.lineTo(18,-20);ctx.closePath();
}
function middleBack(ctx){tracePocketBack(ctx,true);}
export function pocketPath(ctx,middle){tracePocket(ctx,middle);}
// A single open silhouette avoids square cut-outs where a ball crosses the jaws.
export function pocketEntryPath(ctx,middle){
  if(middle){
    pocketPath(ctx,true);ctx.moveTo(-26,-20);ctx.lineTo(26,-20);
    ctx.bezierCurveTo(28,-4,28,0,34,0);
    ctx.lineTo(64,64);ctx.lineTo(-64,64);ctx.lineTo(-34,0);
    ctx.bezierCurveTo(-28,0,-28,-4,-26,-20);ctx.closePath();
  }else{
    ctx.beginPath();cornerBack(ctx);ctx.lineTo(0,38);ctx.lineTo(0,80);
    ctx.lineTo(80,80);ctx.lineTo(80,0);ctx.lineTo(38,0);ctx.lineTo(18,-20);ctx.closePath();
  }
}
function pocketDepth(ctx,middle){
  const x=middle?0:-17,y=middle?-29:-19;
  const depth=ctx.createRadialGradient(x,y,2,x,y,middle?35:42);
  depth.addColorStop(0,'#303133');depth.addColorStop(.32,'#252729');depth.addColorStop(.72,'#111518');depth.addColorStop(1,'#04070a');return depth;
}
function paintPocketWell(ctx,middle){
  pocketPath(ctx,middle);ctx.fillStyle=pocketDepth(ctx,middle);ctx.fill();
  // The raised guard shades only the recessed well. This cached layer remains
  // below every live ball, and the open cloth entrance receives no dark outline.
  ctx.save();pocketPath(ctx,middle);ctx.clip();
  ctx.beginPath();tracePocketBack(ctx,middle);
  ctx.strokeStyle='#0206099c';ctx.lineWidth=4.5;ctx.lineCap='butt';
  ctx.shadowColor='#00000080';ctx.shadowBlur=3.5;ctx.shadowOffsetY=1;
  ctx.stroke();ctx.restore();
}
function polygon(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
function cushionContour(ctx,points,index){
  // The cloth reaches the INNER guard foot, then rounds into the cushion nose.
  // Use this same contour for the material and its cast shadow, not an added patch.
  ctx.moveTo(...points[0]);ctx.lineTo(...points[1]);
  if(index===0||index===2){
    const y=index===0?0:500,sign=index===0?1:-1;
    ctx.bezierCurveTo(472,y-sign*4,472,y,466,y);
  }else ctx.lineTo(...points[2]);
  ctx.lineTo(...points[3]);
  if(index===1||index===3){
    const y=index===1?0:500,sign=index===1?1:-1;
    ctx.bezierCurveTo(528,y,528,y-sign*4,526,y-sign*20);
  }
  ctx.closePath();
}
function pearlSight(ctx,x,y){
  const r=3.2;ctx.save();ctx.translate(x,y);ctx.scale(1.16,1.16);
  ctx.fillStyle='#10191dc4';ctx.beginPath();ctx.arc(0,.2,r+.65,0,Math.PI*2);ctx.fill();
  const shell=ctx.createRadialGradient(-1,-1.3,.2,0,0,r);shell.addColorStop(0,'#fffef2');shell.addColorStop(.4,'#e6f4ed');shell.addColorStop(.7,'#dce5f0');shell.addColorStop(1,'#a5bdbd');
  ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fillStyle=shell;ctx.fill();ctx.clip();
  ctx.lineWidth=.7;for(const [offset,color] of [[-1.5,'#e4d8f67a'],[0,'#fff4c993'],[1.5,'#d3f8ed8c']]){ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(-4,offset+2);ctx.bezierCurveTo(-1,offset-1,1,offset+1,4,offset-2);ctx.stroke();}
  ctx.fillStyle='#fffff6ae';ctx.beginPath();ctx.ellipse(-.85,-1.1,1.1,.45,-.5,0,Math.PI*2);ctx.fill();ctx.restore();
}
function material(){
  const canvas=document.createElement('canvas');canvas.width=2080;canvas.height=1080;
  const c=canvas.getContext('2d'),pixels=c.createImageData(canvas.width,canvas.height),data=pixels.data;let seed=735127;
  // Fine diagonal yarns with a slower irregular nap, shared at world coordinates
  // by the bed and cushions. Low random grain breaks up the weave without dots.
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    const noise=((seed>>>0)/4294967296-.5)*6;
    const nap=.18*Math.sin((x+y)*.031);
    const fibre=Math.sin((x-y)*.92+nap)*2.8+Math.sin((x-y)*1.84+.35*Math.sin(y*.043))*1.15+Math.sin((x+y)*1.31)*.75;
    // Broad overhead lamp: bright central felt, smoothly falling off on all four sides.
    const light=Math.exp(-((x-1040)**2/560000+(y-540)**2/145000));
    const at=(y*canvas.width+x)*4;
    data[at]=(22+54*light)*.94+noise+fibre;data[at+1]=(60+128*light)*.94+noise+fibre;data[at+2]=(106+140*light)*.94+noise+fibre;data[at+3]=255;
  }
  c.putImageData(pixels,0,0);return canvas;
}
export function makeTable(ctx){
  const W=TABLE_WIDTH,H=TABLE_HEIGHT,PAD=TABLE_PAD,cloth=material();
  ctx.clearRect(0,0,W,H);
  const frame=ctx.createLinearGradient(0,0,0,H);frame.addColorStop(0,'#44474a');frame.addColorStop(.08,'#303335');frame.addColorStop(.9,'#303234');frame.addColorStop(1,'#26292b');
  ctx.fillStyle=frame;ctx.beginPath();ctx.roundRect(3,3,1138,H-6,60);ctx.fill();
  ctx.strokeStyle='#717679';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(4,4,1136,H-8,59);ctx.stroke();
  ctx.strokeStyle='#171b1d';ctx.beginPath();ctx.roundRect(7,7,1130,H-14,56);ctx.stroke();
  const bevel=ctx.createLinearGradient(0,0,0,H);bevel.addColorStop(0,'#d6dee34d');bevel.addColorStop(.15,'#a7bac51a');bevel.addColorStop(.85,'#05090d60');bevel.addColorStop(1,'#b3c0c627');
  ctx.strokeStyle=bevel;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(5.5,5.5,1133,H-11,58);ctx.stroke();
  ctx.save();ctx.translate(PAD,PAD);
  const paintCloth=()=>ctx.drawImage(cloth,-20,-20,1040,540);
  // One continuous material pass, including the open cloth between every pocket jaw.
  paintCloth();
  // Draw the well BELOW cloth-covered jaws. The dark shape never overlays the cushions.
  for(const [x,y] of TABLE_HOLES){ctx.save();ctx.translate(x,y);if(y===500)ctx.scale(1,-1);if(x===1000)ctx.scale(-1,1);
    if(x!==500){
      ctx.beginPath();ctx.moveTo(-69,18);ctx.lineTo(-69,-10);ctx.bezierCurveTo(-69,-43,-43,-69,-10,-69);ctx.lineTo(18,-69);ctx.lineTo(18,-20);ctx.lineTo(-20,18);ctx.closePath();
      const cap=ctx.createLinearGradient(-60,-60,20,20);cap.addColorStop(0,'#a1a8aa');cap.addColorStop(.48,'#838c90');cap.addColorStop(1,'#626c72');ctx.fillStyle=cap;ctx.fill();
      // A narrow recessed seam and bevel follow the original outside contour.
      // Clip to the cap so this depth never changes the table's silhouette.
      ctx.save();ctx.clip();ctx.beginPath();ctx.moveTo(-69,18);ctx.lineTo(-69,-10);ctx.bezierCurveTo(-69,-43,-43,-69,-10,-69);ctx.lineTo(18,-69);
      ctx.lineWidth=5;ctx.strokeStyle='#111b2499';ctx.shadowColor='#03090f70';ctx.shadowBlur=3;ctx.shadowOffsetX=1;ctx.shadowOffsetY=1;ctx.stroke();ctx.restore();
      ctx.strokeStyle='#dbe5e944';ctx.lineWidth=1.25;ctx.beginPath();ctx.moveTo(-67,17);ctx.lineTo(-67,-10);ctx.bezierCurveTo(-67,-42,-42,-67,-10,-67);ctx.lineTo(17,-67);ctx.stroke();
      // Cap, tapered guard tip and cloth jaw meet at one shared corner (18/-20).
      // No extra cap block remains below the guard before the straight rail starts.
      ctx.strokeStyle='#090e1359';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(18,-68);ctx.lineTo(18,-20);ctx.moveTo(-68,18);ctx.lineTo(-20,18);ctx.stroke();
      ctx.strokeStyle='#d7e1e327';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(19.5,-67);ctx.lineTo(19.5,-20);ctx.moveTo(-67,19.5);ctx.lineTo(-20,19.5);ctx.stroke();
      // Re-expose the same world-aligned cloth beneath the corner cap, BEFORE any shadows.
      ctx.save();polygon(ctx,[[18,-20],[38,0],[0,38],[-20,18]]);ctx.clip();
      ctx.scale(x===1000?-1:1,y===500?-1:1);ctx.translate(-x,-y);paintCloth();ctx.restore();
    }
    // Guard bodies share the same thickness; corner tips taper into the cloth cuts.
    const pad=ctx.createLinearGradient(-35,-55,5,15);pad.addColorStop(0,'#c5cbcc');pad.addColorStop(.5,'#b7bcbd');pad.addColorStop(1,'#98a2a5');
    ctx.save();ctx.lineWidth=14;ctx.strokeStyle=pad;ctx.lineCap='butt';
    if(x===500){
      // The well covers the inner half of this constant-width stroke, leaving
      // an even 7-unit pad measured normal to the same inner arch all the way round.
      ctx.beginPath();ctx.rect(-50,-70,100,50);ctx.clip();
      ctx.beginPath();middleBack(ctx);ctx.stroke();
    }
    else{cornerGuard(ctx);ctx.fillStyle=pad;ctx.fill();}
    ctx.restore();paintPocketWell(ctx,x===500);
    ctx.restore();
  }
  // The cushion ends are the only diagonal faces: the pocket entrance stays continuous cloth.
  const cushions=[[[18,-20],[474,-20],[466,0],[38,0]],[[526,-20],[982,-20],[962,0],[534,0]],[[18,520],[474,520],[466,500],[38,500]],[[526,520],[982,520],[962,500],[534,500]],[[-20,18],[0,38],[0,462],[-20,482]],[[1020,18],[1000,38],[1000,462],[1020,482]]];
  // Raised cushions cast onto the surrounding cloth, never onto their own top faces.
  // Subtract all cushion footprints before drawing the soft silhouettes.
  ctx.save();ctx.beginPath();ctx.rect(-20,-20,1040,540);
  cushions.forEach((points,index)=>cushionContour(ctx,points,index));
  ctx.clip('evenodd');ctx.fillStyle='#06182e';ctx.shadowColor='#04112eb3';ctx.shadowBlur=22;
  cushions.forEach((points,index)=>{
    ctx.shadowOffsetX=index===4?6:index===5?-6:0;ctx.shadowOffsetY=index<2?6:index<4?-6:0;
    ctx.beginPath();cushionContour(ctx,points,index);ctx.fill();
  });ctx.restore();
  cushions.forEach((points,index)=>{
    ctx.save();ctx.beginPath();cushionContour(ctx,points,index);ctx.clip();paintCloth();
    const g=index<2?ctx.createLinearGradient(0,-20,0,0):index<4?ctx.createLinearGradient(0,520,0,500):index===4?ctx.createLinearGradient(-20,0,0,0):ctx.createLinearGradient(1020,0,1000,0);
    g.addColorStop(0,'#e1f4ff13');g.addColorStop(.6,'#d1edff09');g.addColorStop(.9,'#061e3910');g.addColorStop(1,'#061e3914');ctx.fillStyle=g;ctx.fill();ctx.restore();
  });
  // The rounded corner well cuts through the meeting cushion ends.
  // This is still part of the cached table, entirely below live balls.
  for(const [x,y] of TABLE_HOLES)if(x!==500){ctx.save();ctx.translate(x,y);ctx.scale(x===1000?-1:1,y===500?-1:1);paintPocketWell(ctx,false);ctx.restore();}
  ctx.strokeStyle='#d5eeff24';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(250,25);ctx.lineTo(250,475);ctx.stroke();
  for(const x of [250,750]){ctx.fillStyle='#c7e9fc44';ctx.beginPath();ctx.arc(x,250,2,0,Math.PI*2);ctx.fill();}
  ctx.textAlign='center';ctx.font='600 12px sans-serif';ctx.fillStyle='#c0edff10';ctx.fillText('J O Y F L O C K',500,265);
  const sightOffset=(TABLE_PAD-7+20)/2;
  for(const x of [125,250,375,625,750,875])for(const y of [-sightOffset,500+sightOffset])pearlSight(ctx,x,y);
  for(const x of [-sightOffset,1000+sightOffset])for(const y of [125,250,375])pearlSight(ctx,x,y);
  ctx.restore();
}
