import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {botOpponent} from '../dist/table/cosmetics-rules.js';
import {BOT_LEVELS,DEFAULT_BOT_LEVEL,BOT_LEVEL_KEY,BOT_LEVEL_KEY_PREFIX,BOT_GAME_IDS,BOT_LABELS,
  normalizeBotLevel,botLabel,getBotLevel,setBotLevel,botLevelKey,botLevelStore,
  botTuning,botDie,botDifficultyMarkup,bindBotDifficulty} from '../dist/bot-difficulty.js';
import {start,move,legal,bot} from '../dist/table/grid-rules.js';
import {cardsBot} from '../dist/table/cards.js';
import {poolBot} from '../dist/table/pool.js';
import {snookerBot} from '../dist/table/snooker-duel.js';
import {bubblesBot} from '../dist/table/bubbles-duel.js';
import {chessBot} from '../dist/table/chess-rules.js';

const seeded=(s=7)=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
const memoryStorage=()=>{const map=new Map();return{getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v))};};

test('four levels, Chinese/English labels and Easy as the default',()=>{
  assert.deepEqual(BOT_LEVELS,['easy','normal','pro','hell']);
  assert.equal(DEFAULT_BOT_LEVEL,'easy');
  assert.equal(normalizeBotLevel('nonsense'),'easy');
  assert.equal(normalizeBotLevel(undefined),'easy');
  assert.equal(normalizeBotLevel('hell'),'hell');
  assert.equal(botLabel('pro','zh'),'专业');
  assert.equal(botLabel('pro','en'),'Pro');
  assert.ok(Object.values(BOT_LABELS).every(v=>v.zh&&v.en));
});

test('the legacy single-key API still works for embedders and tests',()=>{
  const storage=memoryStorage();
  assert.equal(getBotLevel(storage),'easy','no stored choice means Easy');
  assert.equal(setBotLevel('hell',storage),'hell');
  assert.equal(storage.getItem(BOT_LEVEL_KEY),'hell');
  assert.equal(getBotLevel(storage),'hell');
  assert.equal(setBotLevel('bogus',storage),'easy');
  assert.ok(BOT_LEVELS.includes(getBotLevel()),'Node without localStorage falls back to a valid level');
});

/* ---------------------------------------------------------------------------
   Per-game storage: one key per playable game, the old shared key is read
   only so an existing choice survives migration, and it is never written.
   --------------------------------------------------------------------------- */
test('every game owns a separate localStorage key',()=>{
  assert.equal(BOT_LEVEL_KEY_PREFIX,'joyflock.bot.level.');
  assert.deepEqual(BOT_GAME_IDS,
    ['flight','four','gomoku','xo','chess','puzzle','draw','cards','pool','snooker','bubbles']);
  for(const game of BOT_GAME_IDS)assert.equal(botLevelKey(game),'joyflock.bot.level.'+game);
  assert.equal(botLevelKey('unknown'),BOT_LEVEL_KEY,'an unknown id keeps the legacy key');
  assert.equal(botLevelKey(),BOT_LEVEL_KEY);

  const storage=memoryStorage();
  const four=botLevelStore('four',storage),pool=botLevelStore('pool',storage),flight=botLevelStore('flight',storage);
  assert.equal(four.key,'joyflock.bot.level.four');
  assert.equal(four.get(),'easy');
  assert.equal(four.set('hell'),'hell');
  assert.equal(storage.getItem('joyflock.bot.level.four'),'hell');
  assert.equal(pool.get(),'easy','Pool is untouched by a Four choice');
  assert.equal(flight.get(),'easy','Flight is untouched by a Four choice');
  assert.equal(pool.set('pro'),'pro');
  assert.equal(four.get(),'hell','Four keeps its own choice');
  assert.equal(storage.getItem(BOT_LEVEL_KEY),null,'the legacy key is never written again');
});

test('a legacy saved value migrates per game but never leaks back',()=>{
  const storage=memoryStorage();
  storage.setItem(BOT_LEVEL_KEY,'pro');
  assert.equal(getBotLevel(storage,'pool'),'pro','an existing shared choice is kept as the initial value');
  assert.equal(setBotLevel('hell',storage,'pool'),'hell');
  assert.equal(storage.getItem(BOT_LEVEL_KEY),'pro','migration is read-only');
  assert.equal(getBotLevel(storage,'pool'),'hell','the game-specific value wins');
  assert.equal(getBotLevel(storage,'four'),'pro','other games still start from the migrated value');
  storage.setItem('joyflock.bot.level.four','bogus');
  assert.equal(getBotLevel(storage,'four'),'pro','an invalid per-game value falls back to legacy');
  storage.setItem(BOT_LEVEL_KEY,'bogus');
  assert.equal(getBotLevel(storage,'four'),'easy','invalid legacy values fall back to Easy');
});

test('the per-game note no longer claims a site-wide choice',()=>{
  const zh=botDifficultyMarkup('easy','zh'),en=botDifficultyMarkup('easy','en');
  assert.ok(zh.includes('每个游戏单独记住'),'Chinese note explains per-game storage');
  assert.ok(en.includes('separately for each game'),'English note explains per-game storage');
});

test('tuning is monotone: fewer blunders, tighter aim, deeper search',()=>{
  const t=BOT_LEVELS.map(botTuning);
  assert.equal(t[1].level,'normal');
  assert.ok(t[0].blunder>t[1].blunder&&t[1].blunder>=t[2].blunder&&t[2].blunder>=t[3].blunder);
  assert.ok(t[0].aimDeg>t[1].aimDeg&&t[1].aimDeg>=t[2].aimDeg&&t[2].aimDeg>=t[3].aimDeg);
  assert.ok(t[0].scan>t[1].scan&&t[1].scan>t[2].scan&&t[2].scan>t[3].scan);
  assert.ok(t[2].depth>0&&t[3].depth>t[2].depth);
  assert.equal(t[1].blunder,0,'Normal is exactly the classic bot');
  assert.equal(t[1].aimDeg,0);
  assert.equal(botTuning(undefined),null,'no level = legacy path');
});

test('classic golden fixtures are untouched when no level is passed',()=>{
  let four=start('four');for(const p of [0,6,1,6,2])four=move(four,four.turn,p);
  assert.equal(bot(four),3);
  assert.equal(bot(four,'normal'),3);
  assert.equal(bot(start('gomoku')),112);
  assert.equal(bot(start('gomoku'),'normal'),112);
  const chess=start('chess');
  assert.ok(legal(chess).includes(bot(chess)));
  assert.equal(bot(chess,'normal'),bot(chess));
});

test('every game returns a legal command on all four levels',()=>{
  for(const game of ['four','xo','gomoku','chess','cards']){
    const s=start(game);
    for(const level of BOT_LEVELS){
      const command=bot(s,level,seeded(101));
      assert.ok(legal(s).includes(command),`${game}/${level} must be legal (got ${command})`);
    }
  }
  for(const game of ['pool','snooker','bubbles']){
    const s=start(game);
    for(const level of BOT_LEVELS){
      const command=bot(s,level,seeded(101));
      assert.ok(Number.isInteger(command)&&command>=0,`${game}/${level} must return a shot code`);
    }
  }
  // Puzzle is co-op: its bot always performs the next solving swap.
  const puzzle=start('puzzle');
  for(const level of BOT_LEVELS)assert.equal(typeof bot(puzzle,level,seeded(1)),'number');
});

test('Hell beats Easy and Normal in real board-game duels',()=>{
  const duel=(game,la,lb,seed)=>{
    let s=start(game);const ra=seeded(seed),rb=seeded(seed+977);
    let steps=0;
    while(!s.over&&steps<200){
      const mine=s.turn===1;
      s=move(s,s.turn,bot(s,mine?la:lb,mine?ra:rb));
      steps++;
    }
    return s.winner;
  };
  for(const game of ['four','gomoku']){
    let hellWins=0,normalWins=0;
    for(let i=0;i<12;i++){
      const seed=i*31+5;
      if(duel(game,'hell','easy',seed)===1)hellWins++;
      if(duel(game,'hell','normal',seed)===1)normalWins++;
    }
    assert.ok(hellWins>=10,`${game}: Hell should beat Easy (${hellWins}/12)`);
    assert.ok(normalWins>=9,`${game}: Hell should beat Normal (${normalWins}/12)`);
  }
  // Tic-tac-toe is solved: two perfect players must always draw.
  for(let i=0;i<6;i++)assert.equal(duel('xo','hell','hell',i*17+3),0);
});

test('cue sports: Easy sprays, Hell is fully deterministic and precise',()=>{
  const pool=start('pool'),legacy=poolBot(pool);
  const varied=new Set([1,2,3,4,5,6,7,8].map(i=>poolBot(pool,'easy',seeded(i))));
  assert.ok(varied.size>1,'Easy varies with the random source');
  const h1=poolBot(pool,'hell',seeded(3)),h2=poolBot(pool,'hell',seeded(99));
  assert.equal(h1,h2,'Hell has no aiming jitter');
  const sprayed=Math.abs((poolBot(pool,'easy',()=>.999)%3600)-(legacy%3600));
  assert.ok(sprayed>40,`Easy aim must move by several degrees (${sprayed})`);
  const snooker=start('snooker'),bubbles=start('bubbles');
  assert.equal(snookerBot(snooker,'hell',seeded(1)),snookerBot(snooker,'hell',seeded(2)));
  assert.equal(bubblesBot(bubbles,'hell',seeded(1)),bubblesBot(bubbles,'hell',seeded(2)));
  assert.notEqual(bubblesBot(bubbles,'easy',()=>.1),bubblesBot(bubbles,'easy',()=>.2));
});

test('chess Hell finds a mate in one; Easy only has to stay legal',()=>{
  const code=s=>{
    const sq=x=>(8-Number(x[1]))*8+x.charCodeAt(0)-97;
    return sq(s.slice(0,2))*64+sq(s.slice(2,4))+4096*({q:1,r:2,b:3,n:4}[s[4]]||0);
  };
  let s=start('chess');
  for(const m of ['f2f3','e7e5','g2g4'])s=move(s,s.turn,code(m));
  assert.equal(chessBot(s,'hell',seeded(1)),code('d8h4'),'Hell takes the immediate mate');
  assert.equal(chessBot(s,'normal',seeded(1)),code('d8h4'));
  assert.ok(legal(s).includes(chessBot(s,'easy',seeded(5))));
});

test('cards Easy plays a random card and only rarely draws, Pro/Hell plan the hand',()=>{
  const s=start('cards'),moves=legal(s),plays=moves.filter(m=>m!==-1);
  assert.equal(cardsBot(s),moves[0],'legacy picks the first playable card');
  assert.equal(cardsBot(s,'normal'),moves[0]);
  const easyPick=cardsBot(s,'easy',()=>.1);
  assert.ok(legal(s).includes(easyPick));
  if(plays.length)assert.notEqual(easyPick,-1,'Easy prefers playing over drawing');
  assert.equal(cardsBot(s,'easy',()=>.95),-1,'Easy still draws occasionally');
  let draws=0;
  for(let i=0;i<200;i++)if(cardsBot(s,'easy',seeded(i))===-1)draws++;
  assert.ok(draws<40,`Easy must not stall games by refilling the deck (${draws}/200 draws)`);
  for(const level of ['pro','hell'])assert.ok(legal(s).includes(cardsBot(s,level,seeded(4))));
});

test('flight dice weighting favours high pips on Hell, low pips on Easy',()=>{
  const tally=level=>{
    let six=0,one=0;const rng=seeded(4242);
    for(let i=0;i<6000;i++){const n=botDie(level,rng);if(n===6)six++;if(n===1)one++;}
    return {six,one};
  };
  const easy=tally('easy'),normal=tally('normal'),hell=tally('hell');
  assert.ok(hell.six>easy.six*1.3,`Hell rolls more sixes (${hell.six} vs ${easy.six})`);
  assert.ok(easy.one>hell.one*1.3,`Easy rolls more ones (${easy.one} vs ${hell.one})`);
  assert.ok(Math.abs(normal.six-normal.one)<350,'Normal stays nearly uniform');
  for(const l of BOT_LEVELS)for(let i=0;i<50;i++){const n=botDie(l,seeded(i));assert.ok(n>=1&&n<=6);}
});

test('markup is bilingual and the control persists a click',()=>{
  const zh=botDifficultyMarkup('easy','zh'),en=botDifficultyMarkup('hell','en');
  assert.ok(zh.includes('简单')&&zh.includes('地狱')&&zh.includes('默认简单'));
  assert.ok(en.includes('Easy')&&en.includes('Hell')&&en.includes('Default Easy'));
  assert.ok(zh.includes('data-bot-level="easy"')&&zh.includes('aria-pressed="true"'));
  assert.ok(en.includes('data-bot-level="hell"')&&en.includes('aria-pressed="true"'));

  const storage=memoryStorage(),buttons=['easy','normal','pro','hell'].map(key=>({
    dataset:{botLevel:key},attrs:{},setAttribute(k,v){this.attrs[k]=v;}
  }));
  const host={innerHTML:'',attrs:{},handlers:{},
    setAttribute(k,v){this.attrs[k]=v;},
    addEventListener(type,fn){this.handlers[type]=fn;},
    querySelector(){return null;},
    querySelectorAll(){return buttons;},
    contains(){return true;}};
  const control=bindBotDifficulty(host,{storage});
  assert.equal(control.get(),'easy');
  host.handlers.click({target:{closest:()=>buttons[3]}});
  assert.equal(storage.getItem(BOT_LEVEL_KEY),'hell');
  assert.equal(control.get(),'hell');
  assert.equal(buttons[3].attrs['aria-pressed'],'true');
  assert.equal(buttons[0].attrs['aria-pressed'],'false');
  assert.equal(control.set('bogus'),'easy');
});

/* ---------------------------------------------------------------------------
   Every "Play computer" entry in the catalog must start on Easy. The chosen
   level is remembered on purpose, but an unset / invalid stored value, the
   first painted trigger and the practice-opponent profile must never fall
   back to the stronger Normal opponent.
   --------------------------------------------------------------------------- */
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('every game defaults its computer opponent to Easy',()=>{
  assert.equal(DEFAULT_BOT_LEVEL,'easy');
  assert.equal(BOT_LEVEL_KEY,'joyflock.bot.level');
  const storage=memoryStorage();
  assert.equal(getBotLevel(storage),'easy','no stored choice means Easy');
  assert.equal(botTuning(getBotLevel(storage)).level,'easy');
  assert.equal(botLabel(undefined,'zh'),'简单');
  assert.equal(botLabel(undefined,'en'),'Easy');
  for(const invalid of [undefined,null,'','bogus',42])assert.equal(normalizeBotLevel(invalid),'easy');
});

test('practice opponent and its fallback also default to Easy',()=>{
  assert.equal(botOpponent().level,'easy');
  assert.equal(botOpponent().points,0);
  assert.equal(botOpponent('unknown').level,'easy');
  assert.match(source('dist/table/cosmetics-rules.js'),/BOT_POINTS\[level\] === undefined \? 'easy' : level/);
  const cosmetics=source('dist/table/game-cosmetics.js');
  assert.ok(!cosmetics.includes("BOT_KEY='joyflock.bot.level'"),'no hard-coded shared key remains');
  assert.match(cosmetics,/getBotLevel\(undefined,practiceGame\(\)\)/,'practice tier reads this game');
  assert.match(cosmetics,/BOT_GAME_IDS\.includes\(raw\)/,'the game id is validated');
  assert.match(cosmetics,/key\.startsWith\(BOT_LEVEL_KEY_PREFIX\)/,'storage events cover every game key');
});

test('all computer-vs-player entry points use a game-scoped saved level',()=>{
  const app=source('dist/app.js'),table=source('dist/table/table.js'),arcade=source('dist/table/arcade.js');
  assert.match(app,/bot-difficulty\.js/,`app.js: imports the shared module`);
  assert.match(app,/game:'flight'/,`app.js: dialog is scoped to Flight`);
  assert.match(app,/botLevelFor=[\s\S]{0,140}getBotLevel\(undefined,'flight'\)/,`app.js: flight bots`);
  assert.match(app,/botDie\(getBotLevel\(undefined,'flight'\)\)/,`app.js: flight dice`);
  assert.match(app,/botLabel\(getBotLevel\(undefined,'flight'\),prefs\.lang\)/,`app.js: labels`);

  assert.match(table,/botLevelStore\(game\)/,`table.js: binds the current ?game= id`);
  assert.match(table,/bot\(board,botLevels\.get\(\)\)/,`table.js: every grid and cue game`);
  assert.match(table,/const current=botLevels\.get\(\)/,`table.js: single-player dialog`);
  assert.match(table,/botLevels\.set\(localGameDialog/,`table.js: saving a choice`);
  assert.match(table,/BOT_BONUS\[botLevels\.get\(\)\]/,`table.js: point bonus`);
  for(const game of BOT_GAME_IDS.filter(id=>id!=='flight'))
    assert.ok(table.includes(`'${game}'`),`table.js catalog contains ${game}`);

  assert.match(arcade,/botLevelStore\(game\)/,`arcade.js: binds snooker/bubbles`);
  assert.match(arcade,/game\}/,`arcade.js: dialog is scoped to this arcade game`);
  assert.match(arcade,/bot\(board,botLevels\.get\(\)\)/,`arcade.js: local opponent`);
});

test('the first painted trigger is Easy and boot reads a per-game key',()=>{
  for(const path of ['dist/index.html','dist/table/arcade.html'])
    assert.match(source(path),/bd-trigger-value" data-system-english="Easy">Easy</,`${path}: first frame`);
  assert.match(source('dist/index.html'),/id="bot-difficulty" data-bot-game="flight"/,`flight slot is scoped`);
  const boot=source('dist/bot-difficulty-boot.js');
  assert.match(boot,/indexOf\(saved\)>=0\?saved:'easy'/);
  assert.match(boot,/catch\(e\)\{return 'easy';\}/);
  assert.match(boot,/levelKey\(host\)/,`boot resolves the game's key`);
  assert.match(boot,/getItem\(levelKey\(host\)\)/,`boot reads the per-game key first`);
  assert.match(boot,/getItem\(KEY\)/,`boot still migrates the legacy key`);
  assert.match(boot,/arcade\\\.html/,`arcade default falls back to Bubbles`);
});
