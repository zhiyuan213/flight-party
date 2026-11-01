import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
import * as T from '../dist/vendor/three.module.min.js';
import {exportGLB,inspectGLB,dataTexturePNG} from '../scripts/export-member-planes.mjs';

test('GLB retains propeller pivots, metadata, PBR clearcoat and aligned embedded texture data',()=>{
 const root=new T.Group();root.name='aircraft';root.userData={style:'gold',source:'concept',circular:root};
 const pivot=new T.Group();pivot.name='propeller-pivot';pivot.position.set(0,.2,-1);root.add(pivot);
 const texture=new T.DataTexture(new Uint8Array([255,0,0,255,0,255,0,255,0,0,255,255,255,255,255,0]),2,2,T.RGBAFormat);texture.name='eyes';texture.colorSpace=T.SRGBColorSpace;
 const material=new T.MeshPhysicalMaterial({map:texture,color:0xffcc44,roughness:.25,metalness:.65,clearcoat:1,clearcoatRoughness:.13});material.name='champagne-paint';
 const blade=new T.Mesh(new T.BoxGeometry(.12,.7,.04),material);blade.name='blade';pivot.add(blade);
 const result=exportGLB(root),{document,binary}=inspectGLB(result);
 assert.equal(document.asset.version,'2.0');assert.equal(document.nodes[0].extras.style,'gold');assert.equal(document.nodes[0].extras.circular,undefined);
 const prop=document.nodes.find(n=>n.name==='propeller-pivot');assert.ok(prop);assert.deepEqual(prop.matrix.slice(12,15),[0,.2,-1]);assert.ok(prop.children.length);
 const mat=document.materials[0];assert.equal(mat.name,'champagne-paint');assert.equal(mat.extensions.KHR_materials_clearcoat.clearcoatFactor,1);assert.equal(mat.pbrMetallicRoughness.metallicFactor,.65);
 assert.ok(document.extensionsUsed.includes('KHR_materials_clearcoat'));assert.equal(document.images[0].mimeType,'image/png');
 const view=document.bufferViews[document.images[0].bufferView];assert.deepEqual([...binary.subarray(view.byteOffset,view.byteOffset+8)],[137,80,78,71,13,10,26,10]);
 assert.ok(document.accessors.filter(a=>a.min).every(a=>a.min.every(Number.isFinite)&&a.max.every(Number.isFinite)));
 assert.ok(document.bufferViews.every(v=>v.byteOffset%4===0));
 assert.throws(()=>inspectGLB(result.subarray(0,-1)),/header/);
});

test('PNG embedding preserves RGBA pixels and explicit row flipping without external files',()=>{
 const texture=new T.DataTexture(new Uint8Array([255,0,0,255,0,0,255,128]),1,2,T.RGBAFormat);texture.flipY=true;
 const png=dataTexturePNG(texture);let offset=8,data=[];
 while(offset<png.length){const size=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);if(type==='IDAT')data.push(png.subarray(offset+8,offset+8+size));offset+=size+12;}
 assert.deepEqual([...inflateSync(Buffer.concat(data))],[0,0,0,255,128,0,255,0,0,255]);
});

test('export refuses unsupported textures and non-finite mesh coordinates',()=>{
 const texture=new T.Texture(),material=new T.MeshStandardMaterial({map:texture});
 assert.throws(()=>exportGLB(new T.Mesh(new T.BoxGeometry(),material)),/DataTexture/);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute([0,0,0,NaN,1,0,1,0,0],3));
 assert.throws(()=>exportGLB(new T.Mesh(geometry,new T.MeshStandardMaterial())),/Non-finite/);
});

test('instanced rivets expand into transformed nodes sharing one glTF mesh',()=>{
 const rivets=new T.InstancedMesh(new T.SphereGeometry(.02,8,6),new T.MeshStandardMaterial({metalness:.8}),3);rivets.name='wing-rivets';rivets.position.set(0,1,0);
 for(let i=0;i<3;i++)rivets.setMatrixAt(i,new T.Matrix4().makeTranslation(i*.2,0,-.5));
 const {document}=inspectGLB(exportGLB(rivets));const parent=document.nodes[0];assert.equal(parent.name,'wing-rivets');assert.equal(parent.mesh,undefined);assert.equal(parent.children.length,3);assert.equal(parent.matrix[13],1);
 assert.equal(document.meshes.length,1);for(let i=0;i<3;i++){const child=document.nodes[parent.children[i]];assert.equal(child.mesh,0);assert.equal(child.extras.instanceIndex,i);assert.ok(Math.abs(child.matrix[12]-i*.2)<1e-7);assert.equal(child.matrix[14],-.5);}
});

test('independent roughness and metalness textures pack into glTF G/B channels',()=>{
 const roughness=new T.DataTexture(new Uint8Array([1,77,3,255]),1,1,T.RGBAFormat),metalness=new T.DataTexture(new Uint8Array([4,5,33,255]),1,1,T.RGBAFormat);
 const material=new T.MeshStandardMaterial({roughnessMap:roughness,metalnessMap:metalness}),{document,binary}=inspectGLB(exportGLB(new T.Mesh(new T.BoxGeometry(),material)));
 const texture=document.textures[document.materials[0].pbrMetallicRoughness.metallicRoughnessTexture.index],view=document.bufferViews[document.images[texture.source].bufferView],png=binary.subarray(view.byteOffset,view.byteOffset+view.byteLength);let offset=8,pixels=[];
 while(offset<png.length){const length=png.readUInt32BE(offset);if(png.toString('ascii',offset+4,offset+8)==='IDAT')pixels.push(png.subarray(offset+8,offset+8+length));offset+=length+12;}
 assert.deepEqual([...inflateSync(Buffer.concat(pixels))],[0,255,77,33,255]);
});
