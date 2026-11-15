/* Shared by the synchronous table first paint and the module-based flight UI.
   A local cosmetic belongs only to an explicitly identified, signed-in self. */
(function(root){
 'use strict';
 var ids=['avatar-starling','avatar-cloudy','avatar-owl','avatar-bear','avatar-rocket','avatar-luna','avatar-fox','avatar-bot','avatar-octo','avatar-crown','avatar-bob','avatar-ponytail','avatar-buns','avatar-waves','avatar-blossom','avatar-beret'];
 var version='20261114-avatar5',base='/assets/shop/avatars-v4/';
 function asset(id){return ids.indexOf(id)>=0?base+id+'.svg?v='+version:null;}
 var fallback=asset('avatar-starling');
 function safe(url){
  if(typeof url!=='string')return null;
  if(/^\/api\/avatars\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(url))return url;
  if(/^\/api\/avatars\/system\/[0-3]$/.test(url))return fallback;
  var match=/^\/assets\/shop\/avatars-v4\/(avatar-[a-z]+)\.svg(?:\?v=[a-zA-Z0-9-]+)?$/.exec(url);
  return match?asset(match[1]):null;
 }
 function equippedAvatar(){
  var selected;
  try{selected=root.__joyflockShop?.getState?.().equipped?.avatar;}catch(e){}
  if(asset(selected))return asset(selected);
  /* The embedded game frame has its OWN JS realm and paints synchronously,
     often before the wallet module publishes __joyflockShop. Both frames share
     one origin and one localStorage, so read the same equipped id directly;
     otherwise the outer header shows the bought portrait while the iframe
     falls back to the default smiley for the very same player. */
  try{
   var raw=root.localStorage&&root.localStorage.getItem('joyflock.shop.v1');
   var saved=raw?JSON.parse(raw):null;
   var id=saved&&saved.equipped&&saved.equipped.avatar;
   if(asset(id))return asset(id);
  }catch(e){}
  return null;
 }
 function resolve(profile){
  var p=typeof profile==='string'?{avatarUrl:profile}:profile||{};
  // Logout may race an older profile snapshot; an explicit local guest wins.
  if(p.isSelf===true&&p.signedIn===false)return fallback;
  var url=safe(p.avatarUrl);
  // Preserve a real account upload. Legacy system portraits become faces.
  if(url&&url.indexOf('/api/avatars/')===0)return url;
  /* `signedIn` is UNKNOWN during the synchronous first paint, before /api/me
     resolves. Treat unknown as an own seat (never an opponent): an explicitly
     signed-out seat above still short-circuits to the default face. */
  if(p.isSelf===true){
   var selected=equippedAvatar();
   if(selected)return selected;
  }
  return asset(p.avatarId)||url||fallback;
 }
 function create(doc,profile){
  var url=resolve(profile);
  function face(){var n=doc.createElement('span');n.className='seat-avatar';n.style.backgroundImage='url("'+(url.indexOf('/api/')===0?fallback:url)+'")';n.style.backgroundSize='cover';n.style.backgroundPosition='center';return n;}
  if(url.indexOf('/api/')!==0)return face();
  var img=doc.createElement('img');img.className='seat-avatar';img.alt='';
  img.addEventListener('error',function(){var p=img.parentNode;if(p)p.replaceChild(face(),img);},{once:true});
  img.src=url;return img;
 }
 root.__joyflockAvatarDisplay=Object.freeze({asset:asset,safe:safe,resolve:resolve,create:create,defaultUrl:fallback});
})(globalThis);
