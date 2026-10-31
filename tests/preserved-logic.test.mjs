import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
test('v0.2 keeps the exact v0.1 game rules module',()=>{
 const bytes=readFileSync(new URL('../dist/engine.js',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'0a3735f3fce664014fc785e5599dc130bccbbe7be03f314cfc0bcd5a4792d2c6');
});
