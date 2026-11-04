import test from 'node:test';
import assert from 'node:assert/strict';
import {poolStart,poolMove} from '../dist/table/pool.js';

const unit=363600;
test('center pool commands preserve the previous authoritative trajectory',()=>{
  assert.deepEqual(poolMove(poolStart(),1,234000).cells,[6062,2465,1,6304,2995,1,6562,2077,1,6784,2744,1,6950,2237,1,6930,2500,1,8475,3641,1,9203,922,1,7150,2379,1,0,0]);
});
test('all eight cue spots produce bounded deterministic trajectories with server fixtures',()=>{
  // Matching golden cue positions are asserted in PoolRulesTest.java.
  const cue=[[6010,2429],[5965,2974],[5966,3169],[5368,2963],[4989,2500],[5368,2037],[6267,1854],[6080,1928]];
  for(let spot=1;spot<=8;spot++){
    const command=spot*unit+234000,a=poolMove(poolStart(),1,command),b=poolMove(poolStart(),1,command);
    assert.deepEqual(a.cells,b.cells);assert.deepEqual(a.cells.slice(0,2),cue[spot-1]);
    for(let i=0;i<9;i++)if(a.cells[i*3+2]){assert.ok(a.cells[i*3]>=120&&a.cells[i*3]<=9880);assert.ok(a.cells[i*3+1]>=120&&a.cells[i*3+1]<=4880);}
    assert.ok(a.history.length<=49);assert.equal(a.moves,1);
  }
});
test('cue spin affects cushion rebound without adding a scoring input',()=>{
  const center=poolMove(poolStart(),1,65*3600+1800),left=poolMove(poolStart(),1,7*unit+65*3600+1800),right=poolMove(poolStart(),1,3*unit+65*3600+1800);
  assert.notEqual(left.cells[1],center.cells[1]);assert.notEqual(right.cells[1],center.cells[1]);assert.deepEqual(left.cells.slice(27),[0,0]);
});
test('pool rejects missing power, noninteger commands and out-of-range spots',()=>{
  for(const command of [-1,0,3599,unit,unit+3599,9*unit+3600,1.5,NaN,Infinity])assert.throws(()=>poolMove(poolStart(),1,command));
});
