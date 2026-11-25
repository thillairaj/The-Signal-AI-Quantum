/* Live news page. Reads ../data/live.json.
   Categories are the same six as the Signal Brief (AI, Quantum, Cloud & DevOps, Cybersecurity, Industry, Policy).
   A category chip appears ONLY when it has a story. The update times are the job's 2-hour cycle; choose one to see what it added. */
(function(){
  var ORDER=['AI','Quantum','Cloud & DevOps','Cybersecurity','Industry','Policy'];
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function ist(iso,o){return new Date(iso).toLocaleString('en-GB',Object.assign({timeZone:'Asia/Kolkata'},o))}
  function hm(iso){return ist(iso,{hour:'2-digit',minute:'2-digit',hour12:false})}
  function parts(iso){var s=ist(iso,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hour12:false}).split(', ');return {d:s[0],h:parseInt(s[1],10)}}
  function pad(n){return (n<10?'0':'')+n+':00'}
  function rank(c){var i=ORDER.indexOf(c);return i<0?99:i}
  var state={cat:'all',slot:'all',d:null};
  function liveSpec(it){
    var SS=window.SignalShare;
    var link=SS.BASE+'/live/#'+it.id;
    var tech=SS.techForCategory(it.category);
    var tags='#TheSignal '+SS.categoryHashtag(it.category);
    return {title:it.headline,line:it.what,link:link,
      caption:SS.buildCaption([it.headline,it.what,it.why,'Live news on The Signal, free:\n'+link,tags]),
      tags:tags,tech:tech,
      image:SS.cardImage({type:'Live news \u00b7 '+ist(it.published,{day:'numeric',month:'short'})+' \u00b7 '+hm(it.published)+' IST',tech:tech,heading:it.headline,body:it.what,boxLabel:'Why it matters',box:it.why,source:(it.sources||[]).map(function(s){return s.label}).join(' \u00b7 ')},it.id+'.png')};
  }
  function render(){
    var d=state.d,up=parts(d.updated),delay=d.delay_hours||2;
    var items=d.items.map(function(it){var p=parts(it.published);return Object.assign({_today:p.d===up.d,_slot:Math.floor(p.h/delay)*delay},it)});
    items.sort(function(a,b){return new Date(b.published)-new Date(a.published)});
    var earlier=items.filter(function(i){return !i._today}).length;
    var today=ist(new Date().toISOString(),{day:'numeric',month:'short'}),upd=ist(d.updated,{day:'numeric',month:'short'});
    document.getElementById('lvStat').innerHTML='<span>Updated <b>'+hm(d.updated)+' IST</b>'+(upd!==today?' · '+upd:'')+'</span><span>Next update <b>'+hm(d.next_update)+' IST</b></span><span>Up to <b>'+delay+' hours</b> behind the sources</span>';
    /* update times */
    var upSlot=Math.floor(up.h/delay)*delay,html='<button class="lv-slot '+(state.slot==='all'?'on':'')+'" data-s="all"><b>All</b><span>'+items.length+' '+(items.length===1?'story':'stories')+'</span></button>';
    if(earlier)html+='<button class="lv-slot has '+(state.slot==='prev'?'on':'')+'" data-s="prev"><b>Earlier</b><span>'+earlier+'</span></button>';
    for(var h=0;h<24;h+=delay){
      var n=items.filter(function(i){return i._today&&i._slot===h}).length,past=h<=upSlot,nxt=h===upSlot+delay;
      var label=n?n+(n===1?' story':' stories'):past?'No news':nxt?'Next':'Later';
      html+='<button class="lv-slot '+(n?'has ':'')+(nxt?'next ':'')+(!past&&!nxt?'later ':'')+(state.slot===String(h)?'on':'')+'" data-s="'+h+'"'+(n?'':' disabled')+'><b>'+pad(h)+'</b><span>'+label+'</span></button>';
    }
    document.getElementById('lvSlots').innerHTML=html;
    /* categories: only the ones that have a story, in the fixed order */
    var bySlot=items.filter(function(i){return state.slot==='all'||(state.slot==='prev'?!i._today:(i._today&&String(i._slot)===state.slot))});
    var counts={};items.forEach(function(i){counts[i.category]=(counts[i.category]||0)+1});
    var cats=Object.keys(counts).sort(function(a,b){return rank(a)-rank(b)});
    if(state.cat!=='all'&&!counts[state.cat])state.cat='all';
    document.getElementById('lvFilters').innerHTML=cats.length>1?'<button class="'+(state.cat==='all'?'on':'')+'" data-c="all">All<em>'+items.length+'</em></button>'+cats.map(function(c){return '<button class="'+(state.cat===c?'on':'')+'" data-c="'+esc(c)+'">'+esc(c)+'<em>'+counts[c]+'</em></button>'}).join(''):'';
    var shown=bySlot.filter(function(i){return state.cat==='all'||i.category===state.cat});
    document.getElementById('lvList').innerHTML=shown.length?shown.map(function(it){
      var srcs=(it.sources||[]).map(function(x){return '<a href="'+esc(x.url)+'" target="_blank" rel="noopener">'+esc(x.label)+'</a>'}).join(' · ');
      return '<article class="lv-card" id="'+esc(it.id)+'"><div class="lv-meta"><span class="lv-chip t">Added '+hm(it.published)+' IST · '+ist(it.published,{day:'numeric',month:'short'})+'</span><span class="lv-chip">'+esc(it.category)+' · '+esc(it.company)+'</span></div><h2>'+esc(it.headline)+'</h2><p><b>What happened.</b> '+esc(it.what)+'</p><div class="lv-why"><b>Why it matters.</b> '+esc(it.why)+'</div><div class="lv-src"><b>Sources</b> '+srcs+'</div></article>';
    }).join(''):'<div class="lv-empty" style="grid-column:1/-1"><b>Nothing new in the last 24 hours.</b>The next update is at '+hm(d.next_update)+' IST. Stories that qualify appear here and in the strip at the top of the front page.</div>';
    if(window.SignalShare){shown.forEach(function(it){var card=document.getElementById(it.id);if(card)card.appendChild(SignalShare.shareButton(liveSpec(it)))})}
    if(location.hash&&!state.touched){var t=document.getElementById(location.hash.slice(1));if(t)t.scrollIntoView({block:'start'})}
  }
  document.getElementById('lvSlots').addEventListener('click',function(e){var b=e.target.closest('button');if(!b||b.disabled)return;state.slot=b.dataset.s;state.touched=1;render()});
  document.getElementById('lvFilters').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;state.cat=b.dataset.c;state.touched=1;render()});
  fetch('../data/live.json?'+Math.floor(Date.now()/60000)).then(function(r){return r.json()}).then(function(d){state.d=d;render()}).catch(function(){document.getElementById('lvList').innerHTML='<div class="lv-empty" style="grid-column:1/-1"><b>Live news is not available right now.</b>Please try again in a little while.</div>'});
})();
