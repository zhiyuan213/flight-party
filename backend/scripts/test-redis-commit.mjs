import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';

const script=readFileSync(new URL('../src/main/resources/redis/commit-command.lua',import.meta.url),'utf8');
const tag=`{test-${randomUUID()}}`, match=`fp:${tag}:match`, receipt=`fp:${tag}:receipt`, stream=`fp:${tag}:events`, due=`fp:${tag}:due`;
const redis=(...args)=>execFileSync('docker',['compose','-f','deploy/compose.yaml','exec','-T','redis','redis-cli','--raw',...args],{encoding:'utf8'}).trim().split(/\r?\n/);
const run=(hash='h1',version='0',deadline='1000')=>redis('EVAL',script,'4',match,receipt,stream,due,version,hash,'{"state":1}','reply','MOVE','{}','match1',deadline);
try {
 redis('HSET',match,'version','0','snapshot','{}');
 assert.equal(run()[0],'COMMITTED');
 assert.deepEqual(run(),['REPLAY','reply']);
 assert.equal(run('different')[0],'COMMAND_CONFLICT');
 assert.equal(redis('XLEN',stream)[0],'1');
 assert.equal(redis('ZSCORE',due,'match1')[0],'1000');
 const receipt2=`${receipt}2`;
 assert.equal(redis('EVAL',script,'4',match,receipt2,stream,due,'0','h2','{}','reply','MOVE','{}','match1','')[0],'VERSION_CONFLICT');
 assert.equal(redis('XLEN',stream)[0],'1');
 assert.equal(redis('EVAL',script,'4',match,receipt2,stream,due,'1','h2','{}','reply','MOVE','{}','match1','')[0],'COMMITTED');
 assert.equal(redis('ZCARD',due)[0],'0');
 redis('DEL',receipt2);
 console.log('Redis commit: replay, conflict, version and due checks passed');
} finally { redis('DEL',match,receipt,`${receipt}2`,stream,due); }
