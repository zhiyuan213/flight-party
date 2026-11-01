import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.min.js';
import {makeMemberPlane} from '../dist/member-plane.js';
test('VIP aircraft have distinct structural assemblies and independent propellers',()=>{
 const gold=makeMemberPlane('gold'),cloud=makeMemberPlane('sapphire'),night=makeMemberPlane('night');
 assert.ok(gold.getObjectByName('Upper biplane airfoil'));assert.ok(gold.getObjectByName('Lower biplane airfoil'));
 assert.ok(cloud.getObjectByName('Sculpted float -1'));assert.ok(cloud.getObjectByName('Sculpted float 1'));assert.equal(cloud.userData.propellers.length,2);
 assert.ok(night.getObjectByName('Twin swept tail -1'));assert.ok(night.getObjectByName('Twin swept tail 1'));assert.ok(night.getObjectByName('Swept sport airfoil'));
 for(const model of [gold,cloud,night]){const hull=model.getObjectByName('Sculpted fuselage');assert.notEqual(hull.geometry.type,'SphereGeometry');const b=new T.Box3().setFromObject(model);assert.ok(b.max.x-b.min.x>2.5);assert.ok(b.max.z-b.min.z>2);for(const prop of model.userData.propellers){const before=new T.Box3().setFromObject(model);prop.rotation.z=1.2;const after=new T.Box3().setFromObject(model);assert.ok(Math.abs(after.getCenter(new T.Vector3()).z-before.getCenter(new T.Vector3()).z)<.05);}}
});
test('model positions and normals are finite and fuselage normals point outward',()=>{
 for(const style of ['gold','sapphire','night']){const model=makeMemberPlane(style);model.traverse(n=>{if(!n.geometry)return;for(const key of ['position','normal']){const a=n.geometry.getAttribute(key);assert.ok(a&&[...a.array].every(Number.isFinite),style+' '+n.name+' '+key);}});const hull=model.getObjectByName('Sculpted fuselage'),position=hull.geometry.attributes.position,normal=hull.geometry.attributes.normal;let found=false;for(let i=0;i<position.count;i++)if(position.getX(i)>.25&&Math.abs(normal.getZ(i))<.4){assert.ok(normal.getX(i)>0);found=true;break;}assert.ok(found);}
});
