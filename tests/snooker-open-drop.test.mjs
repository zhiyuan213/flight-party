import test from 'node:test';
import assert from 'node:assert/strict';
import {snookerCirclePath,SNOOKER_POCKET_SCALE,snookerPockets} from '../dist/table/pool-geometry.js';

// Record the path, then sample its filled region without a browser/canvas dependency.
function clip(middle,scale,depth){
  const circles=[],polygons=[];let path=[];
  const context={
    beginPath(){circles.length=0;polygons.length=0;path=[];},
    arc(x,y,r){circles.push({x,y,r});},
    moveTo(x,y){path=[[x,y]];},
    lineTo(x,y){path.push([x,y]);},
    closePath(){polygons.push(path);path=[];},
    rect(x,y,w,h){polygons.push([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);}
  };
  snookerCirclePath(context,middle,scale,depth);
  function inPolygon(x,y,points){
    let winding=0;
    for(let i=0;i<points.length;i++){
      const [ax,ay]=points[i],[bx,by]=points[(i+1)%points.length];
      const cross=(bx-ax)*(y-ay)-(x-ax)*(by-ay);
      if(Math.abs(cross)<1e-9&&x>=Math.min(ax,bx)-1e-9&&x<=Math.max(ax,bx)+1e-9&&y>=Math.min(ay,by)-1e-9&&y<=Math.max(ay,by)+1e-9)return true;
      if(ay<=y&&by>y&&cross>0)winding++;
      if(ay>y&&by<=y&&cross<0)winding--;
    }
    return winding!==0;
  }
  return {circles,polygons,contains:(x,y)=>circles.some(c=>(x-c.x)**2+(y-c.y)**2<=c.r**2+1e-9)||polygons.some(p=>inPolygon(x,y,p))};
}

test('a ball center has a continuous visible route from baize into every recessed well',()=>{
  for(const middle of [false,true])for(const scale of [.25,SNOOKER_POCKET_SCALE,1]){
    const pocket=snookerPockets(scale)[middle?1:0];
    const cx=middle?0:pocket.x,cy=pocket.y;
    for(const depth of [0,.25,.5,.75]){
      const area=clip(middle,scale,depth),open=1-depth*depth*(3-2*depth);
      const endX=middle?0:20*open,endY=20*open;
      for(let i=0;i<=200;i++){
        const t=i/200,x=cx+(endX-cx)*t,y=cy+(endY-cy)*t;
        assert.ok(area.contains(x,y),
          `gap on ${middle?'middle':'corner'} approach at scale ${scale}, depth ${depth}, (${x},${y})`);
      }
    }
  }
});

test('the rim crossing retains the full eight-unit ball before it starts sinking',()=>{
  for(const middle of [false,true]){
    const area=clip(middle,SNOOKER_POCKET_SCALE,0);
    // These are the old disconnected circle/rectangle seams.
    for(let center=-7;center<=4;center+=.5){
      const x=middle?0:center,y=center;
      for(let i=0;i<64;i++){
        const angle=i*Math.PI/32;
        assert.ok(area.contains(x+8*Math.cos(angle),y+8*Math.sin(angle)),
          `ball sliced at ${middle?'middle':'corner'} rim, center ${center}`);
      }
    }
  }
});

test('the aperture contracts with depth and is empty when the ball is below the rim',()=>{
  for(const middle of [false,true]){
    const open=clip(middle,SNOOKER_POCKET_SCALE,0);
    const half=clip(middle,SNOOKER_POCKET_SCALE,.5);
    const closed=clip(middle,SNOOKER_POCKET_SCALE,1);
    assert.equal(half.circles[0].r,open.circles[0].r*.5);
    assert.equal(closed.circles.length,0);
    assert.equal(closed.polygons.length,0);
    for(let x=-40;x<=90;x+=2)for(let y=-50;y<=90;y+=2){
      if(half.contains(x,y))assert.ok(open.contains(x,y),'sinking cannot reveal new area');
      assert.equal(closed.contains(x,y),false);
    }
  }
});

test('open approach keeps the existing well size and placement',()=>{
  assert.equal(SNOOKER_POCKET_SCALE,.5);
  for(const middle of [false,true]){
    const p=snookerPockets(SNOOKER_POCKET_SCALE)[middle?1:0];
    assert.deepEqual(clip(middle,SNOOKER_POCKET_SCALE,0).circles,[{x:middle?0:p.x,y:p.y,r:p.r}]);
  }
});
