import test from 'node:test';
import assert from 'node:assert/strict';
import {planePlayerName,planeMembershipGrade,fitPlaneName,layoutPlaneNames,drawPlaneNames} from '../dist/plane-nameplates.js';
import {CanvasBoard} from '../dist/fallback.js';
import {BoardScene} from '../dist/scene.js';

function context(){const text=[],transforms=[],images=[];return new Proxy({text,transforms,images,measureText:value=>({width:[...value].length*7}),save(){},restore(){},fillText:value=>text.push(value),drawImage:(...args)=>images.push(args),rotate:()=>transforms.push('rotate'),scale:()=>transforms.push('scale')},{get:(target,key)=>target[key]||(()=>{}),set:(target,key,value)=>(target[key]=value,true)});}
test('names are public plain text on one line, with safe fallback and whole-grapheme ellipsis',()=>{
 assert.equal(planePlayerName('  大卫\n<pilot>\u202e  '),'大卫 <pilot>');assert.equal(planePlayerName('',2),'Pilot 3');
 const name='👨‍👩‍👧‍👦👨‍👩‍👧‍👦飞行员',measure=text=>[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].length*10;
 assert.equal(fitPlaneName(name,25,measure),'👨‍👩‍👧‍👦…');assert.equal(fitPlaneName('大卫',40,measure),'大卫');
});
test('eight stacked labels stay distinct and inside a phone viewport including top and side edges',()=>{
 const entries=Array.from({length:8},(_,i)=>({key:`${i>>1}:${i%2}`,seat:i>>1,name:'飞行员很长的名字👨‍👩‍👧‍👦',x:i%2?18:20,y:20})),labels=layoutPlaneNames(context(),entries,{width:375,height:398,fontSize:10,maxWidth:70});
 assert.equal(labels.length,8);
 for(const a of labels){assert.ok(a.x>=5&&a.y>=5&&a.x+a.width<=370&&a.y+a.height<=393);for(const b of labels){if(a===b)continue;assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,'overlapping names');}}
 assert.deepEqual(layoutPlaneNames(context(),entries.reverse(),{width:375,height:398,fontSize:10,maxWidth:70}).map(x=>[x.key,x.x,x.y]),labels.map(x=>[x.key,x.x,x.y]),'seat/piece placement stays deterministic');
});
test('drawing is upright and separate from body mirror/rotation, and names refresh on the current plane position',()=>{
 const c=context();drawPlaneNames(c,[{key:'0:0',name:'大卫',x:100,y:80}],{width:300,height:200});assert.deepEqual(c.text,['大卫']);assert.deepEqual(c.transforms,[]);
 const b=Object.create(CanvasBoard.prototype),owner={name:'旧昵称',member:true,planeStyle:'gold2d',type:'human'},piece={color:0,piece:0,x:1,y:.4,z:2,heading:1,spin:2,squash:.2};
 Object.assign(b,{ctx:c,planes:[piece],scale:35,w:400,h:398,depth:()=>1,project:p=>({x:150+p.x*10,y:150-p.y*25+p.z*10}),reduced:true,sprites:{vipGold:{width:1312,height:1199}},art:{},game:{players:[owner]}});
 b.drawNames(1000);assert.ok(c.text.includes('旧昵称'));owner.name='新昵称';piece.y=1.5;b.drawNames(2000);assert.ok(c.text.includes('新昵称'));assert.deepEqual(c.transforms,[]);
 assert.equal(piece.heading,1);assert.equal(piece.spin,2);assert.equal(piece.squash,.2,'label rendering cannot change flight animation');
});

test('nameplate grades require verified membership and exclude bots and truthy strings',()=>{
 for(const [owner,grade] of [[undefined,'none'],[{member:false,annualMember:true},'none'],[{member:'true',annualMember:true},'none'],[{member:true,annualMember:'true'},'vip'],[{member:true,annualMember:false},'vip'],[{member:true,annualMember:true},'annual'],[{member:true,annualMember:true,type:'bot'},'none']])assert.equal(planeMembershipGrade(owner),grade);
 const entry={key:'0:0',name:'长名字飞行员',x:180,y:80},options={width:375,height:398,maxWidth:76,fontSize:10},plain=layoutPlaneNames(context(),[entry],options)[0];
 for(const grade of ['vip','annual']){const member=layoutPlaneNames(context(),[{...entry,grade}],options)[0];assert.equal(member.text,plain.text,'badge preserves the original name budget');assert.equal(member.nameWidth,plain.width);assert.equal(member.width,plain.width+member.badgeWidth+5);}
});

test('eight wider annual and VIP labels stay inside mobile and short canvases without overlaps',()=>{
 const entries=Array.from({length:8},(_,i)=>({key:`${i>>1}:${i%2}`,seat:i>>1,grade:i%2?'annual':'vip',name:'长名字飞行员',x:i%2?3:373,y:12}));
 for(const height of [398,180]){
  const labels=layoutPlaneNames(context(),entries,{width:375,height,fontSize:10,maxWidth:76});assert.equal(labels.length,8);
  for(const a of labels){assert.ok(a.x>=5&&a.y>=5&&a.x+a.width<=370&&a.y+a.height<=height-5);for(const b of labels){if(a===b)continue;assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,'membership capsules overlap');}}
 }
});

test('both renderers refresh nameplate grade on annual expiry and bot ownership without touching pieces',()=>{
 const owner={name:'大卫',member:true,annualMember:true,type:'human'},c=context(),piece={color:0,piece:0,x:1,y:.4,z:2,heading:1,spin:2,squash:.2};
 const canvas=Object.create(CanvasBoard.prototype);Object.assign(canvas,{ctx:c,planes:[piece],scale:35,w:400,h:398,depth:()=>1,project:p=>({x:150+p.x*10,y:150-p.y*25+p.z*10}),reduced:true,sprites:{plane0:{width:1312,height:1199}},art:{},game:{players:[owner]}});
 const three=Object.create(BoardScene.prototype);Object.assign(three,{effectContext:c,effectCanvas:{width:400,height:398},game:{players:[owner]},planes:[{userData:{color:0,piece:0,body:{position:{y:0}}},position:{clone:()=>({x:0,y:0,z:0,project(){this.x=this.y=this.z=0;return this;}})}}]});
 for(const renderer of [canvas,three]){
  owner.member=true;owner.annualMember=true;owner.type='human';assert.equal(renderer.drawNames(1000)[0].grade,'annual');
  owner.annualMember=false;assert.equal(renderer.drawNames(1000)[0].grade,'vip');
  owner.member=false;assert.equal(renderer.drawNames(1000)[0].grade,'none');
  owner.member=owner.annualMember=true;owner.type='bot';assert.equal(renderer.drawNames(1000)[0].grade,'none');
 }
 assert.equal(piece.heading,1);assert.equal(piece.spin,2);assert.equal(piece.squash,.2);assert.deepEqual(c.transforms,[]);
});

test('badge loading keeps fixed layout, readable fallback and explicit or document language',()=>{
 const priorImage=globalThis.Image,priorDocument=globalThis.document,created=[];
 globalThis.Image=class{constructor(){this.complete=false;this.naturalWidth=0;created.push(this);}};
 globalThis.document={documentElement:{lang:'zh-CN'}};
 try{
  const c=context(),entries=[{key:'0:0',name:'大卫',grade:'annual',x:150,y:80}],options={width:375,height:398,fontSize:11};
  const loading=drawPlaneNames(c,entries,options);assert.ok(c.text.includes('YEAR VIP'));assert.equal(c.images.length,0);assert.equal(created[0].src,'assets/member/annual-vip-laurel-v3.png');
  created[0].complete=true;created[0].naturalWidth=124;const loaded=drawPlaneNames(c,entries,options);assert.equal(c.images.length,1);assert.deepEqual(loaded.map(({x,y,width,height})=>[x,y,width,height]),loading.map(({x,y,width,height})=>[x,y,width,height]),'asset arrival cannot shift names or badge budget');
  drawPlaneNames(c,entries,{...options,language:'en'});assert.equal(c.images.length,2);assert.equal(created.length,1);
  drawPlaneNames(c,[{...entries[0],grade:'vip'}],options);assert.ok(c.text.includes('VIP'));assert.equal(created[1].src,'assets/member/vip-laurel-v3.png');
  drawPlaneNames(c,entries,{...options,language:'en'});assert.equal(created.length,2,'English badge assets are shared across all interface languages');
 }finally{if(priorImage===undefined)delete globalThis.Image;else globalThis.Image=priorImage;if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;}
});

