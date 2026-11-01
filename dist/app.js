import {onlineMovement} from './online-movement.js';
import {bindHangar} from './hangar.js';
import {avatarStyle} from './avatar.js';
import {HeroPlane} from './hero-plane.js';
import {renderResultRankings} from './result-rankings.js';
import {renderVictory} from './victory-effects.js';
import {Game,COLORS,FINISH,secureDie} from './engine.js';
import {BoardScene,PALETTE} from './scene.js';
import {AudioFX} from './audio.js';
import {CanvasBoard} from './fallback.js';
import {Die3D} from './die3d.js';
import {SocialUI} from './social-ui.js';
import {ReactionPreview} from './reaction-preview.js';
import {OnlineSession} from './online-session.js';
import {bindLiveRooms} from './live-room-ui.js';
import {bindLiveAccount} from './live-account-ui.js';
import {track} from './analytics.js';
const $=id=>document.getElementById(id),fx=new AudioFX();
$('play').addEventListener('contextmenu',event=>event.preventDefault());
let seats=[{type:'human',name:'You'},{type:'human',name:'Alex'},{type:'bot',name:'Milo'},{type:'bot',name:'Coco'}],party=false,game,scene,screen='welcome',clock,seconds=15,epoch=0,jobs=new Set(),toastJob,voteQueue=[],votes={},voteIndex=0;
let prefs;try{prefs=JSON.parse(localStorage.getItem('flight-party-prefs'))||{};}catch{prefs={};}prefs={sound:true,volume:45,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,lang:'en',music:false,visual:'illustrated',...prefs};
const inviteLanguage=new URL(location.href).searchParams.get('lang');if(['zh','en'].includes(inviteLanguage))prefs.lang=inviteLanguage;
let heroModel=new HeroPlane(document.querySelector('.hero-copy'),{reduced:prefs.reduced});
const die=new Die3D($('dice'),{reduced:prefs.reduced});
let diceBusy=false,dieValue=1,dieHasResult=false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const t=(en,zh)=>prefs.lang==='zh'?zh:en;
const social=new SocialUI({getLanguage:()=>prefs.lang,onChange:()=>{if(game&&screen==='play')render();}});
const reactions=new ReactionPreview({getLanguage:()=>prefs.lang,reduced:()=>prefs.reduced});
const onlineSession=new OnlineSession();
bindHangar(heroModel,onlineSession,t,()=>prefs.reduced,style=>{heroModel.dispose();heroModel=new HeroPlane(document.querySelector('.hero-copy'),{reduced:prefs.reduced,style});heroModel.setActive(screen==='welcome');return heroModel;});
document.addEventListener('flight-party-room-left',()=>toast(t('You left the waiting room. You can join again.','已退出等待房间，可以重新加入。')));
let onlineMode=false,onlineRoomId=null,onlineVersion=-1,onlinePending=null,onlineApplying=false,onlineTimer=null;
function authoritativeView(state,room){
 const view=Object.create(Game.prototype);
 view.players=state.players.map(p=>({color:p.seat,pieces:[...p.planes],rank:p.rank,planeStyle:room.seats.find(s=>s.index===p.seat)?.planeStyle||'classic',member:room.seats.find(s=>s.index===p.seat)?.member===true,annualMember:room.seats.find(s=>s.index===p.seat)?.member===true&&room.seats.find(s=>s.index===p.seat)?.annualMember===true,avatarUrl:room.seats.find(s=>s.index===p.seat)?.avatarUrl,avatarFrame:room.seats.find(s=>s.index===p.seat)?.avatarFrame||'none',flightTrail:room.seats.find(s=>s.index===p.seat)?.flightTrail||'none',victoryEffect:room.seats.find(s=>s.index===p.seat)?.victoryEffect||'none',name:room.seats.find(s=>s.index===p.seat)?.displayName||(p.seat===room.yourSeat?'You':`Pilot ${p.seat+1}`),type:p.seat===room.yourSeat?'human':room.seats.find(s=>s.index===p.seat)?.bot?'bot':'remote',bumps:0,rolls:0}));
 view.active=view.players;view.turn=state.turn;view.phase=state.phase.toLowerCase();view.die=state.die;view.ranking=[...state.ranking];view.round=1;view.party=false;view.event=null;return view;
}
async function applyOnlineSnapshot(message){
 if(!message.game?.players||!['PLAYING','SETTLED'].includes(message.room.phase))return;
 if(onlineRoomId===message.room.roomId&&Number(message.gameVersion)<=onlineVersion){
  let changed=false;
  for(const player of game.players){const name=message.room.seats.find(s=>s.index===player.color)?.displayName||(player.color===message.room.yourSeat?'You':`Pilot ${player.color+1}`);const appearance=message.room.seats.find(s=>s.index===player.color);if(player.avatarUrl!==appearance?.avatarUrl){player.avatarUrl=appearance?.avatarUrl;changed=true;}if(player.planeStyle!==(appearance?.planeStyle||'classic')){player.planeStyle=appearance?.planeStyle||'classic';changed=true;}player.flightTrail=appearance?.flightTrail||'none';player.victoryEffect=appearance?.victoryEffect||'none';if(player.annualMember!==(appearance?.member===true&&appearance?.annualMember===true)){player.annualMember=appearance?.member===true&&appearance?.annualMember===true;changed=true;}if(player.member!==!!appearance?.member||player.avatarFrame!==(appearance?.avatarFrame||'none')){player.member=!!appearance?.member;player.avatarFrame=appearance?.avatarFrame||'none';changed=true;}if(name!==player.name){player.name=name;changed=true;}}
  if(changed&&screen==='play')render();
  if(changed&&screen==='results'){
   const winner=game.players[game.ranking[0]];$('winner-name').textContent=t(`${winner.name} sticks the landing!`,`${winner.name} 完美降落！`);$('winner-name').dataset.member=String(winner.member===true);$('winner-name').dataset.annualMember=String(winner.member===true&&winner.annualMember===true);
   document.querySelectorAll('#rankings .rank-row b').forEach((node,i)=>{const player=game.players[game.ranking[i]];if(player){node.textContent=player.name;node.dataset.member=String(player.member===true);node.dataset.annualMember=String(player.member===true&&player.annualMember===true);const avatar=node.parentElement.querySelector('.result-avatar');if(avatar)avatar.dataset.frame=player.avatarFrame||'none';node.parentElement.dataset.cardFrame=player.member?player.avatarFrame||'none':'none';}});
  }
  return;
 }
 const initial=!onlineMode||onlineRoomId!==message.room.roomId;
 const previous=initial?null:game,next=authoritativeView(message.game,message.room);
 if(next.phase!=='choose'||next.legal().length<2){$('piece-buttons').replaceChildren();scene?.setSelectable([]);}
 onlineVersion=Number(message.gameVersion);onlineRoomId=message.room.roomId;
 if(initial){cancel();onlineMode=true;party=false;social.roomDialog.close();show('play');if(!ensureScene())return;game=next;scene.setGame(game);drawDie(next.die||1,!!next.die);if(next.phase!=='over')track('game_start',message.room.origin==='FRIENDS'?'friends':'quick');}
 game=next;
 const generation=epoch;
 const movement=onlineMovement(previous,next);
 if(movement){
  diceBusy=true;render();fx.move();await scene.move(movement,()=>fx.bump());if(generation!==epoch)return;diceBusy=false;fx.land();drawDie(next.die||1,!!next.die);
 }else if(previous&&next.phase==='choose'&&(previous.phase!=='choose'||previous.turn!==next.turn)&&Date.now()<Number(message.busyUntil)){
  diceBusy=true;render();fx.roll();await die.rollTo(next.die);if(generation!==epoch)return;diceBusy=false;drawDie(next.die);
 }else drawDie(next.die||1,!!next.die);
 scene.sync(game);render();$('demo').disabled=true;$('record-demo').disabled=true;
 clearInterval(onlineTimer);const offset=Date.parse(message.room.serverNow)-Date.now();
 onlineTimer=setInterval(()=>{seconds=Math.max(0,Math.ceil((Number(message.actionDeadline)-Date.now()-offset)/1000));updateClock(Number(message.busyUntil)>Date.now()+offset);},250);
 if(game.phase==='over'){clearInterval(onlineTimer);finish();}
}
onlineSession.addEventListener('snapshot',async event=>{
 onlinePending=event.detail;if(onlineApplying)return;onlineApplying=true;
 try{while(onlinePending){const message=onlinePending;onlinePending=null;await applyOnlineSnapshot(message);}}
 catch(error){toast(t('Unable to sync the flight. Reconnecting…','同步失败，正在重连…'));onlineSession.connect();}
 finally{onlineApplying=false;}
});
const later=(fn,ms)=>{const id=setTimeout(()=>{jobs.delete(id);fn();},ms);jobs.add(id);return id;};
function cancel(){document.querySelectorAll('.confetti').forEach(node=>node.remove());reactions.clear();epoch++;die.cancel();diceBusy=false;syncDieLabel();$('demo-status').classList.add('hidden');clearInterval(clock);jobs.forEach(clearTimeout);jobs.clear();}
function show(id){screen=id;if(id==='play')$('play').dataset.online=String(onlineMode);heroModel.setActive(id==='welcome');if(id!=='play')reactions.clear();for(const node of document.querySelectorAll('.screen'))node.classList.toggle('hidden',node.id!==id);$('mode-label').textContent=id==='play'?(party?'PARTY MODE':'CLASSIC MODE'):'THE FRIENDLY SKIES';if(id==='play')requestAnimationFrame(()=>{scene?.resize();die.resize();});}
function toast(text){clearTimeout(toastJob);$('toast').textContent=text;$('toast').classList.add('visible');toastJob=setTimeout(()=>$('toast').classList.remove('visible'),2500);}
function savePrefs(){localStorage.setItem('flight-party-prefs',JSON.stringify(prefs));fx.enabled=prefs.sound;fx.volume=prefs.volume/100;if(fx.master)fx.master.gain.setTargetAtTime(prefs.sound?fx.volume:0,fx.ctx.currentTime,.02);document.body.classList.toggle('reduce-motion',prefs.reduced);heroModel.setReduced(prefs.reduced);if(scene)scene.reduced=prefs.reduced;die.setReduced(prefs.reduced);$('sound').textContent=prefs.sound?'♫':'♩';$('sound').setAttribute('aria-pressed',String(prefs.sound));$('sound-enabled').checked=prefs.sound;$('music-enabled').checked=prefs.music;$('visual-mode').value=prefs.visual;$('volume').value=prefs.volume;$('reduced').checked=prefs.reduced;$('language').textContent=prefs.lang==='en'?'EN / 中':'中文 / EN';}
document.addEventListener('pointerdown',()=>{fx.unlock();if(prefs.music&&!fx.musicTimer)fx.setMusic(true);});document.addEventListener('keydown',()=>fx.unlock());
$('music-enabled').onchange=e=>{prefs.music=e.target.checked;fx.setMusic(prefs.music);savePrefs();};$('visual-mode').onchange=e=>{prefs.visual=e.target.value;savePrefs();};$('sound').onclick=()=>{prefs.sound=!prefs.sound;savePrefs();};$('sound-enabled').onchange=e=>{prefs.sound=e.target.checked;savePrefs();};$('volume').oninput=e=>{prefs.volume=+e.target.value;savePrefs();};$('reduced').onchange=e=>{prefs.reduced=e.target.checked;savePrefs();};$('settings').onclick=()=>$('settings-dialog').showModal();
const copy=[['join-preview','Join by room code →','房间码加入 →'],['create',"Create room <span>↗</span>",'创建房间 <span>↗</span>'],['start','Start local practice <span>→</span>','开始本地练习 <span>→</span>'],['back-home','← Back','← 返回'],['roll','ROLL DICE <span>↗</span>','掷骰子 <span>↗</span>'],['demo','▶ Try a bump','▶ 体验撞机'],['leave','Leave flight','退出对局'],['rematch','Fly again ↗','再来一局 ↗'],['edit-crew','Change crew','调整阵容']];
function translate(){document.documentElement.lang=prefs.lang==='en'?'en':'zh-CN';copy.forEach(([id,en,zh])=>{const node=$(id);if(node)node.innerHTML=t(en,zh);});social.setLanguage();syncDieLabel();if(screen==='lobby')renderSeats();if(screen==='play')render();}
$('language').onclick=()=>{prefs.lang=prefs.lang==='en'?'zh':'en';savePrefs();translate();};
function renderSeats(){$('seat-grid').innerHTML=seats.map((s,i)=>`<article class="seat-card ${s.type==='off'?'off':''}" style="--seat:#${PALETTE[i].toString(16).padStart(6,'0')}"><div class="seat-avatar avatar-${i}">${['✈','✈','✈','✈'][i]}</div><label for="name-${i}">${t('CALL SIGN','玩家昵称')} · ${['BLUE','ORANGE','GREEN','RED'][i]}</label><input id="name-${i}" maxlength="18" value="${esc(s.name)}" ${s.type==='off'?'disabled':''}><label for="type-${i}">${t('SEAT TYPE','席位类型')}</label><select id="type-${i}">${[['human',t('Human player','真人玩家')],['bot',t('Computer pilot','电脑玩家')],['off',t('Close seat','关闭席位')]].map(([v,label])=>`<option value="${v}" ${v===s.type?'selected':''}>${label}</option>`).join('')}</select><small>${t('Two planes. One destination. A few questionable decisions.','两架飞机，一个终点，一点运气。')}</small></article>`).join('');for(let i=0;i<4;i++){$(`type-${i}`).onchange=e=>{seats[i].type=e.target.value;renderSeats();};$(`name-${i}`).oninput=e=>{seats[i].name=e.target.value;};}const humans=seats.filter(s=>s.type==='human').length,bots=seats.filter(s=>s.type==='bot').length;$('seat-summary').textContent=t(`${humans} human${humans===1?'':'s'} + ${bots} bot${bots===1?'':'s'} · ${humans+bots} aboard`,`${humans} 名真人 + ${bots} 名电脑 · 共 ${humans+bots} 方`);$('start').disabled=humans<1||humans+bots<2;$('classic-mode').classList.toggle('selected',!party);$('party-mode').classList.toggle('selected',party);}
function lobby(){cancel();show('lobby');renderSeats();}
$('create').onclick=()=>social.openRoom('invite');$('back-home').onclick=()=>show('welcome');$('classic-mode').onclick=()=>{party=false;renderSeats();};$('party-mode').onclick=()=>{party=true;renderSeats();};
document.addEventListener('flight-party-practice-preview',()=>{seats=[{name:social.viewer.name||'You',type:'human'},{name:'Alex',type:'bot'},{name:'Milo',type:'bot'},{name:'Coco',type:'bot'}];party=false;start();});
function ensureScene(){if(scene)return true;try{scene=prefs.visual==='three'?new BoardScene($('canvas-wrap'),i=>choose(i),{reduced:prefs.reduced}):new CanvasBoard($('canvas-wrap'),i=>choose(i),{reduced:prefs.reduced});$('loading').remove();return true;}catch(e){console.warn('WebGL unavailable; switching to compatibility rendering:',e.message);try{scene=new CanvasBoard($('canvas-wrap'),i=>choose(i),{reduced:prefs.reduced});$('loading').remove();toast(t('Compatibility mode. Enable WebGL for full 3D.','已启用兼容画面。开启 WebGL 可体验完整 3D。'));return true;}catch(error){console.error(error);$('loading').textContent=t('Unable to render the board. Please try an updated browser.','无法绘制棋盘，请尝试新版浏览器。');$('roll').disabled=true;$('demo').disabled=true;return false;}}}
function start(){onlineMode=false;onlineRoomId=null;onlineVersion=-1;clearInterval(onlineTimer);onlineSession.close();cancel();social.setResult(null);drawDie(1,false);game=new Game(seats.map((s,i)=>({...s,name:s.name.trim()||COLORS[i]})),{party});show('play');if(!ensureScene())return;scene.setGame(game);scene.resize();beginTurn();}
$('start').onclick=start;$('rematch').onclick=start;$('edit-crew').onclick=lobby;$('camera-reset').onclick=()=>scene?.resize();
function askLeave(){if(screen!=='play'){show('welcome');return;}$('confirm-dialog').showModal();}
$('home-link').onclick=e=>{e.preventDefault();askLeave();};$('leave').onclick=askLeave;$('confirm-stay').onclick=()=>$('confirm-dialog').close();$('confirm-leave').onclick=()=>{$('confirm-dialog').close();cancel();show('welcome');};
// The geometry's orientation reveals the authoritative result; it never picks a value.
function syncDieLabel(){
 $('dice').setAttribute('aria-busy',String(diceBusy));
 $('dice').setAttribute('aria-label',diceBusy?t('Rolling the 3D die','正在投掷3D骰子'):dieHasResult?t(`Die result: ${dieValue}`,`骰子点数：${dieValue}`):t('3D die, ready to roll','3D骰子，等待投掷'));
 if(diceBusy)$('dice').removeAttribute('data-value');else $('dice').dataset.value=String(dieValue);
 $('dice-result').textContent=dieHasResult&&!diceBusy?t(`Rolled ${dieValue}`,`掷出 ${dieValue} 点`):'';
 $('dice-result').classList.toggle('hidden',!dieHasResult||diceBusy);
}
function drawDie(n=1,hasResult=true){dieValue=n;dieHasResult=hasResult;die.setValue(n);syncDieLabel();}
function previewTakeoverColor(){return social.takeoverPreview?(game.active.find(p=>p.type==='human'&&p.color!==0)||game.active.find(p=>p.type==='human'))?.color:-1;}
function syncTakeoverPreview(){let note=$('takeover-preview-note');if(!note){note=document.createElement('div');note.id='takeover-preview-note';note.className='takeover-preview-note hidden';document.querySelector('.board-region').append(note);}const p=game.players[previewTakeoverColor()];note.classList.toggle('hidden',!p);note.textContent=p?t(`UI PREVIEW · ${p.name} offline · bot takes over`, `界面预览 · ${p.name} 离线 · 机器人代玩`):'';}
function playerCard(s){
 const takeover=s.color===previewTakeoverColor();
 const current=s.color===game.turn,finished=s.pieces.filter(progress=>progress===FINISH).length;
 const fleet=s.pieces.map((progress,i)=>{const state=progress===FINISH?'done':progress<0?'parked':'flying';const label=progress===FINISH?t('Finished','已到达'):progress<0?t('At base','在基地'):t('Flying','航行中');return `<span class="fleet-plane ${state}" title="${t('Plane','飞机')} ${i+1} · ${label}" aria-label="${t('Plane','飞机')} ${i+1} · ${label}"><i>${i+1}</i><span aria-hidden="true">${state==='done'?'✓':'✈'}</span></span>`;}).join('');
 return `<div class="player-row ${current?'active':''}" data-color="${s.color}" style="--seat:#${PALETTE[s.color].toString(16).padStart(6,'0')}"><div class="player-avatar avatar-${s.color}" ${avatarStyle(s.avatarUrl)} data-frame="${esc(s.avatarFrame||'none')}" aria-hidden="true"></div><div class="player-info"><div class="name-line"><span class="seat-dot"></span><b data-member="${s.member===true}" data-annual-member="${s.member===true&&s.annualMember===true}" title="${esc(s.name)}">${esc(s.name)}</b></div><div class="fleet-status player-detail-line"><span class="type-badge ${takeover?'autopilot-preview':''}" title="${takeover?t('UI preview: original player, bot control','界面预览：保留玩家身份，由机器人代玩'):''}">${takeover?t('AUTO*','托管*'):s.type==='bot'?'BOT':'HUMAN'}</span>${fleet}</div></div>${social.playerStats(s)}<div class="player-progress">${current?`<span class="current-badge">${t('CURRENT TURN','当前回合')}</span>`:''}<small>${s.rank?t(`Rank #${s.rank}`,`第 ${s.rank} 名`):`${finished} / 2 ${t('finished','已到达')}`}</small></div></div>`;
}

function render(){const p=game.current,automaticChoice=game.phase==='choose'&&p.pieces.filter(progress=>progress<FINISH).length===1,choices=game.phase==='choose'?game.legal():[],canChoose=!diceBusy&&game.phase==='choose'&&p.type==='human'&&choices.length>1;document.querySelector('.turn-panel').style.setProperty('--turn-color','#'+PALETTE[p.color].toString(16).padStart(6,'0'));$('round-label').textContent=t('ROUND ','回合 ')+String(game.round).padStart(2,'0');$('player-count').textContent=t(`${game.active.length} aboard`,`${game.active.length} 方参与`);$('players').innerHTML=game.active.map(playerCard).join('');reactions.sync();syncTakeoverPreview();$('turn-title').textContent=t(p.name==='You'?'Your turn':`${p.name}'s turn`,`${p.name} 的回合`);$('roll').disabled=diceBusy||game.phase!=='roll'||p.type!=='human';$('demo').disabled=diceBusy||game.phase!=='roll'||p.type!=='human';$('record-demo').disabled=$('demo').disabled;$('board-tip').textContent=diceBusy?t('Rolling…','正在掷骰…'):automaticChoice?t('Moving your remaining plane…','正在自动移动剩余飞机…'):game.phase==='choose'?t('Click a glowing plane to move','点击发光的飞机移动'):t('Two planes. One finish line.','两架飞机，一个终点。');$('action-hint').textContent=diceBusy?t('A little roll. A little luck.','骰子翻滚中…'):automaticChoice?t('Moving your remaining plane…','正在自动移动剩余飞机…'):game.phase==='choose'?t('Choose a plane. Make it count.','选择一架飞机，准备起飞。'):game.phase==='animating'?t('A little turbulence…','遇到一点小气流…'):p.type==='bot'?t('Your copilot is thinking…','电脑正在思考…'):t('Give your luck a little nudge.','掷出你的好运气。');$('piece-buttons').innerHTML=canChoose?choices.map(i=>`<button data-piece="${i}">${t('Plane ','飞机 ')}${i+1} ${p.pieces[i]<0?'↗':'→'}</button>`).join(''):'';document.querySelectorAll('[data-piece]').forEach(b=>b.onclick=()=>choose(+b.dataset.piece));scene?.setSelectable(canChoose?choices.map(i=>`${p.color}:${i}`):[]);$('event-label').textContent=game.party?(game.event==='tailwind'?t('TAILWIND · +1 STEP','顺风 · 前进 +1'):game.event==='peace'?t('PEACEFUL SKIES · NO BUMPS','和平天空 · 禁止撞机'):t('PARTY · VOTE BETWEEN ROUNDS','派对 · 每轮投票')):t('CLASSIC · NO POWER-UPS','经典模式 · 无道具');}
function updateClock(paused=false){$('timer').textContent=paused?t('Paused','已暂停'):`${seconds}s`;$('timer').classList.toggle('urgent',!paused&&seconds<=5);}
function beginTurn(){render();seconds=15;updateClock();clearInterval(clock);clock=setInterval(()=>{if(screen!=='play'||diceBusy||game.phase==='animating'||game.phase==='vote'||document.querySelector('dialog[open]')||document.hidden){updateClock(true);return;}seconds--;updateClock();if(seconds<=0){clearInterval(clock);if(game.phase==='roll')roll(true);else if(game.phase==='choose')choose(bestMove());}},1000);if(game.current.type==='bot')later(()=>roll(true),850);}
function bestMove(){const legal=game.legal();let best=legal[0],score=-Infinity;for(const i of legal){const dest=game.destination(i),tile=(dest+game.turn*13)%52;let value=dest*.2+(dest===FINISH?100:0)+(game.current.pieces[i]<0?4:0);if(dest<52&&tile%13!==0&&game.event!=='peace')for(const p of game.active)if(p!==game.current)for(const progress of p.pieces)if(progress>=0&&progress<52&&(progress+p.color*13)%52===tile)value+=30;if(value>score){best=i;score=value;}}return best;}
async function choose(piece){
 if(!onlineMode)return chooseLocal(piece);
 if(!game||game.current.type!=='human'||game.phase!=='choose'||diceBusy)return;
 try{await onlineSession.move(piece);}catch(error){toast(t('Move rejected. Waiting for server state.','移动未接受，等待服务器状态。'));}
}
async function roll(auto=false){
 if(onlineMode){if(game?.current.type!=='human'||game.phase!=='roll'||diceBusy)return;try{await onlineSession.roll();}catch(error){toast(t('Roll rejected. Waiting for server state.','掷骰未接受，等待服务器状态。'));}return;}
 if(!game||screen!=='play'||diceBusy||game.phase!=='roll'||(!auto&&game.current.type!=='human'))return;
 fx.unlock();const id=epoch,result=game.roll();clearInterval(clock);diceBusy=true;syncDieLabel();render();updateClock(true);fx.roll();
 await die.rollTo(result);
 if(id!==epoch)return;
 diceBusy=false;drawDie(result);render();
 if(game.legal().length===1){await chooseLocal(game.legal()[0]);return;}
 seconds=15;updateClock();
 clock=setInterval(()=>{if(screen!=='play'||game.phase!=='choose')return;if(document.hidden||document.querySelector('dialog[open]')){updateClock(true);return;}seconds--;updateClock();if(seconds<=0){clearInterval(clock);choose(bestMove());}},1000);
 if(game.current.type==='bot'||auto)later(()=>choose(bestMove()),650);
}
async function chooseLocal(piece){if(!game||screen!=='play'||diceBusy||game.phase!=='choose'||!game.legal().includes(piece))return;const id=epoch;clearInterval(clock);const result=game.move(piece);render();updateClock(true);fx.move();await scene.move(result,(point)=>{if(point){$('impact').style.left=Math.min(point.x,scene.wrap.clientWidth-120)+'px';$('impact').style.top=Math.max(30,point.y-100)+'px';}fx.bump();$('impact').classList.remove('show');void $('impact').offsetWidth;$('impact').classList.add('show');toast(t(`${game.players[result.color].name} bumped ${[...new Set(result.captured.map(v=>game.players[v.color].name))].join(' & ')}!`,`${game.players[result.color].name} 撞飞了 ${[...new Set(result.captured.map(v=>game.players[v.color].name))].join('、')}！`));});if(id!==epoch)return;fx.land();scene.sync(game);game.advance();if(game.phase==='over'){finish();return;}if(game.phase==='vote'){openVote();return;}beginTurn();}
$('roll').onclick=()=>roll();
const measuredGames=new Set();
function finish(){
 if(onlineMode&&!measuredGames.has(onlineRoomId)){measuredGames.add(onlineRoomId);track('game_end',onlineSession.room?.origin==='FRIENDS'?'friends':'quick');}
 social.liveResult=onlineMode?{status:'PENDING'}:null;finishLocal();if(!onlineMode)return;
 $('rematch').textContent=onlineSession.room?.origin==='FRIENDS'?t('Play with friends again ↗','好友再来一局 ↗'):t('Match again ↗','重新匹配 ↗');
 const generation=epoch,roomId=onlineRoomId,panel=$('result-save-panel');
 $('rematch').disabled=true;panel.classList.remove('hidden');
 panel.textContent=t('Saving the server-verified result…','正在保存服务器确认的结果…');
 async function check(){
  if(generation!==epoch||!onlineMode||roomId!==onlineRoomId)return;
  try{
   const result=await onlineSession.result();
   if(result.status==='COMMITTED'){
    social.liveResult=result;
    const identity=await onlineSession.request('/api/me');onlineSession.emit('identity',identity);
    panel.textContent=t('Result confirmed. All signed-in games count automatically, including negative points.','结果已确认。所有已绑定账号的对局自动累计，正负分都计入。');
    renderResultRankings($('rankings'),game.players,result.ranking.map(seat=>seat.seatIndex),{key:roomId,online:true,confirmed:result.ranking,t});
    if(identity.activeRoomId!==roomId||onlineSession.room?.phase==='SETTLED'){$('rematch').disabled=false;return;}
   }
  }catch(error){panel.textContent=t('Result confirmation pending. Retrying…','结果确认暂未完成，正在重试…');}
  later(check,1000);
 }
 check();
}
function openVote(){clearInterval(clock);render();updateClock(true);votes={tailwind:0,peace:0};voteQueue=game.active.filter(p=>p.rank===null);voteIndex=0;$('vote-dialog').showModal();nextVote();}
function nextVote(){if(voteIndex>=voteQueue.length){const result=votes.tailwind===votes.peace?(secureDie()>3?'tailwind':'peace'):votes.tailwind>votes.peace?'tailwind':'peace';game.applyEvent(result);$('vote-dialog').close();toast(result==='tailwind'?t('Tailwind! Every move gets +1.','顺风！本轮每次移动 +1。'):t('Peaceful skies! No bumps this round.','和平天空！本轮禁止撞机。'));beginTurn();return;}const p=voteQueue[voteIndex];$('voter-label').textContent=t(`${p.name}, your vote?`,`${p.name}，请选择你的投票`);$('votes-tailwind').textContent=t(`${votes.tailwind} votes`,`${votes.tailwind} 票`);$('votes-peace').textContent=t(`${votes.peace} votes`,`${votes.peace} 票`);document.querySelectorAll('[data-vote]').forEach(b=>b.disabled=p.type==='bot');if(p.type==='bot')later(()=>castVote(secureDie()>3?'tailwind':'peace'),450);}
function castVote(event){votes[event]++;voteIndex++;nextVote();}document.querySelectorAll('[data-vote]').forEach(b=>b.onclick=()=>castVote(b.dataset.vote));$('vote-dialog').addEventListener('cancel',e=>e.preventDefault());
function finishLocal(){cancel();show('results');const localPlayer=game.active.find(p=>p.type==='human');social.setResult(localPlayer?{rank:localPlayer.rank,name:localPlayer.name}:null);fx.win();const winner=game.players[game.ranking[0]];renderVictory($('results'),winner,{reduced:prefs.reduced,label:t('Golden Wings Celebration','金翼庆典')});$('winner-name').textContent=t(`${winner.name} sticks the landing!`,`${winner.name} 完美降落！`);$('winner-name').dataset.member=String(winner.member===true);$('winner-name').dataset.annualMember=String(winner.member===true&&winner.annualMember===true);renderResultRankings($('rankings'),game.players,game.ranking,{key:onlineMode?onlineRoomId:'local-'+epoch,online:onlineMode,t});if(!prefs.reduced)for(let i=0;i<45;i++){const c=document.createElement('i');c.className='confetti';c.style.left=Math.random()*100+'vw';c.style.background=winner.member&&winner.victoryEffect==='gold'?['#f6ca54','#4d88ff','#fff0b0'][i%3]:'#'+PALETTE[i%4].toString(16).padStart(6,'0');c.style.animationDelay=Math.random()*.7+'s';document.body.append(c);setTimeout(()=>c.remove(),4000);}}
const pause=ms=>new Promise(r=>setTimeout(r,prefs.reduced?Math.min(ms,100):ms));
async function demoFlight(){if(game.phase!=='roll'||game.current.type!=='human')return;cancel();const id=epoch,saved=game;const demo=new Game([{name:'You',type:'human'},{name:'Alex',type:'human'},{name:'Milo',type:'bot'},{name:'Coco',type:'bot'}]);demo.players[0].pieces=[41,-1];demo.players[3].pieces=[6,-1];scene.setGame(demo);game=demo;game.phase='animating';render();updateClock(true);$('demo-status').classList.remove('hidden');await pause(650);if(epoch!==id)return;fx.unlock();await fx.ready;fx.roll();diceBusy=true;syncDieLabel();render();await die.rollTo(4);if(epoch!==id)return;diceBusy=false;demo.phase='roll';demo.roll(4);drawDie(4);const result=demo.move(0);render();updateClock(true);fx.move();await scene.move(result,(point)=>{if(point){$('impact').style.left=Math.min(point.x,scene.wrap.clientWidth-120)+'px';$('impact').style.top=Math.max(30,point.y-100)+'px';}fx.bump();$('impact').classList.remove('show');void $('impact').offsetWidth;$('impact').classList.add('show');toast(t('You bumped Coco!','你撞飞了 Coco！'));});if(epoch!==id)return;fx.land();await pause(1100);if(epoch!==id)return;game=saved;scene.setGame(game);$('demo-status').classList.add('hidden');beginTurn();toast(t('Back to your flight.','已恢复你的对局。'));}
$('demo').onclick=demoFlight;
$('record-demo').onclick=async()=>{if(game.phase!=='roll'||game.current.type!=='human')return;fx.unlock();await fx.ready;const canvas=$('canvas-wrap').querySelector('canvas');if(!canvas.captureStream||!window.MediaRecorder){toast(t('Recording is not available in this browser.','当前浏览器不支持录制。'));return;}const stream=canvas.captureStream(30);for(const track of fx.mediaDestination.stream.getAudioTracks())stream.addTrack(track);const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));if(!mime){toast(t('WebM recording is unavailable.','当前浏览器不支持 WebM。'));return;}const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6000000}),chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};rec.onstop=()=>{const blob=new Blob(chunks,{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='FlightParty_collision_preview.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);for(const tr of stream.getVideoTracks())tr.stop();};rec.start();try{await demoFlight();}finally{rec.stop();}};
for(const b of document.querySelectorAll('.reactions button'))b.onclick=()=>{if(!game||screen!=='play')return;fx.click();const sender=game.current.type==='human'?game.current:game.active.find(p=>p.type==='human');reactions.show({color:sender.color,name:sender.name,emoji:b.textContent.trim()});};
window.addEventListener('keydown',e=>{if(e.code==='Space'&&screen==='play'&&!document.querySelector('dialog[open]')&&!['INPUT','SELECT','BUTTON'].includes(document.activeElement.tagName)){e.preventDefault();if(game.phase==='roll'&&game.current.type==='human')roll();}});
social.init();bindLiveRooms(social,onlineSession);bindLiveAccount(social,onlineSession);savePrefs();translate();drawDie(1,false);show('welcome');
const restoreEpoch=epoch;
onlineSession.initialize().then(async identity=>{
 if(epoch!==restoreEpoch||screen!=='welcome')return;
 const invitation=new URL(location.href).searchParams.get('room');
 if(identity.activeRoomId){
  const room=await onlineSession.restore(identity.activeRoomId);
  if(!invitation&&['WAITING_FRIENDS','MATCHING','STARTING'].includes(room.phase))await social.openRoom('invite');
 }
 if(invitation)await social.openInvitation(invitation);
}).catch(()=>{/* Local practice remains available when the local backend is stopped. */});
$('rematch').onclick=()=>{
 if(!onlineMode){start();return;}
 const room=onlineSession.room;
 if(room?.origin==='FRIENDS')social.rematchFriends(room.roomId);
 else social.openRoom('quick');
};
const seenOnlineReactions=new Set();
onlineSession.addEventListener('snapshot',event=>{
 if(!onlineMode||!game)return;
 for(const reaction of event.detail.reactions||[]){
  if(seenOnlineReactions.has(reaction.eventId)||Date.now()-reaction.createdAt>5000)continue;
  seenOnlineReactions.add(reaction.eventId);if(seenOnlineReactions.size>500)seenOnlineReactions.delete(seenOnlineReactions.values().next().value);
  const player=game.players[reaction.seat];if(player)reactions.show({color:reaction.seat,name:player.name,emoji:reaction.emoji});
 }
});
for(const button of document.querySelectorAll('.reactions button')){
 const local=button.onclick;button.onclick=()=>{
  if(!onlineMode)return local();
  onlineSession.react(button.textContent.trim()).catch(()=>toast(t('Reaction could not be sent.','表情发送失败。')));
 };
}
$('confirm-leave').onclick=()=>{
 $('confirm-dialog').close();clearInterval(onlineTimer);
 if(onlineMode){onlineSession.close();onlineMode=false;onlineVersion=-1;onlineRoomId=null;}
 cancel();show('welcome');
};

let lastIdentityRefresh=Date.now();
const refreshLogin=()=>{if(document.hidden||Date.now()-lastIdentityRefresh<15000)return;lastIdentityRefresh=Date.now();(onlineSession.authState==='ready'?onlineSession.refreshIdentity():onlineSession.initialize()).catch(()=>{});};
window.addEventListener('online',refreshLogin);window.addEventListener('focus',refreshLogin);document.addEventListener('visibilitychange',refreshLogin);
