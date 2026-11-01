export const safeAvatar=url=>typeof url==='string'&&/^\/api\/avatars\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(url)?url:null;
export const avatarStyle=url=>safeAvatar(url)?`style="background-image:url('${url}');background-size:cover;background-position:center"`:'';
export function applyAvatar(node,url){if(!node?.style)return;const valid=safeAvatar(url);node.style.backgroundImage=valid?`url('${valid}')`:'';node.style.backgroundSize=valid?'cover':'';node.style.backgroundPosition=valid?'center':'';}
export async function prepareAvatar(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('format');
 const image=await createImageBitmap(file);try{if(image.width>4096||image.height>4096||image.width*image.height>16000000)throw new Error('dimensions');
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d'),side=Math.min(image.width,image.height);c.fillStyle='#fff';c.fillRect(0,0,256,256);c.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,256,256);return canvas.toDataURL('image/png').split(',')[1];
 }finally{image.close();}
}
