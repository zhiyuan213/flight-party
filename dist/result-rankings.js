import {applyAvatar} from './avatar.js';
// Keep result rows mounted while the committed ledger arrives; only patch their content.
export function renderResultRankings(root,players,ranking,{key='',online=false,confirmed=null,t=(en)=>en}={}){
 if(root.dataset.resultKey!==key){root.replaceChildren();root.dataset.resultKey=key;}
 const existing=new Map([...root.querySelectorAll('.rank-row')].map(row=>[Number(row.dataset.seat),row]));
 ranking.forEach((seat,index)=>{
  const player=players[seat];if(!player)return;let row=existing.get(seat);
  if(!row){row=document.createElement('div');row.className='rank-row';row.dataset.seat=String(seat);row.innerHTML='<span class="rank-number"></span><span class="result-avatar" aria-hidden="true"></span><b></b><small></small>';root.append(row);}
  if(root.children[index]!==row)root.insertBefore(row,root.children[index]||null);
  const set=(selector,value)=>{const node=row.querySelector(selector);if(node.textContent!==value)node.textContent=value;return node;};
  set('.rank-number',String(index+1));const name=set('b',player.name);name.dataset.member=String(!!player.member);
  const frame=player.member&&['gold','cloud','night'].includes(player.avatarFrame)?player.avatarFrame:'none';
  row.dataset.cardFrame=frame;const avatar=row.querySelector('.result-avatar');const avatarClass='result-avatar avatar-'+seat;if(avatar.className!==avatarClass)avatar.className=avatarClass;if(avatar.dataset.frame!==frame)avatar.dataset.frame=frame;applyAvatar(avatar,player.avatarUrl);
  const result=confirmed?.find(entry=>entry.seatIndex===seat);
  set('small',online?(result?`${result.pointsDelta>0?'+':''}${result.pointsDelta} ${t('points this game','本局积分')}`:t('Confirming score…','积分确认中…')):`${player.bumps} ${t('bumps','次撞机')} · ${player.rolls} ${t('rolls','次掷骰')}`);
 });
 for(const [seat,row] of existing)if(!ranking.includes(seat))row.remove();
}
