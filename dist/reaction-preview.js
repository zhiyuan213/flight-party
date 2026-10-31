// Presentation only. Future room events should call show({color,name,emoji}).
// No network transport, account identity or persistent chat history is implied.
const ALLOWED = new Set(['😂','👋','🎉','😮','❤️']);
export class ReactionPreview {
  constructor({getLanguage, reduced}) {
    this.getLanguage=getLanguage; this.reduced=reduced; this.messages=new Map();
    this.region=document.createElement('div'); this.region.className='room-reaction-preview';
    this.region.setAttribute('role','status'); this.region.setAttribute('aria-live','polite');
    document.getElementById('canvas-wrap').append(this.region);
  }
  show({color,name,emoji}) {
    if(!ALLOWED.has(emoji)||!Number.isInteger(color)||color<0||color>3)return;
    const old=this.messages.get(color); if(old)clearTimeout(old.timer);
    const entry={emoji,timer:setTimeout(()=>{this.messages.delete(color);this.sync();},3600)};
    this.messages.set(color,entry);
    this.region.replaceChildren();
    const bubble=document.createElement('div'); bubble.className='room-reaction-bubble';
    const avatar=document.createElement('span'); avatar.className=`reaction-avatar avatar-${color}`;avatar.setAttribute('aria-hidden','true');
    const copy=document.createElement('span'); copy.className='reaction-copy';
    const who=document.createElement('b');who.textContent=name;
    const note=document.createElement('small');note.textContent=this.getLanguage()==='zh'?'表情预览 · 仅当前屏幕':'REACTION PREVIEW · THIS SCREEN';
    const face=document.createElement('span');face.className='reaction-emoji';face.textContent=emoji;
    copy.append(who,note);bubble.append(avatar,copy,face);this.region.append(bubble);
    clearTimeout(this.fade);this.fade=setTimeout(()=>this.region.replaceChildren(),3600);
    if(!this.reduced())bubble.animate([{opacity:0,transform:'translateY(12px) scale(.92)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:220,easing:'ease-out'});
    this.sync();
  }
  sync(){
    document.querySelectorAll('.reaction-card-chip').forEach(el=>el.remove());
    for(const [color,message] of this.messages){
      const row=document.querySelector(`.player-row[data-color="${color}"]`);if(!row)continue;
      const chip=document.createElement('span');chip.className='reaction-card-chip';chip.textContent=message.emoji;
      chip.setAttribute('aria-label',this.getLanguage()==='zh'?`表情预览 ${message.emoji}`:`Reaction preview ${message.emoji}`);row.append(chip);
    }
  }
  clear(){clearTimeout(this.fade);for(const value of this.messages.values())clearTimeout(value.timer);this.messages.clear();this.region.replaceChildren();this.sync();}
}
