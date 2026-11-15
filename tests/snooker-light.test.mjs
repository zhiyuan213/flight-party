import test from 'node:test';
import assert from 'node:assert/strict';
import {drawPoolBall,overheadLightAt} from '../dist/table/pool-ball.js';
import {SNOOKER_LIGHT} from '../dist/table/snooker-light.js';

function render(x,y,{light=SNOOKER_LIGHT,plain=true,overhead=true}={}){
  const ellipses=[];
  const ctx=new Proxy({ellipses},{get(target,key){
    if(key==='ellipse')return (...args)=>ellipses.push(args);
    if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>({addColorStop(){}});
    if(key in target)return target[key];
    return ()=>{};
  },set(target,key,value){target[key]=value;return true;}});
  drawPoolBall(ctx,1,x,y,8,0,0,null,light,{plain,overhead});
  return ellipses;
}

test('centered snooker lamp gives mirrored reflection vectors across both table axes',()=>{
  assert.deepEqual(SNOOKER_LIGHT,{x:500,y:250,height:640});
  const left=overheadLightAt(200,120,SNOOKER_LIGHT),right=overheadLightAt(800,380,SNOOKER_LIGHT);
  assert.equal(left.x,-right.x);assert.equal(left.y,-right.y);
  assert.deepEqual(overheadLightAt(500,250,SNOOKER_LIGHT),{x:0,y:0});
});

test('painted snooker shadow points away from the lamp and highlight points toward it',()=>{
  for(const [x,y] of [[150,100],[850,100],[150,400],[850,400],[500,250]]){
    const shapes=render(x,y),cast=shapes[0],contact=shapes[1],highlight=shapes.at(-1);
    const dx=500-x,dy=250-y;
    assert.ok(highlight[0]*dx+highlight[1]*dy>=0,'reflection faces lamp');
    assert.ok(cast[0]*dx+cast[1]*dy<=0,'cast shadow faces away');
    assert.ok(Math.abs(cast[0]*highlight[1]-cast[1]*highlight[0])<1e-8,'both follow one light axis');
    assert.equal(contact[0],0);assert.equal(contact[1],0,'contact core remains attached');
    assert.equal(shapes.length,3,'no fixed lower-right specular spot');
  }
});

test('adding table padding to the ball and lamp preserves all lighting geometry',()=>{
  const local=render(270,330),global=render(342,402,{light:{...SNOOKER_LIGHT,x:572,y:322}});
  assert.deepEqual(global,local,'pocket animation and live balls use the same coordinate frame');
});

test('numbered Pool balls retain their legacy shadow and catchlights even with overhead option',()=>{
  const shapes=render(200,100,{plain:false});
  const lx=300/700,ly=150/550;
  assert.deepEqual(shapes[0],[-lx*8*.8,-ly*8*.8,8*.94,8*.8,0,0,Math.PI*2]);
  assert.deepEqual(shapes.at(-1),[8*.42,8*.32,8*.1,8*.28,-.5,0,Math.PI*2]);
});


test('raising the snooker lamp shortens typical cast-shadow offsets while preserving contact',()=>{
  const previous={...SNOOKER_LIGHT,height:420};
  for(const [x,y] of [[250,250],[150,100],[100,50],[750,250],[850,400],[900,450]]){
    const before=render(x,y,{light:previous}),after=render(x,y);
    const ratio=Math.hypot(after[0][0],after[0][1])/Math.hypot(before[0][0],before[0][1]);
    assert.ok(ratio>=.70&&ratio<=.80,'typical shadow offset is 20–30% shorter');
    assert.deepEqual(after[1],before[1],'the grounded contact core is unchanged');
    assert.ok(after[0].slice(2).every((value,i)=>Math.abs(value-before[0][i+2])<1e-12),'soft footprint shape is preserved');
  }
});
