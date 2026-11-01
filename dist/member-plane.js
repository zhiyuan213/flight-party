import * as T from './vendor/three.module.min.js';
// Dedicated showroom geometry. This does not replace the calibrated board renderer.
export function makeMemberPlane(style='sapphire'){
 const scheme={sapphire:[0x2268e8,0xe7f4ff],gold:[0xf1b72e,0xfff1b1],night:[0x443391,0xb5b9ff]}[style]||[0x2268e8,0xe7f4ff];
 const paint=new T.MeshStandardMaterial({color:scheme[0],roughness:.23,metalness:.32}),trim=new T.MeshStandardMaterial({color:scheme[1],roughness:.22,metalness:.48}),white=new T.MeshStandardMaterial({color:0xf7fbff,roughness:.25}),dark=new T.MeshStandardMaterial({color:0x15294e,roughness:.3}),glass=new T.MeshStandardMaterial({color:0x86d9fa,roughness:.13,metalness:.27}),rubber=new T.MeshStandardMaterial({color:0x182536,roughness:.8});
 const root=new T.Group(),body=new T.Group();root.add(body);
 const ellipsoid=(x,y,z,sx,sy,sz,material)=>{const m=new T.Mesh(new T.SphereGeometry(1,48,32),material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);body.add(m);return m;};
 ellipsoid(0,.39,.03,.28,.29,.59,paint);ellipsoid(0,.30,-.27,.255,.19,.29,white);
 ellipsoid(0,.59,-.055,.226,.157,.29,paint);ellipsoid(0,.60,-.125,.207,.113,.24,glass);
 // Swept, rounded solid wings with raised decorative inlays.
 const wing=(sign)=>{const outline=new T.Shape();outline.moveTo(sign*.12,-.19);outline.lineTo(sign*.73,.0);outline.quadraticCurveTo(sign*.86,.09,sign*.73,.23);outline.lineTo(sign*.13,.16);outline.closePath();const geo=new T.ExtrudeGeometry(outline,{depth:.065,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3,curveSegments:12});geo.rotateX(-Math.PI/2);const mesh=new T.Mesh(geo,paint);mesh.position.y=.31;body.add(mesh);const band=ellipsoid(sign*.61,.385,-.075,.048,.012,.14,trim);band.rotation.y=sign*.32;};wing(-1);wing(1);
 ellipsoid(0,.46,.43,.40,.045,.145,paint);ellipsoid(0,.64,.43,.044,.26,.18,paint);ellipsoid(0,.76,.44,.048,.026,.07,trim);
 // Expressive eyes follow the rounded nose instead of protruding as separate balls.
 for(const sign of [-1,1]){ellipsoid(sign*.108,.485,-.46,.108,.115,.055,white);ellipsoid(sign*.108+.012,.485,-.508,.043,.064,.015,dark);ellipsoid(sign*.108+.003,.512,-.522,.014,.019,.006,white);}
 const smile=new T.Mesh(new T.TorusGeometry(.072,.011,8,32,Math.PI),dark);smile.rotation.z=Math.PI;smile.position.set(0,.262,-.553);body.add(smile);
 const propeller=new T.Group();propeller.position.set(0,.335,-.61);body.add(propeller);
 for(let i=0;i<3;i++){const blade=new T.Mesh(new T.SphereGeometry(1,24,16),paint);blade.scale.set(.045,.20,.018);blade.position.set(Math.sin(i*Math.PI*2/3)*.15,Math.cos(i*Math.PI*2/3)*.15,0);blade.rotation.z=-i*Math.PI*2/3;propeller.add(blade);}
 ellipsoid(0,.335,-.645,.065,.065,.045,new T.MeshStandardMaterial({color:0xffda48,metalness:.5,roughness:.2}));
 for(const x of [-.21,.21]){const wheel=new T.Mesh(new T.CylinderGeometry(.09,.09,.065,32),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.095,.02);body.add(wheel);const cap=new T.Mesh(new T.CylinderGeometry(.043,.043,.072,32),trim);cap.rotation.z=Math.PI/2;cap.position.copy(wheel.position);body.add(cap);}
 root.userData={body,propeller};return root;
}
