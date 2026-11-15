/** Narrow, origin-checked bridge. Authentication stays inside the game. */
export function bindPortalControls({onLocale}={}){
 if(window.parent===window||new URLSearchParams(location.search).get('embed')!=='joyflock')return;
 const allowed=new Set(['https://joyflock.com','https://www.joyflock.com']);
 let parentOrigin;try{parentOrigin=new URL(document.referrer).origin;}catch{return;}
 if(['localhost','127.0.0.1'].includes(location.hostname)&&parentOrigin===location.origin)allowed.add(location.origin);
 if(!allowed.has(parentOrigin))return;
 document.body.classList.add('portal-embedded');
 const style=document.createElement('style');style.textContent='body.portal-embedded #settings{display:none!important}@media(min-width:769px){body.portal-embedded>header{display:none!important}body.portal-embedded{--header-h:0px}body.portal-embedded .screen{min-height:100dvh}body.portal-embedded #play{height:100dvh}}';document.head.append(style);
 const ids={account:'account-open',language:'language',sound:'sound',home:'home-link'};
 let reportPoolScreen=()=>{};
 const game=new URLSearchParams(location.search).get('game');
 if(game&&game!=='flight'){
  document.addEventListener('keydown',event=>{if(event.key==='Escape')window.parent.postMessage({type:'joyflock:exit-expanded-game'},parentOrigin);});
  // Buttons alone miss server-started matches and direct room links. Report the actual play state,
  // including when the parent hello arrives after the child has already rendered its game.
  let lastScreen;
  reportPoolScreen=(force=false)=>{
   const screen=document.body.dataset.screen;
   if(!['home','waiting','play'].includes(screen)||(!force&&screen===lastScreen))return;
   lastScreen=screen;window.parent.postMessage({type:'joyflock:game-screen',game,screen},parentOrigin);
  };
  const screenObserver=new MutationObserver(()=>reportPoolScreen());
  screenObserver.observe(document.body,{attributes:true,attributeFilter:['data-screen']});
 }
 const send=()=>window.parent.postMessage({type:'joyflock:controls',account:document.getElementById('account-open')?.textContent.trim()||'登录',language:document.getElementById('language')?.textContent.trim()||'中文 / EN',sound:document.getElementById('sound')?.getAttribute('aria-pressed')!=='false'},parentOrigin);
 window.addEventListener('message',event=>{if(event.origin!==parentOrigin||event.source!==window.parent)return;const data=event.data;if(data?.type==='joyflock:game-fullscreen'){if(data.full)document.body.dataset.gameFullscreen='1';else delete document.body.dataset.gameFullscreen;return;}if(['joyflock:hello','joyflock:locale'].includes(data?.type)&&['en','zh'].includes(data.locale))onLocale?.(data.locale);if(data?.type==='joyflock:hello'){send();reportPoolScreen(true);return;}if(data?.type!=='joyflock:control'||!Object.hasOwn(ids,data.action))return;document.getElementById(ids[data.action])?.click();send();});
 const observer=new MutationObserver(send);for(const id of Object.values(ids)){const node=document.getElementById(id);if(node)observer.observe(node,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-pressed']});}
 send();reportPoolScreen(true);
}
