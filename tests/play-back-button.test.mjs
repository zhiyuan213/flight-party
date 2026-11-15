import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateStaticUI} from '../dist/static-i18n.js';

const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../dist/play-back-button.css',import.meta.url),'utf8');

test('the play screen has a compact top-left back button before the round label',()=>{
 const row=html.slice(html.indexOf('<div class="board-top">'),html.indexOf('</div>',html.indexOf('<div class="board-top">')));
 assert.match(row,/<button type="button" id="back-mid" class="icon-btn board-back-btn"[^>]*>←<\/button>/);
 assert.ok(row.indexOf('id="back-mid"')<row.indexOf('id="round-label"'),'the arrow sits left of ROUND 01');
 assert.ok(row.indexOf('id="round-label"')<row.indexOf('id="board-tip"'),'the original row order is preserved');
 assert.match(html,/<link rel="stylesheet" href="play-back-button\.css\?v=[^"]+">/);
 assert.equal((html.match(/id="back-mid"/g)||[]).length,1,'exactly one back button');
 assert.ok(html.indexOf('<main id="play"')<html.indexOf('id="back-mid"'),'it lives on the play screen only');
});

test('clicking the arrow returns to the game (middle) screen through one shared handler',()=>{
 assert.match(app,/\$\('back-mid'\)\.onclick=askLeave;/);
 assert.equal((app.match(/\$\('back-mid'\)\.onclick=/g)||[]).length,1,'no duplicate binding');
 assert.match(app,/\$\('leave'\)\.onclick=askLeave;/,'it behaves exactly like Leave flight');
 assert.match(app,/\$\('home-link'\)\.onclick=e=>\{e\.preventDefault\(\);askLeave\(\);\}/);
 assert.match(app,/function askLeave\(\)\{[\s\S]*?leaveFlight\(\);/);
 assert.match(app,/function leaveFlight\(\)\{[\s\S]*?show\('welcome'\);/,'welcome is the middle page');
 const copy=app.slice(app.indexOf('const copy=['),app.indexOf('function translate()'));
 assert.ok(!copy.includes("'back-mid'"),'the arrow glyph is never replaced by translated button text');
});

test('the arrow keeps its bilingual accessible label in both languages',()=>{
 for(const [lang,en,zh] of [['en','Back to game','返回游戏页'],['zh','Back to game','返回游戏页']]){
  const node={attrs:{},setAttribute(k,v){this.attrs[k]=v;}};
  const root={querySelector:selector=>selector==='#back-mid'?node:null};
  translateStaticUI(lang,root);
  assert.equal(node.attrs.title,lang==='zh'?zh:en);
  assert.equal(node.attrs['aria-label'],lang==='zh'?zh:en);
 }
});

test('the button overrides the header icon-button auto margin and stays small on phones',()=>{
 assert.match(css,/#play \.board-top \.board-back-btn\{[^}]*margin-left:0/);
 assert.match(css,/#play \.board-top \.board-back-btn\{[^}]*width:32px;min-width:32px;height:32px/);
 assert.match(css,/#play \.board-top \.board-back-btn:hover\{background:#fff/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/@media\(max-width:600px\)\{[^]*width:28px;min-width:28px;height:28px/);
});
