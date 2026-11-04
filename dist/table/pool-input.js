// Input geometry is separate from rendering and never determines a match result.
export const SPIN_STRIDE = 363600;
export function pullPower(start, current, angle, scale=1) {
  const radians=angle*Math.PI/1800;
  const distance=-((current.x-start.x)*Math.cos(radians)+(current.y-start.y)*Math.sin(radians))*scale;
  return Math.max(0,Math.min(100,Math.round(distance/1.8)));
}
export function spotCode(x,y) {
  if(Math.hypot(x,y)<.25)return 0;
  return 1+((Math.round(Math.atan2(x,-y)/(Math.PI/4))+8)%8);
}
export function encodePoolShot(power,angle,spin=0) {
  return spin*SPIN_STRIDE+Math.max(1,Math.min(100,Math.round(power)))*3600+((Math.round(angle)%3600)+3600)%3600;
}
export function openingSeconds(until,now) {return Math.max(0,Math.min(3,Math.ceil((until-now)/1000)));}
