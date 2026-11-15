/* Regression guard for the "is computer difficulty real?" pass.
   These assertions encode the measured failure modes: a Hell level that was
   weaker than Pro in bubbles / snooker, and an Easy level that kept drawing
   cards until the game hit its move cap instead of losing. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BOT_LEVELS,botTuning} from '../dist/bot-difficulty.js';
import {start,move,bot} from '../dist/table/grid-rules.js';
import {bubblesStart,bubblesStep,bubblesBot,GRID,ROWS,S_UP,ANGLE_MAX,N} from '../dist/table/bubbles-duel.js';
import {snookerBot} from '../dist/table/snooker-duel.js';
import {ballGroup} from '../dist/table/pool-rules.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const seeded=(s=7)=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);

test('sampling resolution is the only thing separating Pro from Hell in bubbles',()=>{
  const t=Object.fromEntries(BOT_LEVELS.map(l=>[l,botTuning(l)]));
  assert.deepEqual([t.easy.scan,t.normal.scan,t.pro.scan,t.hell.scan],[15,6,4,2]);
  // Every Pro lane is also a Hell lane (both start at code 2, step 4 and 2).
  for(let code=2;code<=ANGLE_MAX;code+=t.pro.scan)
    assert.equal(code%t.hell.scan,0,'Pro candidate set must be a subset of Hell');
  const src=read('dist/table/bubbles-duel.js');
  assert.ok(!/reply\*\.5|after\[S_UP\]/.test(src),'no two-ply opponent modelling');
  assert.ok(!/hell\?50:20|hell\?22:11/.test(src),'no Hell-only weight inflation');
  assert.ok(src.includes('const advanced=!!tune&&(tune.level===\'pro\'||tune.level===\'hell\')'));
});

test('Hell never picks a lower-value bubble shot than Pro on the same board',()=>{
  const value=(s,code)=>{
    const colour=s.cells[S_UP];
    const info=bubblesStep(s.cells.slice(),code,colour,s.turn);
    const row=info.slot<0?0:ROWS-GRID[info.slot].r;
    let chain=0;
    const off=s.turn===1?0:N;
    if(info.slot>=0)for(const n of GRID[info.slot].neighbours)if(s.cells[off+n]===colour)chain++;
    return info.points*1000+info.attack*900+info.match*50+info.floating*30+row
      -(info.noSlot?100000:0)-code/1000+info.floating*20+chain*11;
  };
  for(const seed of [1234,2345,3456,4567,5678]){
    let s=bubblesStart(seed);
    for(let step=0;step<4;step++){
      const pro=bubblesBot(s,'pro',seeded(seed)),hell=bubblesBot(s,'hell',seeded(seed));
      assert.ok(value(s,hell)>=value(s,pro)-1e-6,
        `seed ${seed} step ${step}: Hell value ${value(s,hell)} < Pro ${value(s,pro)}`);
      s=move(s,s.turn,hell);
      if(s.over)break;
    }
  }
});

test('snooker Hell keeps Pro\'s exact red-phase line (wider search made it weaker)',()=>{
  const s=start('snooker');
  assert.equal(snookerBot(s,'hell',seeded(1)),snookerBot(s,'pro',seeded(1)));
  const src=read('dist/table/snooker-duel.js');
  assert.ok(src.includes('shootSnooker(probe'),'colour-phase lines are physics-verified');
  assert.ok(src.includes('[proLine,...lines.slice(0,3)]'),"Pro's line stays a Hell candidate");
  assert.ok(/if\(!colours\)return aim\(proLine\.a/.test(src),'red phase short-circuits to Pro');
});

test('snooker strength is monotone over three seeded ten-shot openings',()=>{
  /* A single fixed rng stream over-fits one rack layout. The 2026-11-13 ball
     enlargement spread the red rack, so one lucky Easy blunder could outscore
     Normal on a single board. Average three deterministic seeds instead: the
     ladder has to hold on average, not by one lucky shot. */
  const seeds=[1,17,97];
  const opening=(level,seed)=>{
    let s=start('snooker'),p1=0,p2=0;const rng=seeded(seed);
    for(let i=0;i<10&&!s.over;i++){
      const shooter=s.turn;
      const before=[s.cells[66],s.cells[67]];
      s=move(s,shooter,bot(s,shooter===1?level:'normal',rng));
      p1+=s.cells[66]-before[0];p2+=s.cells[67]-before[1];
    }
    return p1-p2;
  };
  const net=BOT_LEVELS.map(level=>seeds.reduce((sum,seed)=>sum+opening(level,seed),0)/seeds.length);
  assert.ok(net[0]<net[1]&&net[1]<net[2],`Easy < Normal < Pro, got ${net.join(',')}`);
  assert.ok(net[3]>=net[2],`Hell must not be weaker than Pro, got ${net.join(',')}`);
});

test('cards Easy games finish instead of stalling into a draw',()=>{
  const play=level=>{
    let s=start('cards'),steps=0;
    while(!s.over&&steps<200){
      s=move(s,s.turn,s.turn===1?bot(s,'normal',seeded(steps)):bot(s,level,seeded(steps+77)));
      steps++;
    }
    return {steps,winner:s.winner};
  };
  let decided=0,total=0;
  for(let i=0;i<6;i++){
    // fresh shuffles: cardsStart uses Math.random, so sample several games
    const r=play('easy');
    total+=r.steps;
    if(r.winner)decided++;
  }
  assert.ok(total/6<120,`Easy games should end well before the move cap (avg ${total/6})`);
  assert.ok(decided>=4,`Easy games should produce a winner (${decided}/6)`);
});

test('pool difficulty is monotone: Pro/Hell out-pot Normal and never pot the 8-ball early',()=>{
  const run=(level,seeds)=>{
    let shots=0,pots=0,illegal8=0;
    for(const seed of seeds){
      let s=start('pool');const rng=seeded(seed);
      for(let k=0;k<60&&!s.over;k++){
        const who=s.turn,before=s.cells.slice();
        const next=move(s,who,bot(s,level,rng));
        const potted=[];
        for(let i=0;i<16;i++)if(before[i*3+2]===1&&next.cells[i*3+2]===0)potted.push(i);
        shots++;
        for(const id of potted)if(id!==0)pots++;
        if(potted.includes(8)){
          const grp=before[49+who]||0;
          const rem=grp?Array.from({length:15},(_,i)=>i+1).filter(id=>id!==8&&ballGroup(id)===grp&&before[id*3+2]).length:99;
          if(grp===0||rem>0)illegal8++;
        }
        s=next;
      }
    }
    return {shots,pots,illegal8};
  };
  const seeds=[11,23,47,89,101,131,157,181];
  const normal=run('normal',seeds),pro=run('pro',seeds),hell=run('hell',seeds);
  assert.equal(pro.illegal8,0,`Pro must never pot the 8-ball early (${pro.illegal8})`);
  assert.equal(hell.illegal8,0,`Hell must never pot the 8-ball early (${hell.illegal8})`);
  assert.ok(pro.pots*normal.shots>normal.pots*pro.shots,
    `Pro must be more efficient than Normal (${(100*pro.pots/pro.shots).toFixed(0)}% vs ${(100*normal.pots/normal.shots).toFixed(0)}%)`);
  assert.ok(hell.pots*pro.shots>=pro.pots*hell.shots,
    `Hell must not be weaker than Pro (${(100*hell.pots/hell.shots).toFixed(0)}% vs ${(100*pro.pots/pro.shots).toFixed(0)}%)`);
});

test('cache-bust chain covers the changed engines and their importers',()=>{
  const key='20261112-gamelanes1';
  for(const p of ['dist/app.js','dist/index.html','dist/shop.html','dist/portal/index.html',
    'dist/table/index.html','dist/table/table.js','dist/table/grid-rules.js',
    'dist/table/bubbles-duel.js','dist/table/snooker-duel.js','dist/table/cards.js'])
    assert.ok(read(p).includes(key),`${p} must use ${key}`);
  assert.ok(!read('dist/shop.html').includes('20261112-ownedgreen1'));
  assert.ok(read('dist/table/grid-rules.js').includes(`bubbles-duel.js?v=${key}`));
  assert.ok(read('dist/table/grid-rules.js').includes(`snooker-duel.js?v=${key}`));
  assert.ok(read('dist/table/grid-rules.js').includes(`cards.js?v=${key}`));
  assert.ok(read('dist/app.js').includes(`bot-difficulty.js?v=${key}`));
  const poolKey='20261113-pooldiff1';
  assert.ok(read('dist/table/grid-rules.js').includes(`pool.js?v=${poolKey}`),`grid-rules.js must use pool.js?v=${poolKey}`);
  assert.ok(read('dist/table/table.js').includes(`pool.js?v=${poolKey}`),`table.js must use pool.js?v=${poolKey}`);
});
