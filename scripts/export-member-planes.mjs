import {deflateSync} from 'node:zlib';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname} from 'node:path';
import {Matrix4,DataTexture,RGBAFormat} from '../dist/vendor/three.module.min.js';

// Dependency-free GLB 2.0 writer for the project's static Three.js aircraft assets.
// Reference: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
const align4=n=>(n+3)&~3;
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc32=data=>{let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
function pngChunk(name,data){const type=Buffer.from(name),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);type.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([type,data])),data.length+8);return out;}
export function dataTexturePNG(texture){
 const {width,height,data}=texture.image||{};
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||!(data instanceof Uint8Array))throw new Error('Only unsigned-byte DataTextures are supported');
 const channels=data.length/(width*height);if(![1,2,3,4].includes(channels))throw new Error('Invalid DataTexture dimensions/channels');
 const raw=Buffer.alloc(height*(width*4+1));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const from=((texture.flipY?height-y-1:y)*width+x)*channels,to=y*(width*4+1)+1+x*4;
  raw[to]=data[from];raw[to+1]=channels>1?data[from+1]:0;raw[to+2]=channels>2?data[from+2]:0;raw[to+3]=channels===4?data[from+3]:255;
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),pngChunk('IHDR',header),pngChunk('IDAT',deflateSync(raw)),pngChunk('IEND',Buffer.alloc(0))]);
}
function metadata(value,seen=new WeakSet()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number')return Number.isFinite(value)?value:undefined;
 if(typeof value!=='object'||value.isObject3D||value.isMaterial||value.isBufferGeometry||value.isTexture||seen.has(value))return undefined;
 seen.add(value);if(Array.isArray(value))return value.map(v=>metadata(v,seen)).filter(v=>v!==undefined);
 const out={};for(const [k,v] of Object.entries(value)){const next=metadata(v,seen);if(next!==undefined)out[k]=next;}return out;
}
export function exportGLB(root){
 root.updateMatrixWorld(true);
 const doc={asset:{version:'2.0',generator:'Flight Party static aircraft exporter'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],materials:[],accessors:[],bufferViews:[],buffers:[]};
 const parts=[],materialIds=new Map(),textureIds=new Map(),meshIds=new Map(),extensions=new Set();let byteLength=0;
 const view=(data,target)=>{const padded=align4(byteLength);if(padded>byteLength)parts.push(Buffer.alloc(padded-byteLength));const index=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:padded,byteLength:data.length,...(target?{target}:{})});parts.push(data);byteLength=padded+data.length;return index;};
 const accessor=(values,size,{indices=false,minmax=false}={})=>{
  if(indices&&values.some(v=>!Number.isSafeInteger(v)||v<0||v>4294967295))throw new Error('Invalid triangle index');
  const array=indices?(Math.max(...(values.length<10000?values:[0]))>65535||values.some(v=>v>65535)?new Uint32Array(values):new Uint16Array(values)):new Float32Array(values);
  if(!array.length||array.length%size)throw new Error('Invalid empty or partial accessor');
  for(const v of array)if(!Number.isFinite(v))throw new Error('Non-finite vertex data');
  const item={bufferView:view(Buffer.from(array.buffer,array.byteOffset,array.byteLength),indices?34963:34962),componentType:indices?(array instanceof Uint32Array?5125:5123):5126,count:array.length/size,type:{1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4'}[size]};
  if(!item.type)throw new Error('Unsupported attribute size');
  if(minmax){item.min=Array(size).fill(Infinity);item.max=Array(size).fill(-Infinity);for(let i=0;i<array.length;i++){const n=i%size;item.min[n]=Math.min(item.min[n],array[i]);item.max[n]=Math.max(item.max[n],array[i]);}}
  return doc.accessors.push(item)-1;
 };
 const textureInfo=texture=>{
  if(!textureIds.has(texture)){
   if(!texture.isDataTexture)throw new Error('Texture must be a DataTexture; external/DOM images are not embedded');
   const image={bufferView:view(dataTexturePNG(texture)),mimeType:'image/png',name:texture.name||'embedded-texture'};
   doc.images??=[];doc.textures??=[];doc.samplers??=[];
   const filters={1003:9728,1004:9984,1005:9986,1006:9729,1007:9985,1008:9987},wrap={1000:10497,1001:33071,1002:33648};
   const sampler={magFilter:filters[texture.magFilter]||9729,minFilter:filters[texture.minFilter]||9987,wrapS:wrap[texture.wrapS]||33071,wrapT:wrap[texture.wrapT]||33071};
   textureIds.set(texture,doc.textures.length);doc.textures.push({source:doc.images.push(image)-1,sampler:doc.samplers.push(sampler)-1});
  }
  const result={index:textureIds.get(texture)};if(texture.channel)result.texCoord=texture.channel;
  if(texture.offset.x||texture.offset.y||texture.repeat.x!==1||texture.repeat.y!==1||texture.rotation){extensions.add('KHR_texture_transform');result.extensions={KHR_texture_transform:{offset:texture.offset.toArray(),scale:texture.repeat.toArray(),rotation:texture.rotation}};}
  return result;
 };
 const packedMetalRoughness=(rough,metal)=>{
  const source=rough||metal;if([rough,metal].filter(Boolean).some(t=>!t.isDataTexture||!(t.image?.data instanceof Uint8Array)))throw new Error('PBR packing requires unsigned-byte DataTextures');
  if(rough&&metal&&(rough.flipY!==metal.flipY||!rough.offset.equals(metal.offset)||!rough.repeat.equals(metal.repeat)||rough.rotation!==metal.rotation))throw new Error('PBR texture transforms must agree');
  const width=Math.max(rough?.image.width||0,metal?.image.width||0),height=Math.max(rough?.image.height||0,metal?.image.height||0),data=new Uint8Array(width*height*4);
  const sample=(texture,x,y,channel)=>{if(!texture)return 255;const image=texture.image,channels=image.data.length/(image.width*image.height);const index=(Math.min(image.height-1,Math.floor(y*image.height/height))*image.width+Math.min(image.width-1,Math.floor(x*image.width/width)))*channels;return channel<channels?image.data[index+channel]:channel===3?255:0;};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;data[i]=255;data[i+1]=sample(rough,x,y,1);data[i+2]=sample(metal,x,y,2);data[i+3]=255;}
  const packed=new DataTexture(data,width,height,RGBAFormat);packed.name='packed-metallic-roughness';packed.flipY=source.flipY;packed.wrapS=source.wrapS;packed.wrapT=source.wrapT;packed.magFilter=source.magFilter;packed.minFilter=source.minFilter;packed.offset.copy(source.offset);packed.repeat.copy(source.repeat);packed.rotation=source.rotation;return packed;
 };
 const material=mat=>{
  if(materialIds.has(mat))return materialIds.get(mat);
  if(!mat?.isMeshStandardMaterial)throw new Error('Only standard/physical PBR materials are supported');
  const pbr={baseColorFactor:[mat.color.r,mat.color.g,mat.color.b,mat.opacity],metallicFactor:mat.metalness,roughnessFactor:mat.roughness};
  if(mat.map)pbr.baseColorTexture=textureInfo(mat.map);
  if(mat.roughnessMap||mat.metalnessMap)pbr.metallicRoughnessTexture=textureInfo(mat.roughnessMap===mat.metalnessMap?mat.roughnessMap:packedMetalRoughness(mat.roughnessMap,mat.metalnessMap));
  const out={name:mat.name||'aircraft-material',pbrMetallicRoughness:pbr,doubleSided:mat.side===2};
  if(mat.transparent)out.alphaMode='BLEND';else if(mat.alphaTest>0){out.alphaMode='MASK';out.alphaCutoff=mat.alphaTest;}
  if(mat.emissive?.getHex()){out.emissiveFactor=mat.emissive.toArray().map(v=>v*(mat.emissiveIntensity??1));if(out.emissiveFactor.some(v=>v>1)){const strength=Math.max(...out.emissiveFactor);out.emissiveFactor=out.emissiveFactor.map(v=>v/strength);extensions.add('KHR_materials_emissive_strength');out.extensions={KHR_materials_emissive_strength:{emissiveStrength:strength}};}}
  if(mat.emissiveMap)out.emissiveTexture=textureInfo(mat.emissiveMap);
  if(mat.normalMap){out.normalTexture=textureInfo(mat.normalMap);out.normalTexture.scale=mat.normalScale.x;if(mat.normalScale.x!==mat.normalScale.y)throw new Error('Asymmetric normal scaling is unsupported');}
  if(mat.aoMap)out.occlusionTexture={...textureInfo(mat.aoMap),strength:mat.aoMapIntensity};
  if(mat.clearcoat>0){extensions.add('KHR_materials_clearcoat');out.extensions??={};out.extensions.KHR_materials_clearcoat={clearcoatFactor:mat.clearcoat,clearcoatRoughnessFactor:mat.clearcoatRoughness};if(mat.clearcoatMap)out.extensions.KHR_materials_clearcoat.clearcoatTexture=textureInfo(mat.clearcoatMap);}
  if(mat.transmission>0){extensions.add('KHR_materials_transmission');out.extensions??={};out.extensions.KHR_materials_transmission={transmissionFactor:mat.transmission};}
  if(mat.ior&&mat.ior!==1.5){extensions.add('KHR_materials_ior');out.extensions??={};out.extensions.KHR_materials_ior={ior:mat.ior};}
  const extra=metadata(mat.userData);if(extra&&Object.keys(extra).length)out.extras=extra;
  const id=doc.materials.push(out)-1;materialIds.set(mat,id);return id;
 };
 const visit=object=>{
  if(object.visible===false)return null;
  if(object.isSkinnedMesh)throw new Error('Skinned objects are unsupported');
  object.updateMatrix();const node={name:object.name||object.type,matrix:object.matrix.toArray()};
  if(!node.matrix.every(Number.isFinite))throw new Error('Non-finite node transform');
  const extra=metadata(object.userData);if(extra&&Object.keys(extra).length)node.extras=extra;
  const id=doc.nodes.push(node)-1;
  if(object.isMesh&&!object.isInstancedMesh){
   const geometry=object.geometry,position=geometry.getAttribute('position');if(!position)throw new Error('Mesh has no positions');
   const materialKey=(Array.isArray(object.material)?object.material:[object.material]).map(m=>m.uuid).join('/'),meshKey=geometry.uuid+':'+materialKey;
   if(meshIds.has(meshKey)){node.mesh=meshIds.get(meshKey);}else{
   const attributes={};
   for(const [name,key] of [['position','POSITION'],['normal','NORMAL'],['uv','TEXCOORD_0'],['uv1','TEXCOORD_1'],['color','COLOR_0'],['tangent','TANGENT']]){
    const attr=geometry.getAttribute(name);if(!attr)continue;const values=[];
    for(let i=0;i<attr.count;i++)for(let j=0;j<attr.itemSize;j++)values.push(attr.getComponent(i,j));
    attributes[key]=accessor(values,attr.itemSize,{minmax:name==='position'});
   }
   const mats=Array.isArray(object.material)?object.material:[object.material],index=geometry.getIndex(),total=index?index.count:position.count;
   const groups=geometry.groups.length?geometry.groups:[{start:0,count:total,materialIndex:0}];
   const primitives=[];for(const group of groups){
    const start=Math.max(group.start,geometry.drawRange.start),end=Math.min(group.start+group.count,total,geometry.drawRange.start+geometry.drawRange.count);
    if(end<=start)continue;const indices=[];for(let i=start;i<end;i++)indices.push(index?index.getX(i):i);
    if(indices.length%3)throw new Error('Only triangle meshes are supported');
    primitives.push({attributes,indices:accessor(indices,1,{indices:true}),material:material(mats[group.materialIndex??0]||mats[0]),mode:4});
   }
   if(primitives.length){node.mesh=doc.meshes.push({name:object.name||'aircraft-mesh',primitives})-1;meshIds.set(meshKey,node.mesh);}
   }
  }
  const children=object.children.map(visit).filter(v=>v!==null);if(children.length)node.children=children;
  if(object.isInstancedMesh){
   node.children??=[];
   for(let i=0;i<object.count;i++){
    const matrix=new Matrix4();object.getMatrixAt(i,matrix);
    // Core glTF nodes share one mesh; no instancing extension is needed by clients.
    const instance={name:(object.name||'instance')+'-'+i,type:'Mesh',isMesh:true,geometry:object.geometry,material:object.material,matrix,children:[],userData:{instanceIndex:i},updateMatrix(){}};
    node.children.push(visit(instance));
   }
  }
  return id;
 };
 doc.scenes[0].nodes=[visit(root)];if(doc.scenes[0].nodes[0]===null)throw new Error('Root is hidden');
 doc.buffers=[{byteLength}];if(extensions.size)doc.extensionsUsed=[...extensions].sort();
 const json=Buffer.from(JSON.stringify(doc)),jsonPadded=Buffer.alloc(align4(json.length),0x20);json.copy(jsonPadded);
 const binary=Buffer.concat(parts),binPadded=Buffer.alloc(align4(binary.length));binary.copy(binPadded);
 const header=Buffer.alloc(12);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+jsonPadded.length+8+binPadded.length,8);
 const jsonHeader=Buffer.alloc(8);jsonHeader.writeUInt32LE(jsonPadded.length);jsonHeader.writeUInt32LE(0x4e4f534a,4);
 const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(binPadded.length);binHeader.writeUInt32LE(0x004e4942,4);
 return Buffer.concat([header,jsonHeader,jsonPadded,binHeader,binPadded]);
}

export function inspectGLB(buffer){
 if(buffer.readUInt32LE(0)!==0x46546c67||buffer.readUInt32LE(4)!==2||buffer.readUInt32LE(8)!==buffer.length)throw new Error('Invalid GLB header');
 const jsonLength=buffer.readUInt32LE(12);if(jsonLength%4||buffer.readUInt32LE(16)!==0x4e4f534a)throw new Error('Invalid JSON chunk');
 const document=JSON.parse(buffer.subarray(20,20+jsonLength).toString());const binHeader=20+jsonLength,binLength=buffer.readUInt32LE(binHeader);
 if(binLength%4||buffer.readUInt32LE(binHeader+4)!==0x004e4942||binHeader+8+binLength!==buffer.length)throw new Error('Invalid BIN chunk');
 const binary=buffer.subarray(binHeader+8);if(document.buffers[0].byteLength>binary.length)throw new Error('Buffer exceeds BIN');
 for(const view of document.bufferViews)if((view.byteOffset||0)%4||view.byteOffset+view.byteLength>document.buffers[0].byteLength)throw new Error('Misaligned/out-of-range bufferView');
 const sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},bytes={5123:2,5125:4,5126:4};
 for(const accessor of document.accessors){const view=document.bufferViews[accessor.bufferView],needed=accessor.count*sizes[accessor.type]*bytes[accessor.componentType];if(!view||!Number.isFinite(needed)||needed>view.byteLength)throw new Error('Accessor exceeds bufferView');if(accessor.type==='VEC3'&&accessor.min){if(![...accessor.min,...accessor.max].every(Number.isFinite)||accessor.min.some((v,i)=>v>accessor.max[i]))throw new Error('Invalid accessor bounds');}}
 return{document,binary};
}

async function main(){
 const {makeMemberPlane}=await import('../dist/member-plane.js');const out=resolve(dirname(fileURLToPath(import.meta.url)),'../dist/assets/models');await mkdir(out,{recursive:true});
 const manifest=[];for(const [style,name] of [['gold','golden-captain'],['sapphire','cloud-voyager'],['night','starlight-racer']]){
  const model=makeMemberPlane(style),glb=exportGLB(model),{document}=inspectGLB(glb);const filename=name+'.glb';await writeFile(resolve(out,filename),glb);manifest.push({style,file:filename,bytes:glb.length,nodes:document.nodes.length,meshes:document.meshes.length,materials:document.materials.length});
  console.log(filename+': '+glb.length+' bytes, '+document.meshes.length+' meshes');
 }
 await writeFile(resolve(out,'manifest.json'),JSON.stringify({format:'glTF 2.0 binary',assets:manifest},null,2)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
