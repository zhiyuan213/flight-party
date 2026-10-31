// A closed, rounded die mesh. Pips are real recessed surfaces, not image decals.
// Coordinates, pip values and result orientations are renderer-independent.
import {BufferGeometry,Float32BufferAttribute,Vector2,Vector3,Quaternion,Euler,Color,ShapeUtils} from './vendor/three.module.min.js';

const freezeFace=(value,normal,u,v)=>Object.freeze({value,normal:Object.freeze(normal),u:Object.freeze(u),v:Object.freeze(v)});
export const DIE_FACES=Object.freeze([
 freezeFace(1,[0,0,1],[1,0,0],[0,1,0]),
 freezeFace(6,[0,0,-1],[-1,0,0],[0,1,0]),
 freezeFace(2,[0,1,0],[1,0,0],[0,0,-1]),
 freezeFace(5,[0,-1,0],[1,0,0],[0,0,1]),
 freezeFace(3,[1,0,0],[0,0,-1],[0,1,0]),
 freezeFace(4,[-1,0,0],[0,0,1],[0,1,0]),
]);
const HALF=.5,ROUND=.095,CORE=HALF-ROUND,PIP_RADIUS=.091,PIP_DEPTH=.043,PIP_SPACING=.225;
const IVORY=new Color('#f9fcff'),BLUE=new Color('#1677ef');
const FRONT=new Vector3(0,0,1);
const DISPLAY_POSE=new Quaternion().setFromEuler(new Euler(.30,-.38,-.18,'XYZ'));

export function pipCenters(value){
 const d=PIP_SPACING;
 switch(value){
  case 1:return [[0,0]];
  case 2:return [[-d,d],[d,-d]];
  case 3:return [[-d,d],[0,0],[d,-d]];
  case 4:return [[-d,d],[d,d],[-d,-d],[d,-d]];
  case 5:return [[-d,d],[d,d],[0,0],[-d,-d],[d,-d]];
  case 6:return [[-d,d],[d,d],[-d,0],[d,0],[-d,-d],[d,-d]];
  default:throw new RangeError('A die result must be an integer from 1 to 6.');
 }
}

// The chosen face points toward the viewer in a consistent three-quarter pose.
// No face labels or pip counts change during a roll.
export function quaternionForResult(value){
 const face=DIE_FACES.find(face=>face.value===value);
 if(!face)throw new RangeError('A die result must be an integer from 1 to 6.');
 return DISPLAY_POSE.clone().multiply(new Quaternion().setFromUnitVectors(new Vector3(...face.normal),FRONT));
}

export function buildDieGeometry(segments=28){
 if(!Number.isFinite(segments))throw new TypeError('segments must be finite.');
 const detail=Math.max(12,Math.min(64,Math.round(segments)));
 const radial=Math.max(24,Math.ceil(detail/4)*4),edgeSteps=Math.max(4,Math.round(detail/4));
 const positions=[],normals=[],colors=[],indices=[],faceValues=[];
 const add=(face,point,normal,color=IVORY)=>{
  const i=positions.length/3;
  for(let axis=0;axis<3;axis++){
   positions.push(face.u[axis]*point[0]+face.v[axis]*point[1]+face.normal[axis]*point[2]);
   normals.push(face.u[axis]*normal[0]+face.v[axis]*normal[1]+face.normal[axis]*normal[2]);
  }
  colors.push(color.r,color.g,color.b);faceValues.push(face.value);return i;
 };
 const axis=[];
 for(let i=0;i<=edgeSteps;i++)axis.push(-HALF+ROUND*i/edgeSteps);
 for(let i=0;i<=edgeSteps;i++)axis.push(CORE+ROUND*i/edgeSteps);
 for(const face of DIE_FACES){
  // The flat face has circular holes whose boundaries join the sculpted bowls.
  const contour=[new Vector2(-CORE,-CORE),new Vector2(CORE,-CORE),new Vector2(CORE,CORE),new Vector2(-CORE,CORE)];
  const centers=pipCenters(face.value);
  const holes=centers.map(([u,v])=>Array.from({length:radial},(_,i)=>{
   const angle=-i*Math.PI*2/radial;return new Vector2(u+PIP_RADIUS*Math.cos(angle),v+PIP_RADIUS*Math.sin(angle));
  }));
  const planar=[...contour,...holes.flat()],offset=positions.length/3;
  for(const p of planar)add(face,[p.x,p.y,HALF],[0,0,1]);
  for(const tri of ShapeUtils.triangulateShape(contour,holes)){
   const [a,b,c]=tri.map(i=>planar[i]);
   const ccw=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)>0;
   indices.push(offset+tri[0],offset+tri[ccw?1:2],offset+tri[ccw?2:1]);
  }

  // Smooth shallow bowls: zero slope at both the ivory rim and the cavity centre.
  // Blue is vertex colour on this actual concave surface, so it responds to light.
  const radii=[1,.95,.82,.62,.35];
  for(const [u,v] of centers){
   const rings=radii.map((fraction,ring)=>Array.from({length:radial},(_,i)=>{
    const angle=i*Math.PI*2/radial,r=fraction*PIP_RADIUS;
    const depth=PIP_DEPTH*(1-fraction*fraction)**2;
    const slope=4*PIP_DEPTH*r/(PIP_RADIUS*PIP_RADIUS)*(1-fraction*fraction);
    const nx=-slope*Math.cos(angle),ny=-slope*Math.sin(angle),length=Math.hypot(nx,ny,1);
    return add(face,[u+r*Math.cos(angle),v+r*Math.sin(angle),HALF-depth],[nx/length,ny/length,1/length],ring===0?IVORY:BLUE);
   }));
   for(let ring=0;ring<rings.length-1;ring++)for(let i=0;i<radial;i++){
    const j=(i+1)%radial,a=rings[ring][i],b=rings[ring][j],c=rings[ring+1][i],d=rings[ring+1][j];
    indices.push(a,b,c,b,d,c);
   }
   const center=add(face,[u,v,HALF-PIP_DEPTH],[0,0,1],BLUE),last=rings.at(-1);
   for(let i=0;i<radial;i++)indices.push(last[i],last[(i+1)%radial],center);
  }

  // Rounded cube edges/corners. The core face stays planar; all six patches meet
  // at identical positions and use identical analytic normals on their seams.
  const border=[];
  for(let row=0;row<axis.length;row++){
   border[row]=[];
   for(let col=0;col<axis.length;col++){
    const u=axis[col],v=axis[row],cu=Math.max(-CORE,Math.min(CORE,u)),cv=Math.max(-CORE,Math.min(CORE,v));
    const du=u-cu,dv=v-cv,dn=ROUND,length=Math.hypot(du,dv,dn),normal=[du/length,dv/length,dn/length];
    border[row][col]=add(face,[cu+normal[0]*ROUND,cv+normal[1]*ROUND,CORE+normal[2]*ROUND],normal);
   }
  }
  for(let row=0;row<axis.length-1;row++)for(let col=0;col<axis.length-1;col++){
   if(col===edgeSteps&&row===edgeSteps)continue; // Filled by the face-with-holes above.
   const a=border[row][col],b=border[row][col+1],c=border[row+1][col],d=border[row+1][col+1];
   indices.push(a,b,c,b,d,c);
  }
 }
 const geometry=new BufferGeometry();
 geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
 geometry.setAttribute('normal',new Float32BufferAttribute(normals,3));
 geometry.setAttribute('color',new Float32BufferAttribute(colors,3));
 geometry.setAttribute('faceValue',new Float32BufferAttribute(faceValues,1));
 geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData={halfSize:HALF,cornerRadius:ROUND,pipRadius:PIP_RADIUS,pipDepth:PIP_DEPTH,detail,radialSegments:radial};
 return geometry;
}
