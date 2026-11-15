import {tracePocket,tracePocketBack,pocketVisualContext,POCKET_VISUAL_EXPAND,scaleAboutHole,SNOOKER_POCKET_SCALE} from './pool-geometry.js';
import {paintFrameFinish} from './billiard-materials.js?v=20261113-materials1';
// Shared cloth and pocket silhouettes. Geometry is presentation-only; table units stay unchanged.
export const TABLE_WIDTH=1232,TABLE_HEIGHT=644,TABLE_PAD=72;
export const TABLE_HOLES=[[0,0],[500,0],[1000,0],[0,500],[500,500],[1000,500]];
function cornerBack(ctx,scale=1){tracePocketBack(pocketVisualContext(ctx,false,POCKET_VISUAL_EXPAND,scale),false);}
function cornerGuard(ctx,scale=1){
  // Both padded lips retain the same width where they meet the straight black rails.
  const v=pocketVisualContext(ctx,false,POCKET_VISUAL_EXPAND,scale);
  v.beginPath();v.moveTo(18,-20);v.lineTo(18,-29);v.lineTo(4,-43);
  v.bezierCurveTo(-13,-60,-39,-54,-49,-39);
  v.bezierCurveTo(-63,-21,-52,-2,-38,11);v.lineTo(-29,18);v.lineTo(-20,18);
  v.lineTo(-33,7);v.bezierCurveTo(-45,-5,-54,-19,-43,-34);
  v.bezierCurveTo(-34,-47,-16,-53,-3,-40);v.lineTo(18,-20);v.closePath();
}
function middleBack(ctx,scale=1){tracePocketBack(pocketVisualContext(ctx,true,POCKET_VISUAL_EXPAND,scale),true);}
export function pocketPath(ctx,middle,scale=1){tracePocket(pocketVisualContext(ctx,middle,POCKET_VISUAL_EXPAND,scale),middle);}
// A single open silhouette avoids square cut-outs where a ball crosses the jaws.
export function pocketEntryPath(ctx,middle,scale=1){
  const v=pocketVisualContext(ctx,middle,POCKET_VISUAL_EXPAND,scale);
  if(middle){
    pocketPath(ctx,true,scale);v.moveTo(-26,-20);v.lineTo(26,-20);
    v.bezierCurveTo(28,-4,28,0,34,0);
    v.lineTo(64,64);v.lineTo(-64,64);v.lineTo(-34,0);
    v.bezierCurveTo(-28,0,-28,-4,-26,-20);v.closePath();
  }else{
    v.beginPath();cornerBack(ctx);v.lineTo(0,38);v.lineTo(0,80);
    v.lineTo(80,80);v.lineTo(80,0);v.lineTo(38,0);v.lineTo(18,-20);v.closePath();
  }
}
function pocketDepth(ctx,middle,scale=1){
  const x=(middle?0:-17)*scale,y=(middle?-29:-19)*scale;
  const depth=ctx.createRadialGradient(x,y,2*scale,x,y,(middle?35:42)*scale);
  depth.addColorStop(0,'#303133');depth.addColorStop(.32,'#252729');depth.addColorStop(.72,'#111518');depth.addColorStop(1,'#04070a');return depth;
}
function paintPocketWell(ctx,middle,scale=1){
  pocketPath(ctx,middle,scale);ctx.fillStyle=pocketDepth(ctx,middle,scale);ctx.fill();
  // The raised guard shades only the recessed well. This cached layer remains
  // below every live ball, and the open cloth entrance receives no dark outline.
  ctx.save();pocketPath(ctx,middle,scale);ctx.clip();
  ctx.beginPath();tracePocketBack(pocketVisualContext(ctx,middle,POCKET_VISUAL_EXPAND,scale),middle);
  ctx.strokeStyle='#0206099c';ctx.lineWidth=4.5*scale;ctx.lineCap='butt';
  ctx.shadowColor='#00000080';ctx.shadowBlur=3.5;ctx.shadowOffsetY=1;
  ctx.stroke();ctx.restore();
}
function polygon(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
/* The blue cushion band used to end in a razor-sharp 45-degree wedge at every
   pocket. A small quadratic fillet softens ONLY the joints: all four long
   edges and the mitre itself stay perfectly straight, so the grey lip and the
   blue edge still read as one line. Raise/lower this one value to tune it. */
export const CUSHION_SOFT_RADIUS=3;
function softenedContour(ctx,points,radius){
  const n=points.length;
  const along=(from,to,distance)=>{
    const dx=to[0]-from[0],dy=to[1]-from[1],len=Math.hypot(dx,dy)||1;
    const t=Math.min(.5,distance/len);
    return [from[0]+dx*t,from[1]+dy*t];
  };
  // Enter `radius` before each corner, curve through the ORIGINAL vertex as
  // control point, leave `radius` after it. The straight edges in between are
  // untouched, so the polygon's geometry does not shift at all.
  points.forEach((p,i)=>{
    const entry=along(p,points[(i+n-1)%n],radius),exit=along(p,points[(i+1)%n],radius);
    if(i===0)ctx.moveTo(...entry);else ctx.lineTo(...entry);
    ctx.quadraticCurveTo(p[0],p[1],exit[0],exit[1]);
  });
  ctx.closePath();
}
export function cushionContour(ctx,points,index,rounded=false,radius=CUSHION_SOFT_RADIUS){
  // One straight mitre at each middle-pocket jaw. The old nose was a 90-degree
  // rounded corner (across, then down), which read as a square block sticking
  // out of the cloth beside the white lip. A single diagonal keeps the pocket
  // edge one continuous line down into the cushion. `rounded` only exists so
  // the A/B preview can render the previous look; production always uses the
  // mitre. Purely a drawing contour: physical rails keep their rounded nose.
  if(rounded&&(index===0||index===1||index===2||index===3)){
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
    ctx.closePath();return;
  }
  softenedContour(ctx,points,radius);
}
function pearlSight(ctx,x,y){
  const r=3.2;ctx.save();ctx.translate(x,y);ctx.scale(1.16,1.16);
  ctx.fillStyle='#10191dc4';ctx.beginPath();ctx.arc(0,.2,r+.65,0,Math.PI*2);ctx.fill();
  const shell=ctx.createRadialGradient(-1,-1.3,.2,0,0,r);shell.addColorStop(0,'#fffef2');shell.addColorStop(.4,'#e6f4ed');shell.addColorStop(.7,'#dce5f0');shell.addColorStop(1,'#a5bdbd');
  ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fillStyle=shell;ctx.fill();ctx.clip();
  ctx.lineWidth=.7;for(const [offset,color] of [[-1.5,'#e4d8f67a'],[0,'#fff4c993'],[1.5,'#d3f8ed8c']]){ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(-4,offset+2);ctx.bezierCurveTo(-1,offset-1,1,offset+1,4,offset-2);ctx.stroke();}
  ctx.fillStyle='#fffff6ae';ctx.beginPath();ctx.ellipse(-.85,-1.1,1.1,.45,-.5,0,Math.PI*2);ctx.fill();ctx.restore();
}
/* `skin.cloth` is the single themed dye base; with no skin the arithmetic
   below is exactly the original Pool / Snooker felt. */
export function material(snooker,skin){
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
    // The reference snooker cloth is an even mid green: a much wider lamp keeps
    // the corners from going nearly black, so the bed reads as one flat baize.
    const snookerLight=Math.exp(-((x-1040)**2/2600000+(y-540)**2/900000));
    const at=(y*canvas.width+x)*4;
    // The same woven felt, re-dyed: a bright, even mid green like the
    // reference table. Only the cloth channel changes.
    const base=skin&&skin.cloth?skin.cloth:(snooker?[52,112,48]:[22,60,106]);
    const gain=snooker?[28,32,22]:[54,128,140],lamp=snooker?snookerLight:light;
    const dye=[base[0]+gain[0]*lamp,base[1]+gain[1]*lamp,base[2]+gain[2]*lamp];
    data[at]=dye[0]*.94+noise+fibre;data[at+1]=dye[1]*.94+noise+fibre;data[at+2]=dye[2]*.94+noise+fibre;data[at+3]=255;
  }
  c.putImageData(pixels,0,0);return canvas;
}
// Pool's table only. Snooker now has its own renderer in snooker-table.js, so
// every `snooker` branch below is legacy and unreachable; they remain for now
// to keep the well-tested Pool drawing path completely unchanged.
export function makeTable(ctx,options={}){
  const W=TABLE_WIDTH,H=TABLE_HEIGHT,PAD=TABLE_PAD,snooker=!!options.snooker,cloth=material(snooker,options.skin||null);
  // q scales the pocket silhouette, jaw gap and guards. Pool stays at 1.
  // An explicit options.pocketScale lets the proportion preview render the old
  // look side by side with the snooker look.
  const q=options.pocketScale??(snooker?SNOOKER_POCKET_SCALE:1);
  // Snooker's smaller mouth uses a plain leather guard; Pool keeps its chrome.
  const hardware=snooker&&q<1;
  const finish=options.skin,metal=finish?.metal;
  const padStops=metal?[metal[1],metal[2],metal[0]]:hardware?['#9a825f','#6d5639','#3e2e1d']:['#c5cbcc','#b7bcbd','#98a2a5'];
  ctx.clearRect(0,0,W,H);
  /* The wooden surround is one solid colour with a gentle, edgeless vignette.
     A previous radial gradient made the top/bottom rails much darker than the
     left/right ones, and a hard dark skirt left a visible straight seam near
     each rounded corner. Both read as a rendering artefact on a snooker table. */
  const frame=snooker?'#8b5a32':ctx.createLinearGradient(0,0,0,H);
  const f=options.skin&&options.skin.frame;
  if(!snooker){frame.addColorStop(0,f?f[0]:'#44474a');frame.addColorStop(.08,f?f[1]:'#303335');
   frame.addColorStop(.9,f?f[2]:'#303234');frame.addColorStop(1,f?f[3]:'#26292b');}
  ctx.fillStyle=frame;ctx.beginPath();ctx.roundRect(3,3,1138,H-6,60);ctx.fill();
  if(finish)paintFrameFinish(ctx,{x:3,y:3,w:1138,h:H-6,r:60},finish);
  if(snooker){
    ctx.save();ctx.beginPath();ctx.roundRect(3,3,1138,H-6,60);ctx.clip();
    const vignette=ctx.createRadialGradient(W/2,H/2,140,W/2,H/2,780);
    vignette.addColorStop(0,'#1a0e0600');vignette.addColorStop(.62,'#1a0e0612');vignette.addColorStop(1,'#1a0e0638');
    ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);ctx.restore();
  }
  ctx.strokeStyle=snooker?'#e2be8b':'#717679';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(4,4,1136,H-8,59);ctx.stroke();
  ctx.strokeStyle=snooker?'#2b160c':'#171b1d';ctx.beginPath();ctx.roundRect(7,7,1130,H-14,56);ctx.stroke();
  const bevel=ctx.createLinearGradient(0,0,0,H);bevel.addColorStop(0,'#d6dee34d');bevel.addColorStop(.15,'#a7bac51a');bevel.addColorStop(.85,'#05090d60');bevel.addColorStop(1,'#b3c0c627');
  ctx.strokeStyle=bevel;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(5.5,5.5,1133,H-11,58);ctx.stroke();
  ctx.save();ctx.translate(PAD,PAD);
  /* A round cut-out in the cloth reveals the wooden frame that was painted
     underneath, so the corner pocket is a hole in the rail rather than a plate
     laid on top. Painting the cloth first and covering it afterwards always
     left a straight edge and a slightly different brown. Pool keeps the plain
     rectangular cloth pass unchanged. */
  const paintCloth=()=>{
    ctx.save();ctx.beginPath();ctx.rect(-20,-20,1040,540);
    if(hardware)for(const [hx,hy] of TABLE_HOLES)if(hx!==500){
      const cx=(hx===0?-17*q:1000+17*q),cy=(hy===0?-17*q:500+17*q),r=46*q;
      ctx.moveTo(cx+r,cy);ctx.arc(cx,cy,r,0,Math.PI*2);
    }
    ctx.clip(hardware?'evenodd':'nonzero');ctx.drawImage(cloth,-20,-20,1040,540);ctx.restore();
  };
  // One continuous material pass, including the open cloth between every pocket jaw.
  paintCloth();
  // Draw the well BELOW cloth-covered jaws. The dark shape never overlays the cushions.
  for(const [x,y] of TABLE_HOLES){ctx.save();ctx.translate(x,y);if(y===500)ctx.scale(1,-1);if(x===1000)ctx.scale(-1,1);
    if(x!==500){
      const v=pocketVisualContext(ctx,false,POCKET_VISUAL_EXPAND,q);
      if(hardware){
        /* Pool's chrome corner plate is a square-lipped L shape whose two
           straight inner edges are normally hidden beneath the long rails.
           Shrinking the snooker mouth exposed both edges on the cloth as a
           rectangular brown patch. Snooker needs no plate at all: paintCloth()
           already left a round wooden cut-out here; a soft leather rim and the
           brass seam are the only furniture around the well. */
        // No plate, no seam: the round wooden cut-out, the tapered guard and
        // the dark well are the whole corner furniture.
      }else{
        ctx.beginPath();v.moveTo(-69,18);v.lineTo(-69,-10);v.bezierCurveTo(-69,-43,-43,-69,-10,-69);v.lineTo(18,-69);v.lineTo(18,-20);v.lineTo(-20,18);v.closePath();
        const cap=ctx.createLinearGradient(-60*q,-60*q,20*q,20*q);cap.addColorStop(0,metal?metal[1]:'#a1a8aa');cap.addColorStop(.48,metal?metal[2]:'#838c90');cap.addColorStop(1,metal?metal[0]:'#626c72');ctx.fillStyle=cap;ctx.fill();
        // A narrow recessed seam and bevel follow the original outside contour.
        // Clip to the cap so this depth never changes the table's silhouette.
        ctx.save();ctx.clip();ctx.beginPath();v.moveTo(-69,18);v.lineTo(-69,-10);v.bezierCurveTo(-69,-43,-43,-69,-10,-69);v.lineTo(18,-69);
        ctx.lineWidth=5*q;ctx.strokeStyle='#111b2499';ctx.shadowColor='#03090f70';ctx.shadowBlur=3;ctx.shadowOffsetX=1;ctx.shadowOffsetY=1;ctx.stroke();ctx.restore();
        ctx.strokeStyle='#dbe5e944';ctx.lineWidth=1.25*q;ctx.beginPath();v.moveTo(-67,17);v.lineTo(-67,-10);v.bezierCurveTo(-67,-42,-42,-67,-10,-67);v.lineTo(17,-67);ctx.stroke();
        // Cap, tapered guard tip and cloth jaw meet at one shared corner (18/-20).
        // No extra cap block remains below the guard before the straight rail starts.
        ctx.strokeStyle='#090e1359';ctx.lineWidth=2*q;ctx.beginPath();v.moveTo(18,-68);v.lineTo(18,-20);v.moveTo(-68,18);v.lineTo(-20,18);ctx.stroke();
        ctx.strokeStyle='#d7e1e327';ctx.lineWidth=.7*q;ctx.beginPath();v.moveTo(19.5,-67);v.lineTo(19.5,-20);v.moveTo(-67,19.5);v.lineTo(-20,19.5);ctx.stroke();
        // Re-expose the same world-aligned cloth beneath the corner cap, BEFORE any shadows.
        ctx.save();polygon(v,[[18,-20],[38,0],[0,38],[-20,18]]);ctx.clip();
        ctx.scale(x===1000?-1:1,y===500?-1:1);ctx.translate(-x,-y);paintCloth();ctx.restore();
      }
    }
    // Guard bodies share the same thickness; corner tips taper into the cloth cuts.
    const pad=ctx.createLinearGradient(-35*q,-55*q,5*q,15*q);pad.addColorStop(0,padStops[0]);pad.addColorStop(.5,padStops[1]);pad.addColorStop(1,padStops[2]);
    ctx.save();ctx.lineWidth=14*q;ctx.strokeStyle=pad;ctx.lineCap='butt';
    if(x===500){
      // The well covers the inner half of this constant-width stroke, leaving
      // an even 7-unit pad measured normal to the same inner arch all the way round.
      ctx.beginPath();ctx.rect(-50*q,-70*q,100*q,50*q);ctx.clip();
      ctx.beginPath();middleBack(ctx,q);ctx.stroke();
    }
    else{cornerGuard(ctx,q);ctx.fillStyle=pad;ctx.fill();}
    ctx.restore();paintPocketWell(ctx,x===500,q);
    ctx.restore();
  }
  // The cushion ends are the only diagonal faces: the pocket entrance stays continuous cloth.
  // The blue top edge used to reach 8 units further into the mouth than its
  // lower corner, leaving a small blue square with a pointed tip beside each
  // jaw. TRIM shortens that top edge; LEAN sets how far the blue edge moves
  // outward over the 20-unit band. The grey lip falls by 2 units over 20, so
  // LEAN=2 keeps grey and blue on ONE straight line instead of splaying out.
  // Only these four middle-pocket ends change: grey lip, dark well, cloth and
  // physical rails are untouched. Tune these two values together if needed.
  const CUSHION_TIP_TRIM=2,CUSHION_MITRE_LEAN=2;
  const cushions=[
    [[18,-20],[474-CUSHION_TIP_TRIM,-20],[474-CUSHION_TIP_TRIM-CUSHION_MITRE_LEAN,0],[38,0]],
    [[526+CUSHION_TIP_TRIM,-20],[982,-20],[962,0],[526+CUSHION_TIP_TRIM+CUSHION_MITRE_LEAN,0]],
    [[18,520],[474-CUSHION_TIP_TRIM,520],[474-CUSHION_TIP_TRIM-CUSHION_MITRE_LEAN,500],[38,500]],
    [[526+CUSHION_TIP_TRIM,520],[982,520],[962,500],[526+CUSHION_TIP_TRIM+CUSHION_MITRE_LEAN,500]],
    [[-20,18],[0,38],[0,462],[-20,482]],[[1020,18],[1000,38],[1000,462],[1020,482]]
  ];
  // Narrow the jaw gap with the mouth: a snooker cushion runs to within ~15
  // units of a middle pocket instead of Pool's ~30.
  const drawnCushions=q===1?cushions:cushions.map(points=>points.map(([px,py])=>scaleAboutHole(px,py,q)));
  const rounded=options.roundedJaws&&q===1;
  // Raised cushions cast onto the surrounding cloth, never onto their own top faces.
  // Subtract all cushion footprints before drawing the soft silhouettes.
  const softRadius=CUSHION_SOFT_RADIUS*q;
  ctx.save();ctx.beginPath();ctx.rect(-20,-20,1040,540);
  drawnCushions.forEach((points,index)=>cushionContour(ctx,points,index,rounded,softRadius));
  ctx.clip('evenodd');ctx.fillStyle='#06182e';ctx.shadowColor='#04112eb3';ctx.shadowBlur=22;
  drawnCushions.forEach((points,index)=>{
    ctx.shadowOffsetX=index===4?6:index===5?-6:0;ctx.shadowOffsetY=index<2?6:index<4?-6:0;
    ctx.beginPath();cushionContour(ctx,points,index,rounded,softRadius);ctx.fill();
  });ctx.restore();
  drawnCushions.forEach((points,index)=>{
    ctx.save();ctx.beginPath();cushionContour(ctx,points,index,rounded,softRadius);ctx.clip();paintCloth();
    const g=index<2?ctx.createLinearGradient(0,-20*q,0,0):index<4?ctx.createLinearGradient(0,500+20*q,0,500):index===4?ctx.createLinearGradient(-20*q,0,0,0):ctx.createLinearGradient(1000+20*q,0,1000,0);
    g.addColorStop(0,'#e1f4ff13');g.addColorStop(.6,'#d1edff09');g.addColorStop(.9,'#061e3910');g.addColorStop(1,'#061e3914');ctx.fillStyle=g;ctx.fill();ctx.restore();
  });
  // The rounded corner well cuts through the meeting cushion ends.
  // This is still part of the cached table, entirely below live balls.
  for(const [x,y] of TABLE_HOLES)if(x!==500){ctx.save();ctx.translate(x,y);ctx.scale(x===1000?-1:1,y===500?-1:1);paintPocketWell(ctx,false,q);ctx.restore();}
  if(snooker){
    // Baulk line, the D and the six colour spots. These are table markings,
    // not physics: snooker.js owns the authoritative spot coordinates.
    ctx.strokeStyle='#e8f3d45e';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(260,0);ctx.lineTo(260,500);ctx.stroke();
    ctx.beginPath();ctx.arc(260,250,80,Math.PI/2,Math.PI*1.5);ctx.stroke();
    for(const [x,y] of [[260,330],[260,170],[260,250],[500,250],[752,250],[918,250]]){
      ctx.fillStyle='#eaf6d455';ctx.beginPath();ctx.arc(x,y,2.6,0,Math.PI*2);ctx.fill();
    }
    ctx.textAlign='center';ctx.font='600 12px sans-serif';ctx.fillStyle='#e6f5cf10';ctx.fillText('J O Y F L O C K',500,265);
  }else{
    // Head string and its two spots: the same soft white as Snooker's baulk
    // markings. The old blue hairline all but disappeared on dark cloths.
    ctx.strokeStyle='#ffffff8a';ctx.lineWidth=1.35;ctx.beginPath();ctx.moveTo(250,25);ctx.lineTo(250,475);ctx.stroke();
    for(const x of [250,750]){ctx.fillStyle='#ffffff7a';ctx.beginPath();ctx.arc(x,250,2,0,Math.PI*2);ctx.fill();}
    ctx.textAlign='center';ctx.font='600 12px sans-serif';ctx.fillStyle='#c0edff10';ctx.fillText('J O Y F L O C K',500,265);
  }
  // Move the pearl sights onto the slimmer visible wood rail.
  const sightOffset=q<1?26:(TABLE_PAD-7+20)/2;
  for(const x of [125,250,375,625,750,875])for(const y of [-sightOffset,500+sightOffset])pearlSight(ctx,x,y);
  for(const x of [-sightOffset,1000+sightOffset])for(const y of [125,250,375])pearlSight(ctx,x,y);
  ctx.restore();
}
