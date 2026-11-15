/* JoyFlock aircraft effects — the six illustrated planes from the in-game
   hangar, drawn as lightweight animated stages for the points shop.

   Each stage draws: a soft glow (membership planes), the authored body
   artwork, and the same three-blade spinning propeller used by
   propeller.js / hero-plane.js. Flight trails are a SEPARATE cosmetic
   product (star / rainbow / cloud in flight-trails.js); they are not
   bundled into an aircraft card, the hangar or a redeem dialog. One shared
   requestAnimationFrame loop serves every stage on the page; with reduced
   motion the propeller freezes into a still illustration.

   Stages are plain elements with data-plane-style. Cards keep their own style,
   while [data-plane-current] follows the equipped aircraft published by
   site-points.js as data-shop-plane on <html>. The big hangar poster carries
   [data-plane-showcase]: it displays that featured aircraft while the starter
   Classic is equipped and follows the real aircraft after any other plane is
   equipped. This file is cosmetic only: it never reads or writes game state,
   scores or rules. */
(function(){
 'use strict';
 var VERSION='20261112-gamelanes1';
 var BASE='/assets/shop/planes/';
 /* blade / hub / glow mirror plane-skin.js so a shop card is the same
    aircraft the visitor later sees on the homepage and in a live game.
    No trail colours here on purpose: trails are their own shop product. */
 var STYLES={
  classic:   {blade:'#3487ec',hub:'gold',  glow:''},
  gold2d:    {blade:'#d6a629',hub:'gold',  glow:'#ffd34d'},
  cloud2d:   {blade:'#55b4dc',hub:'silver',glow:''},
  night2d:   {blade:'#8c67dc',hub:'silver',glow:'#a47bff'},
  obsidian2d:{blade:'#c98d79',hub:'rose',  glow:'#ff9d83'},
  aurora2d:  {blade:'#c3e8ed',hub:'silver',glow:'#8ff3e2'}
 };
 var stages=new Map(),images={},raf=0,reduced=false,observer=null,lastCurrent='',lastAngle=0;

 function norm(k){return STYLES[k]?k:'classic';}
 function styleKey(id){return norm(String(id||'').replace(/^plane-/,''));}
 function url(k){return BASE+k+'.png?v='+VERSION;}
 function currentStyle(){return norm(document.documentElement.getAttribute('data-shop-plane')||'classic');}
 function rgba(hex,a){
  var m=/^#([0-9a-f]{6})$/i.exec(hex||'');
  if(!m)return 'rgba(140,190,255,'+a+')';
  var n=parseInt(m[1],16);
  return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';
 }
 function shade(hex,f){
  var m=/^#([0-9a-f]{6})$/i.exec(hex||'');if(!m)return '#174f92';
  var n=parseInt(m[1],16),p=function(v){return Math.round(v*f).toString(16).padStart(2,'0');};
  return '#'+p((n>>16)&255)+p((n>>8)&255)+p(n&255);
 }
 function image(k){
  if(!images[k]){
   var img=new Image();
   img.onload=kick;
   img.src=url(k);
   images[k]=img;
  }
  return images[k];
 }

 /* ------------------------------------------------------------- painting */
 /* No trail is drawn here. The three trail cosmetics (star / rainbow /
    cloud) live in flight-trails.js and are selected separately in the
    account's Flight effects panel; an aircraft purchase never includes one. */
 function drawGlow(c,cx,cy,w,h,now,s){
  if(!s.glow)return;
  var pulse=.82+.18*Math.sin((reduced?0:now/700));
  var g=c.createRadialGradient(cx,cy,0,cx,cy,w*.56);
  g.addColorStop(0,rgba(s.glow,.20*pulse));
  g.addColorStop(.55,rgba(s.glow,.08*pulse));
  g.addColorStop(1,rgba(s.glow,0));
  c.fillStyle=g;c.fillRect(cx-w*.6,cy-w*.6,w*1.2,w*1.2);
 }
 function drawPropeller(c,px,py,w,now,s){
  var radius=w*.153,angle=reduced?0:now*.005;
  c.save();c.translate(px,py);c.transform(.83,-.18,.12,1,0,0);
  var fill=c.createLinearGradient(-radius*.18,-radius,radius*.18,0);
  fill.addColorStop(0,'#eaf7ff');fill.addColorStop(.35,s.blade);fill.addColorStop(1,shade(s.blade,.55));
  function blades(off,alpha){
   c.save();c.globalAlpha=alpha;c.rotate(angle+off);
   for(var i=0;i<3;i++){
    c.save();c.rotate(i*Math.PI*2/3);c.fillStyle=fill;
    c.beginPath();c.ellipse(0,-radius*.53,radius*.18,radius*.53,-.12,0,Math.PI*2);c.fill();
    c.restore();
   }
   c.restore();
  }
  if(!reduced){blades(-.14,.07);blades(.14,.07);}
  blades(0,.94);
  var palette=s.hub==='silver'?['#ffffff','#dae9f5','#7893b0']
   :s.hub==='rose'?['#fff1e8','#dfaf9a','#8c5144']
   :['#fff8a7','#ffe145','#d99113'];
  var hub=c.createRadialGradient(-radius*.09,-radius*.10,0,0,0,radius*.34);
  hub.addColorStop(0,palette[0]);hub.addColorStop(.45,palette[1]);hub.addColorStop(1,palette[2]);
  c.fillStyle=hub;c.beginPath();c.ellipse(0,0,radius*.29,radius*.34,0,0,Math.PI*2);c.fill();
  c.restore();
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
  var k=norm(host.getAttribute('data-plane-style')||'classic'),s=STYLES[k];
  lastAngle=reduced?0:now*.005;
  var img=image(k);
  if(!img.complete||!img.naturalWidth)return;
  var ratio=img.naturalWidth/img.naturalHeight;
  var pw=Math.min(w*.90,h*.80*ratio),ph=pw/ratio;
  var x0=(w-pw)/2+pw*.055,y0=(h-ph)/2+ph*.035;
  if(!reduced)y0+=Math.sin(now/620)*Math.min(h*.016,3);
  drawGlow(c,x0+pw*.52,y0+ph*.52,pw,ph,now,s);
  c.drawImage(img,x0,y0,pw,ph);
  /* Same anchor as hero-plane.js drawPropeller(): 82.4% / 72.9% of the body. */
  drawPropeller(c,x0+pw*.824,y0+ph*.729,pw,now,s);
 }

 /* ---------------------------------------------------------------- driver */
 function frame(now){
  raf=0;
  if(document.hidden||!stages.size)return;
  stages.forEach(function(st,host){
   if(!host.isConnected){stages.delete(host);return;}
   draw(st,now);
  });
  if(stages.size)raf=requestAnimationFrame(frame);
 }
 function kick(){if(raf||document.hidden||!stages.size)return;raf=requestAnimationFrame(frame);}
 function mount(host){
  if(stages.has(host))return;
  var canvas=document.createElement('canvas');
  canvas.className='plane-fx-canvas';canvas.setAttribute('aria-hidden','true');
  host.append(canvas);
  stages.set(host,{host:host,canvas:canvas,c:canvas.getContext('2d'),w:0,h:0,dpr:0});
 }
 function refresh(){
  /* Only write when the value really changes: the MutationObserver watches
     these very attributes, so an unconditional set would loop forever. */
  var k=currentStyle();lastCurrent=k;
  var nodes=document.querySelectorAll('[data-plane-current]');
  Array.prototype.forEach.call(nodes,function(host){
   if(host.getAttribute('data-plane-style')!==k)host.setAttribute('data-plane-style',k);
  });
  /* Hangar poster: the featured aircraft is only a display default. The
     moment the visitor equips a different plane, the poster follows it, so
     the big preview still reacts to purchases. */
  var showcases=document.querySelectorAll('[data-plane-showcase]');
  Array.prototype.forEach.call(showcases,function(host){
   var featured=norm(host.getAttribute('data-plane-showcase')||'classic');
   var show=k==='classic'?featured:k;
   if(host.getAttribute('data-plane-style')!==show)host.setAttribute('data-plane-style',show);
  });
  /* The portal's Flight Party cover is a STATIC authored illustration. It is
     deliberately not swapped to the equipped aircraft: a shop cosmetic must
     never change the game-library artwork, which used to visibly flash on
     every reload. Only the shop hangar previews follow the equipped plane. */
 }
 function scan(root){
  var base=root&&root.querySelectorAll?root:document;
  Array.prototype.forEach.call(base.querySelectorAll('[data-plane-style]'),mount);
  refresh();kick();
 }

 function boot(){
  reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  scan(document);
  if(typeof MutationObserver!=='undefined'){
   observer=new MutationObserver(function(){scan(document);});
   observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-shop-plane']});
  }
  window.addEventListener('joyflock:shop-changed',function(){refresh();kick();});
  window.addEventListener('joyflock:plane-changed',function(e){
   if(e&&e.detail)document.documentElement.setAttribute('data-shop-plane',styleKey(e.detail));
   refresh();kick();
  });
  window.addEventListener('storage',function(e){if(e.key==='joyflock.shop.v1'){refresh();kick();}});
  window.addEventListener('resize',kick);
  document.addEventListener('visibilitychange',function(){
   if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0;}
   else kick();
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
 window.__joyflockPlaneFX={version:VERSION,styles:Object.keys(STYLES),scan:scan,refresh:refresh,
  assetUrl:url,styleKey:styleKey,current:currentStyle,
  propellerAngle:function(){return lastAngle;}};
})();
