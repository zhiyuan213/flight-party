import './avatar-display.js?v=20261114-avatar5';
export const safeAvatar=url=>globalThis.__joyflockAvatarDisplay.safe(url);
export const resolveAvatar=profile=>globalThis.__joyflockAvatarDisplay.resolve(profile);
export const createAvatar=(doc,profile)=>globalThis.__joyflockAvatarDisplay.create(doc,profile);
export const avatarStyle=profile=>`style="background-image:url('${resolveAvatar(profile)}');background-size:cover;background-position:center"`;
export function applyAvatar(node,profile){if(!node?.style)return;node.style.backgroundImage=`url('${resolveAvatar(profile)}')`;node.style.backgroundSize='cover';node.style.backgroundPosition='center';}
export async function prepareAvatar(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('format');
 const image=await createImageBitmap(file);try{if(image.width>4096||image.height>4096||image.width*image.height>16000000)throw new Error('dimensions');
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d'),side=Math.min(image.width,image.height);c.fillStyle='#fff';c.fillRect(0,0,256,256);c.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,256,256);return canvas.toDataURL('image/png').split(',')[1];
 }finally{image.close();}
}
