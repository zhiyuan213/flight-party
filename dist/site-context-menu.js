/* JoyFlock — suppress the native right-click / long-press context menu AND
 * the blue drag-selection highlight on every page, including the pages loaded
 * inside the portal's game iframe.
 *
 * A page-level guard is not enough: the portal hosts games in an iframe, and
 * pointer events inside that frame never reach the parent document, so every
 * HTML entry point loads this script (defer, before DOMContentLoaded).
 *
 * Default: full site-wide block. For a subtree that needs native copy/paste or
 * selection, add data-context-menu="allow" (menu) and/or data-select="allow"
 * (selection). Inputs, textareas, selects and contenteditable always keep
 * normal editing and text selection.
 */
(function(){
 'use strict';
 if(window.__joyflockContextMenu)return;
 var VERSION='20261109-noselect1';

 /* Injected synchronously (deferred script, before the page is interactive),
  * so there is no extra request and no first-paint window where a stray drag
  * could still paint the highlight. !important beats page/theme CSS. */
 var CSS=[
  'html,html body,html body *,html body *::before,html body *::after{',
   '-webkit-user-select:none!important;-moz-user-select:none!important;',
   '-ms-user-select:none!important;user-select:none!important;',
   '-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}',
  'html body input,html body textarea,html body select,',
  'html body [contenteditable]:not([contenteditable="false"]),',
  'html body [contenteditable]:not([contenteditable="false"]) *,',
  'html body [data-select="allow"],html body [data-select="allow"] *{',
   '-webkit-user-select:text!important;-moz-user-select:text!important;',
   '-ms-user-select:text!important;user-select:text!important;',
   '-webkit-touch-callout:default}',
  'html ::selection,html *::selection{background:transparent!important;color:inherit!important}',
  'html body input::selection,html body textarea::selection,',
  'html body [contenteditable]::selection,html body [data-select="allow"]::selection,',
  'html body [data-select="allow"] *::selection{background:#3b5bdb!important;color:#fff!important}'
 ].join('');
 var head=document.head||document.documentElement;
 if(head&&!document.querySelector('style[data-joyflock="no-select"]')){
  var style=document.createElement('style');
  style.setAttribute('data-joyflock','no-select');
  style.textContent=CSS;
  head.appendChild(style);
 }

 var enabled=true,blocked=0,selectionBlocked=0,noSelect=true;
 var EDITABLE='input,textarea,select,[contenteditable]:not([contenteditable="false"]),[data-select="allow"]';
 function inside(target,selector){
  try{return !!(target&&target.closest&&target.closest(selector));}catch(e){return false;}
 }
 function allowed(target){
  return inside(target,EDITABLE);
 }

 function stop(event){
  if(!enabled||event.defaultPrevented)return;
  if(inside(event.target,'[data-context-menu="allow"]'))return;
  event.preventDefault();blocked++;
 }
 // Capture phase: preventDefault here still works if a component has its own
 // contextmenu handler (pool-view.js, app.js) that runs later on the target.
 window.addEventListener('contextmenu',stop,{capture:true,passive:false});
 document.addEventListener('contextmenu',stop,{capture:true,passive:false});

 function stopSelect(event){
  if(!noSelect||event.defaultPrevented||allowed(event.target))return;
  event.preventDefault();selectionBlocked++;
 }
 window.addEventListener('selectstart',stopSelect,{capture:true,passive:false});
 document.addEventListener('selectstart',stopSelect,{capture:true,passive:false});
 // Ctrl/Cmd+A on the page body would still build a (visually hidden) selection.
 document.addEventListener('keydown',function(event){
  if(!noSelect||event.defaultPrevented||allowed(event.target))return;
  if(!(event.ctrlKey||event.metaKey)||String(event.key).toLowerCase()!=='a')return;
  event.preventDefault();
 },{capture:true,passive:false});

 // Dragging an image or link otherwise produces a floating "selected" ghost.
 // Keep the HTML5 drag used by the puzzle tiles and anything explicitly opted in.
 document.addEventListener('dragstart',function(event){
  if(!noSelect||event.defaultPrevented||allowed(event.target))return;
  if(inside(event.target,'[draggable="true"],[data-drag="allow"]'))return;
  event.preventDefault();
 },{capture:true,passive:false});

 function clearSelection(event){
  if(!noSelect||allowed(event.target))return;
  try{
   var sel=window.getSelection&&window.getSelection();
   if(sel&&!sel.isCollapsed)sel.removeAllRanges();
  }catch(e){}
 }
 document.addEventListener('pointerdown',clearSelection,{capture:true,passive:true});
 // Also drop a selection made before this deferred script ran.
 try{
  var initial=window.getSelection&&window.getSelection();
  if(initial&&!initial.isCollapsed)initial.removeAllRanges();
 }catch(e){}

 var api={
  version:VERSION,
  get enabled(){return enabled;},
  get blocked(){return blocked;},
  get selectionBlocked(){return selectionBlocked;},
  get selectionEnabled(){return noSelect;},
  setEnabled:function(value){enabled=!!value;return enabled;},
  setSelectionEnabled:function(value){
   noSelect=!!value;
   var el=document.querySelector('style[data-joyflock="no-select"]');
   if(el)el.disabled=!noSelect;
   return noSelect;
  }
 };
 try{Object.defineProperty(window,'__joyflockContextMenu',{value:api,configurable:false});}
 catch(e){window.__joyflockContextMenu=api;}
})();
