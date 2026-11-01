const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
const letters=text=>segmenter?[...segmenter.segment(text)].map(part=>part.segment):Array.from(text);
export const planeMembershipGrade=owner=>owner?.type==='bot'||owner?.member!==true?'none':owner?.annualMember===true?'annual':'vip';
const gradeOf=grade=>grade==='vip'||grade==='annual'?grade:'none';
const badgeImages=new Map();
function badgeLanguage(language){const value=typeof language==='string'?language:typeof document!=='undefined'?document.documentElement?.lang:'';return /^zh(?:-|$)/i.test(value||'')?'zh':'en';}
function badgeImage(grade,language){
 if(typeof Image==='undefined')return null;
 const asset=grade==='annual'?`assets/member/annual-vip-badge${language==='zh'?'':'-en'}.svg`:'assets/member/vip-badge.svg';
 if(!badgeImages.has(asset)){try{const image=new Image();badgeImages.set(asset,image);image.src=asset;}catch{badgeImages.set(asset,null);}}
 const image=badgeImages.get(asset);return image?.complete&&image.naturalWidth>0?image:null;
}
export function planePlayerName(name,seat=0){
 const text=typeof name==='string'?name.replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/gu,' ').trim():'';
 return text||`Pilot ${seat+1}`;
}
export function fitPlaneName(text,maxWidth,measure){
 if(measure(text)<=maxWidth)return text;
 const parts=letters(text),suffix='…';let low=0,high=parts.length;
 while(low<high){const middle=Math.ceil((low+high)/2);if(measure(parts.slice(0,middle).join('')+suffix)<=maxWidth)low=middle;else high=middle-1;}
 return parts.slice(0,low).join('')+suffix;
}
const intersects=(a,b,gap)=>a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;
export function layoutPlaneNames(context,entries,{width,height,fontSize=12,maxWidth=112}={}){
 if(!(width>20&&height>20))return[];
 const inset=5,lineHeight=fontSize+9,available=width-inset*2,limit=Math.min(maxWidth,available),result=[];
 context.save();context.font=`800 ${fontSize}px Flight, sans-serif`;
 const measure=text=>context.measureText(text)?.width??letters(text).length*fontSize*.65;
 for(const entry of [...entries].sort((a,b)=>String(a.key).localeCompare(String(b.key)))){
  if(!Number.isFinite(entry.x)||!Number.isFinite(entry.y))continue;
  const grade=gradeOf(entry.grade),badgeHeight=grade==='none'?0:Math.min(18,lineHeight-1),badgeWidth=grade==='none'?0:Math.min(Math.round(badgeHeight*(grade==='annual'?3.1:90/42)),Math.max(0,available-31)),badgeExtra=badgeWidth?badgeWidth+5:0;
  // The badge extends the old capsule budget; it never steals name space on a normal viewport.
  const nameLimit=Math.max(1,Math.min(limit,available-badgeExtra)),name=planePlayerName(entry.name,entry.seat),text=fitPlaneName(name,Math.max(1,nameLimit-23),measure),nameWidth=Math.min(nameLimit,measure(text)+23),labelWidth=nameWidth+badgeExtra;
  const x=clamp(entry.x-labelWidth/2,inset,width-inset-labelWidth),preferred=clamp(entry.y-lineHeight,inset,height-inset-lineHeight);
  let rect={x,y:preferred,width:labelWidth,height:lineHeight},placed=false;
  // Stable seat/piece order plus nearest free rows keeps parked pairs and stacks legible.
  for(let row=0;row<=entries.length*2;row++){
   const step=(row<=entries.length?-row:row-entries.length)*(lineHeight+6),candidate={...rect,y:clamp(preferred+step,inset,height-inset-lineHeight)};
   if(result.every(other=>!intersects(candidate,other,3))){rect=candidate;placed=true;break;}
  }
  if(!placed){
   // Short canvases can need a second column when eight wider VIP labels share one anchor.
   const xs=[x,inset,width-inset-labelWidth,...result.flatMap(other=>[other.x-labelWidth-6,other.x+other.width+6])],ys=[preferred,inset,height-inset-lineHeight,...result.flatMap(other=>[other.y-lineHeight-6,other.y+other.height+6])];
   const candidates=xs.flatMap(left=>ys.map(top=>({x:clamp(left,inset,width-inset-labelWidth),y:clamp(top,inset,height-inset-lineHeight),width:labelWidth,height:lineHeight}))).sort((a,b)=>(a.x-x)**2+(a.y-preferred)**2-((b.x-x)**2+(b.y-preferred)**2));
   const free=candidates.find(candidate=>result.every(other=>!intersects(candidate,other,3)));if(free)rect=free;
  }
  result.push({...entry,...rect,name,text,fontSize,grade,nameWidth,badgeWidth,badgeHeight,anchorX:entry.x,anchorY:entry.y});
 }
 context.restore();return result;
}
function capsule(c,x,y,w,h){const r=h/2;c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();}
function gradient(c,x,y,w,h,stops){const fill=c.createLinearGradient?.(x,y,x+w*.15,y+h);if(!fill?.addColorStop)return stops[0][1];for(const [position,color] of stops)fill.addColorStop(position,color);return fill;}
function bevel(c,x,y,w,h){const cut=Math.min(4,h*.22);c.beginPath();c.moveTo(x+cut,y);c.lineTo(x+w-cut,y);c.lineTo(x+w,y+cut);c.lineTo(x+w,y+h-cut);c.lineTo(x+w-cut,y+h);c.lineTo(x+cut,y+h);c.lineTo(x,y+h-cut);c.lineTo(x,y+cut);c.closePath();}
function drawBadge(c,label,language){
 const {badgeWidth:w,badgeHeight:h,grade}=label;if(!w||grade==='none')return;
 const x=label.x+label.nameWidth-1,y=label.y+(label.height-h)/2,image=badgeImage(grade,language);
 // The English SVG's longer title becomes too small at nameplate scale; use crisp text.
 if(image&&!(grade==='annual'&&language!=='zh'&&h<22)){c.drawImage(image,x,y,w,h);return;}
 const annual=grade==='annual';c.save();
 bevel(c,x+.5,y+.5,w-1,h-1);c.fillStyle=gradient(c,x,y,w,h,annual?[[0,'#34435b'],[.48,'#202b43'],[.5,'#10192b'],[1,'#263149']]:[[0,'#fff1b2'],[.45,'#f4ce68'],[.5,'#dfab3c'],[1,'#edc477']]);c.fill();
 c.strokeStyle=gradient(c,x,y,w,h,annual?[[0,'#ffead8'],[.45,'#b47b66'],[1,'#e0ae94']]:[[0,'#fff7c6'],[.45,'#a77625'],[1,'#d6a246']]);c.lineWidth=1;c.stroke();
 c.beginPath();c.moveTo(x+4,y+2);c.lineTo(x+w-4,y+2);c.strokeStyle=annual?'#ffead866':'#fff9daaa';c.lineWidth=.6;c.stroke();
 const gemX=x+5.5,gemY=y+h/2,r=h*.17;c.beginPath();c.moveTo(gemX,gemY-r);c.lineTo(gemX+r*.7,gemY);c.lineTo(gemX,gemY+r);c.lineTo(gemX-r*.7,gemY);c.closePath();c.fillStyle=annual?'#efc0a6':'#fff1b7';c.fill();
 const text=annual?(language==='zh'?'年VIP':'YEAR VIP'):'VIP',textLeft=x+10,textWidth=Math.max(1,w-13);c.font=`900 ${annual&&language!=='zh'?Math.max(9,h*.52):h*.68}px Arial, sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=annual?'#f3cfb6':'#623c0d';c.fillText(text,textLeft+textWidth/2,y+h/2+.4,textWidth);c.restore();
}
export function drawPlaneNames(context,entries,options){
 const labels=layoutPlaneNames(context,entries,options),c=context,language=badgeLanguage(options?.language);
 c.save();c.textAlign='left';c.textBaseline='middle';c.lineWidth=1;
 for(const label of labels){
  const {x,y,width,height,color='#4788ec'}=label,edgeX=clamp(label.anchorX,x+height/2,x+width-height/2),edgeY=label.anchorY>=y+height/2?y+height:y;
  if(Math.abs(edgeY-label.anchorY)>5){c.strokeStyle=color+'a6';c.beginPath();c.moveTo(edgeX,edgeY);c.lineTo(label.anchorX,label.anchorY);c.stroke();}
 }
 for(const label of labels){
  const {x,y,width,height,fontSize,color='#4788ec',text}=label;
  c.shadowColor='#15376430';c.shadowBlur=3;c.shadowOffsetY=1;capsule(c,x,y,width,height);c.fillStyle='#fafdfff0';c.fill();c.shadowBlur=0;c.shadowOffsetY=0;c.strokeStyle=color+'b0';c.stroke();
  c.beginPath();c.arc(x+9,y+height/2,3,0,Math.PI*2);c.fillStyle=color;c.fill();
  c.font=`800 ${fontSize}px Flight, sans-serif`;c.fillStyle='#183b70';c.fillText(text,x+17,y+height/2+.5);
  drawBadge(c,label,language);
 }
 c.restore();return labels;
}
