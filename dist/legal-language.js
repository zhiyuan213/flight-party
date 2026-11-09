// Language is resolved by a synchronous bootstrap in <head>, before the first
// paint. Both translations are present in the DOM and switched by CSS, so this
// module only keeps the control and document metadata in sync.
const menu=document.querySelector('#portal-language');
const root=document.documentElement;
function apply(language){
  const chinese=language==='zh';
  const locale=chinese?'zh-CN':'en';
  root.lang=locale;
  root.setAttribute('data-locale',language);
  menu.value=language;
  menu.setAttribute('aria-label',chinese?'语言':'Language');
  const heading=document.querySelector('article[lang="'+locale+'"] h1');
  if(heading)document.title=heading.textContent+' — JoyFlock';
}
apply(root.getAttribute('data-locale')==='zh'?'zh':'en');
menu.addEventListener('change',()=>{
  apply(menu.value);
  try{localStorage.setItem('joyflock-portal-language',menu.value);}catch{}
});
