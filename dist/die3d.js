// A real six-sided 3D mesh, independent of game rules and of the illustrated board.
// WebGL is preferred; software rasterization projects the same geometry if GPU access is absent.
import * as T from './vendor/three.module.min.js';
import {buildDieGeometry,quaternionForResult} from './die-geometry.js';

const TAU=Math.PI*2;
const smooth=t=>t*t*(3-2*t);
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const srgb=v=>Math.round(255*(v<=.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-.055));

export class Die3D{
 constructor(host,{reduced=false}={}){
  this.host=host;this.reduced=reduced;this.value=1;this.pose=quaternionForResult(1);this.lift=0;this.squash=0;this.zoom=1.3;this.serial=0;
  this.geometry=buildDieGeometry(28);this.canvas=document.createElement('canvas');this.canvas.setAttribute('aria-hidden','true');host.replaceChildren(this.canvas);
  this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-1.2,1.2,1.2,-1.2,.1,20);this.camera.position.set(0,0,5);
  this.mesh=new T.Mesh(this.geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.24,metalness:.025}));this.scene.add(this.mesh);
  this.scene.add(new T.HemisphereLight(0xffffff,0x809cc9,2.0));
  const key=new T.DirectionalLight(0xfffcf3,3.0);key.position.set(-3,5,6);this.scene.add(key);
  const fill=new T.DirectionalLight(0x90c7ff,1.0);fill.position.set(4,1,2);this.scene.add(fill);
  this.makeShadow();
  let context=null;try{context=this.canvas.getContext('webgl2',{alpha:true,antialias:true,premultipliedAlpha:true});}catch{}
  if(context){try{this.renderer=new T.WebGLRenderer({canvas:this.canvas,context,alpha:true,antialias:true});this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.host.dataset.dieRenderer='webgl';}catch{this.useSoftware();}}
  else this.useSoftware();
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.useSoftware();this.resize();});
  this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(host);this.resize();
 }
 makeShadow(){
  const image=document.createElement('canvas');image.width=256;image.height=64;const c=image.getContext('2d');const g=c.createRadialGradient(128,32,0,128,32,110);g.addColorStop(0,'#25497570');g.addColorStop(.4,'#25497530');g.addColorStop(1,'#25497500');c.fillStyle=g;c.fillRect(0,0,256,64);
  this.shadow=new T.Mesh(new T.PlaneGeometry(1.9,.35),new T.MeshBasicMaterial({map:new T.CanvasTexture(image),transparent:true,depthWrite:false,opacity:.65}));this.shadow.position.set(0,-.75,-1);this.scene.add(this.shadow);
 }
 useSoftware(){
  // A fresh canvas is needed after a WebGL context was bound to the previous one.
  this.renderer?.dispose();this.renderer=null;const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');this.host.replaceChildren(canvas);this.canvas=canvas;this.ctx=canvas.getContext('2d');this.host.dataset.dieRenderer='software-3d';
  this.pixelsCanvas=document.createElement('canvas');this.pixelsContext=this.pixelsCanvas.getContext('2d');
  this.vertices=new Float32Array(this.geometry.attributes.position.count*6);
 }
 resize(){
  const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.w=w;this.h=h;this.dpr=Math.min(devicePixelRatio||1,this.renderer?2:1.5);
  const aspect=w/h,extent=1.12*Math.max(1,h/w);this.camera.left=-extent*aspect;this.camera.right=extent*aspect;this.camera.top=extent;this.camera.bottom=-extent;this.camera.updateProjectionMatrix();
  if(this.renderer){this.renderer.setPixelRatio(this.dpr);this.renderer.setSize(w,h,false);}
  else{this.canvas.width=Math.round(w*this.dpr);this.canvas.height=Math.round(h*this.dpr);this.pixelsCanvas.width=this.canvas.width;this.pixelsCanvas.height=this.canvas.height;this.raster=this.pixelsContext.createImageData(this.canvas.width,this.canvas.height);this.depth=new Float32Array(this.canvas.width*this.canvas.height);}
  this.draw();
 }
 setReduced(value){this.reduced=!!value;if(this.reduced&&this.pending)this.complete();}
 cancel(){
  cancelAnimationFrame(this.frameId);this.serial++;const pending=this.pending;this.pending=null;this.pose.copy(quaternionForResult(this.value));this.lift=0;this.squash=0;this.zoom=1.3;this.draw();pending?.resolve();
 }
 setValue(value){if(!Number.isInteger(value)||value<1||value>6)throw new RangeError('Die value must be 1–6');this.cancel();this.value=value;this.pose.copy(quaternionForResult(value));this.draw();}
 complete(){
  const p=this.pending;if(!p)return;cancelAnimationFrame(this.frameId);this.pending=null;this.value=p.value;this.pose.copy(p.target);this.lift=0;this.squash=0;this.zoom=1.3;this.draw();p.resolve();
 }
 rollTo(value){
  if(!Number.isInteger(value)||value<1||value>6)throw new RangeError('Die value must be 1–6');this.cancel();
  if(this.reduced){this.setValue(value);return Promise.resolve();}
  const start=this.pose.clone(),target=quaternionForResult(value),id=this.serial,begin=performance.now(),spin=new T.Quaternion(),euler=new T.Euler();
  return new Promise(resolve=>{
   this.pending={value,target,resolve};
   const tick=now=>{
    if(id!==this.serial||!this.pending)return;const t=clamp((now-begin)/1120,0,1);
    if(t>=1){this.complete();return;}
    const u=Math.min(1,t/.76),turn=1-(1-u)**2;this.zoom=1.3-.3*Math.sqrt(Math.sin(t*Math.PI));this.pose.copy(start).slerp(target,smooth(u));
    if(t<.76){euler.set(turn*TAU*2,turn*TAU*3,turn*TAU);spin.setFromEuler(euler);this.pose.multiply(spin);this.lift=.22*Math.abs(Math.sin(u*Math.PI*2))*(1-u*.55);this.squash=0;}
    else{const v=(t-.76)/.24;this.lift=.055*Math.sin(v*Math.PI);this.squash=.045*Math.sin(v*Math.PI);spin.setFromAxisAngle(new T.Vector3(0,0,1),Math.sin(v*Math.PI)*.045);this.pose.multiply(spin);}
    this.draw();this.frameId=requestAnimationFrame(tick);
   };this.frameId=requestAnimationFrame(tick);
  });
 }
 draw(){
  if(!this.w||!this.h)return;
  this.mesh.quaternion.copy(this.pose);this.mesh.position.y=.035+this.lift;this.mesh.scale.set((1+this.squash*.5)*this.zoom,(1-this.squash)*this.zoom,this.zoom);
  this.shadow.scale.setScalar(1+this.lift*.4);this.shadow.material.opacity=.65-this.lift*.5;
  if(this.renderer)this.renderer.render(this.scene,this.camera);else this.drawSoftware();
 }
 drawSoftware(){
  const width=this.canvas.width,height=this.canvas.height,unit=Math.min(width,height)/2.24,positions=this.geometry.attributes.position.array,normals=this.geometry.attributes.normal.array,colors=this.geometry.attributes.color.array,indices=this.geometry.index.array;
  const matrix=new T.Matrix4().makeRotationFromQuaternion(this.pose).elements,v=this.vertices,data=this.raster.data;data.fill(0);this.depth.fill(-Infinity);
  const light=[-.36,.61,.71],half=[-.19,.33,.925],sx=(1+this.squash*.5)*this.zoom,sy=(1-this.squash)*this.zoom;
  for(let i=0,j=0;i<positions.length;i+=3,j+=6){
   const x=positions[i]*sx,y=positions[i+1]*sy,z=positions[i+2]*this.zoom;const rx=matrix[0]*x+matrix[4]*y+matrix[8]*z,ry=matrix[1]*x+matrix[5]*y+matrix[9]*z,rz=matrix[2]*x+matrix[6]*y+matrix[10]*z;
   const nx=matrix[0]*normals[i]+matrix[4]*normals[i+1]+matrix[8]*normals[i+2],ny=matrix[1]*normals[i]+matrix[5]*normals[i+1]+matrix[9]*normals[i+2],nz=matrix[2]*normals[i]+matrix[6]*normals[i+1]+matrix[10]*normals[i+2];
   const diffuse=.62+.42*Math.max(0,nx*light[0]+ny*light[1]+nz*light[2])+.11*Math.max(0,nx*.8+ny*.15+nz*.5),spec=Math.pow(Math.max(0,nx*half[0]+ny*half[1]+nz*half[2]),42)*.27;
   v[j]=width/2+rx*unit;v[j+1]=height/2-(ry+.035+this.lift)*unit;v[j+2]=rz;
   for(let c=0;c<3;c++)v[j+3+c]=clamp(srgb(clamp(colors[i+c]*diffuse+spec,0,1)),0,255);
  }
  for(let t=0;t<indices.length;t+=3){
   const a=indices[t]*6,b=indices[t+1]*6,c=indices[t+2]*6,ax=v[a],ay=v[a+1],bx=v[b],by=v[b+1],cx=v[c],cy=v[c+1],area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
   if(area>=-.00001)continue;
   const minX=Math.max(0,Math.floor(Math.min(ax,bx,cx))),maxX=Math.min(width-1,Math.ceil(Math.max(ax,bx,cx))),minY=Math.max(0,Math.floor(Math.min(ay,by,cy))),maxY=Math.min(height-1,Math.ceil(Math.max(ay,by,cy)));
   for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
    const px=x+.5,py=y+.5,w0=((bx-px)*(cy-py)-(by-py)*(cx-px))/area,w1=((cx-px)*(ay-py)-(cy-py)*(ax-px))/area,w2=1-w0-w1;
    if(w0<-.0001||w1<-.0001||w2<-.0001)continue;const z=w0*v[a+2]+w1*v[b+2]+w2*v[c+2],pixel=y*width+x;if(z<=this.depth[pixel])continue;this.depth[pixel]=z;const p=pixel*4;data[p]=w0*v[a+3]+w1*v[b+3]+w2*v[c+3];data[p+1]=w0*v[a+4]+w1*v[b+4]+w2*v[c+4];data[p+2]=w0*v[a+5]+w1*v[b+5]+w2*v[c+5];data[p+3]=255;
   }
  }
  this.pixelsContext.putImageData(this.raster,0,0);const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.w,this.h);c.save();c.translate(this.w/2,this.h/2+unit/this.dpr*.75);c.scale(1,.24);const radius=Math.min(this.w,this.h)*.4*(1+this.lift*.4),g=c.createRadialGradient(0,0,0,0,0,radius);g.addColorStop(0,`rgba(30,72,124,${.24-this.lift*.2})`);g.addColorStop(.5,'#25588b18');g.addColorStop(1,'#25588b00');c.fillStyle=g;c.beginPath();c.arc(0,0,radius,0,TAU);c.fill();c.restore();c.drawImage(this.pixelsCanvas,0,0,this.w,this.h);
 }
 dispose(){this.cancel();this.ro.disconnect();this.renderer?.dispose();this.geometry.dispose();this.mesh.material.dispose();this.shadow.geometry.dispose();this.shadow.material.map.dispose();this.shadow.material.dispose();this.canvas.remove();}
}
