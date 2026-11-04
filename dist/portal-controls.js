/** Narrow, origin-checked bridge. Authentication stays inside the game. */
export function bindPortalControls(){
 if(window.parent===window||new URLSearchParams(location.search).get('embed')!=='joyflock')return;
 const allowed=new Set(['https://joyflock.com','https://www.joyflock.com']);
 let parentOrigin;try{parentOrigin=new URL(document.referrer).origin;}catch{return;}
 if(['localhost','127.0.0.1'].includes(location.hostname)&&parentOrigin===location.origin)allowed.add(location.origin);
 if(!allowed.has(parentOrigin))return;
 document.body.classList.add('portal-embedded');
 const style=document.createElement('style');style.textContent='body.portal-embedded #settings{display:none!important}@media(min-width:769px){body.portal-embedded>header{display:none!important}body.portal-embedded{--header-h:0px}body.portal-embedded .screen{min-height:100dvh}body.portal-embedded #play{height:100dvh}}';document.head.append(style);
 const ids={account:'account-open',language:'language',sound:'sound',home:'home-link'};
 const send=()=>window.parent.postMessage({type:'joyflock:controls',account:document.getElementById('account-open')?.textContent.trim()||'登录',language:document.getElementById('language')?.textContent.trim()||'中文 / EN',sound:document.getElementById('sound')?.getAttribute('aria-pressed')!=='false'},parentOrigin);
 window.addEventListener('message',event=>{if(event.origin!==parentOrigin||event.source!==window.parent)return;const data=event.data;if(data?.type==='joyflock:hello'){send();return;}if(data?.type!=='joyflock:control'||!Object.hasOwn(ids,data.action))return;document.getElementById(ids[data.action])?.click();send();});
 const observer=new MutationObserver(send);for(const id of Object.values(ids)){const node=document.getElementById(id);if(node)observer.observe(node,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-pressed']});}
 send();
}
