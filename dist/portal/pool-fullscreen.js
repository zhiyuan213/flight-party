/** Pool launches request the containing stage, so its exit-fullscreen button stays visible. */
export function bindPoolFullscreen({document,window,stage,button,frame,gameOrigin,game='pool',labels=full=>full?['退出全屏','退出全屏（Esc）']:['全屏','全屏']}){
  let expanded=false,requesting=false,lastScreen=null,desired=false;
  const style=document.createElement('style');
  style.textContent='.game-stage.pool-stage-expanded{position:fixed;inset:0;z-index:1000;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;display:flex;flex-direction:column}';
  document.head.append(style);
  const expand=value=>{expanded=value;stage.classList.toggle('pool-stage-expanded',value);};
  const reportFullscreen=()=>{
    const full=Boolean(document.fullscreenElement)||expanded;
    try{frame.contentWindow?.postMessage({type:'joyflock:game-fullscreen',full},gameOrigin);}catch(error){/* frame not ready yet */}
  };
  const sync=()=>{
    const full=Boolean(document.fullscreenElement)||expanded;
    const [label,title]=labels(full);
    button.textContent=label;
    button.setAttribute('aria-pressed',String(full));
    button.setAttribute('aria-label',title);
    button.removeAttribute('title');
    reportFullscreen();
  };
  const enter=async(automatic=false)=>{
    if(document.fullscreenElement){sync();return;}
    // Reclaim the viewport immediately; native permission may reject or remain pending.
    desired=true;expand(true);sync();
    if(requesting||document.fullscreenEnabled===false||(automatic&&window.navigator?.userActivation?.isActive===false))return;
    requesting=true;
    try{await stage.requestFullscreen();expand(false);if(!desired&&document.fullscreenElement===stage)await document.exitFullscreen();}catch(error){
      // Browser fullscreen can be denied; still reclaim the portal chrome inside its viewport.
      console.warn('Pool fullscreen request was blocked:',error?.name||'Error',error?.message||String(error));
    }finally{
      requesting=false;
    }
    sync();
  };
  button.addEventListener('click',async()=>{
    if(document.fullscreenElement||expanded)await exitStage();
    else await enter();
  });
  document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement)expand(false);sync();});
  const exitStage=async()=>{
    desired=false;expand(false);sync();
    if(document.fullscreenElement===stage){
      try{await document.exitFullscreen();}catch(error){console.warn('Unable to exit fullscreen:',error);}
      sync();
    }
  };
  document.addEventListener('keydown',event=>{if(event.key==='Escape')exitStage();});
  window.addEventListener('message',event=>{
    if(event.origin!==gameOrigin||event.source!==frame.contentWindow)return;
    // The child reports its controls as soon as it loads; reply with the
    // current state so a fullscreen entered before load is not missed.
    if(event.data?.type==='joyflock:controls')reportFullscreen();
    // The in-game chat heading replaces its old visibility badge with a
    // fullscreen toggle; keep ONE state machine (this one) for both.
    if(event.data?.type==='joyflock:fullscreen-query'){reportFullscreen();return;}
    if(event.data?.type==='joyflock:toggle-fullscreen'){
      if(document.fullscreenElement||expanded)void exitStage();
      else void enter();
      return;
    }
    if(event.data?.type==='joyflock:exit-expanded-game'){exitStage();return;}
    if(event.data?.type==='joyflock:game-screen'&&event.data.game===game){
      const screen=event.data.screen;
      if(!['home','waiting','play'].includes(screen)||screen===lastScreen)return;
      lastScreen=screen;
      // Covers asynchronous matchmaking, invite deep links and a resumed room. Polling must not
      // undo a user's explicit exit from fullscreen during the same match. Flight Party now
      // reports the same screen channel, so its arena fills the viewport on takeoff too.
      if(screen==='play')void enter(true);
      else void exitStage();
      return;
    }
    if(event.data?.type!=='joyflock:enter-game'||lastScreen!==null)return;
    // Expired gestures use the viewport layout directly instead of repeatedly asking the browser.
    void enter(true);
  });
  sync();
  return sync;
}
