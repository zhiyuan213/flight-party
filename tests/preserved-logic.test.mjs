import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
test('local rules match the reviewed two-finish baseline',()=>{
 const bytes=readFileSync(new URL('../dist/engine.js',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'81a6090ff4697e74186584f50809fb65ad674838dbcc4de00235ff80f950d91b');
});
