import * as T from './vendor/three.module.min.js';
import {makePlane} from './scene.js';
import {drawPropeller,propellerAngle} from './propeller.js';
export class HeroPlane {
 constructor(parent,{reduced=false}={}){
  this.wrap=document.createElement('div');this.wrap.className='hero-plane-model';this.wrap.setAttribute('role','img');this.wrap.setAttribute('aria-label','3D airplane with a spinning propeller');parent.prepend(this.wrap);parent.classList.add('hero-model-ready');this.reduced=reduced;this.active=true;this.frame=this.frame.bind(this);
  try{
   this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;this.wrap.append(this.renderer.domElement);
   this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(31,1,.1,20);this.camera.position.set(1.30,.95,-1.55);this.camera.lookAt(0,.35,0);
   this.scene.add(new T.HemisphereLight(0xe5f7ff,0x7295bd,1.9));this.scene.add(new T.AmbientLight(0xffffff,.5));const key=new T.DirectionalLight(0xffffff,3.0);key.position.set(-3,6,-4);this.scene.add(key);const rim=new T.DirectionalLight(0xc1dcff,2);rim.position.set(3,1,3);this.scene.add(rim);
   this.model=makePlane(0);this.model.rotation.z=-.12;this.scene.add(this.model);this.wrap.dataset.heroRenderer='webgl';
  }catch(error){this.renderer?.dispose();this.renderer=null;this.wrap.replaceChildren();this.canvas=document.createElement('canvas');this.wrap.append(this.canvas);this.context=this.canvas.getContext('2d');this.image=new Image();this.image.onload=()=>this.render(performance.now());this.image.src='assets/plane-blue-body.png';this.wrap.dataset.heroRenderer='illustrated-fallback';}
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.wrap);document.addEventListener('visibilitychange',()=>this.schedule());this.resize();this.schedule();
 }
 resize(){const w=this.wrap.clientWidth,h=this.wrap.clientHeight;if(!w||!h)return;this.w=w;this.h=h;if(this.renderer){this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}else{this.canvas.width=w*2;this.canvas.height=h*2;this.context.setTransform(2,0,0,2,0,0);}this.render(performance.now());}
 setReduced(value){this.reduced=value;this.schedule();this.render(performance.now());}
 setActive(value){this.active=value;this.schedule();}
 schedule(){if(this.raf){cancelAnimationFrame(this.raf);this.raf=null;}if(this.active&&!this.reduced&&!document.hidden)this.raf=requestAnimationFrame(this.frame);}
 frame(now){this.raf=null;if(!this.active||document.hidden)return;this.render(now);if(!this.reduced)this.raf=requestAnimationFrame(this.frame);}
 render(now){if(!this.w||!this.h)return;this.wrap.dataset.propellerAngle=String(propellerAngle(now,this.reduced));
  if(this.renderer){this.model.userData.propeller.rotation.z=propellerAngle(now,this.reduced);this.renderer.render(this.scene,this.camera);}
  else if(this.image?.complete&&this.image.naturalWidth){const c=this.context;c.clearRect(0,0,this.w,this.h);const width=this.w*.95,height=width*this.image.naturalHeight/this.image.naturalWidth;c.save();c.translate(this.w/2,this.h*.94);c.drawImage(this.image,-width/2,-height*.91,width,height);drawPropeller(c,width,height,now,'#3487ec',this.reduced);c.restore();}
 }
}
