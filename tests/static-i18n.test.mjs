import test from 'node:test';
import assert from 'node:assert/strict';
import {STATIC_COPY,translateStaticUI} from '../dist/static-i18n.js';
test('static Chinese copy switches back without changing form controls',()=>{
 const nodes=new Map(STATIC_COPY.map(([selector])=>[selector,{firstChild:{nodeType:3,textContent:''}}]));
 const root={querySelector:selector=>nodes.get(selector)};
 translateStaticUI('zh',root);
 assert.match(nodes.get('.hero-copy > h1').innerHTML,/欢乐/);
 assert.equal(nodes.get('.legal-links a[href="/privacy.html"]').textContent,'隐私政策');
 const label=nodes.get('#settings-dialog label:nth-of-type(1)'),child=label.firstChild;
 assert.equal(child.textContent,'游戏音效 ');assert.equal(label.innerHTML,undefined);
 translateStaticUI('en',root);assert.match(nodes.get('.hero-copy > h1').innerHTML,/Little planes/);assert.equal(label.firstChild,child);
});
