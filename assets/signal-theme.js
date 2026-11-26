/* The Signal: ONE site-wide theme. Load it in <head>, before the stylesheets, on every page (no flash of the wrong theme).
   Three themes: light, rose (a light pink mid-tone), dark. One saved choice (localStorage "aisignal_theme") that every page follows.
   light = data-theme="light" · rose = data-theme="light" + data-tone="rose" · dark = data-theme="dark".
   Rose is a variant of light, so every older rule written for [data-theme="dark"] or :not([data-theme="light"]) keeps working untouched.
   Older page scripts that still set data-theme are overruled by the guard below until they are cleaned up. */
(function(){
  var KEY='aisignal_theme',ORDER=['light','rose','dark'],NAMES={light:'Light',rose:'Rose',dark:'Dark'},root=document.documentElement,state='light';
  function saved(){try{var v=localStorage.getItem(KEY);return ORDER.indexOf(v)>-1?v:null}catch(e){return null}}
  function device(){try{return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){return 'light'}}
  function paint(t){
    state=t;
    var dt=t==='dark'?'dark':'light';
    if(root.getAttribute('data-theme')!==dt)root.setAttribute('data-theme',dt);
    if(t==='rose'){if(root.getAttribute('data-tone')!=='rose')root.setAttribute('data-tone','rose')}else if(root.hasAttribute('data-tone'))root.removeAttribute('data-tone');
    root.style.colorScheme=dt;
  }
  function fire(){try{document.dispatchEvent(new CustomEvent('signal-theme',{detail:{theme:state,name:NAMES[state]}}))}catch(e){}}
  paint(saved()||device());
  /* guard: if an older script changes data-theme or data-tone, put the shared choice back */
  try{new MutationObserver(function(){
    var dt=root.getAttribute('data-theme'),tn=root.getAttribute('data-tone');
    if(dt!==(state==='dark'?'dark':'light')||((tn==='rose')!==(state==='rose')))paint(state);
  }).observe(root,{attributes:true,attributeFilter:['data-theme','data-tone']})}catch(e){}
  window.SignalTheme={
    order:ORDER,names:NAMES,
    get:function(){return state},
    set:function(t){if(ORDER.indexOf(t)<0)return state;try{localStorage.setItem(KEY,t)}catch(e){}paint(t);fire();return state},
    next:function(){return this.set(ORDER[(ORDER.indexOf(state)+1)%ORDER.length])}
  };
  /* other tabs follow; with nothing saved, follow the phone's own setting */
  window.addEventListener('storage',function(e){if(e.key===KEY&&ORDER.indexOf(e.newValue)>-1){paint(e.newValue);fire()}});
  try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(){if(!saved()){paint(device());fire()}})}catch(e){}
})();
