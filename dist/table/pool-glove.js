/* White-gloved hand for the ball-in-hand placement affordance.
 * Coordinates are relative to the cue ball (radius 16 table units). */
export const GLOVE_IDLE_ALPHA=.85, GLOVE_DRAG_ALPHA=1;

export function drawGlovedHand(ctx,x,y,alpha=GLOVE_IDLE_ALPHA){
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.translate(x,y);
  ctx.lineJoin='round';ctx.lineCap='round';
  const fill=ctx.createLinearGradient(0,-20,28,12);
  fill.addColorStop(0,'#fff');fill.addColorStop(.48,'#f9fcff');
  fill.addColorStop(1,'#b9cde0');
  // Compact C-shaped silhouette: index finger above, thumb below the ball.
  ctx.shadowColor='rgba(8,26,53,.3)';ctx.shadowBlur=3;
  ctx.shadowOffsetX=1;ctx.shadowOffsetY=2;
  ctx.beginPath();
  ctx.moveTo(-12,-13);
  ctx.bezierCurveTo(-10,-19,-5,-22,2,-22);
  ctx.bezierCurveTo(8,-23,13,-20,18,-16);
  ctx.bezierCurveTo(22,-13,25,-11,29,-11);
  ctx.lineTo(29,9);
  ctx.bezierCurveTo(24,9,20,11,15,12);
  ctx.bezierCurveTo(10,13,5,14,1,14);
  ctx.bezierCurveTo(-3,14,-5,12,-4,9);
  ctx.bezierCurveTo(-3,7,0,7,4,7);
  ctx.bezierCurveTo(8,7,11,5,12,2);
  ctx.bezierCurveTo(13,-2,12,-5,9,-8);
  ctx.bezierCurveTo(5,-11,1,-13,-3,-13);
  ctx.bezierCurveTo(-6,-13,-8,-10,-11,-10);
  ctx.bezierCurveTo(-13,-10,-14,-11,-12,-13);
  ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
  ctx.strokeStyle='rgba(95,125,156,.35)';ctx.lineWidth=.65;ctx.stroke();
  // Rounded white fabric cuff, with a seam and a small blue sleeve edge.
  ctx.beginPath();ctx.moveTo(28,-11);ctx.bezierCurveTo(31,-11,33,-10,34,-9);
  ctx.lineTo(34,8);ctx.bezierCurveTo(32,9,30,9,28,9);ctx.closePath();
  ctx.fillStyle='#e4eff9';ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(31,-10);ctx.bezierCurveTo(32,-5,32,3,31,9);
  ctx.strokeStyle='rgba(106,137,168,.5)';ctx.lineWidth=.7;ctx.stroke();
  // Fine curved seams suggest the folded fingers without obscuring the ball.
  ctx.strokeStyle='rgba(118,147,176,.34)';ctx.lineWidth=.7;
  ctx.beginPath();ctx.moveTo(-9,-15);ctx.bezierCurveTo(-5,-19,0,-19,5,-17);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-5,-18);ctx.bezierCurveTo(0,-21,6,-20,11,-17);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,-20);ctx.bezierCurveTo(5,-21,10,-19,14,-16);ctx.stroke();
  ctx.beginPath();ctx.moveTo(15,-13);ctx.bezierCurveTo(19,-10,20,-7,20,-4);ctx.stroke();
  ctx.beginPath();ctx.moveTo(5,10);ctx.bezierCurveTo(9,10,12,9,14,7);ctx.stroke();
  ctx.restore();
}
