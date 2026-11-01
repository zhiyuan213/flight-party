import test from 'node:test';
import assert from 'node:assert/strict';
import {CanvasBoard} from '../dist/fallback.js';
import {usesVipPlane} from '../dist/plane-skin.js';

// Execute drawPlane itself: the fake context records drawing, without claiming GPU QA.
function boardFor(players) {
 const images=[],labels=[],transforms=[];
 const context=new Proxy({}, {get(target,key){
  if(key in target)return target[key];
  if(key==='drawImage')return (image)=>images.push(image);
  if(key==='fillText')return (text)=>labels.push(text);
  if(key==='scale')return (...values)=>transforms.push(values);
  if(key==='createRadialGradient'||key==='createLinearGradient')return ()=>({addColorStop(){}});
  return ()=>{};
 },set(target,key,value){target[key]=value;return true;}});
 const normal={width:1312,height:1199,name:'classic'},gold={width:1312,height:1199,name:'gold2d'};
 const board=Object.create(CanvasBoard.prototype);
 Object.assign(board,{ctx:context,scale:50,depth:()=>1,project:p=>({x:p.x,y:p.z-p.y}),keys:[],reduced:true,art:{},sprites:{plane0:normal,plane1:normal,vipGold:gold},game:{players}});
 const draw=(color=0,heading=0,piece=0)=>{
  images.length=labels.length=transforms.length=0;
  board.drawPlane({x:0,y:.4,z:0,groundY:.32,color,piece,spin:0,squash:0,heading},1000);
  return {image:images[0],labels:[...labels],transforms:[...transforms]};
 };
 return {board,draw,normal,gold};
}

test('live sprite selection uses authoritative membership and skin for every human seat',()=>{
 const {draw,gold}=boardFor([
  {member:true,planeStyle:'gold2d',type:'human'},
  {member:true,planeStyle:'gold2d',type:'human'},
 ]);
 assert.equal(draw(0).image,gold,'local member uses the playable artwork');
 const remote=draw(1,1,1);
 assert.equal(remote.image,gold,'remote member uses the same playable artwork');
 assert.deepEqual(remote.labels,['2'],'the real piece identity remains printed');
 assert.equal(remote.transforms.filter(([x,y])=>x===-1&&y===1).length,2,'body mirrors while the piece number counter-mirrors');
});

test('nonmembers, bots and an expired member render classic pieces immediately',()=>{
 for(const player of [
  {member:false,planeStyle:'gold2d',type:'human'},
  {member:true,planeStyle:'classic',type:'human'},
  {member:true,planeStyle:'gold2d',type:'bot'},
  {member:'true',planeStyle:'gold2d',type:'human'},
 ]){
  const {draw,normal}=boardFor([player]);assert.equal(draw().image,normal);
 }
 const player={member:true,planeStyle:'gold2d',type:'human'},setup=boardFor([player]);
 assert.equal(setup.draw().image,setup.gold);
 player.member=false;
 assert.equal(setup.draw().image,setup.normal,'same-version entitlement changes need no game rebuild');
 assert.equal(usesVipPlane(undefined),false);
});

test('a loading or missing VIP bitmap safely retains the ordinary plane',()=>{
 const {board,draw,normal}=boardFor([{member:true,planeStyle:'gold2d',type:'human'}]);
 board.sprites.vipGold={width:0,height:0};assert.equal(draw().image,normal);
 delete board.sprites.vipGold;assert.equal(draw().image,normal);
 board.art.vipGold={width:1312,height:1199};assert.equal(draw().image,board.art.vipGold);
});
