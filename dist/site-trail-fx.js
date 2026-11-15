/* JoyFlock flight-trail shop stages — animated previews for the three
   standalone trail products (Starlight / Rainbow / Cloud) plus the free
   默认 "no trail" baseline, whose stage shows the plane and no effect.

   Each [data-trail-style] host gets one canvas; one shared rAF loop paints
   every stage. The little aircraft on the right follows the equipped plane
   published by site-points.js, so the preview always shows the visitor's
   current plane pulling the selected trail. Flight trails are NEVER drawn
   into an aircraft card, the hangar or a plane dialog — see site-plane-fx.js.

   Cosmetic only: no game state, score or rule is read or written. */
(function(){
 'use strict';
 var VERSION='20261112-gamelanes1';
 var BASE='/assets/shop/planes/';
 var RAINBOW=['#ff365d','#ff8a24','#ffd633','#23d990','#25baf5','#426bff','#9950f5'];
 var PLANES=['classic','cloud2d','gold2d','night2d','obsidian2d','aurora2d'];
 var STYLES=['star','rainbow','cloud'];
 var stages=new Map(),images={},raf=0,reduced=false;

 function matchReduced(){
  try{return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);}catch(e){return false;}
 }
 function currentPlane(){
  var k=document.documentElement.getAttribute('data-shop-plane')||'classic';
  return PLANES.indexOf(k)>=0?k:'classic';
 }
 function image(k){
  if(!images[k]){
   var img=new Image();
   img.onload=kick;
   img.src=BASE+k+'.png?v='+VERSION;
   images[k]=img;
  }
  return images[k];
 }
 function pathY(w,h,py,x,phase){return py+Math.sin(x/Math.max(1,w)*7+phase)*h*.075;}
 function star(c,x,y,r,alpha,rot){
  c.save();c.globalAlpha=alpha;c.translate(x,y);c.rotate(rot);
  var g=c.createLinearGradient(-r,-r,r,r);
  g.addColorStop(0,'#fff5a6');g.addColorStop(.42,'#ffcf36');g.addColorStop(1,'#b9760f');
  c.fillStyle=g;c.beginPath();
  for(var k=0;k<10;k++){
   var a=k*Math.PI/5-Math.PI/2,rad=r*(k%2?.4:1);
   k?c.lineTo(Math.cos(a)*rad,Math.sin(a)*rad):c.moveTo(Math.cos(a)*rad,Math.sin(a)*rad);
  }
  c.closePath();c.fill();c.restore();
 }
 function drawTrail(c,style,w,h,x1,py,phase){
  var x0=w*.04,N=30,band=Math.max(3,h*.075),i,xa,xb,ya,yb,b,off,t;
  c.save();c.lineCap='round';c.lineJoin='round';
  if(style==='rainbow'){
   for(i=0;i<N;i++){
    xa=x0+(x1-x0)*i/N;xb=x0+(x1-x0)*(i+1)/N;
    ya=pathY(w,h,py,xa,phase);yb=pathY(w,h,py,xb,phase);
    var fade=(i+1)/N;
    for(b=0;b<7;b++){
     off=(b-3)*band/7;
     c.globalAlpha=.12+.78*fade;c.strokeStyle=RAINBOW[b];
     c.lineWidth=Math.max(.8,band/7*fade+.5);
     c.beginPath();c.moveTo(xa,ya+off);c.lineTo(xb,yb+off);c.stroke();
    }
   }
  }else if(style==='cloud'){
   var layers=[[2.2,'rgba(168,205,231,.20)'],[1.3,'rgba(232,246,255,.58)'],[.6,'rgba(255,255,255,.96)']];
   layers.forEach(function(layer){
    c.strokeStyle=layer[1];c.lineWidth=Math.max(1,h*.055*layer[0]);
    for(i=0;i<N;i++){
     xa=x0+(x1-x0)*i/N;xb=x0+(x1-x0)*(i+1)/N;
     c.globalAlpha=((i+1)/N)*.85;
     c.beginPath();c.moveTo(xa,pathY(w,h,py,xa,phase));c.lineTo(xb,pathY(w,h,py,xb,phase));c.stroke();
    }
   });
  }else{
   var grad=c.createLinearGradient(x0,0,x1,0);
   grad.addColorStop(0,'rgba(255,197,53,0)');grad.addColorStop(1,'rgba(255,197,53,.62)');
   c.strokeStyle=grad;c.lineWidth=Math.max(1,h*.018);c.beginPath();
   for(i=0;i<=N;i++){
    var x=x0+(x1-x0)*i/N,y=pathY(w,h,py,x,phase);
    i?c.lineTo(x,y):c.moveTo(x,y);
   }
   c.stroke();
   for(i=0;i<7;i++){
    t=(i/6+phase*.07)%1;
    var sx=x0+(x1-x0)*t;
    star(c,sx,pathY(w,h,py,sx,phase),2+h*.045*t,.22+.72*t,phase+t*3);
   }
  }
  c.restore();
 }
 function drawPlane(c,w,h,px,py,now){
  var img=image(currentPlane());
  if(img.complete&&img.naturalWidth){
   var bw=Math.min(w*.34,h*.72),bh=bw*img.naturalHeight/img.naturalWidth;
   c.drawImage(img,px-bw*.58,py-bh*.5,bw,bh);
   return;
  }
  c.save();c.globalAlpha=.8;
  var g=c.createLinearGradient(px-w*.18,py,px+w*.14,py);
  g.addColorStop(0,'#2f6fc0');g.addColorStop(1,'#7fc6ff');
  c.fillStyle=g;c.beginPath();c.ellipse(px-w*.03,py,w*.16,h*.13,-.12,0,Math.PI*2);c.fill();c.restore();
 }
 function draw(st,now){
  var host=st.host,w=host.clientWidth,h=host.clientHeight;
  if(!w||!h)return;
  var dpr=Math.min(2,window.devicePixelRatio||1);
  if(st.w!==w||st.h!==h||st.dpr!==dpr){
   st.w=w;st.h=h;st.dpr=dpr;
   st.canvas.width=Math.round(w*dpr);st.canvas.height=Math.round(h*dpr);
  }
  var c=st.c;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  var style=host.getAttribute('data-trail-style')||'star';
  var phase=reduced?0:now*.001;
  var px=w*.78,py=h*.52;
  /* The free 默认 "no trail" card draws the plane and NOTHING behind it. */
  if(style==='none'){drawPlane(c,w,h,px,py,now);return;}
  if(STYLES.indexOf(style)<0)style='star';
  drawTrail(c,style,w,h,px-Math.min(w*.34,h*.72)*.58,py,phase);
  drawPlane(c,w,h,px,py,now);
 }
 function tick(now){
  raf=0;
  stages.forEach(function(st,host){if(!host.isConnected)stages.delete(host);});
  stages.forEach(function(st){
   var dlg=st.host.closest&&st.host.closest('dialog');
   if(dlg&&!dlg.open)return;               /* a closed redeem dialog is not painted */
   draw(st,now);
  });
  if(!reduced&&stages.size)raf=requestAnimationFrame(tick);
 }
 function kick(){if(!raf)raf=requestAnimationFrame(tick);}
 function scan(node){
  reduced=matchReduced();
  var scope=node||document,list=[];
  if(scope.querySelectorAll)list=Array.prototype.slice.call(scope.querySelectorAll('[data-trail-style]'));
  if(scope.matches&&scope.matches('[data-trail-style]'))list.unshift(scope);
  list.forEach(function(host){
   if(stages.has(host))return;
   var canvas=document.createElement('canvas');
   canvas.className='trail-fx-canvas';
   canvas.setAttribute('aria-hidden','true');
   host.appendChild(canvas);
   stages.set(host,{host:host,canvas:canvas,c:canvas.getContext('2d'),w:0,h:0,dpr:0});
  });
  kick();
 }
 window.addEventListener('resize',kick);
 window.addEventListener('joyflock:trail-changed',kick);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){scan(document);},{once:true});
 else scan(document);
 window.__joyflockTrailFX={
  version:VERSION,scan:scan,styles:STYLES.slice(),rainbow:RAINBOW.slice(),
  kick:kick,stageCount:function(){return stages.size;},reduced:function(){return reduced;}
 };
})();
