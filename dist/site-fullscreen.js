/* One fullscreen control for every site header.
   - The button is written statically in each page (so the first frame is
     complete); this script only wires behaviour and the bilingual label.
   - On shell pages the button sits INSIDE .top-actions; the legacy portal
     button used to sit outside the cluster, so we move it in to inherit the
     shared gap. bindPoolFullscreen keeps the very same element reference.
   - The portal's game stage has its own fullscreen state machine. While the
     game view is open, that handler owns the button completely; otherwise the
     generic documentElement toggle below runs (and blocks the stale pool
     handler after a visitor returns to the lobby). */
(function(){
 'use strict';
 var doc=document,header=doc.querySelector('header.topbar');
 if(!header)return;
 var button=doc.getElementById('fullscreen');
 if(!button)return;
 var group=header.querySelector('.top-actions');
 if(group&&button.parentNode!==group)group.appendChild(button);
 var stage=doc.querySelector('.game-stage');

 function zh(){
  try{
   var saved=localStorage.getItem('joyflock-portal-language');
   if(saved==='zh')return true;
   if(saved==='en')return false;
  }catch(e){}
  var l=(doc.documentElement.getAttribute('data-locale')||doc.documentElement.lang||'').toLowerCase();
  return l.indexOf('zh')===0;
 }
 function labels(full){
  return zh()
   ?[full?'退出全屏':'全屏',full?'退出全屏（Esc）':'进入全屏']
   :[full?'Exit fullscreen':'Fullscreen',full?'Exit fullscreen (Esc)':'Enter fullscreen'];
 }
 function owned(){
  /* bindPoolFullscreen() is bound once a game opens and stays bound afterwards;
     while the game view is visible it owns both the label and the click. */
  return !!stage&&doc.body.classList.contains('playing');
 }
 function sync(){
  if(owned())return;
  var full=Boolean(doc.fullscreenElement||doc.webkitFullscreenElement);
  var t=labels(full);
  button.textContent=t[0];
  button.setAttribute('aria-label',t[1]);
  /* No native title tooltip: hovering the pill used to paint a pale square
     over the white label, which looked broken in fullscreen. */
  button.removeAttribute('title');
  button.setAttribute('aria-pressed',String(full));
 }
 button.addEventListener('click',function(event){
  if(owned())return;
  /* Returning to the lobby leaves the pool handler attached. Our listener was
     registered first, so stop it from also expanding the hidden game stage. */
  if(stage&&event.stopImmediatePropagation)event.stopImmediatePropagation();
  var current=doc.fullscreenElement||doc.webkitFullscreenElement;
  try{
   if(current)(doc.exitFullscreen||doc.webkitExitFullscreen).call(doc);
   else{
    var root=doc.documentElement;
    (root.requestFullscreen||root.webkitRequestFullscreen).call(root);
   }
  }catch(e){/* fullscreen denied or unsupported: the header stays usable */}
 });
 doc.addEventListener('fullscreenchange',sync);
 doc.addEventListener('webkitfullscreenchange',sync);
 if(typeof MutationObserver!=='undefined'){
  new MutationObserver(sync).observe(doc.documentElement,
   {attributes:true,attributeFilter:['lang','data-locale']});
 }
 window.addEventListener('storage',function(e){
  if(e.key==='joyflock-portal-language')sync();
 });
 sync();
})();
