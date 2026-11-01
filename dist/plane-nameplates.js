const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
const letters=text=>segmenter?[...segmenter.segment(text)].map(part=>part.segment):Array.from(text);
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
 const inset=5,lineHeight=fontSize+9,limit=Math.min(maxWidth,width-inset*2),result=[];
 context.save();context.font=`800 ${fontSize}px Flight, sans-serif`;
 const measure=text=>context.measureText(text)?.width??letters(text).length*fontSize*.65;
 for(const entry of [...entries].sort((a,b)=>String(a.key).localeCompare(String(b.key)))){
  if(!Number.isFinite(entry.x)||!Number.isFinite(entry.y))continue;
  const name=planePlayerName(entry.name,entry.seat),text=fitPlaneName(name,Math.max(1,limit-23),measure),labelWidth=Math.min(limit,measure(text)+23);
  const x=clamp(entry.x-labelWidth/2,inset,width-inset-labelWidth),preferred=clamp(entry.y-lineHeight,inset,height-inset-lineHeight);
  let rect={x,y:preferred,width:labelWidth,height:lineHeight};
  // Stable seat/piece order plus nearest free rows keeps parked pairs and stacks legible.
  for(let row=0;row<=entries.length*2;row++){
   const step=(row<=entries.length?-row:row-entries.length)*(lineHeight+6),candidate={...rect,y:clamp(preferred+step,inset,height-inset-lineHeight)};
   if(result.every(other=>!intersects(candidate,other,3))){rect=candidate;break;}
  }
  result.push({...entry,...rect,name,text,fontSize,anchorX:entry.x,anchorY:entry.y});
 }
 context.restore();return result;
}
function capsule(c,x,y,w,h){const r=h/2;c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();}
export function drawPlaneNames(context,entries,options){
 const labels=layoutPlaneNames(context,entries,options),c=context;
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
 }
 c.restore();return labels;
}
