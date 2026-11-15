/* Shared DOM rendering for the online custody state. Both game shells (the 10
   table games and Flight Party) call these helpers, so the "托管状态" badge,
   the 30s countdown and the no-score notice look and read identically.

   The contract itself is pure and lives in online-custody.js; this module only
   paints it. CSS is installed once per document so no HTML/version chain has to
   change when the badge styling is tuned. */

import {CUSTODY_GRACE, CUSTODY_HOSTED, SEAT_BOT, seatCustody, CUSTODY_LABELS}
  from './online-custody.js?v=20261115-joincoin1';

export const CUSTODY_UI_VERSION = '20261115-joincoin1';

const STYLE_ID = 'joyflock-custody-style';
const CSS = `
.seat-custody,.custody-badge{display:inline-flex;align-items:center;gap:5px;margin-left:6px;
  padding:2px 7px;border-radius:999px;font-size:11px;font-weight:700;line-height:1.45;
  letter-spacing:.01em;white-space:nowrap;vertical-align:middle;
  border:1px solid #ffd16766;background:#ffd1671c;color:#ffd97e}
.seat-custody[data-state="hosted"],.custody-badge[data-state="hosted"]{
  border-color:#8fb0ff66;background:#5f82ff1c;color:#b9caff}
.seat-custody[data-state="grace"] .custody-count,.custody-badge[data-state="grace"] .custody-count{
  font-variant-numeric:tabular-nums;color:#fff3cf}
.seat-custody::before,.custody-badge::before{content:"";width:6px;height:6px;border-radius:50%;
  background:currentColor;box-shadow:0 0 6px currentColor;flex:none}
.seat-custody[data-state="grace"]::before,.custody-badge[data-state="grace"]::before{
  animation:joyflock-custody-pulse 1s ease-in-out infinite}
@keyframes joyflock-custody-pulse{0%,100%{opacity:1}50%{opacity:.3}}
.seat[data-custody="grace"],.player-row[data-custody="grace"]{outline:1px solid #ffd16755}
.seat[data-custody="hosted"],.player-row[data-custody="hosted"]{outline:1px solid #8fb0ff44}
.custody-no-score{display:block;margin:8px 0 0;padding:8px 11px;border-radius:10px;
  border:1px solid #ff9b9b55;background:#5f202033;color:#ffc9c9;
  font-size:12px;font-weight:600;line-height:1.5}
.custody-no-score[hidden]{display:none}
.room-seat-custody{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:999px;
  font-style:normal;font-size:10px;font-weight:700;vertical-align:middle;
  border:1px solid #ffd16766;background:#ffd1671c;color:#ffd97e}
.room-seat-custody[data-state="hosted"]{border-color:#8fb0ff66;background:#5f82ff1c;color:#b9caff}
/* Hosted seats wear a small standing warning beacon on the avatar, drawn from
   the side (not top-down): a domed red lamp on a dark base, with a glass glint
   and a breathing red glow. Grace (waiting to reconnect) and native bots keep
   a clean face. */
.seat[data-custody="hosted"] .avatar-shell,
.player-row[data-custody="hosted"] .player-avatar{position:relative}
.seat[data-custody="hosted"] .avatar-shell::after,
.player-row[data-custody="hosted"] .player-avatar::after{
  content:'';position:absolute;left:50%;top:56%;transform:translate(-50%,-50%);
  width:32%;height:44%;border-radius:46% 46% 22% 22%;pointer-events:none;z-index:3;
  background:
    radial-gradient(ellipse 50% 34% at 36% 20%, rgba(255,255,255,.62) 0 24%, transparent 70%),
    radial-gradient(ellipse 86% 58% at 50% 8%, #ff6a3a 0 28%, #d41c0c 46%, #811006 60%, transparent 73%),
    linear-gradient(#2c3346, #101420) 50% 88% / 76% 20% no-repeat;
  box-shadow:inset 0 -2px 4px #000b,inset 0 1px 2px #fff3,0 1px 8px 1px #ff2d0d8c,0 0 18px 6px #ff201055;
  animation:joyflock-custody-beacon 1.6s ease-in-out infinite
}
@keyframes joyflock-custody-beacon{
  0%,100%{box-shadow:inset 0 -2px 4px #000b,inset 0 1px 2px #fff3,0 1px 8px 1px #ff2d0d8c,0 0 18px 6px #ff201055}
  50%{box-shadow:inset 0 -2px 4px #000b,inset 0 1px 2px #fff3,0 1px 11px 3px #ff3f2099,0 0 26px 10px #ff2a0d66}
}
@media (prefers-reduced-motion:reduce){
  .seat-custody[data-state="grace"]::before,.custody-badge[data-state="grace"]::before{animation:none}
  .seat[data-custody="hosted"] .avatar-shell::after,
  .player-row[data-custody="hosted"] .player-avatar::after{animation:none}}
`;

export function ensureCustodyStyles(doc){
  if(!doc || typeof doc.getElementById !== 'function')return null;
  if(doc.getElementById(STYLE_ID))return doc.getElementById(STYLE_ID);
  if(typeof doc.createElement !== 'function' || !doc.head)return null;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.append(style);
  return style;
}

const escapeHTML = value => String(value).replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* HTML-string variant for shells that build seat rows with innerHTML. */
export function custodyBadgeHTML(info){
  if(!info||!info.label)return '';
  const l=CUSTODY_LABELS[info.lang==='en'?'en':'zh'];
  const hint=info.hint?' title="'+escapeHTML(info.hint)+'"':'';
  const inner=info.state===CUSTODY_GRACE
    ? '<span class="custody-text">'+escapeHTML(l.grace+' ')+'</span><span class="custody-count">'+info.seconds+'s</span>'
    : '<span class="custody-text">'+escapeHTML(info.label)+'</span>';
  return '<span class="custody-badge" data-state="'+info.state+'" role="status"'+hint+'>'+inner+'</span>';
}

/* Build the badge for one seat. `info` comes from seatCustody(). */
export function custodyBadge(doc, info, className = 'seat-custody'){
  if(!doc || !info || !info.label)return null;
  ensureCustodyStyles(doc);
  const badge = doc.createElement('span');
  badge.className = className;
  badge.dataset.state = info.state;
  badge.dataset.custody = info.state;
  badge.setAttribute('role', 'status');
  if(info.hint)badge.title = info.hint;
  const text = doc.createElement('span');
  text.className = 'custody-text';
  if(info.state === CUSTODY_GRACE){
    text.textContent = CUSTODY_LABELS[info.lang === 'en' ? 'en' : 'zh'].grace + ' ';
    const count = doc.createElement('span');
    count.className = 'custody-count';
    count.textContent = info.seconds + (info.lang === 'en' ? 's' : 's');
    badge.append(text, count);
  }else{
    text.textContent = info.label;
    badge.append(text);
  }
  return badge;
}

/* Refresh badges already in the DOM without rebuilding the whole seat list.
   Both shells call this once a second while a countdown is running. */
export function updateCustodyBadges(doc, root, room, serverNow, lang = 'zh', seatSelector = '[data-seat-index]'){
  if(!doc || !root || !room || typeof root.querySelectorAll !== 'function')return 0;
  let touched = 0;
  for(const node of root.querySelectorAll(seatSelector)){
    const index = Number(node.dataset.seatIndex);
    if(!Number.isInteger(index) || index < 0)continue;
    const info = seatCustody(room, index, serverNow, lang);
    info.lang = lang;
    let badge = node.querySelector('.seat-custody,.custody-badge');
    if(info.label){
      if(!badge){
        badge = custodyBadge(doc, {...info, lang});
        if(badge){
          const host = node.querySelector('.seat-name,.name-line') || node;
          host.append(badge);
        }
      }
      if(badge){
        badge.dataset.state = info.state;
        if(info.hint)badge.title = info.hint;
        const text = badge.querySelector('.custody-text');
        const count = badge.querySelector('.custody-count');
        if(info.state === CUSTODY_GRACE){
          if(text)text.textContent = CUSTODY_LABELS[lang === 'en' ? 'en' : 'zh'].grace + ' ';
          if(count)count.textContent = info.seconds + 's';
          else if(badge.appendChild && text){
            const extra = doc.createElement('span');extra.className = 'custody-count';
            extra.textContent = info.seconds + 's';badge.appendChild(extra);
          }
        }else{
          if(text)text.textContent = info.label;
          if(count && count.remove)count.remove();
        }
      }
      node.dataset.custody = info.state;
      touched++;
    }else if(badge){
      badge.remove();
      delete node.dataset.custody;
      touched++;
    }
  }
  return touched;
}

export function noScoreNotice(doc, lang = 'zh'){
  if(!doc || typeof doc.createElement !== 'function')return null;
  ensureCustodyStyles(doc);
  const note = doc.createElement('span');
  note.className = 'custody-no-score';
  note.dataset.custodyNoScore = '1';
  note.setAttribute('role', 'status');
  note.textContent = CUSTODY_LABELS[lang === 'en' ? 'en' : 'zh'].noScore;
  return note;
}

export {CUSTODY_GRACE, CUSTODY_HOSTED, SEAT_BOT, seatCustody, CUSTODY_LABELS};
