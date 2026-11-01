import {HeroPlane} from './hero-plane.js';
export function bindHangar(hero,session,t,getReduced,onSelect){
 let identity=null,preview=null,choice='classic',saving=false,openRevision=0;
 const dialog=document.createElement('dialog');dialog.className='hangar-dialog';dialog.setAttribute('aria-label',t('Your hangar','我的机库'));document.body.append(dialog);
 const designs=[['classic','Classic','经典飞机'],['gold2d','Golden Wings · 2D','金翼领航 · 2D']];
 function updateControls(){if(!dialog.open)return;dialog.querySelectorAll('[data-plane]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plane===choice)));const button=dialog.querySelector('[data-plane-save]');button.disabled=identity?.appearance?.member!==true||saving;button.textContent=identity?.appearance?.member===true?t('Use this plane','使用这架飞机'):t('Membership required to select','会员可选择专属飞机');}
 function showModel(){if(!dialog.open)return;preview?.dispose();const host=dialog.querySelector('.hangar-stage');preview=new HeroPlane(host,{style:choice,reduced:getReduced()});preview.wrap.setAttribute('aria-label',t('Enlarged airplane preview','放大的飞机预览'));preview.wrap.removeAttribute('role');dialog.querySelector('.hangar-hint').textContent=choice==='classic'?t('Classic illustrated airplane','经典插画飞机'):t('2D aircraft · animated propeller','2D 飞机 · 螺旋桨动态展示');updateControls();}
 function open(){openRevision++;choice=identity?.appearance?.plane==='gold2d'?'gold2d':'classic';dialog.innerHTML=`<button type="button" class="close" data-hangar-close aria-label="${t('Close','关闭')}">×</button><span class="sample-pill">${t('YOUR HANGAR','我的机库')}</span><h2>${t('Ready for your next flight','选一架，准备起飞')}</h2><div class="hangar-stage"></div><p class="hangar-hint">${t('2D aircraft · animated propeller','2D 飞机 · 螺旋桨动态展示')}</p><div class="hangar-choices">${designs.map(([id,en,zh])=>`<button type="button" class="secondary" data-plane="${id}">${t(en,zh)}</button>`).join('')}</div><p class="hangar-notice" role="status">${t('Your selected VIP aircraft appears on your homepage and in live games.','选择的会员飞机会显示在主页和实际对局中。')}</p><button type="button" class="primary" data-plane-save></button>`;dialog.showModal();showModel();}
 function bindHero(){hero.wrap.setAttribute('role','button');hero.wrap.setAttribute('tabindex','0');hero.wrap.setAttribute('aria-label',t('Open airplane hangar','查看飞机机库'));hero.wrap.onclick=open;hero.wrap.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};}
 bindHero();
 const onIdentity=event=>{identity=event.detail;const style=identity?.appearance?.member===true&&identity?.appearance?.plane==='gold2d'?'gold2d':'classic';if(hero.wrap.dataset.planeStyle!==style){hero=onSelect(style);hero.wrap.dataset.planeStyle=style;bindHero();}updateControls();};session.addEventListener('identity',onIdentity);session.addEventListener('profile-updated',onIdentity);
 dialog.addEventListener('click',async e=>{
  if(e.target.closest('[data-hangar-close]')){dialog.close();return;}
  const option=e.target.closest('[data-plane]');if(option&&!saving){choice=option.dataset.plane;showModel();return;}
  if(!e.target.closest('[data-plane-save]')||saving||identity?.appearance?.member!==true)return;
  const revision=openRevision,selected=choice;saving=true;updateControls();
  try{
   await session.request('/api/account/appearance',{plane:selected});identity=await session.request('/api/me');session.dispatchEvent(new CustomEvent('identity',{detail:identity}));
   if(dialog.open){if(revision!==openRevision){choice=identity?.appearance?.plane==='gold2d'?'gold2d':'classic';showModel();}dialog.querySelector('.hangar-notice').textContent=t('Saved. Your homepage and game aircraft are updated.','已保存，主页与对局飞机已更新。');}
  }catch{if(dialog.open&&revision===openRevision)dialog.querySelector('.hangar-notice').textContent=t('Save failed. Please retry.','保存失败，请重试。');}
  finally{saving=false;updateControls();}
 });
 dialog.addEventListener('close',()=>{preview?.dispose();preview=null;});
}
