import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('translation tolerates removed optional entry points so login restoration can run',()=>{
 const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');const start=source.indexOf('const copy='),end=source.indexOf("$('language').onclick",start);const nodes=new Map([['roll',{}],['create',{}]]);let translated=false;
 const context=vm.createContext({document:{documentElement:{}},prefs:{lang:'en'},$:id=>nodes.get(id),t:en=>en,social:{setLanguage(){translated=true;}},syncDieLabel(){},screen:'welcome'});
 vm.runInContext(source.slice(start,end)+';translate();',context);assert.equal(translated,true);assert.ok(nodes.get('roll').innerHTML.includes('ROLL DICE'));
});
