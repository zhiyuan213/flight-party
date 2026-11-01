import {avatarStyle} from './avatar.js';
export function renderVictory(root,winner,{reduced=false,label='Golden Wings'}={}){
 const host=root.querySelector('.trophy');if(!host)return;
 const enabled=winner?.member&&winner.victoryEffect==='gold';root.dataset.victoryEffect=enabled?'gold':'none';
 if(!enabled){host.textContent='🏆';return;}
 const frame=['gold','cloud','night'].includes(winner.avatarFrame)?winner.avatarFrame:'gold';root.dataset.celebrationFrame=frame;
 const color=Number.isInteger(winner.color)&&winner.color>=0&&winner.color<4?winner.color:0;
 host.innerHTML=`<span class="victory-crest ${reduced?'victory-static':''}" aria-hidden="true"><span class="victory-wings"></span><span class="victory-portrait avatar-${color}" ${avatarStyle(winner.avatarUrl)} data-frame="${frame}"></span><span class="victory-spark">✦</span><span class="victory-spark right">✦</span></span>`;
 const caption=document.createElement('span');caption.className='victory-caption';caption.textContent=label;host.append(caption);
}
