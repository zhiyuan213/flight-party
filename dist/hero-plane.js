import {VIP_PLANE_ASSET,VIP_PROPELLER_COLOR} from './plane-skin.js';
import {drawPropeller,propellerAngle} from './propeller.js';

// Homepage and hangar share the same authored 2D artwork used by live pieces.
export class HeroPlane {
 constructor(parent,{reduced=false,style='classic'}={}){
  this.wrap=document.createElement('div');this.wrap.className='hero-plane-model';this.wrap.setAttribute('role','img');this.wrap.setAttribute('aria-label','Airplane with a gently spinning propeller');parent.prepend(this.wrap);parent.classList.add('hero-model-ready');this.reduced=reduced;this.active=true;this.frame=this.frame.bind(this);this.style=style==='gold2d'?'gold2d':'classic';
  this.canvas=document.createElement('canvas');this.wrap.append(this.canvas);this.context=this.canvas.getContext('2d');this.image=new Image();this.image.onload=()=>this.render(performance.now());this.image.onerror=()=>{if(this.style==='gold2d'){this.style='classic';this.image.src='assets/plane-blue-body.png';}};this.image.src=this.style==='gold2d'?VIP_PLANE_ASSET:'assets/plane-blue-body.png';this.wrap.dataset.heroRenderer='illustrated-animated';
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.wrap);this.onVisibility=()=>this.schedule();document.addEventListener('visibilitychange',this.onVisibility);this.resize();this.schedule();
 }
 dispose(){this.disposed=true;this.active=false;this.schedule();this.observer.disconnect();document.removeEventListener('visibilitychange',this.onVisibility);this.wrap.remove();}
 resize(){const w=this.wrap.clientWidth,h=this.wrap.clientHeight;if(!w||!h)return;this.w=w;this.h=h;this.canvas.width=w*2;this.canvas.height=h*2;this.context.setTransform(2,0,0,2,0,0);this.render(performance.now());}
 setReduced(value){this.reduced=value;this.schedule();this.render(performance.now());}
 setActive(value){this.active=value;this.schedule();if(value)this.render(performance.now());}
 schedule(){if(this.raf){cancelAnimationFrame(this.raf);this.raf=null;}if(!this.disposed&&this.active&&!this.reduced&&!document.hidden)this.raf=requestAnimationFrame(this.frame);}
 frame(now){this.raf=null;if(this.disposed||!this.active||document.hidden)return;this.render(now);if(!this.reduced)this.raf=requestAnimationFrame(this.frame);}
 render(now){
  if(this.disposed||!this.w||!this.h)return;this.wrap.dataset.propellerAngle=String(propellerAngle(now,this.reduced));
  if(this.image?.complete&&this.image.naturalWidth){const c=this.context;c.clearRect(0,0,this.w,this.h);const width=Math.min(this.w*.96,this.h*.96*this.image.naturalWidth/this.image.naturalHeight),height=width*this.image.naturalHeight/this.image.naturalWidth;c.save();c.translate(this.w/2,(this.h-height)/2+height*.91);c.drawImage(this.image,-width/2,-height*.91,width,height);drawPropeller(c,width,height,now,this.style==='gold2d'?VIP_PROPELLER_COLOR:'#3487ec',this.reduced);c.restore();}
 }
}
