import test from 'node:test';
import assert from 'node:assert/strict';
import {planePlayerName,fitPlaneName,layoutPlaneNames,drawPlaneNames} from '../dist/plane-nameplates.js';
import {CanvasBoard} from '../dist/fallback.js';

function context(){const text=[],transforms=[];return new Proxy({text,transforms,measureText:value=>({width:[...value].length*7}),save(){},restore(){},fillText:value=>text.push(value),rotate:()=>transforms.push('rotate'),scale:()=>transforms.push('scale')},{get:(target,key)=>target[key]||(()=>{}),set:(target,key,value)=>(target[key]=value,true)});}
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
 b.drawNames(1000);assert.equal(c.text.at(-1),'旧昵称');owner.name='新昵称';piece.y=1.5;b.drawNames(2000);assert.equal(c.text.at(-1),'新昵称');assert.deepEqual(c.transforms,[]);
 assert.equal(piece.heading,1);assert.equal(piece.spin,2);assert.equal(piece.squash,.2,'label rendering cannot change flight animation');
});
