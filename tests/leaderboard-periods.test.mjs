import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('period boards show three point tabs and omit sample labels from display rows',()=>{
 const source=readFileSync(new URL('../dist/social-ui.js',import.meta.url),'utf8').replace('export class SocialUI','class SocialUI');
 for(const period of ['month','week','day']){
  const badge={textContent:''};const panel={innerHTML:'',querySelector:()=>badge,querySelectorAll:()=>[]};
  const context=vm.createContext({panel,period});
  vm.runInContext(source+`;const ui=new SocialUI();ui.leaderboard=panel;ui.boardTab=period;ui.liveBoards={[period]:[{name:'Real <pilot>',points:-1,games:1,avatar:0}]};ui.liveBoardStatus={[period]:'loaded'};ui.renderLeaderboard();`,context);
  assert.equal((panel.innerHTML.match(/data-leaderboard-tab=/g)||[]).length,3);
  assert.equal((panel.innerHTML.match(/<small>Sample<\/small>/g)||[]).length,0);
  assert.ok(panel.innerHTML.includes('Real &lt;pilot&gt;'));
  assert.ok(!panel.innerHTML.includes('Games played'));
  assert.equal(badge.textContent,'PILOT RANKINGS');
 }
});
