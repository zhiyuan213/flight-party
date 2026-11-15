// Snooker ash shaft and ebony splice. Drawing coordinates only; shot geometry is unchanged.
export function drawCue(ctx,c,angle,pull=0,skin=null){
  ctx.save();ctx.translate(c[0]/10,c[1]/10);ctx.rotate(angle*Math.PI/1800+Math.PI);ctx.translate(27+pull,0);
  const gradient=(key,fallback)=>{const g=ctx.createLinearGradient(0,-3.8,0,3.8);for(const [at,color] of skin?.[key]||fallback)g.addColorStop(at,color);return g;};
  const shaft=()=>{ctx.beginPath();ctx.moveTo(5,-1.55);ctx.lineTo(335,-3.7);ctx.quadraticCurveTo(340,-3.7,340,0);ctx.quadraticCurveTo(340,3.7,335,3.7);ctx.lineTo(5,1.55);ctx.closePath();};
  ctx.shadowColor='#0007';ctx.shadowBlur=2;ctx.shadowOffsetX=1;ctx.shadowOffsetY=2;
  ctx.fillStyle=gradient('shaft',[[0,'#99815a'],[.32,'#d8c393'],[.55,'#e1d0a6'],[1,'#a28a60']]);shaft();ctx.fill();ctx.shadowColor='transparent';
  ctx.save();shaft();ctx.clip();
  ctx.strokeStyle='#68523050';ctx.lineWidth=.28;
  for(const y of [-1,.15,1]){ctx.beginPath();ctx.moveTo(7,y);ctx.bezierCurveTo(90,y-.5,180,y+.8,253,y*2);ctx.stroke();}
  ctx.fillStyle=gradient('butt',[[0,'#100e0b'],[.38,'#373026'],[.6,'#28231c'],[1,'#100e0c']]);
  ctx.beginPath();ctx.moveTo(208,-3);ctx.bezierCurveTo(240,-2.2,230,-.7,190,0);ctx.bezierCurveTo(230,.7,240,2.2,208,3);ctx.lineTo(340,4);ctx.lineTo(340,-4);ctx.closePath();ctx.fill();
  ctx.fillStyle=gradient('ring',[[0,'#66502c'],[.4,'#baa475'],[1,'#78613c']]);ctx.fillRect(270,-4,1.6,8);
  ctx.restore();
  ctx.fillStyle=gradient('ferrule',[[0,'#827045'],[.42,'#d3bf8a'],[1,'#917b4e']]);ctx.fillRect(0,-1.55,5.5,3.1);
  ctx.fillStyle=gradient('tip',[[0,'#35464b'],[.5,'#6a8e99'],[1,'#2d464e']]);
  ctx.beginPath();ctx.moveTo(0,-1.65);ctx.lineTo(-1.8,-1.65);ctx.quadraticCurveTo(-3.4,0,-1.8,1.65);ctx.lineTo(0,1.65);ctx.closePath();ctx.fill();
  ctx.fillStyle='#141512';ctx.beginPath();ctx.roundRect(335,-3.7,6,7.4,2);ctx.fill();ctx.restore();
}
