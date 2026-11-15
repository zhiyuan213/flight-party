export function installCosmeticsDom(equipped={},game='four'){
  const prior=Object.fromEntries(['window','document','location','localStorage','CustomEvent'].map(k=>[k,globalThis[k]]));
  const node=()=>{const attrs=new Map(),styles=new Map();return {attrs,styles,dataset:{},
    getAttribute:n=>attrs.get(n)??null,hasAttribute:n=>attrs.has(n),
    setAttribute:(n,v)=>attrs.set(n,String(v)),removeAttribute:n=>attrs.delete(n),
    style:{setProperty:(n,v)=>styles.set(n,v),removeProperty:n=>styles.delete(n)}};};
  const root=node(),board=node(),cells=[node(),node(),node()],classes=new Set();
  cells.forEach((n,i)=>n.dataset.value=String(i));board.querySelectorAll=()=>cells;
  const store={equipped:{...equipped}},listeners=new Map();
  const win={__joyflockGamePoints:{get:()=>({points:750})},__joyflockMe:{},__joyflockPoints:{get:()=>({})},
    addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn);},
    dispatchEvent:event=>{for(const fn of listeners.get(event.type)||[])fn(event);}};
  globalThis.window=win;globalThis.document={documentElement:root,body:{classList:{contains:name=>classes.has(name)}},getElementById:id=>id==='board'?board:null};
  globalThis.location={search:'?game='+game};
  globalThis.localStorage={getItem:key=>key==='joyflock.shop.v1'?JSON.stringify(store):null};
  globalThis.CustomEvent=class {constructor(type){this.type=type;}};
  return {root,board,cells,store,win,setGame:g=>globalThis.location.search='?game='+g,
    setTheme:theme=>theme==='classic'?classes.delete('four-themed'):classes.add('four-themed'),
    restore:()=>Object.assign(globalThis,prior)};
}
