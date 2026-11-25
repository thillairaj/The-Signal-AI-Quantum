/* Live news strip. Reads data/live.json (written by the Live news job). Renders nothing if the file is missing or has no items. */
(function(){
  var me=document.currentScript, root=new URL('../',me.src).href;
  function ist(iso,o){return new Date(iso).toLocaleString('en-GB',Object.assign({timeZone:'Asia/Kolkata'},o))}
  function hm(iso){return ist(iso,{hour:'2-digit',minute:'2-digit',hour12:false})}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  fetch(root+'data/live.json?'+Math.floor(Date.now()/60000)).then(function(r){return r.json()}).then(function(d){
    if(!d||!d.items||!d.items.length)return;
    var today=ist(new Date().toISOString(),{day:'numeric',month:'short'}), upd=ist(d.updated,{day:'numeric',month:'short'});
    var stamp='Updated '+hm(d.updated)+' IST'+(upd!==today?' · '+upd:'')+' · up to '+(d.delay_hours||2)+' hours behind';
    var one=d.items.map(function(it){return '<a href="'+root+'live/#'+esc(it.id)+'"><b>'+hm(it.published)+' · '+esc(it.category)+'</b> '+esc(it.headline)+'</a>'}).join('<span class="ls-sep">•</span>');
    var half=one+'<span class="ls-sep">•</span>'+one+'<span class="ls-sep">•</span>'+one+'<span class="ls-sep">•</span>';
    var el=document.createElement('div');el.className='live-strip';el.setAttribute('role','region');el.setAttribute('aria-label','Live news');
    el.innerHTML='<a class="ls-label" href="'+root+'live/"><span class="ls-ring" aria-hidden="true"></span>Live news</a><span class="ls-meta">'+stamp+'</span><div class="ls-trk"><div class="ls-mv">'+half+half+'</div></div>';
    var m=document.getElementById('liveStripMount');
    if(m){m.appendChild(el);var mv=el.querySelector('.ls-mv');if(mv){var w=mv.scrollWidth/2;mv.style.animationDuration=Math.max(30,Math.round(w/45))+'s'}}
  }).catch(function(){});
})();
