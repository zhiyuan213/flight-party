// The tip, ferrule and tapered shaft are separate materials; the cap is rounded.
/* `skin` is optional and belongs to MY cue only. Passing null keeps the
   original wooden stick byte-for-byte, which is what the opponent sees. */
export function drawCue(ctx,c,angle,pull=0,skin=null){
  ctx.save();ctx.translate(c[0]/10,c[1]/10);ctx.rotate(angle*Math.PI/1800+Math.PI);ctx.translate(27+pull,0);
  const gradient=(colors,y0=-4.5,y1=4.5)=>{const g=ctx.createLinearGradient(0,y0,0,y1);for(const [at,color]of colors)g.addColorStop(at,color);return g;};
  const stops=(key,fallback)=>skin&&skin[key]?skin[key]:fallback;
  const shaft=()=>{ctx.beginPath();ctx.moveTo(8,-2.1);ctx.lineTo(336,-4.4);ctx.quadraticCurveTo(340,-4.4,340,0);ctx.quadraticCurveTo(340,4.4,336,4.4);ctx.lineTo(8,2.1);ctx.closePath();};
  ctx.shadowColor='#00162660';ctx.shadowBlur=3;ctx.shadowOffsetX=(c[0]/10-480)/110;ctx.shadowOffsetY=(c[1]/10-234)/90;
  ctx.fillStyle=gradient(stops('shaft',[[0,'#70502f'],[.24,'#d4a566'],[.42,'#f4d7a0'],[.65,'#c18a47'],[1,'#654022']]));shaft();ctx.fill();ctx.shadowColor='transparent';
  ctx.save();shaft();ctx.clip();ctx.strokeStyle='#80542840';ctx.lineWidth=.26;
  for(const y of [-1.4,.1,1.5]){ctx.beginPath();ctx.moveTo(14,y);ctx.bezierCurveTo(83,y-.3,165,y+.7,235,y*1.7);ctx.stroke();}
  ctx.strokeStyle='#fff2c477';ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(10,-.65);ctx.lineTo(232,-1.5);ctx.stroke();ctx.restore();
  if(skin?.surface){
    ctx.save();shaft();ctx.clip();
    if(skin.surface==='carbon'){
      ctx.strokeStyle='#d8f5ff30';ctx.lineWidth=.4;
      for(let x=15;x<232;x+=3){ctx.beginPath();ctx.moveTo(x,-4);ctx.lineTo(x+7,4);ctx.moveTo(x,4);ctx.lineTo(x+7,-4);ctx.stroke();}
    }else if(skin.surface==='crystal'){
      /* A bright light core running down the clear glass shaft. */
      ctx.strokeStyle='#ffffff55';ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(230,0);ctx.stroke();
      ctx.strokeStyle='#aee6f52e';ctx.lineWidth=1.6;
      for(let x=15;x<232;x+=9){ctx.beginPath();ctx.moveTo(x,-3.6);ctx.lineTo(x+5,3.6);ctx.stroke();}
    }else if(skin.surface==='galaxy'){
      for(let x=18;x<230;x+=7){
        ctx.fillStyle=(x%14===0)?'#e8dcff':'#cdb8ff';
        ctx.beginPath();ctx.arc(x,Math.sin(x*.7)*2.6,(x%14===0?.5:.32),0,Math.PI*2);ctx.fill();
      }
    }
    // Three elongated timber / metal splices, inset into the back of the shaft.
    ctx.fillStyle=skin.surface==='walnut'?'#243f32':skin.surface==='obsidian'?'#63506f':skin.surface==='crystal'?'#8fd0e6':skin.surface==='galaxy'?'#2a2250':'#152530';
    for(const y of [-2.4,0,2.4]){ctx.beginPath();ctx.moveTo(134,y);ctx.lineTo(229,y-1.1);ctx.lineTo(229,y+1.1);ctx.closePath();ctx.fill();}
    ctx.strokeStyle=skin.inlay;ctx.lineWidth=.4;
    for(const y of [-2.4,2.4]){ctx.beginPath();ctx.moveTo(145,y);ctx.lineTo(228,y);ctx.stroke();}
    ctx.restore();
  }
  ctx.fillStyle=gradient(stops('ferrule',[[0,'#717c78'],[.38,'#fff8dd'],[.7,'#e9e7d5'],[1,'#89968d']]),-2.1,2.1);ctx.fillRect(0,-2.1,9,4.2);
  ctx.fillStyle=gradient(stops('tip',[[0,'#3d535b'],[.35,'#a5c6cb'],[.7,'#5c828f'],[1,'#273f49']]),-2.15,2.15);
  ctx.beginPath();ctx.moveTo(0,-2.15);ctx.lineTo(-2,-2.15);ctx.bezierCurveTo(-4.7,-2.15,-4.7,2.15,-2,2.15);ctx.lineTo(0,2.15);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#ddf3ec99';ctx.lineWidth=.35;ctx.beginPath();ctx.moveTo(-2.4,-1.4);ctx.quadraticCurveTo(-3.5,-.8,-3.5,.15);ctx.stroke();
  ctx.fillStyle=gradient(stops('butt',[[0,'#0a0e18'],[.36,'#343b48'],[.58,'#252b39'],[1,'#070c13']]));ctx.beginPath();ctx.moveTo(234,-3.68);ctx.lineTo(314,-4.25);ctx.lineTo(314,4.25);ctx.lineTo(234,3.68);ctx.closePath();ctx.fill();
  ctx.save();ctx.beginPath();ctx.rect(235,-3.65,78,7.3);ctx.clip();ctx.strokeStyle='#b8ae9e24';ctx.lineWidth=.25;
  for(let x=235;x<315;x+=2){ctx.beginPath();ctx.moveTo(x,-4.2);ctx.lineTo(x-2,4.2);ctx.stroke();}
  if(skin){ctx.strokeStyle=skin.inlay+'45';ctx.lineWidth=.24;for(let x=236;x<315;x+=4){ctx.beginPath();ctx.moveTo(x,-4.2);ctx.lineTo(x+3,4.2);ctx.stroke();}}ctx.restore();
  ctx.fillStyle=gradient(stops('ring',[[0,'#88734c'],[.4,'#f3e0ad'],[.7,'#c3b07c'],[1,'#6f6148']]));ctx.fillRect(231,-3.75,3,7.5);ctx.fillRect(314,-4.25,3,8.5);
  ctx.fillStyle=gradient(stops('cap',[[0,'#1b2028'],[.4,'#41454a'],[1,'#0b0f16']]));ctx.beginPath();ctx.moveTo(336,-4.4);ctx.bezierCurveTo(342,-4.4,342,4.4,336,4.4);ctx.closePath();ctx.fill();ctx.restore();
}
