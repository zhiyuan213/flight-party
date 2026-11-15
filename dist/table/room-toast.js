/* Keep the status toast readable while a modal dialog is open.
   #message is a fixed element in the normal page layer, so a modal dialog's
   ::backdrop (navy + blur) dims and blurs it — e.g. "邀请链接已复制" becomes
   unreadable behind the waiting-room card. A manual popover puts the same
   element in the top layer, above the dialog and its backdrop; no copy of the
   message and no change to the 14 places that assign textContent. */
(function(){
  var msg=document.getElementById('message');
  if(!msg||typeof msg.showPopover!=='function')return;   // older browsers: keep the old layer
  msg.setAttribute('popover','manual');

  function isOpen(){try{return msg.matches(':popover-open');}catch(e){return false;}}
  function sync(){
    var has=!!(msg.textContent||'').trim(),open=isOpen();
    try{
      if(has&&!open)msg.showPopover();
      else if(!has&&open)msg.hidePopover();
    }catch(e){}
  }
  if(window.MutationObserver){
    new MutationObserver(sync).observe(msg,{childList:true,characterData:true,subtree:true});
  }
  /* A dialog opened after a visible toast would stack its backdrop on top of
     the popover; re-entering the top layer puts the toast back in front. */
  document.addEventListener('toggle',function(event){
    var el=event.target;
    if(!el||el.tagName!=='DIALOG'||!el.open||!isOpen())return;
    try{msg.hidePopover();msg.showPopover();}catch(e){}
  },true);
  sync();
})();
