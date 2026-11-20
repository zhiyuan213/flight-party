import {decoratePiece} from './game-cosmetics.js?v=20261112-gamelanes1&nine=20261120-nineball1';
import {stoneUrl} from './personal-piece-art.js?v=20261113-gomokuseat1';

/** A small copy of the actual seat counter, using the board's material and
 * theme face variables. It never reads another player's local equipment. */
export function fourSeatPiece(doc,seat,name='玩家'){
  const node=doc.createElement('span');
  node.className='four-seat-piece';node.dataset.player=String(seat);
  node.setAttribute('role','img');node.setAttribute('aria-label',name+'的棋子');
  decoratePiece(node,seat);
  /* Gomoku seats show the shop's themed stone (the exact Canvas finish from
     drawStoneFinish), not the generic emblem medallion. Default stones are
     painted by four-seat-piece.css. */
  const themed=node.getAttribute('data-cosmetic-piece');
  if(themed&&doc?.body?.classList?.contains('gomoku-game'))node.style.setProperty('--personal-stone',stoneUrl(themed,seat));
  return node;
}
