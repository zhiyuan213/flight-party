import test from 'node:test';import assert from 'node:assert/strict';
import {propellerAngle} from '../dist/propeller.js';
import {renderResultRankings} from '../dist/result-rankings.js';
test('propeller angle advances while idle and stays fixed for reduced motion',()=>{assert.notEqual(propellerAngle(1000),propellerAngle(1300));assert.equal(propellerAngle(1000,true),propellerAngle(5000,true));});
test('server confirmation patches scores without replacing row or avatar nodes',()=>{
 const saved=globalThis.document;let created=0;
 class Row{constructor(){this.dataset={};this.nodes=Object.fromEntries(['.rank-number','.result-avatar','b','small'].map(k=>[k,{textContent:'',dataset:{},className:''}]));}querySelector(s){return this.nodes[s]}remove(){root.children=root.children.filter(r=>r!==this)}}
 const root={dataset:{},children:[],replaceChildren(){this.children=[]},querySelectorAll(){return this.children},append(r){this.children.push(r)},insertBefore(r,b){this.children=this.children.filter(x=>x!==r);this.children.splice(b?this.children.indexOf(b):this.children.length,0,r)}};
 globalThis.document={createElement(){created++;return new Row()}};
 try{const players=[{name:'大卫',member:true,avatarFrame:'cloud',bumps:0,rolls:0},{name:'Pilot 2'}];const ranking=[1,0];
 renderResultRankings(root,players,ranking,{key:'match',online:true});const row=root.children[1],avatar=row.querySelector('.result-avatar');assert.match(row.querySelector('small').textContent,/Confirming/);
 const args={key:'match',online:true,confirmed:[{seatIndex:1,pointsDelta:2},{seatIndex:0,pointsDelta:0}]};renderResultRankings(root,players,ranking,args);renderResultRankings(root,players,ranking,args);
 assert.equal(created,2);assert.equal(root.children[1],row);assert.equal(row.querySelector('.result-avatar'),avatar);assert.equal(row.querySelector('small').textContent,'0 points this game');assert.equal(row.dataset.cardFrame,'cloud');assert.equal(avatar.dataset.frame,'cloud');
 }finally{globalThis.document=saved}
});
