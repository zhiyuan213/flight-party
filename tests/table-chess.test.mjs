import test from 'node:test';import assert from 'node:assert/strict';import {start,move,legal,bot} from '../dist/table/grid-rules.js';
const sq=s=>(8-Number(s[1]))*8+s.charCodeAt(0)-97;
const code=s=>sq(s.slice(0,2))*64+sq(s.slice(2,4))+4096*({q:1,r:2,b:3,n:4}[s[4]]||0);
function play(moves){let s=start('chess');for(const m of moves)s=move(s,s.turn,code(m));return s;}
test('chess initial position has 20 legal moves and rejects illegal self turns',()=>{const s=start('chess');assert.equal(legal(s).length,20);assert.throws(()=>move(s,2,code('e2e4')));assert.throws(()=>move(s,1,code('e1g1')));assert.ok(legal(s).includes(bot(s)));});
test('chess checkmate and repetition are terminal server-compatible states',()=>{const s=play(['f2f3','e7e5','g2g4','d8h4']);assert.equal(s.over,true);assert.equal(s.winner,2);assert.throws(()=>move(s,1,code('e2e4')));const draw=play(['g1f3','g8f6','f3g1','f6g8','g1f3','g8f6','f3g1','f6g8']);assert.equal(draw.over,true);assert.equal(draw.winner,0);});
test('castling moves both king and rook; en passant removes the bypassed pawn',()=>{let s=play(['e2e4','e7e5','g1f3','b8c6','f1c4','g8f6','e1g1']);assert.equal(s.cells[sq('g1')],6);assert.equal(s.cells[sq('f1')],4);s=play(['e2e4','a7a6','e4e5','d7d5','e5d6']);assert.equal(s.cells[sq('d6')],1);assert.equal(s.cells[sq('d5')],0);});
test('all four promotion types are distinct legal commands',()=>{for(const [p,piece] of [['q',5],['r',4],['b',3],['n',2]]){const s=play(['a2a4','h7h5','a4a5','h5h4','a5a6','h4h3','a6b7','h3g2','b7a8'+p]);assert.equal(s.cells[sq('a8')],piece);}});
