import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installCosmeticsDom} from './helpers/cosmetics-dom.mjs';

test('the player-card counter reads the same cosmetic instance and absolute seat as the board',async()=>{
 const env=installCosmeticsDom({},'four');try{
  // Resolve the exact specifier used by the badge, preventing duplicate
  // cache-version instances from silently losing an equipped emblem.
  const source=readFileSync(new URL('../dist/table/four-seat-piece.js',import.meta.url),'utf8');
  const spec=source.match(/from '([^']+)'/)[1];
  const api=await import(new URL(spec,new URL('../dist/table/four-seat-piece.js',import.meta.url)));
  const {fourSeatPiece}=await import('../dist/table/four-seat-piece.js');
  const doc={createElement:()=>{const attrs=new Map(),styles=new Map();return {dataset:{},setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),getAttribute:k=>attrs.get(k),style:{setProperty:(k,v)=>styles.set(k,v),removeProperty:k=>styles.delete(k)}};}};
  api.applyCosmetics({network:true,mySeat:2,seatProfiles:[{piece:'four-piece-neon'},{piece:'four-piece-default'}]});
  const first=fourSeatPiece(doc,1,'甲'),second=fourSeatPiece(doc,2,'乙');
  assert.equal(first.getAttribute('data-cosmetic-piece'),'neon');assert.equal(second.getAttribute('data-cosmetic-piece'),undefined);
  assert.equal(first.dataset.player,'1');assert.equal(first.getAttribute('aria-label'),'甲的棋子');
  env.setTheme('halloween');api.applyCosmetics({network:true,mySeat:2,seatProfiles:[{piece:'four-piece-neon'},{}]});
  assert.equal(fourSeatPiece(doc,1,'甲').getAttribute('data-cosmetic-piece'),undefined);
 }finally{env.restore();}
});
