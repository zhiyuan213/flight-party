import {avatarStyle} from '../dist/avatar.js';
import {SocialUI} from '../dist/social-ui.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('period boards show three point tabs and omit sample labels from display rows',()=>{
 const source=readFileSync(new URL('../dist/social-ui.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export class SocialUI','class SocialUI');
 for(const period of ['month','week','day']){
  const badge={textContent:''};const panel={innerHTML:'',querySelector:()=>badge,querySelectorAll:()=>[]};
  const context=vm.createContext({panel,period,avatarStyle});
  vm.runInContext(source+`;const ui=new SocialUI();ui.leaderboard=panel;ui.boardTab=period;ui.liveBoards={[period]:[{name:'Real <pilot>',points:-1,games:1,avatar:0,member:true,annualMember:true,avatarFrame:'night'}]};ui.liveBoardStatus={[period]:'loaded'};ui.renderLeaderboard();`,context);
  assert.equal((panel.innerHTML.match(/data-leaderboard-tab=/g)||[]).length,3);
  assert.equal((panel.innerHTML.match(/<small>Sample<\/small>/g)||[]).length,0);
  assert.ok(panel.innerHTML.includes('Real &lt;pilot&gt;'));
  assert.ok(panel.innerHTML.includes('<span class="membership-name-value">Real &lt;pilot&gt;</span>'));
  assert.ok(panel.innerHTML.includes('data-frame="night"'));
  assert.ok(panel.innerHTML.includes('data-member="true"')); 
  assert.ok(panel.innerHTML.includes('data-annual-member="true"'));
  assert.ok(!panel.innerHTML.includes('Games played'));
  assert.equal(badge.textContent,'PILOT RANKINGS');
 }
});

test('leaderboard scrollbar measurement follows visibility and replaces its observer with the list',()=>{
 const previous=globalThis.ResizeObserver,observers=[];
 globalThis.ResizeObserver=class{constructor(callback){this.callback=callback;observers.push(this);}observe(value){this.target=value;}disconnect(){this.disconnected=true;}};
 try{
  let list={offsetWidth:220,clientWidth:200},gutter;
  const ui=new SocialUI();ui.leaderboard={querySelector:()=>list,style:{setProperty(key,value){assert.equal(key,'--lb-scrollbar');gutter=value;}}};
  ui.syncLeaderboardGutter();assert.equal(gutter,'20px');assert.equal(observers.length,1);assert.equal(observers[0].target,list);
  list.clientWidth=205;observers[0].callback();assert.equal(gutter,'15px');
  ui.syncLeaderboardGutter();assert.equal(observers.length,1,'same list reuses its observer');
  list={offsetWidth:0,clientWidth:0};ui.syncLeaderboardGutter();assert.equal(observers[0].disconnected,true);assert.equal(gutter,'0px');
  list.offsetWidth=220;list.clientWidth=208;observers[1].callback();assert.equal(gutter,'12px','becoming visible recalculates the shared header gutter');
  observers[0].callback();assert.equal(gutter,'12px','a queued callback from the old list cannot overwrite the new gutter');
 }finally{if(previous===undefined)delete globalThis.ResizeObserver;else globalThis.ResizeObserver=previous;}
});
