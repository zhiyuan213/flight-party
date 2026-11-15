// Material-only collections shared by canvas and the reproducible shop art.
// The default artwork never enters these paths. No geometry or rules live here.
export const BILLIARD_MATERIALS = {
  neon: {
    name:'冰川碳纤',surface:'carbon',wood:'#182933',cloth:'#142a5e',rim:'#b9d9e7',
    metal:['#405866','#d9f1fa','#90afbd','#e6f6fb','#506c7b'],
    patch:'#eff7f7',ink:'#153343',stripe:'#edf4f4',engraving:'#d6f4ff',
    shaft:['#17252e','#586f7b','#b5c7cb','#3d5059','#15232b'],
    grip:['#07141d','#253d48','#0d202a'],inlay:'#86dcf0',
    frame:['#344b57','#21343e','#1a2b34','#101d25']
  },
  jade: {
    name:'胡桃典藏',surface:'walnut',wood:'#67412c',cloth:'#12452f',rim:'#c4a267',
    metal:['#62431f','#efd8a0','#bb9250','#f8e6b5','#785526'],
    patch:'#fff3db',ink:'#3d2818',stripe:'#fbf1dd',engraving:'#f3d695',
    shaft:['#6f4729','#c58d4f','#edcc91','#aa723c','#634124'],
    grip:['#102f28','#2b5747','#0c241f'],inlay:'#d9bc7d',
    frame:['#9e6d46','#775034','#68412b','#462c20']
  },
  aurora: {
    name:'黑曜鎏金',surface:'obsidian',wood:'#24212c',cloth:'#2c1852',rim:'#d3b679',
    metal:['#66502c','#f9e5af','#c6a564','#fff0c2','#725936'],
    patch:'#fff5df',ink:'#302136',stripe:'#f6f0e7',engraving:'#e5c4ef',
    shaft:['#17141d','#49404f','#948393','#352c3e','#100e17'],
    grip:['#140f21','#3e2b53','#160f25'],inlay:'#d1ac6b',
    frame:['#51414f','#302a38','#27212e','#15111e']
  },
  crystal: {
    name:'冰晶玻璃',surface:'crystal',wood:'#b9d2dd',cloth:'#9fd4e6',rim:'#e6f8ff',
    metal:['#7fa8bc','#f2fbff','#b9d6e2','#ffffff','#5f8ba0'],
    patch:'#f4fcff',ink:'#0e3d55',stripe:'#eefaff',engraving:'#dff6ff',
    shaft:['#9cc6d8','#eaf9ff','#ffffff','#b9dbea','#7ba8bc'],
    grip:['#123a4e','#3f7894','#0c2c3d'],inlay:'#aee6f5',
    frame:['#c3dbe6','#94bccb','#82aaba','#5c8396']
  },
  galaxy: {
    name:'星云星河',surface:'galaxy',wood:'#1a1a3a',cloth:'#1d1454',rim:'#9f8bff',
    metal:['#4a3a7a','#cdb8ff','#8a74c9','#e8dcff','#3a2c66'],
    patch:'#f6f1ff',ink:'#241a52',stripe:'#efeaff',engraving:'#c9b3ff',
    shaft:['#14112e','#4a3d7a','#8f7fd0','#383063','#0e0b22'],
    grip:['#0c0920','#322a5e','#080619'],inlay:'#c3a9ff',
    frame:['#4a3a7a','#322a5e','#282047','#161230']
  }
};

// The caller supplies the EXISTING frame boundary. Cloth and pocket layers
// are painted afterwards, so decoration cannot close a pocket entrance.
export function paintFrameFinish(ctx,box,skin){
  if(!skin?.surface)return;
  const {x,y,w,h,r}=box;
  ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip();
  if(skin.surface==='carbon'){
    ctx.lineWidth=2.2;
    for(let p=-h;p<w+h;p+=9){
      ctx.strokeStyle='#8ab4c21a';ctx.beginPath();ctx.moveTo(x+p,y);ctx.lineTo(x+p+h,y+h);ctx.stroke();
      ctx.strokeStyle='#020b1536';ctx.beginPath();ctx.moveTo(x+p+3,y);ctx.lineTo(x+p-h+3,y+h);ctx.stroke();
    }
  }else if(skin.surface==='walnut'){
    for(let i=0;i<h/2;i++){
      const yy=y+i*2;ctx.lineWidth=i%7===0?1.9:.55;ctx.strokeStyle=i%3?'#1e100e1c':'#f1bd7a18';
      ctx.beginPath();ctx.moveTo(x,yy);ctx.bezierCurveTo(x+w*.28,yy+Math.sin(i*.32)*13,x+w*.68,yy-Math.cos(i*.21)*9,x+w,yy+Math.sin(i*.1)*8);ctx.stroke();
    }
  }else if(skin.surface==='crystal'){
    for(let i=0;i<w+h;i+=12){
      ctx.strokeStyle='#ffffff2e';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(x+i,y);ctx.lineTo(x+i-h*.6,y+h);ctx.stroke();
      ctx.strokeStyle='#7fa8bc1c';ctx.lineWidth=.7;
      ctx.beginPath();ctx.moveTo(x+i+4,y);ctx.lineTo(x+i-h*.6+4,y+h);ctx.stroke();
    }
  }else if(skin.surface==='galaxy'){
    for(let i=0;i<110;i++){
      const sx=x+((i*37)%w),sy=y+((i*53)%h),bright=i%9===0;
      ctx.fillStyle=bright?'#efe6ff':'#ffffff';ctx.globalAlpha=bright?.55:.16;
      ctx.beginPath();ctx.arc(sx,sy,bright?1:.6,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;ctx.strokeStyle='#8a74c91f';ctx.lineWidth=1.3;
    for(let i=0;i<6;i++){
      ctx.beginPath();ctx.moveTo(x,y+i*h/5);
      ctx.bezierCurveTo(x+w*.3,y+i*h/5-20,x+w*.6,y+i*h/5+22,x+w,y+i*h/5-4);ctx.stroke();
    }
  }else{
    for(let i=0;i<18;i++){
      const yy=y+i*h/17;ctx.strokeStyle=i%4?'#b197ba12':'#e6ca9125';ctx.lineWidth=i%4?.7:1.15;
      ctx.beginPath();ctx.moveTo(x,yy);ctx.bezierCurveTo(x+w*.27,yy+24*Math.sin(i),x+w*.53,yy-40,x+w,yy+30*Math.cos(i));ctx.stroke();
    }
  }
  ctx.strokeStyle=skin.rim;ctx.globalAlpha=.52;ctx.lineWidth=1.15;
  ctx.beginPath();ctx.roundRect(x+10,y+10,w-20,h-20,Math.max(2,r-10));ctx.stroke();ctx.restore();
}

// Engraving rotates with the sphere and sits below the number and lighting.
export function paintSphereFinish(ctx,r,project,skin,id,plain){
  if(!skin?.surface||id===0)return;
  ctx.save();ctx.strokeStyle=skin.engraving;ctx.lineWidth=Math.max(.32,r*.022);ctx.globalAlpha=plain?.11:.22;
  const signature=skin.marks?skin.marks(id,plain):id;
  const latitudes=skin.surface==='carbon'?[-.77,-.66,.66,.77]:skin.surface==='walnut'?[-.72,.72]:skin.surface==='crystal'?[-.86,-.7,-.42,.42,.7,.86]:[-.78,-.61,.61,.78];
  for(const latitude of latitudes){
    let connected=false;ctx.beginPath();
    for(let k=0;k<=96;k++){
      const a=k/96*Math.PI*2,rr=Math.sqrt(1-latitude*latitude),p=project(rr*Math.sin(a),latitude,rr*Math.cos(a));
      if(p[2]<=0){connected=false;continue;}
      if(connected)ctx.lineTo(p[0]*r,p[1]*r);else ctx.moveTo(p[0]*r,p[1]*r);connected=true;
    }ctx.stroke();
  }
  if(skin.surface==='obsidian')for(let k=0;k<6;k++){
    const a=k*Math.PI/3+signature*.09,p=project(Math.sin(a)*.78,Math.cos(a)*.78,.625);
    if(p[2]>.1){ctx.beginPath();ctx.moveTo(p[0]*r-r*.03,p[1]*r);ctx.lineTo(p[0]*r,p[1]*r-r*.05);ctx.lineTo(p[0]*r+r*.03,p[1]*r);ctx.stroke();}
  }
  if(skin.surface==='crystal')for(let k=0;k<8;k++){
    /* Cut-glass facet arcs: a handful of shallow diagonal edges. */
    const a=k*Math.PI/4+signature*.03;ctx.beginPath();
    for(let t=-.78;t<=.78;t+=.06){
      const lon=a+t*.5,lat=t*1.12,rr2=Math.sqrt(Math.max(0,1-lat*lat)),p=project(rr2*Math.sin(lon),lat,rr2*Math.cos(lon));
      if(p[2]<=0){ctx.moveTo(p[0]*r,p[1]*r);continue;}
      ctx.lineTo(p[0]*r,p[1]*r);
    }ctx.stroke();
  }
  if(skin.surface==='galaxy'){
    for(let k=0;k<16;k++){
      const a=(k*137.5)%360*Math.PI/180,lat=Math.sin(k*2.3)*.82,rr2=Math.sqrt(1-lat*lat),p=project(rr2*Math.sin(a),lat,rr2*Math.cos(a));
      if(p[2]>.12){ctx.fillStyle=k%4===0?'#efe6ff':'#cdb8ff';ctx.beginPath();ctx.arc(p[0]*r,p[1]*r,(k%4===0?.05:.03)*r,0,Math.PI*2);ctx.fill();}
    }
    ctx.strokeStyle='#8a74c955';ctx.lineWidth=Math.max(.26,r*.014);
    ctx.beginPath();
    for(let t=-.9;t<=.9;t+=.05){
      const lon=t*2.4+signature*.05,lat=t;
      const rr2=Math.sqrt(Math.max(0,1-lat*lat)),p=project(rr2*Math.sin(lon),lat,rr2*Math.cos(lon));
      if(p[2]<=0){ctx.moveTo(p[0]*r,p[1]*r);continue;}
      ctx.lineTo(p[0]*r,p[1]*r);
    }ctx.stroke();
  }
  ctx.restore();
}
