import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from '../dist/vendor/three.module.min.js';
import {DIE_FACES,buildDieGeometry,pipCenters,quaternionForResult} from '../dist/die-geometry.js';

test('a single fixed die has all six values and opposite faces sum to seven',()=>{
 assert.deepEqual(DIE_FACES.map(face=>face.value).sort((a,b)=>a-b),[1,2,3,4,5,6]);
 for(const face of DIE_FACES){
  const n=new Vector3(...face.normal),u=new Vector3(...face.u),v=new Vector3(...face.v);
  assert.ok(u.cross(v).distanceTo(n)<1e-12,'local face basis is right handed');
  const opposite=DIE_FACES.find(other=>new Vector3(...other.normal).dot(n)<-.99);
  assert.equal(face.value+opposite.value,7);
  assert.equal(pipCenters(face.value).length,face.value);
 }
});

test('every result orientation exposes its actual fixed face as the dominant readable face',()=>{
 for(let value=1;value<=6;value++){
  const q=quaternionForResult(value);assert.ok(Math.abs(q.length()-1)<1e-12);
  const facing=DIE_FACES.map(face=>({value:face.value,z:new Vector3(...face.normal).applyQuaternion(q).z})).sort((a,b)=>b.z-a.z);
  assert.equal(facing[0].value,value);
  assert.ok(facing[0].z>.85,'result stays legible, facing camera');
  assert.ok(facing[0].z-facing[1].z>.4,'decorative face cannot dominate the result');
 }
 assert.throws(()=>quaternionForResult(0),RangeError);
 assert.throws(()=>quaternionForResult(7),RangeError);
});

test('rounded die mesh is finite, outward-facing and has physically recessed blue pips on every face',()=>{
 const geometry=buildDieGeometry(),p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),c=geometry.getAttribute('color'),faceValues=geometry.getAttribute('faceValue');
 for(const attribute of [p,n,c])assert.ok([...attribute.array].every(Number.isFinite));
 assert.equal(p.count,n.count);assert.equal(p.count,c.count);
 assert.ok(geometry.index.count>3000&&geometry.index.count<60000);
 for(const axis of ['x','y','z']){
  assert.ok(Math.abs(geometry.boundingBox.min[axis]+.5)<1e-6);
  assert.ok(Math.abs(geometry.boundingBox.max[axis]-.5)<1e-6);
 }
 const point=new Vector3(),normal=new Vector3();
 for(let i=0;i<n.count;i++)assert.ok(Math.abs(normal.fromBufferAttribute(n,i).length()-1)<1e-6);
 for(const face of DIE_FACES){
  const faceNormal=new Vector3(...face.normal),u=new Vector3(...face.u),v=new Vector3(...face.v);
  for(const [x,y] of pipCenters(face.value)){
   let centre=-1;
   for(let i=0;i<p.count;i++){
    if(faceValues.getX(i)!==face.value)continue;
    point.fromBufferAttribute(p,i);
    if(Math.abs(point.dot(u)-x)<1e-6&&Math.abs(point.dot(v)-y)<1e-6&&point.dot(faceNormal)<.48){centre=i;break;}
   }
   assert.notEqual(centre,-1,`face ${face.value} has a cavity at ${x},${y}`);
   point.fromBufferAttribute(p,centre);
   assert.ok(Math.abs(point.dot(faceNormal)-(.5-geometry.userData.pipDepth))<1e-6);
   assert.ok(c.getZ(centre)>c.getX(centre)*5,'cavity is physically blue vertex geometry');
  }
 }
 // Geometric winding must agree with outward supplied normals, including bowls.
 const a=new Vector3(),b=new Vector3(),d=new Vector3(),cross=new Vector3(),avg=new Vector3();
 for(let i=0;i<geometry.index.count;i+=3){
  const ia=geometry.index.getX(i),ib=geometry.index.getX(i+1),ic=geometry.index.getX(i+2);
  a.fromBufferAttribute(p,ia);b.fromBufferAttribute(p,ib);d.fromBufferAttribute(p,ic);
  cross.subVectors(b,a).cross(d.sub(a));
  avg.fromBufferAttribute(n,ia).add(normal.fromBufferAttribute(n,ib)).add(normal.fromBufferAttribute(n,ic));
  assert.ok(cross.dot(avg)>0,'triangle faces outward without folded geometry');
 }
 geometry.dispose();
});
