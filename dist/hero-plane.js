import * as T from './vendor/three.module.min.js';
import {makeMemberPlane} from './member-plane.js';
import {drawPropeller,propellerAngle} from './propeller.js';

function disposeTree(root){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 root?.traverse(node=>{node.shadow?.dispose?.();if(node.geometry)geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:node.material?[node.material]:[]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}});
 for(const texture of textures)texture.dispose();for(const material of materials)material.dispose();for(const geometry of geometries)geometry.dispose();
}

// An authored studio reflection rig gives polished paint/metal something real to reflect.
function studioEnvironment(renderer){
 const scene=new T.Scene();scene.background=new T.Color(0xb8cee7);
 const wall=new T.Mesh(new T.BoxGeometry(18,12,18),new T.MeshBasicMaterial({color:0xe4edf8,side:T.BackSide}));wall.position.y=3;scene.add(wall);
 const panel=(w,h,x,y,z,ry,color)=>{const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color,side:T.DoubleSide}));mesh.position.set(x,y,z);mesh.rotation.y=ry;scene.add(mesh);};
 panel(5,8,-5,3,-3,.7,new T.Color().setRGB(5,5.3,6));
 panel(3,6,5,3,1,-.9,new T.Color().setRGB(2.2,2.5,3));
 panel(6,2,0,7,-1,0,new T.Color().setRGB(4,3.8,3.3));
 const generator=new T.PMREMGenerator(renderer);let target;
 try{target=generator.fromScene(scene,.04,.1,40,{size:128});}finally{generator.dispose();disposeTree(scene);}
 return target;
}

function shadowTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const context=canvas.getContext('2d');
 const gradient=context.createRadialGradient(64,64,8,64,64,64);gradient.addColorStop(0,'rgba(25,40,66,.24)');gradient.addColorStop(.45,'rgba(31,54,81,.13)');gradient.addColorStop(1,'rgba(31,54,81,0)');context.fillStyle=gradient;context.fillRect(0,0,128,128);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
}

export class HeroPlane {
 constructor(parent,{reduced=false,model=false,style='sapphire'}={}){
  this.wrap=document.createElement('div');this.wrap.className='hero-plane-model';this.wrap.setAttribute('role','img');this.wrap.setAttribute('aria-label','Airplane with a gently spinning propeller');parent.prepend(this.wrap);parent.classList.add('hero-model-ready');this.reduced=reduced;this.active=true;this.frame=this.frame.bind(this);
  if(model){try{
   this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.91;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.wrap.append(this.renderer.domElement);
   this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(32,1,.01,40);
   try{this.environment=studioEnvironment(this.renderer);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.5;}catch{this.environment=null;}
   this.scene.add(new T.HemisphereLight(0xe9f5ff,0x8a9ab7,.8));
   const key=new T.DirectionalLight(0xfff5df,2.15);key.position.set(-3.5,6,-4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.normalBias=.018;key.shadow.bias=-.00015;key.shadow.radius=4;this.scene.add(key);
   const fill=new T.DirectionalLight(0xb9d9ff,.6);fill.position.set(4,2,-1);this.scene.add(fill);
   const rim=new T.DirectionalLight(0xe2ecff,1.1);rim.position.set(0,4,5);this.scene.add(rim);
   this.model=makeMemberPlane(style);this.model.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}});this.scene.add(this.model);
   this.model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(this.model),center=bounds.getCenter(new T.Vector3());this.model.position.x-=center.x;this.model.position.z-=center.z;this.model.position.y+=.07-bounds.min.y;this.model.updateMatrixWorld(true);
   const normalized=new T.Box3().setFromObject(this.model);this.modelCenter=normalized.getCenter(new T.Vector3());this.modelRadius=normalized.getBoundingSphere(new T.Sphere()).radius;
   // Per-mesh boxes avoid treating the empty corners around wings and tail as solid aircraft.
   this.fitCorners=[];this.model.traverse(node=>{if(!node.geometry)return;node.geometry.computeBoundingBox();const b=node.geometry.boundingBox;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])this.fitCorners.push(this.model.worldToLocal(new T.Vector3(x,y,z).applyMatrix4(node.matrixWorld)));});
   // Include each propeller's full circular sweep, not just the initial blade orientation.
   for(const propeller of this.model.userData.propellers||[this.model.userData.propeller].filter(Boolean)){
    const inverse=new T.Matrix4().copy(propeller.matrixWorld).invert(),sweep=new T.Box3();let radius=0;propeller.traverse(node=>{const a=node.geometry?.attributes.position;if(a)for(let i=0;i<a.count;i++){const point=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(node.matrixWorld).applyMatrix4(inverse);sweep.expandByPoint(point);radius=Math.max(radius,Math.hypot(point.x,point.y));}});
    for(const z of [sweep.min.z,sweep.max.z])for(let i=0;i<16;i++){const angle=i*Math.PI/8;this.fitCorners.push(this.model.worldToLocal(new T.Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius,z).applyMatrix4(propeller.matrixWorld)));}
   }
   const plinth=new T.Mesh(new T.CylinderGeometry(this.modelRadius*.95,this.modelRadius*.97,.025,80),new T.MeshStandardMaterial({color:0xe8f0fb,roughness:.8,metalness:0}));plinth.position.y=.008;plinth.receiveShadow=true;this.scene.add(plinth);
   const contact=new T.Mesh(new T.PlaneGeometry(this.modelRadius*2.15,this.modelRadius*1.65),new T.MeshBasicMaterial({map:shadowTexture(),transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=.043;this.scene.add(contact);
   const extent=this.modelRadius*1.8;Object.assign(key.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,near:.1,far:25});key.target.position.copy(this.modelCenter);this.scene.add(key.target);key.shadow.camera.updateProjectionMatrix();
   this.wrap.dataset.heroRenderer='webgl';
  }catch(error){disposeTree(this.scene);this.environment?.dispose();this.environment=null;this.renderer?.dispose();this.renderer=null;this.wrap.replaceChildren();}}
  if(!this.renderer){this.canvas=document.createElement('canvas');this.wrap.append(this.canvas);this.context=this.canvas.getContext('2d');this.image=new Image();this.image.onload=()=>this.render(performance.now());this.image.src='assets/plane-blue-body.png';this.wrap.dataset.heroRenderer='illustrated-animated';}
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.wrap);this.onVisibility=()=>this.schedule();document.addEventListener('visibilitychange',this.onVisibility);this.resize();this.schedule();
 }
 dispose(){this.disposed=true;this.active=false;this.schedule();this.observer.disconnect();document.removeEventListener('visibilitychange',this.onVisibility);disposeTree(this.scene);this.environment?.dispose();this.renderer?.dispose();this.wrap.remove();}
 resize(){
  const w=this.wrap.clientWidth,h=this.wrap.clientHeight;if(!w||!h)return;this.w=w;this.h=h;
  if(this.renderer){
   this.renderer.setSize(w,h,false);this.camera.aspect=w/h;
   // Fit the current yaw projection with independent horizontal and vertical margins.
   this.fitCamera();
  }else{this.canvas.width=w*2;this.canvas.height=h*2;this.context.setTransform(2,0,0,2,0,0);}
  this.render(performance.now());
 }
 fitCamera(){
  this.model.updateMatrixWorld(true);const points=this.fitCorners.map(point=>point.clone().applyMatrix4(this.model.matrixWorld));
  this.modelCenter=new T.Box3().setFromPoints(points).getCenter(new T.Vector3());
  const direction=new T.Vector3(1.35,.55,-1.85).normalize(),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),direction).normalize(),up=new T.Vector3().crossVectors(direction,right);
  const tanV=Math.tan(T.MathUtils.degToRad(this.camera.fov)/2),tanH=tanV*this.camera.aspect;let distance=.1;
  for(const point of points){const relative=point.clone().sub(this.modelCenter),depth=relative.dot(direction);distance=Math.max(distance,depth+Math.abs(relative.dot(right))/tanH*1.12,depth+Math.abs(relative.dot(up))/tanV*1.12);}
  this.camera.position.copy(this.modelCenter).addScaledVector(direction,distance);this.camera.lookAt(this.modelCenter);this.camera.near=Math.max(.01,distance-this.modelRadius*2.5);this.camera.far=distance+this.modelRadius*5;this.camera.updateProjectionMatrix();this.fittedYaw=this.model.rotation.y;
 }
 setReduced(value){this.reduced=value;this.schedule();this.render(performance.now());}
 setActive(value){this.active=value;this.schedule();if(value)this.render(performance.now());}
 schedule(){if(this.raf){cancelAnimationFrame(this.raf);this.raf=null;}if(!this.disposed&&this.active&&!this.reduced&&!document.hidden)this.raf=requestAnimationFrame(this.frame);}
 frame(now){this.raf=null;if(this.disposed||!this.active||document.hidden)return;this.render(now);if(!this.reduced)this.raf=requestAnimationFrame(this.frame);}
 render(now){
  if(this.disposed||!this.w||!this.h)return;this.wrap.dataset.propellerAngle=String(propellerAngle(now,this.reduced));
  if(this.renderer){
   if(this.fittedYaw!==this.model.rotation.y)this.fitCamera();
   const propellers=this.model.userData.propellers||[this.model.userData.propeller].filter(Boolean);
   propellers.forEach((propeller,index)=>{propeller.rotation.z=propellerAngle(now,this.reduced)*((propeller.userData.spinDirection)||1)+(this.reduced?0:index*1.7);});this.renderer.render(this.scene,this.camera);
  }else if(this.image?.complete&&this.image.naturalWidth){const c=this.context;c.clearRect(0,0,this.w,this.h);const width=Math.min(this.w*.96,this.h*.96*this.image.naturalWidth/this.image.naturalHeight),height=width*this.image.naturalHeight/this.image.naturalWidth;c.save();c.translate(this.w/2,(this.h-height)/2+height*.91);c.drawImage(this.image,-width/2,-height*.91,width,height);drawPropeller(c,width,height,now,'#3487ec',this.reduced);c.restore();}
 }
}


