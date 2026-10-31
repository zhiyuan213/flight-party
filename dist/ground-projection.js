// Receiving pavement measured from the 1254px airport-island-v5.png artwork.
// Virtual corners extend the straight inner curbs through their chamfered corners.
export const GROUND_HALF = 5.725;
export const AIRPORT_SIZE = Object.freeze({width:14.3,height:11.3});
const IMAGE_SIZE=1254,TOP=105,BOTTOM=1076;
const FAR_LEFT=145,FAR_RIGHT=1109,NEAR_LEFT=124,NEAR_RIGHT=1128;
const FAR_WIDTH=FAR_RIGHT-FAR_LEFT,NEAR_WIDTH=NEAR_RIGHT-NEAR_LEFT;

// A projective map (not bilinear interpolation): straight world lines stay straight.
// Keep calibration fixed across viewport sizes; only the containing image scales.
function along(z){
 const t=(z+GROUND_HALF)/(2*GROUND_HALF),g=FAR_WIDTH/NEAR_WIDTH-1;
 return t*(1+g)/(1+g*t);
}
export function groundPoint(x,z){
 const q=along(z),left=FAR_LEFT+(NEAR_LEFT-FAR_LEFT)*q;
 const width=FAR_WIDTH+(NEAR_WIDTH-FAR_WIDTH)*q;
 return {u:(left+(x+GROUND_HALF)/(2*GROUND_HALF)*width)/IMAGE_SIZE,v:(TOP+(BOTTOM-TOP)*q)/IMAGE_SIZE};
}
export function groundScale(z){
 const width=FAR_WIDTH+(NEAR_WIDTH-FAR_WIDTH)*along(z);
 return width/IMAGE_SIZE*AIRPORT_SIZE.width/(2*GROUND_HALF);
}
export const GROUND_CENTER=Object.freeze(groundPoint(0,0));
