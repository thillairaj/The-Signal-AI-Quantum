const BANK=GAMES_DATA.bank;
const PATHS=GAMES_DATA.paths;
const SUD=GAMES_DATA.sudoku;
const FAMS=[['all','Everything'],['ai','AI'],['quantum','Quantum'],['cloud','Cloud and DevOps'],['cyber','Cybersecurity']];
const FK=['ai','quantum','cloud','cyber'];
const ACC={any:'#0E6B47',all:'#0E6B47',quantum:'#6B4FD8',ai:'#0E6B47',cloud:'#24508A',cyber:'#B4372A'};
const LABEL={any:'PUZZLE',all:'EVERYTHING',quantum:'QUANTUM',ai:'AI',cloud:'CLOUD AND DEVOPS',cyber:'CYBERSECURITY'};
const BANDS={quantum:['#DAD2FA','#C4B8F6','#AC9CF0','#9482E8','#7C68DE'],ai:['#CFEEDD','#B2E3CA','#92D6B6','#6FC7A0','#4DB78A'],cloud:['#D3E3F7','#B8D2F1','#9BBFE9','#7DAADF','#5E94D3'],cyber:['#F8D9D3','#F2BFB6','#EBA397','#E2867A','#D86A5C']};
const PAR={double:90,guess:60,ladder:150,path:150,duel:100,queens:180,sudoku:240,trail:150,gems:150};
const state={fam:'ai'};
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>[...(r||document).querySelectorAll(s)];
const inside=(el,x,y)=>{const r=el.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
let cleanups=[];
/* ---------- seeded daily engine ---------- */
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function sshuffle(arr,seed){const r=rng(hashStr(seed));const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const LAUNCH=Math.floor(Date.UTC(2026,10,25)/864e5);
const TODAY=Math.floor((Date.now()+5.5*3600e3)/864e5);
const DAYN=TODAY-LAUNCH;               // 0 on launch day
const PUZNO=DAYN+1;
/* pick item k of a pool so that every item is used once before any repeats (new shuffle each cycle) */
function pickNonRepeat(pool,key,k){const cyc=Math.floor(k/pool.length);const order=sshuffle(pool.map((_,i)=>i),key+'|'+cyc);return pool[order[k%pool.length]]}
/* ---------- storage ---------- */
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const dkey=(g,fam)=>'sg|'+TODAY+'|'+g+'|'+fam;
const doneInfo=(g,fam)=>store.get(dkey(g,fam));
function streak(){let n=0,d=TODAY;if(!store.get('sg|day|'+d))d--;while(store.get('sg|day|'+d)){n++;d--}return n}
/* ---------- sound and celebration ---------- */
const AC=window.AudioContext||window.webkitAudioContext;let audioCtx=null;
const muted=()=>!!store.get('sg|mute');
function note(f,t0,d,type,vol){try{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type||'sine';o.frequency.value=f;const t=audioCtx.currentTime+t0;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol||.18,t+.02);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+d+.05)}catch(e){}}
function playSound(kind){
  if(muted()||!AC)return;try{audioCtx=audioCtx||new AC();if(audioCtx.state==='suspended')audioCtx.resume();
    if(kind==='super'){[523.25,659.25,783.99,1046.5,1318.5,1567.98].forEach((f,i)=>note(f,i*.1,.5,'triangle',.2));[2093,2637,3136].forEach((f,i)=>note(f,.6+i*.08,.35,'sine',.08));note(1046.5,.75,.9,'triangle',.18);note(1318.5,.75,.9,'triangle',.14);note(1567.98,.75,.9,'triangle',.12)}
    else if(kind==='win'){[523.25,659.25,783.99,1046.5].forEach((f,i)=>note(f,i*.11,.45,'sine',.2))}
    else if(kind==='draw'){[440,523.25,440].forEach((f,i)=>note(f,i*.14,.35,'sine',.16))}
  }catch(e){}
  try{if(navigator.vibrate)navigator.vibrate(kind==='super'?[80,60,80,60,200]:[60,40,100])}catch(e){}
}
function confetti(n,gold){
  const box=document.createElement('div');box.className='confetti';const cols=gold?['#A9D18A','#3F7D20','#EAF3E3','#12A06A','#FFFFFF']:['#12A06A','#8CC56A','#6B4FD8','#2B7FD9','#D9822B'];
  for(let i=0;i<n;i++){const p=document.createElement('i');p.style.left=Math.random()*100+'%';p.style.background=cols[i%cols.length];p.style.animationDelay=(Math.random()*.6)+'s';p.style.animationDuration=(1.8+Math.random()*1.6)+'s';p.style.transform='rotate('+Math.random()*360+'deg)';p.style.width=(6+Math.random()*7)+'px';p.style.height=(10+Math.random()*10)+'px';if(gold&&i%4===0)p.style.borderRadius='50%';box.appendChild(p)}
  document.body.appendChild(box);setTimeout(()=>box.remove(),4200);cleanups.push(()=>box.remove());
}
const SUBS={double:'One number left.',guess:'You found the group.',ladder:'The ladder is solved.',path:'Every word found.',duel:'All five questions answered.',queens:'One king in every row, column and colour.',sudoku:'Every row, column and box is complete.',trail:'One path through every square.',gems:'Perfectly balanced.'};
const nextDrop=()=>{const now=Date.now()+5.5*3600e3;const next=(Math.floor(now/864e5)+1)*864e5;const ms=next-now;return Math.floor(ms/36e5)+'h '+Math.floor(ms%36e5/6e4)+'m'};
const BADGES=[[3,'3-day streak'],[10,'10-day streak'],[30,'30-day streak'],[100,'100-day streak']];
function badgeSvg(n,on){const c=on?['#EAF3E3','#8CC56A','#13241B']:['#E4E8E2','#BFC7BE','#8A968F'];return '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="bg'+n+(on?'1':'0')+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+c[0]+'"/><stop offset="1" stop-color="'+c[1]+'"/></linearGradient></defs><path d="M32 4l7 5 8.5-.5 3 8 7.5 4-2 8.5 2 8.5-7.5 4-3 8-8.5-.5-7 5-7-5-8.5.5-3-8-7.5-4 2-8.5-2-8.5 7.5-4 3-8 8.5.5z" fill="url(#bg'+n+(on?'1':'0')+')"/><circle cx="32" cy="32" r="17" fill="none" stroke="'+c[2]+'" stroke-opacity=".25" stroke-width="2"/><text x="32" y="39" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="'+(n>=100?15:19)+'" fill="'+c[2]+'">'+n+'</text></svg>'}
function celebrate(opts){
  const old=$('#cele');if(old)old.remove();
  const st=opts.stars,sup=st===3&&!opts.noSuper;
  const el=document.createElement('div');el.id='cele';el.className='cele'+(sup?' super':'');el.setAttribute('role','dialog');el.setAttribute('aria-label',opts.title);
  const stars=[1,2,3].map(i=>'<span class="cs'+(i<=st?' on':'')+'" style="animation-delay:'+(.25+i*.18)+'s">'+STAR(i<=st)+'</span>').join('');
  el.innerHTML='<div class="box">'+(sup?'<div class="burst" aria-hidden="true"></div>':'')+'<div class="cs-row">'+(opts.noStats?'':stars)+'</div><div class="ct">'+(sup?'Superstar!':opts.title)+'</div><div class="cm">'+(sup?'Flawless: no hints and a fast time.':opts.sub)+'</div>'+(opts.noStats?'':'<div class="stats"><div><b>'+fmt(opts.time)+'</b><small>TIME</small></div><div><b>'+opts.hints+'</b><small>HINTS</small></div><div><b>'+st+' of 3</b><small>STARS</small></div></div>')+(opts.extra||'')+(opts.daily?'<div class="nextdrop">See you tomorrow! Your next puzzle arrives in <b>'+nextDrop()+'</b> (00:00 IST).</div>':'')+'<div class="acts" style="justify-content:center">'+(opts.daily||opts.noAgain?'':'<button class="p" id="cagain">Play again</button>')+'<a class="'+(opts.daily?'p':'')+'" href="#hub">More games</a><button id="cview">View board</button></div></div>';
  document.body.appendChild(el);cleanups.push(()=>el.remove());
  playSound(opts.sound||(sup?'super':'win'));confetti(sup?110:60,sup);
  const ca=$('#cagain');if(ca)ca.onclick=()=>{el.remove();route()};
  $('#cview').onclick=()=>{el.remove();const g=$('#game');if(g&&!$('#donebar')){const bar=document.createElement('div');bar.id='donebar';bar.className='donebar'+(sup?' sup':'');bar.innerHTML='<b>'+(sup?'Superstar!':opts.title)+'</b><span>'+(opts.noStats?opts.sub:fmt(opts.time)+' · '+opts.hints+(opts.hints===1?' hint':' hints')+' · '+st+' of 3 stars')+'</span>';g.parentNode.insertBefore(bar,g)}};
  document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){const b=$('#cview');if(b)b.click();document.removeEventListener('keydown',esc)}});
}
/* ---------- game share images: the game icon on the standard card ---------- */
const GAME_SHARE_FILE={'Kings':'queens','Mini Sudoku':'sudoku','Trail':'trail','Fox & Penguin':'gems','Double Up':'double','Guess the Group':'guess','Term Ladder':'ladder','Path Words':'path','Answer Duel':'duel','Duel a friend':'duel-2p'};
function overlayGameIcon(blob,file,bg){
  return new Promise(function(res){
    try{
      const url=URL.createObjectURL(blob);const base=new Image();
      base.onload=function(){try{
        const cv=document.createElement('canvas');cv.width=base.naturalWidth||1080;cv.height=base.naturalHeight||1350;
        const x=cv.getContext('2d');x.drawImage(base,0,0);
        const icon=new Image();
        const finish=()=>{if(cv.toBlob)cv.toBlob(function(b){res(b||blob)},'image/png');else res(blob)};
        icon.onload=function(){try{const S=Math.round(cv.width*0.115);const ix=cv.width-84-S,iy=cv.height-118-26-S;
          x.fillStyle=bg;x.beginPath();if(x.roundRect)x.roundRect(ix,iy,S,S,18);else x.rect(ix,iy,S,S);x.fill();
          x.drawImage(icon,ix+12,iy+12,S-24,S-24);}catch(e){}finish()};
        icon.onerror=function(){finish()};
        icon.src='../assets/games/icons/'+file;
      }catch(e){res(blob)}};
      base.onerror=function(){res(blob)};
      base.src=url;
    }catch(e){res(blob)}
  });
}
function gameShareImage(gameKey,gameTitle,card){
  const img=SignalShare.cardImage(card,'game-result.png');
  if(!gameKey)return img;
  const file=ICONFILE[gameKey];if(!file)return img;
  const render0=img.render;
  img.render=function(size,theme){return render0(size,theme).then(function(blob){return blob?overlayGameIcon(blob,file,TILEC[gameKey]||'#EEEEEE'):blob})};
  return img;
}
window.__sgGameShare={overlay:overlayGameIcon,wrap:gameShareImage};
/* ---------- run: timer, hints, cooldown, rating ---------- */
function newRun(game,fam,mode){
  const run={game,fam,mode,t0:Date.now(),hints:0,wrong:0,cd:0,done:false,time:0};
  const iv=setInterval(()=>{
    if(!run.done){const s=Math.floor((Date.now()-run.t0)/1000);const el=$('#tm');if(el)el.textContent=fmt(s)}
    if(run.cd>0){run.cd--;refreshHint(run)}
  },1000);
  cleanups.push(()=>clearInterval(iv));
  return run;
}
const fmt=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
function refreshHint(run){const b=$('#hint');if(!b)return;if(run.done){b.disabled=true;b.textContent='Hint';return}b.disabled=run.cd>0;b.textContent=run.cd>0?'Next hint in '+run.cd+'s':'Hint'+(run.hints?' · '+run.hints+' used':'')}
function bindHint(run,fn){const b=$('#hint');if(!b)return;b.onclick=()=>{if(run.cd>0||run.done)return;if(fn()===false)return;run.hints++;run.cd=10;refreshHint(run)};refreshHint(run)}
const STAR=on=>'<svg viewBox="0 0 24 24"><path d="M12 2l3 6.9 7.5.7-5.6 5 1.7 7.4L12 18l-6.6 4 1.7-7.4-5.6-5 7.5-.7z" fill="'+(on?'#3F7D20':'none')+'" stroke="#3F7D20" stroke-width="1.6"/></svg>';
/* ---------- result sharing (new standard) ---------- */
const SHARE_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';
const SHARE_BTN='<button type="button" class="sg-share-btn" data-gshare aria-label="Share" title="Share">'+SHARE_ICON+'</button>';
document.addEventListener('click',function(e){
  const b=e.target&&e.target.closest?e.target.closest('[data-gshare]'):null;
  if(!b||!window.SignalShare)return;
  const res=b.closest('.res');if(!res)return;
  const gt=document.querySelector('.gt');const game=gt?gt.textContent.trim():'Games';
  const a=res.querySelector('.a'),k=res.querySelector('.k');
  const headline=a?a.textContent.trim():(k?k.textContent.trim():'Result');
  const heading=game+' \u2014 '+headline;
  let body='';
  const stats=res.querySelector('.stats');
  if(stats){
    body=[...stats.querySelectorAll('div')].map(function(d){
      const bb=d.querySelector('b'),sm=d.querySelector('small');
      let v=bb?bb.textContent.trim():'';
      if(!v&&bb){const on=bb.querySelectorAll('path[fill="#3F7D20"]').length;const all=bb.querySelectorAll('path').length;if(all)v=on+' of '+all+' stars'}
      const lab=sm?sm.textContent.trim().toLowerCase():'';
      return (v+(lab?' '+lab:'')).trim();
    }).filter(Boolean).join(' \u00b7 ');
  }
  if(!body){const pp=res.querySelector('p');body=pp?pp.textContent.trim():headline}
  const type='Games \u00b7 '+game;
  const gfile=GAME_SHARE_FILE[game];
  const link=SignalShare.BASE+'/games/';
  const caption=SignalShare.buildCaption([heading,body,'Play the games free:\n'+link,'#TheSignal']);
  SignalShare.openPanel({title:heading,line:body,link:link,caption:caption,tags:'#TheSignal',tech:'signal',
    image:gameShareImage(gfile,game,{type:type,tech:'signal',heading:heading,body:body,source:'The Signal Games'})},b);
});
function finish(run){
  run.done=true;run.time=Math.floor((Date.now()-run.t0)/1000);
  const par=PAR[run.game];const st=run.hints===0&&run.wrong<=1&&run.time<=par?3:run.hints<=2?2:1;
  let extra='';
  if(run.mode==='daily'){store.set(dkey(run.game,run.fam),{t:run.time,h:run.hints,s:st});store.set('sg|day|'+TODAY,1);
    const cur=streak();store.set('sg|best',Math.max(store.get('sg|best')||0,cur));store.set('sg|total',(store.get('sg|total')||0)+1);if(st===3)store.set('sg|super',(store.get('sg|super')||0)+1);
    const bt=store.get('sg|bt|'+run.game);if(!bt||run.time<bt.t)store.set('sg|bt|'+run.game,{t:run.time,s:st});
    const nb=BADGES.find(x=>x[0]===cur);if(nb&&!store.get('sg|badge|'+nb[0])){store.set('sg|badge|'+nb[0],TODAY);extra='<div class="newbadge"><span>'+badgeSvg(nb[0],true)+'</span><div><b>New badge!</b><br>'+nb[1]+'</div></div>'}
    else if(cur>=2)extra='<div class="streakline">'+cur+'-day streak</div>'}
  refreshHint(run);
  setTimeout(()=>celebrate({title:'Completed!',sub:SUBS[run.game]||'Well done.',stars:st,time:run.time,hints:run.hints,daily:run.mode==='daily',extra}),450);
  return '<div class="stats"><div><b>'+fmt(run.time)+'</b><small>TIME</small></div><div><b>'+run.hints+'</b><small>HINTS</small></div><div><b class="stars">'+STAR(st>=1)+STAR(st>=2)+STAR(st>=3)+'</b><small>RATING</small></div></div>';
}
/* ---------- tap utility ---------- */
/* Every game is tap only: tap an item to select it, tap its target to place it. */
/* ---------- shell ---------- */
const HELP={
 guess:['You see one clue term at a time.','Tap an answer tile, then tap the box to place it.','Stuck? Tap Hint. It removes a wrong answer or shows another clue.'],
 ladder:['Tap a term tile, then tap the clue it matches.','Then tap two rows to swap them into the order they happen.','Hint shows the next tile, marks wrong rows, then fixes one for you.'],
 path:['Tap letters one after another, each next letter touching the last, to spell a hidden term.','Tap the last letter again to step back. Use every square.','Hint reveals the starting letter, then the next letters of a word.'],
 duel:['Tap the card that matches the meaning, then tap the question.','First try 100 points, then 50, 25, 0.','Hint removes a wrong card, so use it when you need it.'],
 queens:['Tap a square once for a \u00d7 mark, tap again for a crown, tap again to clear. Hold a square to clear it at once.','One crown in every row, column and colour group. Crowns may not touch, not even diagonally.','Hint marks wrong crowns in red. If all are right, it places one for you.'],
 trail:['Tap the squares one after another, starting at 1, to draw the path in number order.','The path fills every square and cannot cross itself or the thick walls.','Hint removes a wrong stretch, then draws the next three squares.'],
 double:['Tap a number, then tap a neighbour with the same number. They add up.','Only side by side, above or below. +3 and \u00d72 tokens join any number.','Merge until one number is left. Hint shows the next merge, then does it.'],
 gems:['Tap a square to cycle it: fox, penguin, then empty. Or tap a tray tile first, then tap squares to place it. Given squares cannot change.','Three of each in every row and column. Never three of the same in a row, side by side or stacked.','Hint marks wrong squares in red. If all are right, it fills one for you.'],
 sudoku:['Tap a square, then tap a number on the pad. Or tap a number first, then tap squares to fill them.','Each row, column and 2 by 3 box has each number once.','Hint marks wrong numbers in red. If all are right, it fills one square.']
};
const KEY={guess:'guess',ladder:'ladder',path:'path',duel:'duel',target:'target',sudoku:'sudoku'};
function shell(key,title,withFam,mount,mode){
  cleanups.forEach(f=>f());cleanups=[];
  document.body.classList.add('sg-play');
  if(window.SGAnim)cleanups.push(()=>SGAnim.stopIdle());
  const icf=title==='Duel a friend'?'duel-a-friend.svg':(ICONFILE[key]||'');
  const ick=title==='Duel a friend'?'duel-2p':key;
  document.getElementById('app').innerHTML='<header class="gh"><div><a class="back" href="#hub" aria-label="Back to Games">\u2190</a>'+(icf?'<span class="gh-ic" style="--tilec:'+(TILEC[ick]||'#EEEEEE')+'"><img src="'+GICON+icf+'" alt=""></span>':'')+'<div class="gt">'+title+'</div><span class="gh-meta" id="ghmeta"></span><button class="snd" id="snd" aria-label="Sound"></button><button class="help" id="hb" aria-label="How to play">?</button></div></header><main class="gm">'+(withFam?'<div class="chips" id="chips"></div>':'')+'<div id="hc"></div><div id="game"></div></main>';
  if(withFam){const c=$('#chips');FAMS.forEach(([id,l])=>{const b=document.createElement('button');b.textContent=l;const on=id===state.fam;const col=ACC[id];b.style.cssText=on?'background:'+col+';border-color:'+col+';color:#fff':'color:var(--ink)';b.onclick=()=>{state.fam=id;mount()};c.appendChild(b)})}
  const SPK='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/>',SON=SPK+'<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',SOFF=SPK+'<path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const sb=$('#snd');const sync=()=>{sb.innerHTML=muted()?SOFF:SON;sb.title=muted()?'Sound off':'Sound on'};sync();sb.onclick=()=>{store.set('sg|mute',muted()?0:1);sync();if(!muted())playSound('draw')};
  $('#hb').onclick=()=>{const hc=$('#hc');if(hc.innerHTML){hc.innerHTML='';return}hc.innerHTML='<div class="helpcard"><b>How to play</b><ol>'+HELP[key].map(x=>'<li>'+x+'</li>').join('')+'</ol><div class="calmrow"><span>Animations</span><button type="button" class="calmbtn" id="calmbtn"></button></div></div>';const cb=$('#calmbtn');const csync=()=>{cb.textContent='Calm animations: '+(window.SGAnim&&SGAnim.isOn()?'on':'off')};csync();cb.onclick=()=>{if(window.SGAnim){SGAnim.setOn(!SGAnim.isOn());csync()}}};
  window.scrollTo(0,0);
}
const famOf=f=>f==='all'?FK[((DAYN%4)+4)%4]:f;      // "Everything" edition rotates families by day
function metaHead(run,famLabel,extra){const gh=$('#ghmeta');if(gh)gh.innerHTML=(run.mode==='daily'?'Daily #'+PUZNO:'Anytime')+' \u00b7 <span class="tm" id="tm">0:00</span>';return '<div class="meta"><span><span class="badge'+(run.mode==='daily'?'':' pr')+'">'+(run.mode==='daily'?'DAILY #'+PUZNO:'PLAY ANYTIME')+'</span> <span style="color:'+ACC[run.fam==='all'?'all':run.fam]+'">'+famLabel+(extra||'')+'</span></span><span class="mrow"><button class="hintb" id="hint">Hint</button></span></div>'}
function doneCard(game,fam,mode,title,mount){
  const d=mode==='daily'?doneInfo(game,fam):null;if(!d)return false;
  const gh=$('#ghmeta');if(gh)gh.textContent='Daily #'+PUZNO;
  $('#game').innerHTML='<div class="res" style="text-align:center"><div class="k" style="color:var(--good)">TODAY’S PUZZLE COMPLETE · #'+PUZNO+'</div><div class="a">'+title+'</div><div class="stats"><div><b>'+fmt(d.t)+'</b><small>TIME</small></div><div><b>'+d.h+'</b><small>HINTS</small></div><div><b class="stars">'+STAR(d.s>=1)+STAR(d.s>=2)+STAR(d.s>=3)+'</b><small>RATING</small></div></div><div class="nextdrop">See you tomorrow! Your next puzzle arrives in <b>'+nextDrop()+'</b> (00:00 IST).</div><div class="acts" style="justify-content:center"><a class="p" href="#hub">More games</a><a href="#profile">Your streak</a></div></div>';
  return true;
}
/* ---------- generators from the real term bank ---------- */
const byFam=f=>BANK.filter(x=>f==='all'||x.f===f);
function groupsOf(f){const m={};byFam(f).forEach(x=>{const k=x.t+'|'+x.g;(m[k]=m[k]||{k,f:x.f,t:x.t,g:x.g,terms:[]}).terms.push(x)});return Object.values(m).filter(g=>g.terms.length>=5)}
function guessPuzzle(fam,mode){
  const pool=groupsOf(fam).sort((a,b)=>a.k<b.k?-1:1);
  const g=mode==='daily'?pickNonRepeat(pool,'guess|'+fam,DAYN):pool[Math.floor(Math.random()*pool.length)];
  const cyc=Math.floor(DAYN/pool.length);
  const terms=mode==='daily'?sshuffle(g.terms,'clues|'+g.k+'|'+cyc):shuffle(g.terms.slice());
  const clues=terms.slice(0,5).map(x=>x.n);
  const others=groupsOf(g.f).filter(o=>o.k!==g.k);const sameT=others.filter(o=>o.t===g.t);
  const dist=(sameT.length>=3?sameT:others).sort(()=>Math.random()-.5).slice(0,3).map(o=>o.g);
  const options=sshuffle([g.g].concat(dist),'opt|'+g.k+'|'+DAYN);
  return {f:g.f,answer:g.g,clues,options,explain:'These terms all belong to the group “'+g.g+'”: '+g.terms.slice(5).concat(terms.slice(0,5)).slice(0,3).map(x=>x.n).join(', ')+' and more.'};
}
function maskDef(d,name){const toks=(name.match(/[A-Za-z]+/g)||[]).filter(w=>w.length>=5);toks.forEach(t=>{d=d.replace(new RegExp(t,'gi'),'___')});return d}
function questions(fam,mode,game,n){
  const pool=byFam(fam).filter(x=>x.d.length>=30&&x.d.length<=170).sort((a,b)=>(a.f+a.n)<(b.f+b.n)?-1:1);
  let picks=[];
  if(mode==='daily'){
    let excl={};
    if(game==='target'){questions(fam,mode,'duel',n).forEach(q=>excl[q.answer]=1)}
    const pl=pool.filter(x=>!excl[x.n.split(' — ')[0]]);
    for(let i=0;i<n;i++)picks.push(pickNonRepeat(pl,game+'|'+fam,DAYN*n+i));
  }else picks=shuffle(pool.slice()).slice(0,n);
  return picks.map((x,i)=>{
    const name=x.n.split(' — ')[0];
    let same=byFam(x.f).filter(y=>y.t===x.t&&y.g===x.g&&y.n!==x.n);if(same.length<3)same=byFam(x.f).filter(y=>y.t===x.t&&y.n!==x.n);
    const d=sshuffle(same,'dist|'+x.n+'|'+DAYN).slice(0,3).map(y=>y.n.split(' — ')[0]);
    return {q:maskDef(x.d,x.n),answer:name,opts:sshuffle([name].concat(d),'o|'+x.n+'|'+DAYN),fam:x.f};
  });
}
/* ---------- Guess the Group ---------- */
function mountGuess(mode){
  mode=mode||'daily';const rr=()=>mountGuess(mode);
  shell('guess','Guess the Group',true,rr,mode);
  const fam=state.fam;if(doneCard('guess',fam,mode,'Guess the Group',rr))return;
  const P=guessPuzzle(fam,mode),pf=P.f,acc=ACC[pf],bands=BANDS[pf];
  const run=newRun('guess',fam,mode);let shown=1,solved=false,summary='',selV=null;const wrong=new Set();const g=$('#game');
  function render(){
    g.innerHTML=metaHead(run,LABEL[pf],' · CLUE '+Math.min(shown,5)+' OF 5')+
    '<div class="bands">'+P.clues.map((c,i)=>{const o=i<shown||solved;return '<div class="band'+(o?' open':'')+'" style="'+(o?'background:'+bands[i]+';color:'+(i>2?'#fff':'#13241B'):'')+'">'+(o?esc(c):'Clue '+(i+1)+' locked')+'</div>'}).join('')+'</div>'+
    (solved?'<div class="res"><div class="k" style="color:var(--good)">SOLVED</div><div class="a">'+esc(P.answer)+'</div><p>'+esc(P.explain)+'</p>'+summary+'<div class="acts"><a class="p" href="#hub">Learn this group ›</a>'+(mode==='daily'?'<a href="#hub">More games</a>':'<button id="again">Play another</button>')+''+SHARE_BTN+'</div></div>':
    '<div class="zone" id="zone">Tap an answer, then tap here</div><div class="tray" id="tray">'+P.options.map(o=>'<div class="tile'+(wrong.has(o)?' dead':'')+'" data-v="'+esc(o)+'">'+esc(o)+'</div>').join('')+'</div><div class="msg" id="msg"></div>');
    bindHint(run,hint);
    if(solved){const a=$('#again');if(a)a.onclick=rr;return}
    const zone=$('#zone');
    $$('#tray .tile:not(.dead)').forEach(t=>{t.onclick=()=>{selV=t.dataset.v;$$('#tray .tile').forEach(x=>x.classList.toggle('sel',x===t));$('#msg').textContent='Now tap the box to place your answer.'}});
    zone.onclick=()=>{if(selV===null)return;const v=selV;selV=null;
      if(v===P.answer){solved=true;summary=finish(run);render();return}
      wrong.add(v);run.wrong++;if(shown<5)shown++;zone.classList.add('shake');setTimeout(render,320)};
  }
  function hint(){
    const wrongLeft=P.options.filter(o=>o!==P.answer&&!wrong.has(o));
    const lvl=run.hints;
    if(wrongLeft.length>0&&(lvl%2===0||shown>=5)){wrong.add(wrongLeft[0]);render();$('#msg').textContent='Hint: one wrong answer removed.';return true}
    if(shown<5){shown++;render();$('#msg').textContent='Hint: a new clue is shown.';return true}
    const t=$('#tray .tile[data-v="'+P.answer.replace(/"/g,'\\"')+'"]');if(t){t.classList.add('glow');$('#msg').textContent='Hint: tap the glowing tile, then tap the box.'}return true;
  }
  render();
}
/* ---------- Term Ladder ---------- */
const LADDER={
 cyber:[{title:'The cyber kill chain, in order',steps:[['Reconnaissance','The attacker researches the target and looks for a way in.'],['Weaponization','An exploit is paired with a malicious payload.'],['Delivery','The attack reaches the victim, for example in a phishing email.'],['Exploitation','A flaw is triggered to run the attacker’s code.'],['Installation','Malware is planted so the attacker can stay.'],['Command and Control','The attacker takes remote control of the system.'],['Actions on Objectives','The attacker reaches the goal, such as stealing data.']]},
  {title:'Responding to a security incident',steps:[['Prepare','Plans, tools and people are ready before anything happens.'],['Identify','Spot that something is wrong and confirm it is an incident.'],['Contain','Stop the problem spreading to other systems.'],['Eradicate','Remove the cause, such as malware or a stolen account.'],['Recover','Bring systems back to normal and check them.'],['Review','Learn what went wrong and improve the plan.']]}],
 ai:[{title:'How an AI model gets built',steps:[['Collect data','Gather the examples the model will learn from.'],['Clean and label','Fix errors and add the right answers to the examples.'],['Split the data','Set some examples aside to test the model later.'],['Train','The model adjusts its weights to fit the training data.'],['Evaluate','Test the model on examples it has never seen.'],['Deploy','Release the model so people and systems can use it.'],['Monitor','Watch the model in use for errors and drift.']]},
  {title:'How a prompt becomes an answer',steps:[['Write the prompt','You type a question or instruction.'],['Split into tokens','The text is cut into small pieces the model can read.'],['Embed','Each token becomes a list of numbers.'],['Run the layers','Transformer layers weigh how the tokens relate.'],['Predict','The model scores every possible next token.'],['Pick a token','One token is chosen, guided by the temperature.'],['Repeat','The loop runs until the answer is complete.']]}],
 cloud:[{title:'A change travelling through CI/CD',steps:[['Code','Developers write and commit a change.'],['Build','The change is compiled and packaged.'],['Test','Automated tests check that it works.'],['Release','A tested version is approved for production.'],['Deploy','The release is rolled out to live servers.'],['Operate','The service runs and serves real users.'],['Monitor','Logs and metrics show how the live service behaves.']]},
  {title:'The journey of a web request',steps:[['DNS lookup','The name is turned into an address.'],['Connect','A connection to the server is opened.'],['Secure it','A TLS handshake encrypts the connection.'],['Send the request','The browser asks for the page.'],['Server works','The server builds the answer.'],['Response','The page data travels back.'],['Render','The browser draws the page.']]}],
 quantum:[{title:'A quantum computation, step by step',steps:[['Define the problem','Choose a task that suits a quantum computer.'],['Encode the data','Turn the inputs into qubit states.'],['Build the circuit','Arrange gates into a quantum circuit.'],['Run on hardware','Execute the circuit on a quantum processor.'],['Measure','Read the qubits out as 0s and 1s.'],['Post-process','Combine many runs and correct errors in the results.'],['Interpret','Turn the numbers back into an answer to the problem.']]},
  {title:'Sharing a key with BB84',steps:[['Send photons','Alice sends photons prepared in random settings.'],['Measure','Bob measures each photon in randomly chosen settings.'],['Compare settings','They announce which settings they used, not the results.'],['Keep matches','Only results where the settings matched are kept.'],['Check for spies','A sample is compared to look for eavesdropping errors.'],['Form the key','The rest becomes the shared secret key.']]}]
};
const LOCK='<svg class="lockic" viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="9" width="12" height="8" rx="2" fill="currentColor"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
function mountLadder(mode){
  mode=mode||'daily';const rr=()=>mountLadder(mode);
  shell('ladder','Term Ladder',true,rr,mode);
  const fam=state.fam;if(doneCard('ladder',fam,mode,'Term Ladder',rr))return;
  const pf=famOf(fam),list=LADDER[pf];
  const L=mode==='daily'?pickNonRepeat(list,'ladder|'+pf,DAYN):list[Math.floor(Math.random()*list.length)];
  const S=L.steps,N=S.length,LAST=N-1,acc=ACC[pf];
  const mids=[];for(let i=1;i<LAST;i++)mids.push(i);
  let order=sshuffle(mids,'ord|'+L.title+'|'+DAYN);if(mode!=='daily')order=shuffle(mids.slice());
  while(order.every((s,i)=>s===i+1))order=shuffle(order.slice());
  const run=newRun('ladder',fam,mode);
  const filled={};let stage=1,msg='Tap a term, then tap the clue it matches.',summary='',glowStep=-1,redShown=false,selStep=null,selRow=null;
  const bank1=sshuffle(mids,'b1|'+L.title),bank3=sshuffle([0,LAST],'b3|'+L.title);
  const g=$('#game');
  const stageText=()=>({1:'STEP 1 OF 3 · MATCH THE TERMS',2:'STEP 2 OF 3 · PUT IN ORDER',3:'STEP 3 OF 3 · UNLOCK THE ENDS',4:'LADDER COMPLETE'}[stage]);
  function row(i){
    const end=i===0||i===LAST;
    if(end&&stage<3)return '<div class="rung locked">'+LOCK+'<span>Locked · order the ladder to unlock</span></div>';
    const done=filled[i];
    const slot=done?'<div class="slot ok">'+esc(S[i][0])+'</div>':'<div class="slot" data-slot="'+i+'">Tap a term, then tap here</div>';
    if(end||stage===1)return '<div class="rung'+(done?' ok':'')+'" data-step="'+i+'"><div class="clue">'+esc(S[i][1])+'</div>'+slot+'</div>';
    return '<div class="rung mid" data-step="'+i+'"><div class="clue"><span class="term">'+esc(S[i][0])+'</span>'+esc(S[i][1])+'</div>'+(stage===2?'<div class="handle" aria-hidden="true">\u2261</div>':'')+'</div>';
  }
  function place(st){filled[st]=true;glowStep=-1;
    if(stage===1&&mids.every(s=>filled[s])){stage=2;msg='All matched. Now tap two rows to swap them into the order they happen.'}
    else if(stage===3&&filled[0]&&filled[LAST]){stage=4;msg='';summary=finish(run)}
    else msg='Right match.';
    render()}
  function render(){
    const bank=stage===1?bank1.filter(s=>!filled[s]):stage===3?bank3.filter(s=>!filled[s]):[];
    g.innerHTML=metaHead(run,LABEL[pf],' · '+stageText())+'<div class="serif" style="font-size:24px;line-height:1.1;margin-top:2px">'+esc(L.title)+'</div>'+
    '<div class="ladder" id="ladder">'+row(0)+order.map(row).join('')+row(LAST)+'</div>'+
    (bank.length?'<div class="tray dock" id="tray">'+bank.map(s=>'<div class="tile" data-v="'+s+'">'+esc(S[s][0])+'</div>').join('')+'</div>':'')+
    '<div class="msg" id="msg">'+msg+'</div>'+
    (stage===4?'<div class="res"><div class="k" style="color:var(--good)">SOLVED</div><div class="a">'+esc(S[0][0])+' to '+esc(S[LAST][0])+'</div><p>You matched every term, put the steps in order and unlocked both ends.</p>'+summary+'<div class="acts"><a class="p" href="#hub">See it in the explainer ›</a>'+(mode==='daily'?'<a href="#hub">More games</a>':'<button id="again">Play another</button>')+''+SHARE_BTN+'</div></div>':'');
    if(glowStep>=0){const t=$('#tray .tile[data-v="'+glowStep+'"]'),sl=$('[data-slot="'+glowStep+'"]');t&&t.classList.add('glow');sl&&sl.classList.add('glow')}
    bindHint(run,hint);
    if(stage===4){const a=$('#again');if(a)a.onclick=rr;return}
    if(stage===1||stage===3){
      $$('#tray .tile').forEach(t=>{t.onclick=()=>{selStep=+t.dataset.v;$$('#tray .tile').forEach(x=>x.classList.toggle('sel',x===t));$('#msg').textContent='Now tap the clue it matches.'}});
      $$('.slot[data-slot]').forEach(sl=>{sl.onclick=()=>{if(selStep===null)return;const st=+sl.dataset.slot,tv=selStep;selStep=null;
        if(tv===st){place(st);return}
        run.wrong++;sl.classList.add('shake');setTimeout(()=>sl.classList.remove('shake'),400);$('#msg').textContent='Not that one. Try another clue.'}});
    }
    if(stage===2){
      $$('.rung.mid').forEach(rEl=>{rEl.onclick=()=>{const st=+rEl.dataset.step;
        if(selRow===null){selRow=st;rEl.classList.add('sel');$('#msg').textContent='Now tap the row to swap with.';return}
        if(selRow===st){selRow=null;rEl.classList.remove('sel');return}
        const i=order.indexOf(selRow),j=order.indexOf(st);const o=order.slice();const t2=o[i];o[i]=o[j];o[j]=t2;order=o;selRow=null;redShown=false;
        if(order.every((sv,k)=>sv===k+1)){stage=3;msg='Ladder solved. The top and bottom rows are open: tap their terms in.'}else{run.wrong++;msg='Swapped. Tap Hint to see which rows are off.'}
        render()}});
    }
  }
  function hint(){
    if(stage===2){
      const wrongIdx=order.map((s,i)=>s!==i+1?i:-1).filter(i=>i>=0);
      if(!wrongIdx.length)return false;
      if(!redShown){redShown=true;$$('.rung.mid').forEach((r,i)=>{if(+r.dataset.step!==i+1)r.classList.add('bad')});$('#msg').textContent='Hint: red rows are in the wrong place.';return true}
      const i=wrongIdx[0],j=order.indexOf(i+1);const o=order.slice();const t=o[i];o[i]=o[j];o[j]=t;order=o;redShown=false;
      if(order.every((s,k)=>s===k+1)){stage=3;msg='Ladder solved. The top and bottom rows are open: tap their terms in.'}else msg='Hint: one row was moved to its place.';
      render();return true;
    }
    const b=stage===1?bank1:bank3;const t=b.find(s=>!filled[s]);if(t===undefined)return false;
    if(glowStep===t){place(t);msg='Hint: placed for you.';$('#msg').textContent=msg;return true}
    glowStep=t;render();$('#msg').textContent='Hint: tap the glowing tile, then tap the glowing clue. Use Hint again to place it for you.';return true;
  }
  render();
}
/* ---------- Path Words ---------- */
const PCOL=['#6B4FD8','#0E8F6B','#D9822B','#2B7FD9','#C23B7A'];
function mountPath(mode){
  mode=mode||'daily';const rr=()=>mountPath(mode);
  shell('path','Path Words',true,rr,mode);
  const fam=state.fam;if(doneCard('path',fam,mode,'Path Words',rr))return;
  const pf=famOf(fam),list=PATHS[pf];
  const D=mode==='daily'?pickNonRepeat(list,'path|'+pf,DAYN):list[Math.floor(Math.random()*list.length)];
  const acc=ACC[pf],g=$('#game'),R=D.R,C=D.C,words=D.words;
  const run=newRun('path',fam,mode);
  const found={};let partials=[],cur=[],drawing=false,base=null,flash=false,wrongTail=[],hintCell=null,hintWord=-1,summary='';
  g.innerHTML='<div id="ph"></div><div class="pgrid" id="pg" style="grid-template-columns:repeat('+C+',minmax(0,1fr))"></div><div class="wl" id="wl"></div><div class="msg" id="msg">Tap letters one after another, each touching the last, to spell a hidden term. Correct letters stay.</div><div id="pres"></div>';
  $('#ph').innerHTML=metaHead(run,LABEL[pf],' · <span id="pn"></span>');
  const pg=$('#pg');
  const cells=[];for(let r=0;r<R;r++)for(let c=0;c<C;c++){const ch=D.grid[r][c];const d=document.createElement('div');d.className='pc'+(ch==='#'?' x':'');d.textContent=ch==='#'?'':ch;d.dataset.r=r;d.dataset.c=c;pg.appendChild(d);cells.push(d)}
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='pover';pg.appendChild(svg);
  const key=(r,c)=>r+','+c;const rc=k=>k.split(',').map(Number);
  const letter=k=>{const [r,c]=rc(k);return D.grid[r][c]};
  const rev=w=>w.split('').reverse().join('');
  const foundSet=()=>{const u={};Object.values(found).forEach(p=>p.forEach(k=>u[k]=1));return u};
  const partialSet=(except)=>{const u={};partials.forEach(p=>{if(p!==except)p.cells.forEach(k=>u[k]=1)});return u};
  const cellEl=(r,c)=>cells[r*C+c];
  const adj=(a,b)=>{const [r1,c1]=rc(a),[r2,c2]=rc(b);return Math.abs(r1-r2)+Math.abs(c1-c2)===1};
  const textOf=(wi,dir)=>dir?rev(words[wi]):words[wi];
  /* can the player's correct start still be finished with free squares? returns the remaining cells or null */
  function completion(prefix,wi,dir){
    const txt=textOf(wi,dir);if(prefix.length>=txt.length)return [];
    const blocked=Object.assign({},foundSet(),partialSet(partials.find(p=>p.word===wi)));prefix.forEach(k=>blocked[k]=1);
    const out=[];
    function dfs(last,i){if(i===txt.length)return true;const [r,c]=rc(last);
      for(const [dr,dc] of [[0,1],[1,0],[0,-1],[-1,0]]){const rr_=r+dr,cc=c+dc;if(rr_<0||cc<0||rr_>=R||cc>=C)continue;const k=key(rr_,cc);if(D.grid[rr_][cc]==='#'||blocked[k]||D.grid[rr_][cc]!==txt[i])continue;blocked[k]=1;out.push(k);if(dfs(k,i+1))return true;out.pop();delete blocked[k]}
      return false}
    return dfs(prefix[prefix.length-1],prefix.length)?out:null;
  }
  /* longest correct start of what the player traced */
  function bestPrefix(trace,ignoreWord){
    const ls=trace.map(letter).join('');let best={k:0,word:-1,dir:0};
    words.forEach((w,wi)=>{if(found[wi])return;if(partials.some(p=>p.word===wi&&wi!==ignoreWord))return;
      [0,1].forEach(dir=>{const t=textOf(wi,dir);let k=0;while(k<ls.length&&k<t.length-1&&ls[k]===t[k])k++;
        while(k>0&&completion(trace.slice(0,k),wi,dir)===null)k--;
        if(k>best.k)best={k,word:wi,dir}})});
    return best;
  }
  function drawPath(poly,color,w,op){if(poly.length<2)return '';const pb=pg.getBoundingClientRect();const pts=poly.map(k=>{const [r,c]=rc(k);const b=cellEl(r,c).getBoundingClientRect();return (b.left+b.width/2-pb.left-10)+','+(b.top+b.height/2-pb.top-10)}).join(' ');return '<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round" opacity="'+op+'"/>'}
  function paint(){
    const own={};Object.keys(found).forEach(i=>found[i].forEach(k=>own[k]=+i));
    const pp={};partials.forEach(p=>p.cells.forEach(k=>pp[k]=1));const ck={};cur.forEach(k=>ck[k]=1);const wr={};wrongTail.forEach(k=>wr[k]=1);
    cells.forEach(el=>{const k=key(el.dataset.r,el.dataset.c);const blocked=el.classList.contains('x');el.style.background='';el.style.color='';
      el.classList.toggle('cur',!!ck[k]&&!wr[k]);el.classList.toggle('pp',!!pp[k]&&!ck[k]);el.classList.toggle('wr',!!wr[k]);el.classList.toggle('hl',k===hintCell);
      if(!blocked&&own[k]!==undefined){el.style.background=PCOL[own[k]%5];el.style.color='#fff'}});
    const pb=pg.getBoundingClientRect();svg.setAttribute('width',pb.width-20);svg.setAttribute('height',pb.height-20);
    let s='';Object.keys(found).forEach(i=>{s+=drawPath(found[i],PCOL[i%5],14,.45)});partials.forEach(p=>{s+=drawPath(p.cells,'#13241B',12,.28)});
    s+=drawPath(cur.filter(k=>!wr[k]||true),flash?'#B4372A':'#13241B',14,.55);svg.innerHTML=s;
    const n=Object.keys(found).length;$('#pn').textContent=n+' OF '+words.length+' FOUND';
    $('#wl').innerHTML=words.map((w,i)=>{const f=!!found[i];const p=partials.find(q=>q.word===i);const k=p?p.cells.length:0;
      const hn=(hintWord===i&&hintCell)?(p?p.cells.length:0):-1;
      const tiles=w.split('').map((ch,idx)=>{const pos=p&&p.dir?w.length-1-idx:idx;const isPart=!f&&p&&(p.dir?idx>=w.length-k:idx<k);const isHint=!f&&hn>=0&&(p&&p.dir?idx===w.length-1-hn:idx===hn);
        return '<b class="'+(isPart?'pr':isHint?'hn':'')+'" style="background:'+(f?PCOL[i%5]:'')+'">'+(f||isPart||isHint?ch:'')+'</b>'}).join('');
      return '<div class="wi" style="border-color:'+(f?PCOL[i%5]:'')+'"><span class="tl">'+tiles+'</span><span class="c">'+esc(D.clues[i])+'</span></div>'}).join('');
    $('#pres').innerHTML=n===words.length?'<div class="res"><div class="k" style="color:var(--good)">EVERY WORD FOUND</div><p>'+D.names.map(esc).join(', ')+'. Open each term to learn it.</p>'+summary+'<div class="acts"><a class="p" href="#hub">Learn these terms ›</a>'+(mode==='daily'?'<a href="#hub">More games</a>':'<button id="pa">Play another</button>')+''+SHARE_BTN+'</div></div>':'';
    const pa=$('#pa');if(pa)pa.onclick=rr;
    refreshHint(run);
  }
  function lockWord(wi,trace){found[wi]=trace.slice();partials=partials.filter(p=>p.word!==wi);if(hintWord===wi){hintCell=null;hintWord=-1}if(window.SGAnim){const els=trace.map(k=>{const [r,c]=rc(k);return cellEl(r,c)});SGAnim.shimmer(els)}if(Object.keys(found).length===words.length){summary=finish(run);setTimeout(()=>{if(window.SGAnim)SGAnim.win(pg,'.pc')},60)}}
  const cellAt=e=>{const t=e.target&&e.target.closest?e.target.closest('.pc'):null;if(t&&pg.contains(t))return t;const el=document.elementFromPoint(e.clientX,e.clientY);const c=el&&el.closest&&el.closest('.pc');return c&&pg.contains(c)?c:null};
  function finishTrace(){
    const trace=cur.slice();cur=[];const ls=trace.map(letter).join('');
    if(base)partials=partials.filter(p=>p!==base);
    const idx=words.findIndex((x,i)=>!found[i]&&(x===ls||rev(x)===ls));
    if(idx>=0){lockWord(idx,trace);$('#msg').textContent='Word found.';paint();base=null;return}
    const best=bestPrefix(trace,base?base.word:-1);
    if(best.k>=1&&(best.k>=2||base)){partials.push({word:best.word,dir:best.dir,cells:trace.slice(0,best.k),t:Date.now()})}
    if(hintCell&&partialSet(null)[hintCell])hintCell=null;
    if(best.k<trace.length&&trace.length>=2){
      wrongTail=trace.slice(best.k);flash=true;run.wrong++;
      $('#msg').textContent=best.k>=1?'Those last letters are wrong. Your correct letters stay. Carry on from the end.':'That is not the start of a hidden word. Try another square.';
      cur=trace;paint();
      setTimeout(()=>{flash=false;wrongTail=[];cur=[];paint()},1100);
    }else{$('#msg').textContent=best.k>=2?'Good, those letters stay. Tap on from the last one, or tap Hint for the next letter.':$('#msg').textContent}
    base=null;paint();
  }
  pg.addEventListener('click',e=>{
    const c=cellAt(e);if(!c||c.classList.contains('x')||flash)return;const k=key(c.dataset.r,c.dataset.c);if(foundSet()[k])return;
    if(cur.length&&k===cur[cur.length-1]){cur.pop();paint();return}
    if(!cur.length){for(const p of partials){if(p.cells[p.cells.length-1]===k){p.cells.pop();if(!p.cells.length)partials=partials.filter(q=>q!==p);paint();return}}}
    if(!cur.length){base=null;cur=[k];for(const p of partials){const i=p.cells.indexOf(k);if(i>=0){base=p;cur=p.cells.slice(0,i+1);break}}wrongTail=[];paint();return}
    const last=cur[cur.length-1];if(k===last)return;
    if(cur.length>1&&k===cur[cur.length-2]){cur.pop();paint();return}
    const other=partialSet(base),fs=foundSet();
    if(adj(last,k)&&cur.indexOf(k)<0&&!fs[k]&&!other[k]){cur.push(k);
      const ls=cur.map(letter).join('');const idx=words.findIndex((x,i)=>!found[i]&&(x===ls||rev(x)===ls));
      if(idx>=0){const tr=cur.slice();cur=[];lockWord(idx,tr);$('#msg').textContent='Word found.';base=null;paint();return}
      const best=bestPrefix(cur.slice(),base?base.word:-1);
      if(best.k<cur.length){finishTrace();return}
      paint();return}
    finishTrace();
    base=null;cur=[k];wrongTail=[];paint();
  });

  bindHint(run,()=>{
    if(flash)return false;
    const sorted=partials.slice().sort((a,b)=>b.t-a.t);
    const p=sorted[0];
    if(p){
      const rest=completion(p.cells,p.word,p.dir);
      if(rest===null){while(p.cells.length&&completion(p.cells,p.word,p.dir)===null)p.cells.pop();if(!p.cells.length)partials=partials.filter(q=>q!==p);hintCell=null;$('#msg').textContent='Hint: the last letters led nowhere, so they were removed. Your earlier letters stay.';paint();return true}
      const next=rest[0];
      if(next===undefined)return false;
      if(hintCell===next&&hintWord===p.word){
        p.cells.push(next);p.t=Date.now();const t=textOf(p.word,p.dir);
        if(p.cells.length>=t.length){lockWord(p.word,p.cells);$('#msg').textContent='Hint: the last letter was placed. Word found.';hintCell=null;paint();return true}
        const r2=completion(p.cells,p.word,p.dir);hintCell=r2&&r2[0]?r2[0]:null;
        $('#msg').textContent='Hint: that letter was placed for you. The next letter is shown in green.';paint();return true}
      hintCell=next;hintWord=p.word;
      $('#msg').textContent='Hint: the next letter is “'+letter(next)+'”, shown in green. Tap Hint again to place it for you.';paint();return true;
    }
    const wi=words.findIndex((w,j)=>!found[j]);if(wi<0)return false;
    const start=key(...D.paths[words[wi]][0]);
    if(hintCell===start&&hintWord===wi){
      partials.push({word:wi,dir:0,cells:[start],t:Date.now()});const r2=completion([start],wi,0);hintCell=r2&&r2[0]?r2[0]:null;
      $('#msg').textContent='Hint: the first letter was placed for you. The next letter is shown in green.';paint();return true}
    hintCell=start;hintWord=wi;
    $('#msg').textContent='Hint: the gold square holds the first letter, “'+words[wi][0]+'”. Tap Hint again to place it for you.';paint();return true;
  });
  const rs=()=>paint();window.addEventListener('resize',rs);cleanups.push(()=>window.removeEventListener('resize',rs));
  paint();
}
/* ---------- Answer Duel and Target Run ---------- */
const PTS=[100,50,25,0];
function mountDuel(mode,players){
  mode=mode||'daily';players=players||1;const rr=()=>mountDuel(mode,players);
  shell('duel',players===2?'Duel a friend':'Answer Duel',true,rr,mode);
  const fam=state.fam;if(players===1&&doneCard('duel',fam,mode,'Answer Duel',rr))return;
  const Q=questions(fam,mode,'duel',5),g=$('#game');
  const run=newRun('duel',fam,mode);
  let qi=0,phase=players===2?'ready':'play',removed=[],scores=[0,0],gained=0,lastRight=false,summary='';
  const accOf=()=>ACC[fam==='all'?famOf(fam):fam];
  function render(){
    const turn=players===2?qi%2:0,q=Q[Math.min(qi,4)],acc=accOf();
    const sb=(players===2?'<div class="score"><div class="'+(turn===0&&phase!=='over'?'on':'')+'" style="'+(turn===0&&phase!=='over'?'background:'+acc:'')+'"><small>PLAYER ONE</small><b>'+scores[0]+'</b></div><div class="'+(turn===1&&phase!=='over'?'on':'')+'" style="'+(turn===1&&phase!=='over'?'background:'+acc:'')+'"><small>PLAYER TWO</small><b>'+scores[1]+'</b></div></div><div class="row"><span style="font-weight:700;letter-spacing:.08em;color:'+acc+'">'+LABEL[fam]+'</span><span>Question '+Math.min(qi+1,5)+' of 5</span></div>':metaHead(run,LABEL[fam],' · QUESTION '+Math.min(qi+1,5)+' OF 5')+'<div class="score"><div class="on" style="background:'+acc+'"><small>POINTS</small><b>'+scores[0]+'</b></div></div>');
    if(phase==='ready'){g.innerHTML=sb+'<div class="ready"><div class="eyebrow" style="color:var(--muted)">PASS THE PHONE</div><div class="serif" style="font-size:38px;line-height:1.1;margin-top:6px">'+(turn===0?'Player One':'Player Two')+', you’re up.</div><p style="color:var(--muted)">One question. Four cards.</p><button class="btn" id="go" style="background:'+acc+';color:#fff;margin-top:12px">Start</button></div>';$('#go').onclick=()=>{phase='play';removed=[];render()};return}
    if(phase==='over'){if(players===2&&!run.celeb){run.celeb=1;const dw=scores[0]===scores[1]?'draw':scores[0]>scores[1]?'Player One':'Player Two';setTimeout(()=>celebrate({title:dw==='draw'?'A shared win!':'Winner: '+dw+'!',sub:scores[0]+' to '+scores[1],stars:3,noSuper:true,noStats:true,sound:dw==='draw'?'draw':'win'}),350)}const w=players===1?scores[0]+' points':scores[0]===scores[1]?'A shared win.':scores[0]>scores[1]?'Player One wins.':'Player Two wins.';g.innerHTML=sb+'<div class="res" style="text-align:center"><div class="k" style="color:var(--good)">'+(players===1?'ALL 5 ANSWERED':'MATCH OVER')+'</div><div class="a" style="font-size:38px">'+w+'</div>'+summary+'<div class="acts" style="justify-content:center">'+(mode==='daily'&&players===1?'<a class="p" href="#hub">More games</a>':'<button class="p" id="rm">Play again</button>')+'<a href="#hub">Review the terms ›</a></div></div>';const rm=$('#rm');if(rm)rm.onclick=rr;refreshHint(run);return}
    if(phase==='result'){g.innerHTML=sb+'<div class="res" style="text-align:center"><div class="k" style="color:'+(lastRight?'var(--good)':'var(--bad)')+'">'+(lastRight?'CORRECT · +'+gained+' POINTS':'THE RIGHT CARD WAS')+'</div><div class="a" style="font-size:36px">'+esc(q.answer)+'</div><p>'+esc(q.q)+'</p><div class="acts" style="justify-content:center"><button class="p" id="nx">'+(qi>=4?'See the result':'Next')+'</button></div></div>';$('#nx').onclick=()=>{if(qi>=4){phase='over';summary=players===1?finish(run):''}else{qi++;phase=players===2?'ready':'play';removed=[]}render()};bindHint(run,()=>false);return}
    g.innerHTML=sb+'<div class="qcard" id="qz"><small>TAP A CARD, THEN TAP HERE</small><div class="q">'+esc(q.q)+'</div></div><div class="hand" id="hand">'+q.opts.map(t=>'<div class="tile'+(removed.indexOf(t)>=0?' gone':'')+'" data-v="'+esc(t)+'">'+esc(t)+'</div>').join('')+'</div><div class="msg" id="msg" style="text-align:center">This card is worth '+PTS[Math.min(removed.length,3)]+' points right now.</div>';
    if(players===1)bindHint(run,hint);
    const qz=$('#qz');let selCard=null;
    $$('#hand .tile:not(.gone)').forEach(t=>{t.onclick=()=>{selCard=t.dataset.v;$$('#hand .tile').forEach(x=>x.classList.toggle('sel',x===t));const m=$('#msg');if(m)m.textContent='Now tap the question to play that card.'}});
    qz.onclick=()=>{if(selCard===null||phase!=='play')return;const v=selCard;selCard=null;
      if(v===q.answer){gained=PTS[Math.min(removed.length,3)];scores[turn]+=gained;lastRight=true;phase='result';render();return}
      removed.push(v);run.wrong++;qz.classList.add('shake');setTimeout(()=>{if(removed.length===3){gained=0;lastRight=false;phase='result'}render()},300)};
  }
  function hint(){
    const q=Q[Math.min(qi,4)];const wrongLeft=q.opts.filter(o=>o!==q.answer&&removed.indexOf(o)<0);
    if(wrongLeft.length>1){removed.push(wrongLeft[0]);render();$('#msg').textContent='Hint: one wrong card removed. This card is now worth '+PTS[Math.min(removed.length,3)]+' points.';return true}
    const t=$('#hand .tile[data-v="'+q.answer.replace(/"/g,'\\"')+'"]');if(t){t.classList.add('glow');$('#msg').textContent='Hint: tap the glowing card, then tap the question.'}return true;
  }
  render();
}
/* ---------- Kings (one king per row, column and group) ---------- */
const QUEENS=GAMES_DATA.queens;
const QCOL=['#F4B6B0','#F7D08A','#B7DDA8','#A9CCFA','#D3B7F2','#F2A6C7','#9ED9D2','#DAD3AE'];
const KING='<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M14 74 L8 32 L31 48 L50 18 L69 48 L92 32 L86 74Z" fill="#FFC83D" stroke="#1F2A44" stroke-width="4" stroke-linejoin="round"/><rect x="14" y="72" width="72" height="14" rx="6" fill="#F29F05" stroke="#1F2A44" stroke-width="4"/><circle cx="8" cy="30" r="6" fill="#fff" stroke="#1F2A44" stroke-width="3.5"/><circle cx="50" cy="16" r="6" fill="#fff" stroke="#1F2A44" stroke-width="3.5"/><circle cx="92" cy="30" r="6" fill="#fff" stroke="#1F2A44" stroke-width="3.5"/><circle cx="41" cy="58" r="4.6" fill="#1F2A44"/><circle cx="59" cy="58" r="4.6" fill="#1F2A44"/><circle cx="42.4" cy="56.4" r="1.6" fill="#fff"/><circle cx="60.4" cy="56.4" r="1.6" fill="#fff"/><path d="M44 66 Q50 71 56 66" stroke="#1F2A44" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="34" cy="65" r="3.4" fill="#FF9E8A" opacity=".9"/><circle cx="66" cy="65" r="3.4" fill="#FF9E8A" opacity=".9"/></svg>';
function exBoard(kind){
  const L=['POOOO','BGBOB','BGBBB','BBBYY','BBBBB'];const col={P:'#C9B6E8',O:'#FDD2A5',B:'#ABC9F8',G:'#C4E5B4',Y:'#E2E2E2'};
  const kings={row:[[0,0]],col:[[0,0]],region:[[2,3],[4,1]],touch:[[2,2],[3,3]]}[kind];
  const xs=kind==='row'?[[0,1],[0,2],[0,3],[0,4]]:kind==='col'?[[1,0],[2,0],[3,0],[4,0]]:[];
  const bad=kind==='region'||kind==='touch';
  let h='<div class="exb">';
  for(let r=0;r<5;r++)for(let c=0;c<5;c++){
    const id=L[r][c];const k=kings.some(p=>p[0]===r&&p[1]===c),x=xs.some(p=>p[0]===r&&p[1]===c);
    const hatch=bad&&((kind==='region'&&id==='B')||(kind==='touch'&&k));
    const bd=(dr,dc)=>{const rr=r+dr,cc=c+dc;return (rr<0||cc<0||rr>4||cc>4||L[rr][cc]!==id)?'2px solid #13241B':'1px solid rgba(19,36,27,.2)'};
    h+='<div class="exc'+(hatch?' hatch':'')+'" style="background-color:'+col[id]+';border-top:'+bd(-1,0)+';border-left:'+bd(0,-1)+';border-right:'+bd(0,1)+';border-bottom:'+bd(1,0)+'">'+(k?'<span style="width:70%;height:70%;display:flex;color:'+(bad?'#B4372A':'#13241B')+'">'+KING+'</span>':x?'<span style="font-weight:700;color:rgba(19,36,27,.6)">×</span>':'')+'</div>';
  }
  return h+'</div>';
}
function mountQueens(mode){
  mode=mode||'daily';const rr=()=>mountQueens(mode);
  shell('queens','Kings',false,rr,mode);
  const fam='any';if(doneCard('queens',fam,mode,'Kings',rr))return;
  const weekend=[0,6].indexOf((TODAY+4)%7)>=0;
  const pool=mode==='daily'?QUEENS[weekend?'8':'7']:QUEENS['6'].concat(QUEENS['7'],QUEENS['8']);
  const P=mode==='daily'?pickNonRepeat(pool,'queens'+(weekend?'8':'7'),DAYN):pool[Math.floor(Math.random()*pool.length)];
  const N=P.N,reg=P.reg.map(r=>r.split('').map(Number)),sol=P.sol;
  const run=newRun('queens',fam,mode);
  let mark=Array.from({length:N},()=>Array(N).fill(0));const wrongMark=new Set(),revealed=new Set();let solved=false,msg='Tap a square for a ×, tap again for a crown.',summary='',lastPlace=null;const hist=[];
  const g=$('#game');
  const kingsN=()=>{let n=0;mark.forEach(r=>r.forEach(v=>{if(v===2)n++}));return n};
  const snap=()=>hist.push(JSON.stringify({mark,w:[...wrongMark],v:[...revealed]}));
  function conflicts(){
    const bad=new Set(),rb=new Set(),cb=new Set(),gb=new Set();const cs=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(mark[r][c]===2)cs.push([r,c]);
    for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++){const [r1,c1]=cs[i],[r2,c2]=cs[j];
      if(r1===r2){rb.add(r1);bad.add(r1+','+c1);bad.add(r2+','+c2)}
      if(c1===c2){cb.add(c1);bad.add(r1+','+c1);bad.add(r2+','+c2)}
      if(reg[r1][c1]===reg[r2][c2]){gb.add(reg[r1][c1]);bad.add(r1+','+c1);bad.add(r2+','+c2)}
      if(Math.abs(r1-r2)<=1&&Math.abs(c1-c2)<=1){bad.add(r1+','+c1);bad.add(r2+','+c2)}}
    return {bad,rb,cb,gb};
  }
  function render(){
    const cf=conflicts(),bad=cf.bad;const n=kingsN();
    if(n===N&&bad.size===0&&!solved){solved=true;summary=finish(run);setTimeout(()=>{if(window.SGAnim)SGAnim.win($('#qb'),'.cr')},60)}
    let h=metaHead(run,'PUZZLE',' · '+n+' OF '+N+' KINGS')+'<div class="qb" id="qb" style="grid-template-columns:repeat('+N+',minmax(0,1fr))">';
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){
      const k=r+','+c,v=mark[r][c],id=reg[r][c];
      const bd=(dr,dc)=>{const rr_=r+dr,cc=c+dc;return (rr_<0||cc<0||rr_>=N||cc>=N||reg[rr_][cc]!==id)?'3px solid var(--ink)':'1px solid rgba(19,36,27,.18)'};
      const hatch=cf.rb.has(r)||cf.cb.has(c)||cf.gb.has(id);
      h+='<div class="qc'+(v===2?' has':'')+((bad.has(k)||wrongMark.has(k))?' err':'')+(hatch?' hatch':'')+(revealed.has(k)?' rev':'')+'" data-r="'+r+'" data-c="'+c+'" style="background-color:'+QCOL[id]+';border-top:'+bd(-1,0)+';border-left:'+bd(0,-1)+';border-right:'+bd(0,1)+';border-bottom:'+bd(1,0)+'">'+(v===2?'<span class="cr">'+KING+'</span>':v===1?'<span class="xm">×</span>':'')+'</div>';
    }
    h+='</div>';
    h+='<div class="qstat"><span class="cr">'+KING+'</span> Crowns left: '+(N-n)+' of '+N+'</div>';
    h+='<div class="qact"><button class="ghost" id="undo"'+(hist.length?'':' disabled')+'>Undo</button><button class="ghost" id="reset">Reset</button></div><div class="msg" id="msg" style="text-align:center">'+msg+'</div>';
    if(solved){
      h+='<div class="res"><div class="k" style="color:var(--good)">SOLVED</div><div class="a">Every row, column and colour has one king.</div>'+summary+'<div class="acts">'+(mode==='daily'?'<a class="p" href="#hub">More puzzles</a>':'<button class="p" id="qa">New puzzle</button>')+''+SHARE_BTN+'</div></div>';
    }
    g.innerHTML=h;bindHint(run,hint);
    const u=$('#undo');if(u)u.onclick=()=>{if(!hist.length)return;const s0=JSON.parse(hist.pop());mark=s0.mark;wrongMark.clear();s0.w.forEach(x=>wrongMark.add(x));revealed.clear();s0.v.forEach(x=>revealed.add(x));msg='Undone.';render()};
    const rs=$('#reset');if(rs)rs.onclick=()=>{snap();mark=Array.from({length:N},()=>Array(N).fill(0));wrongMark.clear();revealed.clear();msg='Board cleared.';render()};
    if(solved){const a=$('#qa');if(a)a.onclick=rr;return}
    const cellEls=()=>$$('#qb .qc');
    $$('#qb .qc').forEach(cell=>{
      let lpT=0,lpFired=false;
      cell.addEventListener('pointerdown',()=>{lpFired=false;clearTimeout(lpT);lpT=setTimeout(()=>{lpFired=true;const r=+cell.dataset.r,c=+cell.dataset.c;if(mark[r][c]!==0){snap();mark[r][c]=0;wrongMark.delete(r+','+c);revealed.delete(r+','+c);msg='Square cleared.';render()}},500)});
      ['pointerup','pointerleave','pointercancel'].forEach(ev=>cell.addEventListener(ev,()=>clearTimeout(lpT)));
      cell.onclick=()=>{if(lpFired||solved)return;const r=+cell.dataset.r,c=+cell.dataset.c;const v=mark[r][c];
        if(v===0){snap();mark[r][c]=1;msg='Marked with a ×. Tap again for a crown.'}
        else if(v===1){if(kingsN()>=N){msg='All '+N+' crowns are on the board. Clear one first.';render();return}snap();mark[r][c]=2;msg='Crown placed.';lastPlace=[r,c]}
        else{snap();mark[r][c]=0;msg='Square cleared.'}
        wrongMark.delete(r+','+c);revealed.delete(r+','+c);render()};
    });
    if(lastPlace&&window.SGAnim){const lp=lastPlace;lastPlace=null;const el=cellEls().find(x=>+x.dataset.r===lp[0]&&+x.dataset.c===lp[1]);if(el)SGAnim.pop(el);
      const cs=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(mark[r][c]===2)cs.push([r,c]);let touched=false;
      for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++)if(Math.abs(cs[i][0]-cs[j][0])<=1&&Math.abs(cs[i][1]-cs[j][1])<=1)touched=true;
      if(touched)cs.forEach(([r,c])=>{const e2=cellEls().find(x=>+x.dataset.r===r&&+x.dataset.c===c);if(e2)SGAnim.gasp(e2)});}
  }
  function hint(){
    const wrongs=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(mark[r][c]===2&&sol[r]!==c)wrongs.push(r+','+c);
    if(wrongs.length){wrongs.forEach(k=>wrongMark.add(k));msg='Hint: the red crowns are in the wrong place. Tap a red crown to clear it.';run.wrong++;render();return true}
    const sizes=reg.flat().reduce((a,v)=>{a[v]=(a[v]||0)+1;return a},{});
    let best=-1,bs=99;for(let r=0;r<N;r++){if(mark[r][sol[r]]!==2&&sizes[reg[r][sol[r]]]<bs){bs=sizes[reg[r][sol[r]]];best=r}}
    if(best<0)return false;
    if(kingsN()>=N){msg='Hint: remove a king first, then use Hint again.';render();return false}
    snap();mark[best][sol[best]]=2;revealed.add(best+','+sol[best]);msg='Hint: a crown was placed for you (shown in green).';render();return true;
  }
  render();
  if(window.SGAnim)SGAnim.startIdle({board:()=>$('#qb'),chars:()=>$$('#qb .qc.has .cr')});
}
/* ---------- Trail (draw one path through every square, numbers in order) ---------- */
const TRAIL=GAMES_DATA.trail;
function mountTrail(mode){
  mode=mode||'daily';const rr=()=>mountTrail(mode);
  shell('trail','Trail',false,rr,mode);
  const fam='any';if(doneCard('trail',fam,mode,'Trail',rr))return;
  const P=mode==='daily'?pickNonRepeat(TRAIL,'trail',DAYN):TRAIL[Math.floor(Math.random()*TRAIL.length)];
  const N=P.N,sol=P.path.map(p=>p[0]+','+p[1]);const nums={};P.nums.forEach(([r,c,v])=>nums[r+','+c]=v);const K=Math.max(...Object.values(nums));
  const wl=new Set();P.walls.forEach(([a,b])=>wl.add(a[0]+','+a[1]+'|'+b[0]+','+b[1]));
  const wall=(a,b)=>{const [r1,c1]=a.split(',').map(Number),[r2,c2]=b.split(',').map(Number);const x=[[r1,c1],[r2,c2]].sort((p,q)=>p[0]-q[0]||p[1]-q[1]);return wl.has(x[0][0]+','+x[0][1]+'|'+x[1][0]+','+x[1][1])};
  const run=newRun('trail',fam,mode);const g=$('#game');
  let path=[],drawing=false,solved=false,summary='',msg='Tap square 1, then tap each next square to draw the path.',gold=new Set(),red=new Set(),supTap=false;
  const hist=[];
  function nextNeeded(){let n=0;path.forEach(k=>{if(nums[k])n++});return n+1}
  function render(){
    if(path.length===N*N&&nums[path[path.length-1]]===K&&!solved){solved=true;summary=finish(run);setTimeout(()=>{if(window.SGAnim)SGAnim.win($('#tb'),'.tc')},60)}
    let h=metaHead(run,'PUZZLE',' · '+path.length+' OF '+(N*N))+'<div class="tb" id="tb" style="grid-template-columns:repeat('+N+',minmax(0,1fr))">';
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){const k=r+','+c;const t=(dr,dc)=>{const rr_=r+dr,cc=c+dc;if(rr_<0||cc<0||rr_>=N||cc>=N)return '3px solid var(--ink)';return wall(k,rr_+','+cc)?'4px solid var(--ink)':'1px solid var(--line)'};
      h+='<div class="tc'+(path.indexOf(k)>=0?' on':'')+(gold.has(k)?' gold':'')+(red.has(k)?' red':'')+'" data-r="'+r+'" data-c="'+c+'" style="border-top:'+t(-1,0)+';border-left:'+t(0,-1)+';border-right:'+t(0,1)+';border-bottom:'+t(1,0)+'">'+(nums[k]?'<span class="nm">'+nums[k]+'</span>':'')+'</div>';}
    h+='<svg id="tov" class="tov"></svg></div><div class="qact"><button class="ghost" id="undo"'+(path.length?'':' disabled')+'>Undo</button><button class="ghost" id="reset">Reset</button></div><div class="msg" id="msg" style="text-align:center">'+msg+'</div>';
    if(solved)h+='<div class="res"><div class="k" style="color:var(--good)">SOLVED</div><div class="a">One path through every square.</div>'+summary+'<div class="acts">'+(mode==='daily'?'<a class="p" href="#hub">More puzzles</a>':'<button class="p" id="ta">New puzzle</button>')+''+SHARE_BTN+'</div></div>';
    g.innerHTML=h;bindHint(run,hint);paint();
    const u=$('#undo');if(u)u.onclick=()=>{if(solved||!path.length)return;path.pop();gold.clear();red.clear();msg='Step removed.';render()};
    const rs=$('#reset');if(rs)rs.onclick=()=>{path=[];gold.clear();red.clear();msg='Path cleared.';render()};
    const ta=$('#ta');if(ta)ta.onclick=rr;
    if(solved)return;
    const tb=$('#tb');
    const cellAt=e=>{const t=e.target&&e.target.closest?e.target.closest('.tc'):null;if(t&&tb.contains(t))return t.dataset.r+','+t.dataset.c;const el=document.elementFromPoint(e.clientX,e.clientY);const c=el&&el.closest&&el.closest('.tc');return c&&tb.contains(c)?c.dataset.r+','+c.dataset.c:null};
    tb.addEventListener('pointerdown',e=>{const k=cellAt(e);if(!k)return;
      if(!path.length){if(nums[k]!==1)return}
      else if(path[path.length-1]!==k){const i=path.indexOf(k);if(i<0)return;path=path.slice(0,i+1);supTap=true}
      e.preventDefault();tb.setPointerCapture(e.pointerId);drawing=true;gold.clear();red.clear();if(!path.length){path=[k];supTap=true}paint()});
    tb.addEventListener('pointermove',e=>{if(!drawing)return;const k=cellAt(e);if(!k)return;const last=path[path.length-1];if(k===last)return;
      const [r1,c1]=last.split(',').map(Number),[r2,c2]=k.split(',').map(Number);if(Math.abs(r1-r2)+Math.abs(c1-c2)!==1)return;
      if(path.length>1&&k===path[path.length-2]){path.pop();supTap=true;paint();return}
      if(path.indexOf(k)>=0||wall(last,k))return;
      if(nums[k]&&nums[k]!==nextNeeded())return;
      path.push(k);supTap=true;paint()});
    const end=e=>{if(!drawing)return;drawing=false;try{tb.releasePointerCapture(e.pointerId)}catch(_){}render()};
    tb.addEventListener('pointerup',end);tb.addEventListener('pointercancel',end);
    tb.addEventListener('click',e=>{if(solved)return;if(supTap){supTap=false;return}
      const t=e.target&&e.target.closest?e.target.closest('.tc'):null;if(!t||!tb.contains(t))return;const k=t.dataset.r+','+t.dataset.c;
      if(!path.length)return;
      if(k===path[path.length-1]){path.pop()}
      else{const i=path.indexOf(k);if(i>=0)path=path.slice(0,i+1);
        else{const last=path[path.length-1];const [r1,c1]=last.split(',').map(Number),[r2,c2]=k.split(',').map(Number);if(Math.abs(r1-r2)+Math.abs(c1-c2)!==1)return;if(wall(last,k))return;if(nums[k]&&nums[k]!==nextNeeded())return;path.push(k)}}
      gold.clear();red.clear();render()});
  }
  function paint(){
    const tb=$('#tb');if(!tb)return;const cells=$$('.tc',tb);const svg=$('#tov');const pb=tb.getBoundingClientRect();
    svg.setAttribute('width',pb.width);svg.setAttribute('height',pb.height);
    const pts=path.map(k=>{const [r,c]=k.split(',').map(Number);const b=cells[r*N+c].getBoundingClientRect();return (b.left+b.width/2-pb.left)+','+(b.top+b.height/2-pb.top)});
    svg.innerHTML=pts.length>1?'<polyline class="sg-trailglow" points="'+pts.join(' ')+'" fill="none" stroke="#0E6B47" stroke-opacity=".55" stroke-width="'+(pb.width/N*.42)+'" stroke-linecap="round" stroke-linejoin="round"/>':'';
    cells.forEach(el=>{const k=el.dataset.r+','+el.dataset.c;el.classList.toggle('on',path.indexOf(k)>=0)});
  }
  function hint(){
    if(solved)return false;
    let m=-1;for(let i=0;i<path.length;i++){if(path[i]!==sol[i]){m=i;break}}
    if(m>=0){for(let i=m;i<path.length;i++)red.add(path[i]);path=path.slice(0,m);msg='Hint: the red part went off track, so it was removed. Carry on from the end.';render();setTimeout(()=>{red.clear();const t=$$('.tc.red');t.forEach(x=>x.classList.remove('red'))},1800);return true}
    const start=path.length,add=sol.slice(start,start+3);if(!add.length)return false;
    add.forEach(k=>{path.push(k);gold.add(k)});msg='Hint: the next squares were drawn for you (shown in green).';render();return true;
  }
  render();
}
/* ---------- Fox & Penguin (balance two symbols) ---------- */
const SUNMOON=GAMES_DATA.gems;
const FOXSVG='<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M14 58 L12 14 L36 30 Q50 26 64 30 L88 14 L86 58 Q86 88 50 90 Q14 88 14 58Z" fill="#F28A30" stroke="#1F2A44" stroke-width="4" stroke-linejoin="round"/><path d="M18 22 L30 31 L19 40Z M82 22 L70 31 L81 40Z" fill="#FFD2A8"/><path d="M16 66 Q34 62 50 74 Q66 62 84 66 Q80 88 50 90 Q20 88 16 66Z" fill="#FFF8EC" stroke="#1F2A44" stroke-width="3" stroke-linejoin="round"/><circle cx="37" cy="52" r="5.6" fill="#1F2A44"/><circle cx="63" cy="52" r="5.6" fill="#1F2A44"/><circle cx="38.8" cy="50.2" r="1.9" fill="#fff"/><circle cx="64.8" cy="50.2" r="1.9" fill="#fff"/><ellipse cx="50" cy="68" rx="5" ry="3.6" fill="#1F2A44"/><path d="M44 75 Q50 80 56 75" stroke="#1F2A44" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
const PENGSVG='<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M18 78 Q4 70 10 54 Q16 62 22 64Z M82 78 Q96 70 90 54 Q84 62 78 64Z" fill="#2B3A67" stroke="#1F2A44" stroke-width="3.5" stroke-linejoin="round"/><ellipse cx="50" cy="54" rx="31" ry="40" fill="#2B3A67" stroke="#1F2A44" stroke-width="4"/><ellipse cx="50" cy="64" rx="21" ry="28" fill="#FFF8EC"/><circle cx="39" cy="44" r="8" fill="#fff" stroke="#1F2A44" stroke-width="3"/><circle cx="61" cy="44" r="8" fill="#fff" stroke="#1F2A44" stroke-width="3"/><circle cx="40" cy="45" r="4" fill="#1F2A44"/><circle cx="60" cy="45" r="4" fill="#1F2A44"/><circle cx="41.4" cy="43.4" r="1.5" fill="#fff"/><circle cx="61.4" cy="43.4" r="1.5" fill="#fff"/><path d="M43 55 L57 55 L50 64Z" fill="#F5A524" stroke="#1F2A44" stroke-width="3" stroke-linejoin="round"/><circle cx="31" cy="56" r="3.6" fill="#FF9E8A" opacity=".9"/><circle cx="69" cy="56" r="3.6" fill="#FF9E8A" opacity=".9"/><path d="M36 94 L46 94 M54 94 L64 94" stroke="#F5A524" stroke-width="6" stroke-linecap="round"/></svg>';
function mountSunMoon(mode){
  mode=mode||'daily';const rr=()=>mountSunMoon(mode);
  shell('gems','Fox & Penguin',false,rr,mode);
  const fam='any';if(doneCard('gems',fam,mode,'Fox & Penguin',rr))return;
  const P=mode==='daily'?pickNonRepeat(SUNMOON,'gems',DAYN):SUNMOON[Math.floor(Math.random()*SUNMOON.length)];
  const N=6,sol=P.sol.map(r=>r.split('').map(Number));const given={};P.given.forEach(([r,c,v])=>given[r+','+c]=v);
  const grid=Array.from({length:N},(_,r)=>Array.from({length:N},(_,c)=>given[r+','+c]||0));
  const run=newRun('gems',fam,mode);const g=$('#game');const wrongMark=new Set(),revealed=new Set();let solved=false,summary='',msg='Tap a square: fox, penguin, then empty.',toolN=null,lastPlace=null;const hist=[];
  const sym=v=>v===1?FOXSVG:v===2?PENGSVG:'';
  let reason={};
  function violations(){
    reason={};const bad=new Set();
    for(let r=0;r<N;r++){const row=grid[r];[1,2].forEach(v=>{if(row.filter(x=>x===v).length>3){reason.count=1;row.forEach((x,c)=>{if(x===v)bad.add(r+','+c)})}});for(let c=0;c<N-2;c++)if(row[c]&&row[c]===row[c+1]&&row[c]===row[c+2]){reason.triple=1;bad.add(r+','+c);bad.add(r+','+(c+1));bad.add(r+','+(c+2))}}
    for(let c=0;c<N;c++){const col=grid.map(r=>r[c]);[1,2].forEach(v=>{if(col.filter(x=>x===v).length>3){reason.count=1;col.forEach((x,r)=>{if(x===v)bad.add(r+','+c)})}});for(let r=0;r<N-2;r++)if(col[r]&&col[r]===col[r+1]&&col[r]===col[r+2]){reason.triple=1;bad.add(r+','+c);bad.add((r+1)+','+c);bad.add((r+2)+','+c)}}
    P.edges.forEach(([r1,c1,r2,c2,t])=>{const a=grid[r1][c1],b=grid[r2][c2];if(a&&b&&((t==='=')!==(a===b))){bad.add(r1+','+c1);bad.add(r2+','+c2);reason.edge=1}});
    return bad;
  }
  const snap=()=>hist.push(JSON.stringify({g:grid,w:[...wrongMark],v:[...revealed]}));
  function render(){
    const bad=violations();const full=grid.every(r=>r.every(v=>v>0));
    if(full&&bad.size===0&&!solved){solved=true;summary=finish(run);setTimeout(()=>{if(window.SGAnim)SGAnim.win($('#mb'),'.mc')},60)}
    let h=metaHead(run,'PUZZLE',' · FOX AND PENGUIN')+'<div class="mb" id="mb">';
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){const k=r+','+c;const gv=!!given[k];h+='<div class="mc'+(gv?' gv':'')+((bad.has(k)||wrongMark.has(k))?' err':'')+(revealed.has(k)?' rev':'')+'" data-r="'+r+'" data-c="'+c+'">'+sym(grid[r][c])+'</div>'}
    P.edges.forEach(([r1,c1,r2,c2,t])=>{const horiz=r1===r2;const left=horiz?((c1+1)/N*100):((c1+.5)/N*100),top=horiz?((r1+.5)/N*100):((r1+1)/N*100);h+='<span class="eg" style="left:'+left+'%;top:'+top+'%">'+(t==='='?'=':'×')+'</span>'});
    h+='</div><div class="dtray" id="dt" style="grid-template-columns:1fr 1fr 1fr"><div class="tile" data-n="1" aria-label="Fox"><span style="width:30px;height:30px;display:inline-block">'+FOXSVG+'</span></div><div class="tile" data-n="2" aria-label="Penguin"><span style="width:30px;height:30px;display:inline-block">'+PENGSVG+'</span></div><div class="tile" data-n="0" style="font-size:14px">Erase</div></div>';
    h+='<div class="qact"><button class="ghost" id="undo"'+(hist.length?'':' disabled')+'>Undo</button><button class="ghost" id="reset">Reset</button></div><div class="msg" id="msg" style="text-align:center">'+(reason.triple?'<b style="color:var(--bad)">Rule broken: never three of the same icon in a row.</b>':reason.count?'<b style="color:var(--bad)">Rule broken: only three of each icon per row and column.</b>':reason.edge?'<b style="color:var(--bad)">Rule broken: check the = and × marks.</b>':msg)+'</div>';
    if(solved)h+='<div class="res"><div class="k" style="color:var(--good)">SOLVED</div><div class="a">Perfectly balanced.</div>'+summary+'<div class="acts">'+(mode==='daily'?'<a class="p" href="#hub">More puzzles</a>':'<button class="p" id="sa">New puzzle</button>')+''+SHARE_BTN+'</div></div>';
    g.innerHTML=h;bindHint(run,hint);
    if(lastPlace){const mb=$('#mb');const el=mb&&mb.querySelector('.mc[data-r="'+lastPlace[0]+'"][data-c="'+lastPlace[1]+'"]');if(el&&window.SGAnim){SGAnim.pop(el);SGAnim.neighbours(mb,el,'.mc')}lastPlace=null}
    const u=$('#undo');if(u)u.onclick=()=>{if(!hist.length)return;const s0=JSON.parse(hist.pop());s0.g.forEach((row,r)=>row.forEach((v,c)=>grid[r][c]=v));wrongMark.clear();s0.w.forEach(x=>wrongMark.add(x));revealed.clear();s0.v.forEach(x=>revealed.add(x));msg='Undone.';render()};
    const rs=$('#reset');if(rs)rs.onclick=()=>{snap();for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(!given[r+','+c])grid[r][c]=0;wrongMark.clear();revealed.clear();msg='Board cleared.';render()};
    const sa=$('#sa');if(sa)sa.onclick=rr;
    if(solved)return;
    const cellEls=()=>$$('#mb .mc').filter(c=>!c.classList.contains('gv'));
    $$('#dt .tile').forEach(t=>{t.onclick=()=>{toolN=+t.dataset.n;$$('#dt .tile').forEach(x=>x.classList.toggle('sel',x===t));$('#msg').textContent=toolN===0?'Now tap a square to clear it.':'Now tap a square to place it.'}});
    $$('#mb .mc').forEach(cell=>{if(cell.classList.contains('gv'))return;cell.onclick=()=>{const r=+cell.dataset.r,c=+cell.dataset.c;snap();grid[r][c]=toolN===null?(grid[r][c]+1)%3:toolN;wrongMark.delete(r+','+c);revealed.delete(r+','+c);lastPlace=[r,c];msg='Tap a square: fox, penguin, then empty.';render()}});
  }
  function hint(){
    const wrongs=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(!given[r+','+c]&&grid[r][c]>0&&grid[r][c]!==sol[r][c])wrongs.push(r+','+c);
    if(wrongs.length){wrongs.forEach(k=>wrongMark.add(k));msg='Hint: the red squares are wrong. Tap them to change them, or use the Erase tile.';run.wrong++;render();return true}
    let best=null,bs=-1;for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(grid[r][c]===0){let s=0;if(grid[r].filter(x=>x>0).length>=4)s+=2;if(grid.map(rw=>rw[c]).filter(x=>x>0).length>=4)s+=2;P.edges.forEach(e=>{if((e[0]===r&&e[1]===c)||(e[2]===r&&e[3]===c))s++});if(s>bs){bs=s;best=[r,c]}}
    if(!best)return false;snap();const [r,c]=best;grid[r][c]=sol[r][c];revealed.add(r+','+c);msg='Hint: a square was filled for you (shown in green).';render();return true;
  }
  render();
  if(window.SGAnim)SGAnim.startIdle({board:()=>$('#mb'),chars:()=>$$('#mb .mc svg')});
}
/* ---------- Double Up (merge equal numbers until one is left) ---------- */
const DOUBLE=GAMES_DATA.double;
const isNum=t=>/^\d+$/.test(t);
function mergeVal(a,b){
  if(a===''||b==='')return null;
  if(isNum(a)&&isNum(b))return a===b?String(+a+ +b):null;
  if(isNum(a)&&!isNum(b))return b==='+3'?String(+a+3):String(+a*2);
  if(!isNum(a)&&isNum(b))return a==='+3'?String(+b+3):String(+b*2);
  return null;
}
const DCOL=v=>{v=+v;return v<=1?'#FDE2A7':v<=2?'#FBC9A5':v<=3?'#F6B7B7':v<=4?'#F2A6C7':v<=5?'#E3B2F0':v<=6?'#C9B6F7':v<=8?'#A9C7FA':v<=16?'#8ED8E8':v<=32?'#8FE0C0':v<=64?'#BFE58A':'#F3E27A'};
function mountDouble(mode){
  mode=mode||'daily';const rr=()=>mountDouble(mode);
  shell('double','Double Up',false,rr,mode);
  const fam='any';if(doneCard('double',fam,mode,'Double Up',rr))return;
  const P=mode==='daily'?pickNonRepeat(DOUBLE,'double',DAYN):DOUBLE[Math.floor(Math.random()*DOUBLE.length)];
  const N=P.N;let grid=P.cells.slice();const hist=[];let solved=false,summary='',msg='Tap a number, then tap an equal neighbour.',pending=null,lastTo=-1,selI=null,burstTo=-1;
  const run=newRun('double',fam,mode);const g=$('#game');
  const nb=i=>{const r=Math.floor(i/N),c=i%N,o=[];[[0,1],[1,0],[0,-1],[-1,0]].forEach(([dr,dc])=>{const rr_=r+dr,cc=c+dc;if(rr_>=0&&cc>=0&&rr_<N&&cc<N)o.push(rr_*N+cc)});return o};
  const memo=new Map();
  function solvable(gr){const key=gr.join(',');if(memo.has(key))return memo.get(key);const toks=gr.filter(x=>x!=='');let res=false;
    if(toks.length===1)res=isNum(toks[0]);
    else outer:for(let i=0;i<gr.length;i++){if(gr[i]==='')continue;for(const j of nb(i)){const v=mergeVal(gr[i],gr[j]);if(v===null)continue;const g2=gr.slice();g2[i]='';g2[j]=v;if(solvable(g2)){res=true;break outer}}}
    memo.set(key,res);return res}
  function bestMove(gr){for(let i=0;i<gr.length;i++){if(gr[i]==='')continue;for(const j of nb(i)){const v=mergeVal(gr[i],gr[j]);if(v===null)continue;const g2=gr.slice();g2[i]='';g2[j]=v;if(solvable(g2))return {from:i,to:j,v}}}return null}
  const anyMove=gr=>gr.some((a,i)=>a!==''&&nb(i).some(j=>mergeVal(a,gr[j])!==null));
  const left=()=>grid.filter(x=>x!=='').length;
  function doMerge(i,j){const v=mergeVal(grid[i],grid[j]);if(v===null)return false;hist.push(grid.slice());grid[i]='';grid[j]=v;lastTo=j;pending=null;return true}
  function render(){
    if(left()===1&&isNum(grid.find(x=>x!==''))&&!solved){solved=true;summary=finish(run);setTimeout(()=>{if(window.SGAnim)SGAnim.win($('#db'),'.dt')},60)}
    const stuck=!solved&&!anyMove(grid);
    let h=metaHead(run,'PUZZLE',' · '+left()+' LEFT')+'<div class="db" id="db" style="grid-template-columns:repeat('+N+',minmax(0,1fr))">';
    for(let i=0;i<N*N;i++){const t=grid[i];const isP=(pending&&pending.from===i)||selI===i,isT=(pending&&pending.to===i)||(selI!==null&&selI!==i&&nb(selI).indexOf(i)>=0&&mergeVal(grid[selI],grid[i])!==null);
      h+='<div class="dc'+(isT?' tgt':'')+'" data-i="'+i+'">'+(t===''?'':'<div class="dt'+(isNum(t)?'':' wild')+(isP?' glow':'')+(i===lastTo?' pop':'')+'" data-i="'+i+'" style="'+(isNum(t)?'background:'+DCOL(t):'')+'">'+(isNum(t)?t:(t==='+3'?'+3':'×2'))+'</div>')+'</div>'}
    h+='</div><div class="qact"><button class="ghost" id="undo"'+(hist.length?'':' disabled')+'>Undo</button><button class="ghost" id="reset">Reset</button></div><div class="msg" id="msg" style="text-align:center">'+(stuck?'<b style="color:var(--bad)">No more merges are possible. Tap Undo or Reset.</b>':msg)+'</div>';
    if(solved)h+='<div class="res"><div class="k" style="color:var(--good)">SOLVED</div><div class="a">One number left: '+grid.find(x=>x!=='')+'.</div>'+summary+'<div class="acts">'+(mode==='daily'?'<a class="p" href="#hub">More puzzles</a>':'<button class="p" id="da">New puzzle</button>')+''+SHARE_BTN+'</div></div>';
    g.innerHTML=h;bindHint(run,hint);
    const u=$('#undo');if(u)u.onclick=()=>{if(!hist.length||solved)return;grid=hist.pop();pending=null;lastTo=-1;msg='Undone.';render()};
    const rs=$('#reset');if(rs)rs.onclick=()=>{hist.push(grid.slice());grid=P.cells.slice();pending=null;lastTo=-1;msg='Board reset.';render()};
    const da=$('#da');if(da)da.onclick=rr;
    if(solved)return;
    $$('#db .dt').forEach(tile=>{const i=+tile.dataset.i;
      tile.onclick=()=>{
        if(selI===null){selI=i;render();return}
        if(selI===i){selI=null;render();return}
        if(nb(selI).indexOf(i)>=0&&mergeVal(grid[selI],grid[i])!==null){const from=selI;selI=null;doMerge(from,i);burstTo=i;msg='Merged.';render();return}
        run.wrong++;msg='Those two cannot merge. Equal numbers only, side by side.';selI=i;render()};
    });
    if(burstTo>=0){const bt=burstTo;burstTo=-1;const el=$('#db .dt[data-i="'+bt+'"]');if(el&&window.SGAnim){SGAnim.pop(el);SGAnim.burst(el,'×2')}}
  }
  function hint(){
    if(solved)return false;
    if(!solvable(grid)){let n=0;while(hist.length&&!solvable(grid)){grid=hist.pop();n++}pending=null;lastTo=-1;msg='Hint: that position could not be finished, so the last '+n+(n===1?' move was':' moves were')+' undone.';render();return true}
    const m=bestMove(grid);if(!m)return false;
    if(pending&&pending.from===m.from&&pending.to===m.to){doMerge(m.from,m.to);msg='Hint: that merge was made for you.';render();return true}
    pending={from:m.from,to:m.to};msg='Hint: tap the glowing number, then tap the gold-ringed neighbour. Tap Hint again to do it for you.';render();return true;
  }
  render();
}
/* ---------- Mini Sudoku ---------- */
function mountSudoku(mode){
  mode=mode||'daily';const rr=()=>mountSudoku(mode);
  shell('sudoku','Mini Sudoku',false,rr,mode);
  const fam='any';if(doneCard('sudoku',fam,mode,'Mini Sudoku',rr))return;
  const idx=mode==='daily'?((DAYN%SUD.length)+SUD.length)%SUD.length:Math.floor(Math.random()*SUD.length);
  const P=SUD[idx];const g=$('#game');
  const grid=P.puz.map(r=>r.split('').map(Number));const given=grid.map(r=>r.map(v=>v>0));const sol=P.sol.map(r=>r.split('').map(Number));
  const run=newRun('sudoku',fam,mode);const wrongMark=new Set(),revealed=new Set();let solved=false,msg='Tap a square, then tap a number.',summary='',selC=null,armed=null,lastPlace=null;
  const conflicts=()=>{const bad=new Set();for(let r=0;r<6;r++)for(let c=0;c<6;c++){const v=grid[r][c];if(!v)continue;for(let i=0;i<6;i++){if(i!==c&&grid[r][i]===v)bad.add(r+','+c);if(i!==r&&grid[i][c]===v)bad.add(r+','+c)}const br=Math.floor(r/2)*2,bc=Math.floor(c/3)*3;for(let i=0;i<2;i++)for(let j=0;j<3;j++){const rr_=br+i,cc=bc+j;if((rr_!==r||cc!==c)&&grid[rr_][cc]===v)bad.add(r+','+c)}}return bad};
  const cands=(r,c)=>{const s=[];for(let v=1;v<=6;v++){let ok=true;for(let i=0;i<6;i++){if(grid[r][i]===v||grid[i][c]===v)ok=false}const br=Math.floor(r/2)*2,bc=Math.floor(c/3)*3;for(let i=0;i<2;i++)for(let j=0;j<3;j++)if(grid[br+i][bc+j]===v)ok=false;if(ok)s.push(v)}return s};
  function render(){
    const bad=conflicts();const full=grid.every(r=>r.every(v=>v>0));
    if(full&&bad.size===0&&!solved){solved=true;summary=finish(run);setTimeout(()=>{if(window.SGAnim)SGAnim.win($('#sg'),'.sc')},60)}
    let h=metaHead(run,'PUZZLE',' · #'+(idx+1))+'<div class="sg" id="sg">';
    for(let r=0;r<6;r++)for(let c=0;c<6;c++){const k=r+','+c;const v=grid[r][c];h+='<div class="sc '+(given[r][c]?'g':'u')+((bad.has(k)||wrongMark.has(k))?' err':'')+(revealed.has(k)?' rev':'')+((c===2)?' br':'')+((r===1||r===3)?' bb':'')+'" data-r="'+r+'" data-c="'+c+'">'+(v||'')+'</div>'}
    h+='</div><div class="dtray" id="dt">'+[1,2,3,4,5,6].map(n=>'<div class="tile" data-n="'+n+'">'+n+'</div>').join('')+'<div class="tile" data-n="0" aria-label="Eraser" style="font-size:15px">Erase</div></div><div class="msg" id="msg" style="text-align:center">'+msg+'</div>';
    if(solved)h+='<div class="res"><div class="k" style="color:var(--good)">SOLVED</div><p>Every row, column and box has 1 to 6 once.</p>'+summary+'<div class="acts">'+(mode==='daily'?'<a class="p" href="#hub">More games</a>':'<button class="p" id="nw">New puzzle</button>')+''+SHARE_BTN+'</div></div>';
    g.innerHTML=h;
    bindHint(run,hint);
    if(solved){const nw=$('#nw');if(nw)nw.onclick=rr;return}
    if(selC){const sc=$('#sg .sc[data-r="'+selC[0]+'"][data-c="'+selC[1]+'"]');if(sc)sc.classList.add('sel')}
    if(armed!==null){const at=$('#dt .tile[data-n="'+armed+'"]');if(at)at.classList.add('sel')}
    if(lastPlace){const lp=lastPlace;lastPlace=null;const el=$('#sg .sc[data-r="'+lp[0]+'"][data-c="'+lp[1]+'"]');if(el&&window.SGAnim){SGAnim.pop(el);
      const bad=conflicts();const units=[];const ru=[],cu=[],bu=[];for(let i=0;i<6;i++){ru.push(lp[0]+','+i);cu.push(i+','+lp[1])}const br=Math.floor(lp[0]/2)*2,bc=Math.floor(lp[1]/3)*3;for(let i=0;i<2;i++)for(let j=0;j<3;j++)bu.push((br+i)+','+(bc+j));
      [ru,cu,bu].forEach(u=>{if(u.every(k=>{const [r,c]=k.split(',').map(Number);return grid[r][c]>0&&!bad.has(k)}))units.push(u)});
      units.forEach(u=>SGAnim.shimmer(u.map(k=>{const [r,c]=k.split(',').map(Number);return $('#sg .sc[data-r="'+r+'"][data-c="'+c+'"]')})))}}
    $$('#sg .sc').forEach(cell=>{if(cell.classList.contains('g'))return;cell.onclick=()=>{const r=+cell.dataset.r,c=+cell.dataset.c;
      if(armed!==null){grid[r][c]=armed;wrongMark.delete(r+','+c);revealed.delete(r+','+c);lastPlace=[r,c];msg=armed===0?'Erased.':'Placed. Tap more squares to keep filling, or tap Erase to stop.';render();return}
      selC=[r,c];render()}});
    $$('#dt .tile').forEach(t=>{t.onclick=()=>{const n=+t.dataset.n;
      if(selC){grid[selC[0]][selC[1]]=n;wrongMark.delete(selC[0]+','+selC[1]);revealed.delete(selC[0]+','+selC[1]);lastPlace=selC;msg=n===0?'Erased.':'Placed.';render();return}
      armed=n;msg=n===0?'Tap a square to erase it.':'Now tap squares to fill them with '+n+'.';render()}});
  }
  function hint(){
    const wrongs=[];for(let r=0;r<6;r++)for(let c=0;c<6;c++)if(!given[r][c]&&grid[r][c]>0&&grid[r][c]!==sol[r][c])wrongs.push(r+','+c);
    if(wrongs.length){wrongs.forEach(k=>wrongMark.add(k));msg='Hint: the red numbers are wrong. Tap a red square, then tap the eraser or a new number.';run.wrong++;render();return true}
    let best=null,bn=9;for(let r=0;r<6;r++)for(let c=0;c<6;c++)if(grid[r][c]===0){const n=cands(r,c).length;if(n<bn){bn=n;best=[r,c]}}
    if(!best)return false;
    const [r,c]=best;grid[r][c]=sol[r][c];revealed.add(r+','+c);msg='Hint: a square was filled for you (shown in green).';render();return true;
  }
  render();
}
/* ---------- Hub ---------- */
const GICON='../assets/games/icons/';
const ICONFILE={queens:'kings.svg',sudoku:'mini-sudoku.svg',trail:'trail.svg',gems:'fox-and-penguin.svg',double:'double-up.svg',guess:'guess-the-group.svg',ladder:'term-ladder.svg',path:'path-words.svg',duel:'answer-duel.svg','duel-2p':'duel-a-friend.svg'};
const TILEC={queens:'#FFF0C2',sudoku:'#E4EEFF',trail:'#E0F3E6',gems:'#FFE9DC',double:'#EFE6FF',guess:'#E3F6F2',ladder:'#FFF1DA',path:'#E8EBFF',duel:'#FFE6EC','duel-2p':'#E2F4FF'};
const LEARN=[['guess','Guess the Group','2 min','Name what the clues share'],['ladder','Term Ladder','3 min','Match, then order the steps'],['path','Path Words','4 min','Trace the hidden terms'],['duel','Answer Duel','3 min','Tap the right card'],['duel-2p','Duel a friend','2 players','Two players, one phone','duel']];
const PUZ=[['queens','Kings','4 min','One king per row, column, colour'],['sudoku','Mini Sudoku','4 min','Fill the grid with 1 to 6'],['trail','Trail','3 min','One path through every square'],['gems','Fox & Penguin','3 min','Three of each, never three in a row'],['double','Double Up','3 min','Merge equal numbers until one is left']];
const KINGP='<path d="M10.6 1h2.8v2h2v2.6h-2v1.6h-2.8V5.6h-2V3h2z"/><path d="M12 8.2c-3.6 0-6.2 1.9-6.2 4.7 0 1.6.9 2.8 2.3 3.5L6.9 19.4h10.2l-1.2-3c1.4-.7 2.3-1.9 2.3-3.5 0-2.8-2.6-4.7-6.2-4.7z"/><path d="M4.6 20.2h14.8v2.3H4.6z"/>';
function gtile(g,kind,st){
  const [id,t,time,desc,ic]=g;const icon=ic||id;
  return '<a class="hg" href="#'+id+'" aria-label="'+t+', play"><span class="hgi" style="--tilec:'+(TILEC[icon]||'#EEEEEE')+'"><img src="'+GICON+(ICONFILE[icon]||'')+'" alt=""></span><span class="hgn">'+t+'</span><span class="hgd">'+desc+'</span><span class="hgk">'+time+' · unlimited</span><span class="hgs play">Play</span></a>';
}
function dtile(g,st){
  const [id,t,time]=g;const done=!!st;
  return '<a class="dtile" href="#'+id+'" aria-label="'+t+(done?', completed':', play')+'"><span class="dti" style="--tilec:'+(TILEC[id]||'#EEEEEE')+'"><img src="'+GICON+(ICONFILE[id]||'')+'" alt=""></span><span class="dtm2"><span class="dtn">'+t+'</span><span class="dtt">'+time+'</span>'+(done?'<span class="dtdone">Done · '+fmt(st.t)+' · '+st.s+' of 3 stars</span>':'')+'</span><span class="playbtn'+(done?' done':'')+'" aria-hidden="true">'+(done?'<svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>':'<svg viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>')+'</span></a>';
}
function mountHub(){
  cleanups.forEach(f=>f());cleanups=[];
  document.body.classList.remove('sg-play');if(window.SGAnim)SGAnim.stopIdle();
  const fam=state.fam;
  const stP=PUZ.map(([id])=>doneInfo(id,'any'));
  const nDone=stP.filter(Boolean).length;const nextI=stP.findIndex(x=>!x);
  const cur=streak();const best=Math.max(store.get('sg|best')||0,cur);
  const earned=BADGES.filter(b=>best>=b[0]);const nextB=BADGES.find(b=>best<b[0]);
  const dt=new Date(Date.now()+5.5*3600e3);const dateStr=dt.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
  document.getElementById('app').innerHTML=
  '<div class="wrap hub3"><div class="h3top"><h1 class="serif">Games</h1><a class="stk" href="#profile"><b>'+cur+'</b>-day streak'+(earned.length?'<span class="stkb">'+badgeSvg(earned[earned.length-1][0],true)+'</span>':'')+'</a></div>'+
  '<div class="segs"><div class="segbar">'+stP.map(st=>'<i class="'+(st?'on':'')+'"></i>').join('')+'</div><span><b>'+nDone+' of 5</b> today</span>'+(nextI<0?'<span class="allset">All done. Next in '+nextDrop()+'</span>':'<a class="upnext" href="#'+PUZ[nextI][0]+'">Up next: '+PUZ[nextI][1]+' \u203a</a>')+'</div>'+
  '<div class="sec3"><h2 class="serif">Daily puzzles</h2><span class="sm">new at 00:00 IST</span></div>'+
  '<div class="dgrid">'+PUZ.map((g,i)=>dtile(g,stP[i])).join('')+(nextB?'<div class="dtile badget"><b>'+(nextB[0]-cur)+' '+((nextB[0]-cur)===1?'day':'days')+' in a row</b><span>earns the '+nextB[1]+' badge</span></div>':'<div class="dtile badget"><b>Every badge earned</b><span>Latest: '+earned[earned.length-1][1]+'</span></div>')+'</div>'+
  '<div class="sec3"><h2 class="serif">Learn and play</h2><span class="sm">swipe \u203a</span></div>'+
  '<div class="famrow"><span>Choose your family</span><div class="seg" id="fams"></div></div>'+
  '<div class="lrow">'+LEARN.map(g=>gtile(g,'learn',null)).join('')+'</div>'+
  '<div class="note">Everyone can finish: hints are always there, and your score is your time and the hints you use.</div></div>';
  const f=$('#fams');FAMS.forEach(([id,l])=>{const b=document.createElement('button');b.textContent=l;if(id===state.fam)b.className='on';b.onclick=()=>{state.fam=id;mountHub()};f.appendChild(b)});
  window.scrollTo(0,0);
}
function mountProfile(){
  cleanups.forEach(f=>f());cleanups=[];
  document.body.classList.remove('sg-play');if(window.SGAnim)SGAnim.stopIdle();
  const cur=streak(),best=Math.max(store.get('sg|best')||0,cur),total=store.get('sg|total')||0,sup=store.get('sg|super')||0;
  document.getElementById('app').innerHTML=
  
  '<div class="wrap hub2" style="max-width:720px"><div class="eyebrow">YOUR PROFILE</div><h1 class="serif">Your streak and badges</h1>'+
  '<div class="savebox"><div><b>Saved on this device only.</b><br><span>Create a free account to keep your streak safe, on every phone and laptop. (Idea for a later stage, not built yet.)</span></div><button class="p" disabled>Create free account</button></div>'+
  '<div class="stats big"><div><b>'+cur+'</b><small>CURRENT STREAK</small></div><div><b>'+best+'</b><small>LONGEST STREAK</small></div><div><b>'+total+'</b><small>PUZZLES SOLVED</small></div><div><b>'+sup+'</b><small>SUPERSTARS</small></div></div>'+
  '<div class="sec2"><h2 class="serif">Badges</h2><span class="sm">For days in a row with at least one daily puzzle</span></div><div class="bdgrow">'+BADGES.map(([n,t])=>{const on=best>=n;return '<div class="bdg'+(on?' on':'')+'">'+badgeSvg(n,on)+'<b>'+t+'</b><span>'+(on?'Earned':(n-best)+' to go')+'</span></div>'}).join('')+'</div>'+
  '<div class="sec2"><h2 class="serif">Best times</h2></div><div class="bt">'+PUZ.map(([id,t])=>{const b=store.get('sg|bt|'+id);return '<div><span>'+t+'</span><b>'+(b?fmt(b.t)+' · '+b.s+' of 3 stars':'not played yet')+'</b></div>'}).join('')+'</div>'+
  '<div class="plus"><div class="eyebrow" style="color:#8CC56A">LUZOVI PLUS · AN IDEA FOR LATER</div><div class="serif" style="font-size:30px;line-height:1.1;margin-top:6px">A small fee for a little extra</div><ul><li>New decks and tables one to two months early</li><li>Extra decks and extra cards</li><li>Unlimited quiz attempts, with your history</li></ul><p>Everything you see today stays free. This is only a sketch of what a membership could add.</p></div></div>';
  window.scrollTo(0,0);
}
const PV={
 guess:()=>'<div style="width:78%;display:flex;flex-direction:column;gap:5px"><div style="background:#A9CCFA;border-radius:8px;padding:6px 10px;font-weight:600;font-size:13px;color:#13241B">Hadamard Gate</div><div style="background:#7FB0F5;border-radius:8px;padding:6px 10px;font-weight:600;font-size:13px;color:#13241B">CNOT Gate</div><div style="border:2px dashed var(--brand);border-radius:8px;padding:6px 10px;font-size:13px;color:var(--brand);font-weight:700;animation:fade 4s infinite">Drop the group here</div></div>',
 ladder:()=>'<div style="width:78%;display:flex;flex-direction:column;gap:6px"><div style="background:var(--card);border-radius:9px;padding:7px 10px;font-size:13px;font-weight:600;animation:swap 6s infinite;--d:40px">Build</div><div style="background:var(--card);border-radius:9px;padding:7px 10px;font-size:13px;font-weight:600;animation:swap 6s infinite;--d:-40px">Test</div><div style="background:var(--card);border-radius:9px;padding:7px 10px;font-size:13px;font-weight:600">Deploy</div></div>',
 path:()=>'<div style="display:grid;grid-template-columns:repeat(5,26px);gap:3px;font-size:12px;font-weight:700;text-align:center;line-height:26px">'+'QUBIT#GATENOISE'.split('').map((ch,i)=>ch==='#'?'<div style="background:color-mix(in srgb,var(--muted) 25%,transparent);border-radius:6px"></div>':'<div style="--c:'+(i<5?'#6B4FD8':i<10?'#0E8F6B':'#D9822B')+';border-radius:6px;animation:fill 6s '+(i*.3)+'s infinite">'+ch+'</div>').join('')+'</div>',
 duel:()=>'<div style="position:absolute;inset:0;background:linear-gradient(150deg,#2A1458,#4B2A96)"></div><div style="position:relative;display:flex;gap:7px;align-items:flex-end;height:100%;padding-bottom:18px"><i style="width:50px;height:70px;border-radius:8px;background:#FFF7E6;display:block;animation:fade 5s infinite"></i><i style="width:50px;height:70px;border-radius:8px;background:#FFF7E6;display:block;animation:dropc 5s infinite"></i><i style="width:50px;height:70px;border-radius:8px;background:#FFF7E6;display:block"></i><i style="width:50px;height:70px;border-radius:8px;background:#FFF7E6;display:block"></i></div>',
 queens:()=>'<div style="display:grid;grid-template-columns:repeat(5,28px);gap:2px;border:2px solid var(--ink);border-radius:6px;overflow:hidden;background:var(--ink)">'+['#F4B6B0','#F4B6B0','#F7D08A','#F7D08A','#B7DDA8','#F4B6B0','#A9CCFA','#F7D08A','#F7D08A','#B7DDA8','#A9CCFA','#A9CCFA','#D3B7F2','#B7DDA8','#B7DDA8','#A9CCFA','#D3B7F2','#D3B7F2','#D3B7F2','#B7DDA8','#A9CCFA','#A9CCFA','#D3B7F2','#D3B7F2','#D3B7F2'].map((c,i)=>'<div style="background:'+c+';height:28px;display:flex;align-items:center;justify-content:center;color:#13241B">'+([2,5+0].indexOf(i)>=0&&false?'':'')+([2,5,11,18,24].indexOf(i)>=0?'<span style="width:18px;height:18px;display:block;animation:fade 4s infinite">'+KING+'</span>':'')+'</div>').join('')+'</div>',
 trail:()=>'<div style="display:grid;grid-template-columns:repeat(4,30px);gap:3px;position:relative">'+Array.from({length:16},(_,i)=>'<div style="height:30px;border-radius:6px;background:'+([0,1,2,3,7,6,5,9,10,11,15].indexOf(i)>=0?'#BFE3D0':'var(--soft)')+';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">'+({0:'1',7:'2',15:'3'}[i]||'')+'</div>').join('')+'</div>',
 gems:()=>'<div style="display:grid;grid-template-columns:repeat(4,32px);gap:4px">'+[1,2,2,1,2,1,1,2,1,1,2,2,2,2,1,1].map(v=>'<div style="height:32px;border-radius:8px;background:var(--card);border:1px solid var(--line);padding:4px">'+(v===1?FOXSVG:PENGSVG)+'</div>').join('')+'</div>',
 sudoku:()=>'<div style="display:grid;grid-template-columns:repeat(6,24px);gap:2px;background:var(--ink);border:2px solid var(--ink);border-radius:6px;font-weight:700;font-size:13px;text-align:center;line-height:24px">'+[2,5,6,0,0,3,3,1,0,6,2,0,0,2,0,4,0,5].map(n=>'<div style="background:var(--card)">'+(n||'')+'</div>').join('')+'</div>'
};
/* ---------- router ---------- */
const ROUTES={hub:()=>mountHub(),profile:()=>mountProfile(),guess:()=>mountGuess('practice'),'guess-p':()=>mountGuess('practice'),ladder:()=>mountLadder('practice'),'ladder-p':()=>mountLadder('practice'),path:()=>mountPath('practice'),'path-p':()=>mountPath('practice'),duel:()=>mountDuel('practice',1),'duel-p':()=>mountDuel('practice',1),'duel-2p':()=>mountDuel('practice',2),queens:()=>mountQueens('daily'),'queens-p':()=>{location.hash='#queens'},trail:()=>mountTrail('daily'),'trail-p':()=>{location.hash='#trail'},gems:()=>mountSunMoon('daily'),'gems-p':()=>{location.hash='#gems'},double:()=>mountDouble('daily'),'double-p':()=>{location.hash='#double'},sudoku:()=>mountSudoku('daily'),'sudoku-p':()=>{location.hash='#sudoku'}};
function route(){const k=(location.hash||'#hub').slice(1);(ROUTES[k]||ROUTES.hub)()}
window.addEventListener('hashchange',route);route();

/* ---------- ad slots: Games only, collapsed and invisible while off ---------- */
(function(){
  function applyAds(cfg){
    if(!cfg||!cfg.enabled)return;
    $$('.adslot').forEach(function(sl){sl.innerHTML='<span class="adlabel">Advertisement</span><div class="adbody">'+(cfg[sl.dataset.adslot]||'')+'</div>';sl.hidden=false});
  }
  window.__sgApplyAds=applyAds;
  try{fetch('ads.json').then(function(r){return r.json()}).then(applyAds).catch(function(){})}catch(e){}
})();
