import * as T from './vendor/three.module.min.js';
// Hand-authored meshes. Nose is -Z. Pure geometry/DataTextures support Node GLB export.
const TAU=Math.PI*2,textureCache=new Map();
const physical=(color,metalness=.12,roughness=.3)=>new T.MeshPhysicalMaterial({color,metalness,roughness,clearcoat:.8,clearcoatRoughness:.2});
function texture(key,paint,w=256,h=128){
 if(textureCache.has(key))return textureCache.get(key);
 const data=new Uint8Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)data.set(paint(x/(w-1),y/(h-1)),(y*w+x)*4);
 const map=new T.DataTexture(data,w,h,T.RGBAFormat);map.colorSpace=T.SRGBColorSpace;map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;textureCache.set(key,map);return map;
}
function faceTexture(iris){return texture('eyes-'+iris,(u,v)=>{
 const x=u*2-1,y=v*2-1,mask=(x/.99)**2+(y/.98)**2;if(mask>1)return[0,0,0,0];let color=mask<.89?[139,199,227,255]:[34,63,104,255];
 for(const eye of [-.46,.46]){if(Math.pow(Math.abs((x-eye)/.43),4)+Math.pow(Math.abs((y+.025)/.79),4)<1)color=[252,252,245,255];
  if(((x-eye-.055)/.15)**2+((y+.04)/.49)**2<1)color=iris==='gold'?[112,61,20,255]:iris==='night'?[85,51,143,255]:[25,108,159,255];
  if(((x-eye-.055)/.093)**2+((y+.04)/.37)**2<1)color=[11,21,36,255];
  if(((x-eye+.005)/.052)**2+((y-.22)/.13)**2<1)color=[255,255,255,255];
 }return color;
},512,256);}
function emblem(kind){return texture('emblem-'+kind,(u,v)=>{
 const x=(u-.5)*2,y=(v-.5)*2;let inside=false;
 if(kind==='cloud')inside=x*x/.67+y*y/.20<1||(x+.37)**2+(y+.01)**2<.13||(x-.2)**2+(y-.23)**2<.18;
 else{const a=((Math.atan2(y,x)-Math.PI/2)%(TAU/5)+TAU/5)%(TAU/5);inside=Math.hypot(x,y)<.36+.43*Math.abs(a-Math.PI/5)/(Math.PI/5);if(kind==='wings')inside||=Math.abs(y)<.11&&Math.abs(x)<.96||Math.abs(y+.23)<.07&&Math.abs(x)<.78;}
 return inside?(kind==='cloud'?[244,253,255,255]:kind==='wings'?[250,207,102,255]:[221,227,249,255]):[0,0,0,0];
},128,128);}
function mesh(parent,name,geometry,material){const m=new T.Mesh(geometry,material);m.name=name;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function ellipsoid(parent,name,p,size,material){const m=mesh(parent,name,new T.SphereGeometry(1,32,20),material);m.position.set(...p);m.scale.set(...size);return m;}
function rod(parent,name,a,b,r,material){const d=new T.Vector3(...b).sub(new T.Vector3(...a)),m=mesh(parent,name,new T.CylinderGeometry(r,r,d.length(),10),material);m.position.copy(new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return m;}
function line(parent,name,points,r,material){return mesh(parent,name,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(12,points.length*3),r,5,false),material);}
function sample(sections,z){
 let i=0;while(i<sections.length-2&&z>sections[i+1][0])i++;const a=sections[i],b=sections[i+1],l=sections[Math.max(0,i-1)],r=sections[Math.min(sections.length-1,i+2)],d=b[0]-a[0],t=T.MathUtils.clamp((z-a[0])/d,0,1);
 return[1,2,3].map(k=>(2*t**3-3*t*t+1)*a[k]+(t**3-2*t*t+t)*d*(b[k]-l[k])/(b[0]-l[0])+(-2*t**3+3*t*t)*b[k]+(t**3-t*t)*d*(r[k]-a[k])/(r[0]-a[0]));
}
function hull(parent,name,sections,upper,lower=upper){
 const p=[],uv=[],top=[],bottom=[],nr=48,nz=64;
 for(let j=0;j<=nz;j++){const z=T.MathUtils.lerp(sections[0][0],sections.at(-1)[0],j/nz),[w,h,cy]=sample(sections,z);for(let i=0;i<=nr;i++){const a=i/nr*TAU;p.push(Math.cos(a)*Math.max(.001,w),cy+Math.sin(a)*Math.max(.001,h),z);uv.push(i/nr,j/nz);}}
 for(let j=0;j<nz;j++)for(let i=0;i<nr;i++){const a=j*(nr+1)+i,b=a+nr+1,out=Math.sin((i+.5)/nr*TAU)<-.18?bottom:top;out.push(a,a+1,b,b,a+1,b+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex([...top,...bottom]);g.addGroup(0,top.length,0);g.addGroup(top.length,bottom.length,1);g.computeVertexNormals();return mesh(parent,name,g,[upper,lower]);
}
function ring(parent,name,sections,z,material,r=.005){const[w,h,cy]=sample(sections,z),p=[];for(let i=0;i<=48;i++){const a=i/48*TAU;p.push([Math.cos(a)*(w+.003),cy+Math.sin(a)*(h+.003),z]);}line(parent,name,p,r,material);}
function wingPoint(t,q,side,{span,chord,sweep=0,dihedral=0,y=0,z=0,thickness=.13}){
 const tip=t<.85?1:Math.sqrt(Math.max(.001,1-((t-.85)/.15)**2)),c=chord*(1-.33*t)*tip,air=5*thickness*c*(.2969*Math.sqrt(q)-.126*q-.3516*q*q+.2843*q**3-.1036*q**4);
 return[t*span,y+t*dihedral+side*air+.025*c*Math.sin(q*Math.PI),z+sweep*t+(q-.33)*c];
}
function wing(parent,name,options,paint,trim){
 const group=new T.Group();group.name=name;parent.add(group);
 for(const sign of [-1,1]){const p=[],uv=[],idx=[[],[]],ns=30,nc=32;
  for(let j=0;j<=ns;j++)for(let k=0;k<=nc;k++){const a=k/nc*TAU,q=(1-Math.cos(a))/2,v=wingPoint(j/ns,q,Math.sin(a)>=0?1:-1,options);p.push(v[0]*sign,v[1],v[2]);uv.push(j/ns,k/nc);}
  for(let j=0;j<ns;j++)for(let k=0;k<nc;k++){const a=j*(nc+1)+k,b=a+nc+1;idx[j/ns>.71&&j/ns<.83?1:0].push(...(sign===1?[a,a+1,b,b,a+1,b+1]:[a,b,a+1,b,b+1,a+1]));}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex([...idx[0],...idx[1]]);g.addGroup(0,idx[0].length,0);g.addGroup(idx[0].length,idx[1].length,1);g.computeVertexNormals();mesh(group,name+(sign<0?'-L':'-R'),g,[paint,trim]);
 }return group;
}
function fin(parent,name,x,y,z,height,chord,paint,trim){const g=wing(parent,name,{span:height,chord,sweep:.20,thickness:.14},paint,trim);const unused=g.children[0];g.remove(unused);unused.geometry.dispose();g.rotation.z=Math.PI/2;g.position.set(x,y,z);return g;}
function decal(parent,name,kind,p,size,rotation=0){const material=new T.MeshStandardMaterial({map:emblem(kind),transparent:true,roughness:.4,metalness:.25,depthWrite:false,side:T.DoubleSide}),m=mesh(parent,name,new T.PlaneGeometry(size,size),material);m.position.set(...p);m.rotation.y=rotation;return m;}
function surfaceZ(surfaces,x,y){
 const hits=[];for(const sections of surfaces){let front=sections[0][0],back=sections[2][0];const inside=z=>{const[w,h,cy]=sample(sections,z);return(x/Math.max(.001,w))**2+((y-cy)/Math.max(.001,h))**2<=1;};let found=false;for(let n=1;n<=48;n++){const z=T.MathUtils.lerp(sections[0][0],sections[2][0],n/48);if(inside(z)){back=z;found=true;break;}front=z;}if(found){for(let n=0;n<14;n++){const z=(front+back)/2;if(inside(z))back=z;else front=z;}hits.push(back);}}
 return hits.length?Math.min(...hits)-.012:surfaces[0][2][0]-.012;
}
function surfacePatch(parent,name,surfaces,map,{width,height,y},materialOptions={},smooth=false){
 const p=[],uv=[],idx=[],nx=40,ny=20;let front=0;const curve=(u,v)=>.15*((u-.5)*2)**2+.04*((v-.5)*2)**2;
 if(smooth){front=Infinity;for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const u=i/nx,v=j/ny;if(((u-.5)*2)**2+((v-.5)*2)**2<1)front=Math.min(front,surfaceZ(surfaces,(u-.5)*width,y+(v-.5)*height)-curve(u,v));}}
 for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const u=i/nx,v=j/ny,x=(u-.5)*width,yy=y+(v-.5)*height;p.push(x,yy,smooth?front+curve(u,v):surfaceZ(surfaces,x,yy));uv.push(u,v);}
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+nx+1;idx.push(a,b,a+1,b,b+1,a+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return mesh(parent,name,g,new T.MeshPhysicalMaterial({map,transparent:true,side:T.DoubleSide,roughness:.55,metalness:0,clearcoat:.15,depthWrite:false,...materialOptions}));
}
function windshield(parent,style,surfaces,shape,paint){
 const face=surfacePatch(parent,'Integrated windshield eyes',surfaces,faceTexture(style),shape,{clearcoat:.05,roughness:.7},true),positions=face.geometry.attributes.position,front=positions.getZ(10*41+20),p=[],idx=[];
 for(let ring=0;ring<2;ring++)for(let i=0;i<=64;i++){const a=i/64*TAU,u=.99*Math.cos(a),v=.98*Math.sin(a),x=u*shape.width/2,y=shape.y+v*shape.height/2,z=ring?surfaceZ(surfaces,x,y)+.05:front+.15*u*u+.04*v*v;p.push(x,y,z);}
 for(let i=0;i<64;i++)idx.push(i,i+65,i+1,i+1,i+65,i+66);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();const material=paint.clone();material.side=T.DoubleSide;mesh(parent,'Sculpted windshield surround',g,material);
}
function smile(parent,sections,y){const map=texture('painted-smile',(u,v)=>{const x=u*2-1,yy=v*2-1;return Math.abs(x)<.94&&Math.abs(yy-(-.30+.65*x*x))<.18?[31,32,45,255]:[0,0,0,0];},128,64);surfacePatch(parent,'Painted smile',[sections],map,{width:.23,height:.075,y});}

function propeller(parent,name,x,y,z,r,paint,trim,spinner,propellers){
 const pivot=new T.Group();pivot.name=name;pivot.position.set(x,y,z);pivot.userData.animation='rotation.z';parent.add(pivot);
 for(let i=0;i<3;i++){const blade=new T.Group();blade.rotation.z=i*TAU/3;pivot.add(blade);const s=new T.Shape();s.moveTo(-r*.08,r*.12);s.bezierCurveTo(-r*.30,r*.45,-r*.21,r*.94,-r*.03,r);s.bezierCurveTo(r*.16,r*.99,r*.20,r*.60,r*.075,r*.12);s.closePath();mesh(blade,'Sculpted blade '+(i+1),new T.ExtrudeGeometry(s,{depth:r*.075,bevelEnabled:true,bevelThickness:r*.025,bevelSize:r*.025,bevelSegments:2,curveSegments:10}),paint);ellipsoid(blade,'Blade tip inlay',[0,r*.88,r*.05],[r*.10,r*.065,r*.055],trim);}
 ellipsoid(parent,name+' spinner',[x,y,z-.04],[r*.29,r*.29,r*.42],spinner);propellers.push(pivot);return pivot;
}
function landingGear(parent,paint,trim,rubber,{z=-.4,x=.35}={}){
 for(const sign of [-1,1]){rod(parent,'Main gear strut',[sign*x*.75,.48,z+.08],[sign*x,.19,z],.035,trim);const tire=mesh(parent,'Rubber tire',new T.CylinderGeometry(.14,.14,.115,32),rubber);tire.rotation.z=Math.PI/2;tire.position.set(sign*x,.14,z);const hub=mesh(parent,'Machined wheel hub',new T.CylinderGeometry(.075,.075,.119,24),trim);hub.rotation.z=Math.PI/2;hub.position.copy(tire.position);ellipsoid(parent,'Wheel fairing',[sign*x,.24,z-.015],[.115,.12,.235],paint);}
 ellipsoid(parent,'Tail wheel',[0,.10,.95],[.04,.07,.07],rubber);rod(parent,'Tail wheel fork',[0,.28,.91],[0,.13,.95],.018,trim);
}
function rivets(parent,sections,material){const points=[];for(const z of [-.56,-.18,.22,.55,.82]){const[w,h,cy]=sample(sections,z);for(let i=0;i<16;i++){const a=i/16*TAU;points.push([Math.cos(a)*(w+.007),cy+Math.sin(a)*(h+.007),z]);}}const m=new T.InstancedMesh(new T.SphereGeometry(.008,6,4),material,points.length),matrix=new T.Matrix4();points.forEach((p,i)=>{matrix.makeTranslation(...p);m.setMatrixAt(i,matrix);});m.name='Inset rivet rows';parent.add(m);}
export function makeMemberPlane(style='gold'){
 if(!['gold','sapphire','night'].includes(style))style='gold';
 const root=new T.Group(),body=new T.Group(),propellers=[];root.name={gold:'Golden Captain — biplane',sapphire:'Cloud Voyager — twin-engine floatplane',night:'Starlight Racer — swept-wing sport plane'}[style];body.name='Aircraft assembly';root.add(body);
 const color={gold:0xe0a132,sapphire:0x338fd1,night:0x252865}[style],paint=physical(color,style==='gold'?.50:.32,.29),trim=physical(style==='gold'?0xffe1a0:0xc6d4e9,.72,.25),ivory=physical(0xf3f1e7,.05,.38),navy=physical(0x172d50,.18,.35),rubber=physical(0x17202b,0,.85),seam=new T.MeshStandardMaterial({color:style==='gold'?0x9b7433:style==='night'?0x5f65a5:0x39779e,roughness:.6}),silver=physical(0xf0d27c,.65,.25),gold=style==='gold',cloud=style==='sapphire',cy=cloud?.76:.66;
 const sections=cloud?[[-1.02,.01,.02,cy],[-.88,.26,.20,cy],[-.62,.40,.33,cy],[-.20,.42,.34,cy],[.35,.34,.29,cy],[.78,.22,.22,cy],[1.12,.10,.13,cy+.04],[1.32,.01,.02,cy+.09]]:gold?[[-1.04,.02,.03,cy],[-.97,.29,.26,cy],[-.65,.36,.30,cy],[-.24,.39,.31,cy],[.25,.30,.26,cy],[.72,.19,.18,cy+.06],[1.08,.085,.10,cy+.12],[1.22,.01,.01,cy+.14]]:[[-1.10,.025,.025,cy],[-.95,.22,.21,cy],[-.58,.32,.28,cy],[-.08,.35,.28,cy],[.35,.27,.23,cy],[.85,.16,.14,cy+.04],[1.22,.08,.08,cy+.11],[1.38,.01,.01,cy+.12]];
 hull(body,'Sculpted fuselage',sections,paint,ivory);const cabin=[[-.92,.01,.01,.94],[-.61,cloud?.34:.32,.18,.97],[-.13,cloud?.35:.33,.19,.97],[.23,.25,.13,.97],[.55,.03,.02,.95]];if(cloud)cabin.forEach(section=>section[3]+=.10);hull(body,'Rounded cockpit shell',cabin,paint);
 windshield(body,style,[cabin],{width:cloud?.68:.63,height:cloud?.29:.28,y:cloud?1.11:1.02},paint);
 for(const z of [-.62,-.18,.22,.72])ring(body,'Fuselage panel join',sections,z,seam,.0045);rivets(body,sections,trim);
 smile(body,sections,cy-.13);
 if(gold){
  wing(body,'Upper biplane airfoil',{span:1.48,chord:.76,thickness:.18,y:1.32,z:-.12,dihedral:.03},paint,ivory);wing(body,'Lower biplane airfoil',{span:1.28,chord:.70,thickness:.18,y:.48,z:-.06,dihedral:.05},paint,ivory);
  for(const sign of [-1,1])for(const z of [-.24,.21]){rod(body,'Interplane strut',[sign*.91,.53,z],[sign*.98,1.32,z-.06],.022,trim);rod(body,'Cabane strut',[sign*.22,.98,z+.05],[sign*.34,1.32,z],.018,trim);}
  wing(body,'Tailplane',{span:.53,chord:.42,y:.87,z:.95,dihedral:.025},paint,ivory);fin(body,'Rounded vintage tail',0,.85,.98,.57,.48,paint,ivory);landingGear(body,paint,trim,rubber,{x:.38,z:-.48});
  for(const sign of [-1,1])decal(body,'Gold aviation insignia','wings',[sign*.400,.72,-.16],.30,sign*Math.PI/2);
  propeller(body,'Nose propeller',0,cy,-1.09,.32,navy,trim,silver,propellers);
 }else if(cloud){
  wing(body,'High gull wing',{span:1.66,chord:.76,y:1.32,z:.04,dihedral:.12,sweep:.06},ivory,paint);
  for(const sign of [-1,1]){const nacelle=new T.Group();nacelle.position.set(sign*.72,1.24,-.40);nacelle.name='Engine nacelle '+sign;body.add(nacelle);const rings=[[-.41,.01,.01,0],[-.34,.16,.16,0],[-.10,.18,.18,0],[.19,.13,.13,0],[.38,.01,.01,0]];hull(nacelle,'Engine cowling',rings,paint,ivory);ring(nacelle,'Metal cowling rim',rings,-.29,trim,.014);propeller(body,'Wing propeller '+sign,sign*.72,1.24,-.83,.28,navy,trim,silver,propellers);
   const float=new T.Group();float.position.x=sign*.41;float.name='Sculpted float '+sign;body.add(float);hull(float,'Float hull',[[-1.08,.01,.01,.21],[-.90,.13,.095,.19],[-.45,.17,.13,.18],[.40,.15,.12,.17],[.85,.08,.07,.19],[1.04,.01,.01,.22]],ivory,paint);
   for(const z of [-.46,.49])rod(body,'Float support',[sign*.27,.50,z],[sign*.41,.28,z],.027,trim);
   for(const z of [.08,.36,.63])ellipsoid(body,'Side cabin window',[sign*(z<.4?.37:.28),.89,z],[.012,.07,.083],navy);
   decal(body,'Cloud marking','cloud',[sign*.585,.19,-.38],.23,sign*Math.PI/2);
  }wing(body,'Seaplane tailplane',{span:.63,chord:.43,y:.92,z:1.02,dihedral:.03},paint,ivory);fin(body,'Seaplane fin',0,.92,1.07,.59,.53,paint,ivory);
 }else{
  wing(body,'Swept sport airfoil',{span:1.48,chord:.88,sweep:.49,dihedral:.10,y:.49,z:-.03,thickness:.10},paint,trim);wing(body,'Rear stabilizer',{span:.62,chord:.42,sweep:.12,y:.85,z:1.08,dihedral:.04},paint,trim);
  for(const sign of [-1,1]){fin(body,'Twin swept tail '+sign,sign*.29,.83,1.07,.57,.46,paint,trim);decal(body,'Silver star insignia','star',[sign*.365,.73,-.12],.25,sign*Math.PI/2);}
  landingGear(body,paint,trim,rubber,{x:.36,z:-.42});propeller(body,'Sport nose propeller',0,cy,-1.14,.30,navy,trim,trim,propellers);
 }root.userData={body,propeller:propellers[0],propellers,style,designVersion:2};return root;
}
