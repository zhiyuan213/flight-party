import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {avatarStyle} from '../dist/avatar.js';
import {isChineseMobile} from '../dist/room-share.js';

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=en=>en;

test('game player cards expose verified monthly and annual badge attributes with escaped names',()=>{
 const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('function playerCard('),source.indexOf('function render(){'));
 const context=vm.createContext({game:{turn:0},previewTakeoverColor:()=>-1,FINISH:57,PALETTE:[0x477eff],avatarStyle,esc,t,social:{playerStats:()=>''}});vm.runInContext(fn,context);
 const player={color:0,type:'human',name:'Annual <pilot>',pieces:[-1,2],member:true,annualMember:true};
 const annual=context.playerCard(player);assert.match(annual,/data-member="true" data-annual-member="true"/);assert.ok(annual.includes('Annual &lt;pilot&gt;'));
 player.annualMember=false;assert.match(context.playerCard(player),/data-member="true" data-annual-member="false"/);
 player.member=false;player.annualMember=true;assert.match(context.playerCard(player),/data-member="false" data-annual-member="false"/);
});

test('account header and account heading use the same verified badge tier',()=>{
 const source=readFileSync(new URL('../dist/live-account-ui.js',import.meta.url),'utf8');
 const header=source.slice(source.indexOf(' social.renderAccountButton=()=>'),source.indexOf(' social.renderDialog=()=>'));
 const heading=source.slice(source.indexOf(' social.renderDialog=()=>'),source.indexOf(' const renderAccount='));
 for(const [member,annualMember,expected] of [[true,true,'true'],[true,false,'false'],[false,true,'false'],[true,'true','false']]){
  const accountButton={innerHTML:'',classList:{toggle(){}},setAttribute(){}},dialog={innerHTML:'',setAttribute(){}};
  const social={accountButton,viewer:{isGuest:false,name:'VIP <pilot>'},authTab:'login'},identity={account:{displayName:'VIP <pilot>'},appearance:{member,annualMember},statistics:{}};
  const context=vm.createContext({social,identity,dialog,avatarStyle,esc,t,notice:'',busy:false,session:{authState:'ready'}});
  vm.runInContext(header+heading+';social.renderAccountButton();social.renderDialog();',context);
  assert.ok(accountButton.innerHTML.includes('data-annual-member="'+expected+'"'));assert.ok(dialog.innerHTML.includes('data-annual-member="'+expected+'"'));
  assert.ok(accountButton.innerHTML.includes('VIP &lt;pilot&gt;'));assert.ok(dialog.innerHTML.includes('VIP &lt;pilot&gt;'));
 }
});

test('friend-room names expose annual badges while empty seats remain unbadged',()=>{
 const source=readFileSync(new URL('../dist/live-room-ui.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export function','function');
 const dialog={open:true,innerHTML:'',setAttribute(){},addEventListener(){}},social={roomDialog:dialog,t,renderRoom(){}};
 const session={room:{origin:'FRIENDS',phase:'WAITING_FRIENDS',roomId:'test',yourSeat:0,seats:[{index:0,displayName:'Annual <pilot>',member:true,annualMember:true}]},addEventListener(){}};
 const context=vm.createContext({social,session,avatarStyle,isChineseMobile});vm.runInContext(source+';bindLiveRooms(social,session);social.renderRoom();',context);
 assert.match(dialog.innerHTML,/data-member="true" data-annual-member="true">Annual &lt;pilot&gt;/);
 assert.equal((dialog.innerHTML.match(/data-member="false" data-annual-member="false">Open seat/g)||[]).length,3);
});
