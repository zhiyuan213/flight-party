import test from 'node:test';import assert from 'node:assert/strict';import {sketchStart,sketchNext} from '../dist/table/sketch.js';
test('six drawing rounds alternate seats and finalize independently derived scores',()=>{let s=sketchStart();for(let i=0;i<6;i++){assert.equal(s.turn,i%2+1);s=sketchNext(s,true);}assert.equal(s.over,true);assert.equal(s.winner,0);assert.deepEqual(s.cells,[9,9]);});
test('skipped drawing round cannot grant points',()=>{const s=sketchNext(sketchStart());assert.deepEqual(s.cells,[0,0]);assert.equal(s.moves,1);assert.equal(s.history.length,0);});
