import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {botTuning,pick,jitter,botDie,getBotLevel,BOT_LEVELS} from '../dist/bot-difficulty.js';

const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const moveSnippet=app.slice(app.indexOf('const botLevelFor='),app.indexOf('async function choose('));
const rollSnippet=app.slice(app.indexOf('async function roll(auto=false)'),app.indexOf('async function chooseLocal('));

function moveFixture(pieces,enemies,die=4){
  const player={color:0,type:'human',pieces:[...pieces]};
  const game={
    turn:0,die,event:null,current:player,active:[player,...enemies],
    legal(){return player.pieces.map((p,i)=>p<57?i:-1).filter(i=>i>=0);},
    destination(i){return Math.min(57,(player.pieces[i]<0?-1:player.pieces[i])+die);}
  };
  const context=vm.createContext({game,FINISH:57,botTuning,pick,jitter,botDie,getBotLevel});
  const api=vm.runInContext(moveSnippet+'\n;({bestMove,classicBestMove,advancedBestMove,botLevelFor});',context);
  return {game,api};
}
test('flight: all four levels choose a legal plane, Easy is random, Hell takes a bump',()=>{
  // Plane 1 lands on tile 24 where an enemy plane sits, so it scores a bump.
  const enemy={color:1,type:'human',pieces:[11,-1]};
  const f=moveFixture([-1,20],[enemy]);
  const legal=f.game.legal();
  assert.deepEqual(legal,[0,1]);
  assert.equal(f.api.botLevelFor({type:'human'}),null,'a human timeout never uses a bot level');
  assert.equal(f.api.botLevelFor({type:'bot'}),getBotLevel());
  for(const level of BOT_LEVELS){
    const choice=f.api.bestMove(level,()=>.3);
    assert.ok(legal.includes(choice),`${level} must choose a legal plane`);
  }
  assert.equal(f.api.bestMove(null),1,'classic always takes the bump');
  assert.equal(f.api.bestMove('normal'),1);
  assert.equal(f.api.bestMove('hell',()=>.3),1,'Hell also takes the bump');
  assert.equal(f.api.bestMove('easy',()=>.1),0,'Easy can pick the weaker plane');
  assert.equal(f.api.bestMove('easy',()=>.9),1);
});
test('flight: only computer pilots receive the weighted die',async()=>{
  const run=async type=>{
    let received='unset';
    const game={phase:'roll',current:{type},roll(n){received=n;this.phase='choose';return n??4;},legal(){return [0,1];}};
    const context=vm.createContext({
      onlineMode:false,game,screen:'play',diceBusy:false,epoch:1,clock:null,seconds:0,
      fx:{unlock(){},roll(){}},die:{rollTo:()=>Promise.resolve()},clearInterval(){},setInterval(){return 1;},
      syncDieLabel(){},render(){},updateClock(){},drawDie(){},chooseLocal:async()=>{},
      botLevelFor:()=>type==='bot'?'hell':null,getBotLevel:()=>'hell',botDie:()=>6,
      bestMove:()=>0,later(){}
    });
    await vm.runInContext('('+rollSnippet+')',context)(true);
    return received;
  };
  assert.equal(await run('human'),undefined,'a human roll keeps the fair die');
  const bot=await run('bot');
  assert.ok(Number.isInteger(bot)&&bot>=1&&bot<=6,'a bot roll uses the difficulty-weighted die');
});
