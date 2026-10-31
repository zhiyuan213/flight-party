import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game} from '../dist/engine.js';

const lines=readFileSync(new URL('../backend/src/test/resources/classic-moves.csv',import.meta.url),'utf8').split(/\r?\n/).filter(x=>x&&!x.startsWith('#'));
for(const line of lines){
 const [name,...values]=line.split(',');
 const n=values.map(Number);
 test(`shared classic fixture: ${name}`,()=>{
  const game=new Game(Array.from({length:4},(_,i)=>({type:i?'bot':'human',name:String(i)})));
  for(let seat=0;seat<4;seat++)game.players[seat].pieces=n.slice(seat*2,seat*2+2);
  game.roll(n[8]);const outcome=game.move(n[9]);
  assert.equal(outcome.to,n[10]);assert.equal(outcome.captured.length,n[11]);
 });
}
