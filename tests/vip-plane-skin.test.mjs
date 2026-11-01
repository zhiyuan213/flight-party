import test from 'node:test';
import assert from 'node:assert/strict';
import {CanvasBoard} from '../dist/fallback.js';
import {PLANE_SKINS,normalizePlaneStyle,planeSkin,playerPlaneSkin,usesVipPlane} from '../dist/plane-skin.js';

// Execute drawPlane itself: the fake context records drawing, without claiming GPU QA.
function boardFor(players) {
 const images=[],labels=[],transforms=[],rotorColors=[];
 const context=new Proxy({}, {get(target,key){
  if(key in target)return target[key];
  if(key==='drawImage')return (image)=>images.push(image);
  if(key==='fillText')return (text)=>labels.push(text);
  if(key==='scale')return (...values)=>transforms.push(values);
  if(key==='createRadialGradient')return ()=>({addColorStop(){}});
  if(key==='createLinearGradient')return ()=>({addColorStop(offset,color){if(offset===.35)rotorColors.push(color);}});
  return ()=>{};
 },set(target,key,value){target[key]=value;return true;}});
 const normal={width:1312,height:1199,name:'classic'},gold={width:1312,height:1199,name:'gold2d'},cloud={width:1312,height:1199,name:'cloud2d'},night={width:1312,height:1199,name:'night2d'},obsidian={width:1312,height:1199,name:'obsidian2d'},aurora={width:1312,height:1199,name:'aurora2d'};
 const board=Object.create(CanvasBoard.prototype);
 Object.assign(board,{ctx:context,scale:50,depth:()=>1,project:p=>({x:p.x,y:p.z-p.y}),keys:[],reduced:true,art:{},sprites:{plane0:normal,plane1:normal,plane2:normal,plane3:normal,vipGold:gold,vipCloud:cloud,vipNight:night,vipObsidian:obsidian,vipAurora:aurora},game:{players}});
 const draw=(color=0,heading=0,piece=0)=>{
  images.length=labels.length=transforms.length=rotorColors.length=0;
  board.drawPlane({x:0,y:.4,z:0,groundY:.32,color,piece,spin:0,squash:0,heading},1000);
  return {image:images[0],labels:[...labels],transforms:[...transforms],rotorColors:[...rotorColors]};
 };
 return {board,draw,normal,gold,cloud,night,obsidian,aurora};
}

test('all three live VIP sprites use authoritative skin selection for local and remote members',()=>{
 for(const style of ['gold2d','cloud2d','night2d']){
  const {board,draw}=boardFor([
   {member:true,planeStyle:style,type:'human'},
   {member:true,planeStyle:style,type:'remote'},
  ]),image=board.sprites[planeSkin(style).spriteKey];
  assert.equal(draw(0).image,image,style+' local member uses the playable artwork');
  const remote=draw(1,1,1);
  assert.equal(remote.image,image,style+' remote member uses the same playable artwork');
  assert.ok(remote.rotorColors.includes(planeSkin(style).propellerColor),style+' rotor color agrees with selected artwork');
  assert.deepEqual(remote.labels,['2'],'the real piece identity remains printed');
  assert.equal(remote.transforms.filter(([x,y])=>x===-1&&y===1).length,2,'body mirrors while the piece number counter-mirrors');
 }
});

test('nonmembers, bots and an expired member render classic pieces immediately',()=>{
 for(const style of ['gold2d','cloud2d','night2d']){
  for(const player of [
   {member:false,planeStyle:style,type:'human'},
   {member:true,planeStyle:'classic',type:'human'},
   {member:true,planeStyle:style,type:'bot'},
   {member:'true',planeStyle:style,type:'human'},
  ]){
   const {draw,normal}=boardFor([player]);assert.equal(draw().image,normal);
  }
  const player={member:true,planeStyle:style,type:'human'},setup=boardFor([player]);
  assert.equal(setup.draw().image,setup.board.sprites[planeSkin(style).spriteKey]);
  player.member=false;
  assert.equal(setup.draw().image,setup.normal,'same-version entitlement changes need no game rebuild');
 }
 assert.equal(usesVipPlane(undefined),false);
});

test('a loading or missing VIP bitmap safely retains the ordinary plane',()=>{
 for(const style of ['gold2d','cloud2d','night2d']){
  const {board,draw,normal}=boardFor([{member:true,planeStyle:style,type:'human'}]),key=planeSkin(style).spriteKey;
  board.sprites[key]={width:0,height:0};assert.equal(draw().image,normal);
  delete board.sprites[key];assert.equal(draw().image,normal);
  board.art[key]={width:1312,height:1199};assert.equal(draw().image,board.art[key]);
 }
});

test('shared plane catalog rejects unknown and legacy client styles and isolates per-style assets',()=>{
 const entries=['gold2d','cloud2d','night2d'].map(style=>planeSkin(style));
 assert.equal(new Set(entries.map(entry=>entry.asset)).size,3);
 assert.equal(new Set(entries.map(entry=>entry.spriteKey)).size,3);
 assert.equal(new Set(entries.map(entry=>entry.propellerColor)).size,3);
 for(const style of [undefined,null,'gold','sapphire','night','__proto__','missing']){
  assert.equal(normalizePlaneStyle(style),'classic');
  assert.equal(playerPlaneSkin({member:true,planeStyle:style,type:'human'}),PLANE_SKINS.classic);
 }
});

test('annual live aircraft require both verified flags and fall back immediately on annual expiry',()=>{
 for(const style of ['obsidian2d','aurora2d']){
  const player={member:true,annualMember:true,planeStyle:style,type:'remote'},setup=boardFor([player]);
  const skin=planeSkin(style);assert.equal(skin.tier,'annual');
  assert.equal(setup.draw().image,setup.board.sprites[skin.spriteKey]);
  assert.ok(setup.draw().rotorColors.includes(skin.propellerColor));
  for(const flags of [{member:true,annualMember:false},{member:false,annualMember:true},{member:true,annualMember:'true'},{member:true,annualMember:true,type:'bot'}]){
   Object.assign(player,{type:'remote'},flags);
   assert.equal(setup.draw().image,setup.normal,'annual qualification cannot be inferred from a monthly VIP, guest, bot or string');
  }
 }
});
