// The tip, ferrule and tapered shaft are separate materials; the cap is rounded.
export function drawCue(ctx,c,angle,pull=0){
  ctx.save();ctx.translate(c[0]/10,c[1]/10);ctx.rotate(angle*Math.PI/1800+Math.PI);ctx.translate(27+pull,0);
  const gradient=(colors,y0=-4.5,y1=4.5)=>{const g=ctx.createLinearGradient(0,y0,0,y1);for(const [at,color]of colors)g.addColorStop(at,color);return g;};
  const shaft=()=>{ctx.beginPath();ctx.moveTo(8,-2.1);ctx.lineTo(336,-4.4);ctx.quadraticCurveTo(340,-4.4,340,0);ctx.quadraticCurveTo(340,4.4,336,4.4);ctx.lineTo(8,2.1);ctx.closePath();};
  ctx.shadowColor='#00162660';ctx.shadowBlur=3;ctx.shadowOffsetX=(c[0]/10-480)/110;ctx.shadowOffsetY=(c[1]/10-234)/90;
  ctx.fillStyle=gradient([[0,'#70502f'],[.24,'#d4a566'],[.42,'#f4d7a0'],[.65,'#c18a47'],[1,'#654022']]);shaft();ctx.fill();ctx.shadowColor='transparent';
  ctx.save();shaft();ctx.clip();ctx.strokeStyle='#80542840';ctx.lineWidth=.26;
  for(const y of [-1.4,.1,1.5]){ctx.beginPath();ctx.moveTo(14,y);ctx.bezierCurveTo(83,y-.3,165,y+.7,235,y*1.7);ctx.stroke();}
  ctx.strokeStyle='#fff2c477';ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(10,-.65);ctx.lineTo(232,-1.5);ctx.stroke();ctx.restore();
  ctx.fillStyle=gradient([[0,'#717c78'],[.38,'#fff8dd'],[.7,'#e9e7d5'],[1,'#89968d']],-2.1,2.1);ctx.fillRect(0,-2.1,9,4.2);
  ctx.fillStyle=gradient([[0,'#3d535b'],[.35,'#a5c6cb'],[.7,'#5c828f'],[1,'#273f49']],-2.15,2.15);
  ctx.beginPath();ctx.moveTo(0,-2.15);ctx.lineTo(-2,-2.15);ctx.bezierCurveTo(-4.7,-2.15,-4.7,2.15,-2,2.15);ctx.lineTo(0,2.15);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#ddf3ec99';ctx.lineWidth=.35;ctx.beginPath();ctx.moveTo(-2.4,-1.4);ctx.quadraticCurveTo(-3.5,-.8,-3.5,.15);ctx.stroke();
  ctx.fillStyle=gradient([[0,'#0a0e18'],[.36,'#343b48'],[.58,'#252b39'],[1,'#070c13']]);ctx.beginPath();ctx.moveTo(234,-3.68);ctx.lineTo(314,-4.25);ctx.lineTo(314,4.25);ctx.lineTo(234,3.68);ctx.closePath();ctx.fill();
  ctx.save();ctx.beginPath();ctx.rect(235,-3.65,78,7.3);ctx.clip();ctx.strokeStyle='#b8ae9e24';ctx.lineWidth=.25;
  for(let x=235;x<315;x+=2){ctx.beginPath();ctx.moveTo(x,-4.2);ctx.lineTo(x-2,4.2);ctx.stroke();}ctx.restore();
  ctx.fillStyle=gradient([[0,'#88734c'],[.4,'#f3e0ad'],[.7,'#c3b07c'],[1,'#6f6148']]);ctx.fillRect(231,-3.75,3,7.5);ctx.fillRect(314,-4.25,3,8.5);
  ctx.fillStyle=gradient([[0,'#1b2028'],[.4,'#41454a'],[1,'#0b0f16']]);ctx.beginPath();ctx.moveTo(336,-4.4);ctx.bezierCurveTo(342,-4.4,342,4.4,336,4.4);ctx.closePath();ctx.fill();ctx.restore();
}
