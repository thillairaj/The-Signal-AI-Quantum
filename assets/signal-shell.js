/* The Signal: shared top bar and path (breadcrumb). One script, every page.
   - Standalone pages: adds the top bar and the path, hides the old Back / Next / Home buttons, moves the Share button into the path row.
   - Front page (index.html): keeps its own top bar, turns "Learning Space" into the menu, and shows the path for every tab except Home.
   Page content, fonts, animations and sharing are not touched. */
(function(){
  var me=document.currentScript,BASE=me.src.replace(/assets\/signal-shell\.js.*$/,'');
  var TABLES={"agentic-ai-keywords": "Agentic AI Keywords", "agentic-ai-tools": "Agentic AI Tools", "ai-cybersecurity": "AI & Cybersecurity", "ai-keywords": "AI Keywords for Leaders", "ai-tools": "AI Tools for Leaders", "aws-leaders": "AWS for Leaders", "azure-leaders": "Microsoft Azure for Leaders", "cloud-devops": "Cloud & DevOps for Leaders", "cyber-threats": "Cyber Threats & Attack Techniques", "cybersecurity": "Cybersecurity for Leaders", "founder-finance": "Financial Terms Every Startup Founder Should Know", "google-cloud-leaders": "Google Cloud for Leaders", "leadership": "Leadership Keywords", "quantum-algorithms": "Quantum Algorithms", "quantum-hardware": "Quantum Hardware", "quantum-keywords": "Quantum Keywords for Leaders", "quantum-security": "Quantum Security & Post-Quantum Crypto", "security-frameworks": "Security Frameworks & Compliance", "startup-growth": "Startup Growth for Founders", "startup-sales": "B2B Sales for Founders"}; /* generated at build time from each periodic table page title */
  (function(){if(!document.querySelector('link[href*="DM+Serif+Display"]')){var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Figtree:wght@400;500;600;700;800&display=swap';document.head.appendChild(l)}})();
  var MENU=[
    {h:'Videos',u:BASE+'videos/',all:['All videos','videos/'],items:[['AI','ai-learning-space/'],['Quantum','quantum-learning-space/'],['Cloud & DevOps','cloud-devops-learning-space/'],['Cybersecurity','cybersecurity-learning-space/']]},
    {h:'Decks',u:BASE+'decks/',all:['All decks','decks/'],items:[['AI Deck','ai-deck/'],['Quantum Deck','quantum-deck/'],['Cloud & DevOps Deck','cloud-deck/'],['Cybersecurity Deck','cybersecurity-deck/']]},
    {h:'Periodic tables',u:BASE+'periodic-tables/',items:[['AI Keywords','periodic-tables/ai-keywords/'],['Quantum Keywords','periodic-tables/quantum-keywords/'],['Cloud & DevOps','periodic-tables/cloud-devops/'],['Cybersecurity','periodic-tables/cybersecurity/']],all:['All 20 tables','periodic-tables/']},
    {h:'Explainers',u:BASE+'explainers/',all:['All explainers','explainers/'],items:[['How an LLM answers','explainers/llm-answers.html'],['Quantum computer hardware','explainers/quantum-hardware.html'],['Journey of a web request','explainers/web-request.html']]},
    {h:'Games',u:BASE+'games/',items:[['Daily puzzles','games/'],['Learn and play','games/']]}
  ];
  var TABS=[['Home',BASE,''],['Learning Space','#menu','01'],['Podcast',BASE+'#podcast','02'],['Articles',BASE+'#research','03'],['RSS Feed',BASE+'#feed','04'],['Signal Brief',BASE+'#brief','05'],['Live news',BASE+'live/','']];
  function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function rel(){var p=location.pathname,b=new URL(BASE).pathname;return p.indexOf(b)===0?p.slice(b.length):p.replace(/^\//,'')}
  function h1(){var h=document.querySelector('h1');var t=(h?h.innerText:document.title)||'';t=t.replace(/\s+/g,' ').trim();return t.replace(/\s*[·|–-]\s*The Signal.*$/,'')}
  function dateLabel(s){return new Date(s+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}
  function crumbs(){
    var r=rel(),L=[['Home',BASE]],LS=['Learning Space',null,true],m;
    if(/^(ai|ai-bot|ai-assistants|quantum|cloud-devops|cybersecurity)-learning-space\//.test(r)){
      var k=r.split('/')[0].replace('-learning-space',''),map={ai:'AI','ai-bot':'AI','ai-assistants':'AI',quantum:'Quantum','cloud-devops':'Cloud & DevOps',cybersecurity:'Cybersecurity'};
      L.push(LS,['Videos',BASE+'videos/']);
      if(k==='ai-bot'||k==='ai-assistants'){L.push([map[k],BASE+'ai-learning-space/'],[h1()||'Room'])}else L.push([map[k]]);
    }else if(/^(ai|quantum|cloud|cybersecurity)-deck\//.test(r)){
      var dn={ai:'AI Deck',quantum:'Quantum Deck',cloud:'Cloud & DevOps Deck',cybersecurity:'Cybersecurity Deck'};L.push(LS,['Decks',BASE+'decks/'],[dn[r.split('-deck')[0]]]);
    }else if((m=r.match(/^periodic-tables\/([^\/]+)\//))){L.push(LS,['Periodic tables',BASE+'periodic-tables/'],[h1()||m[1]]);}
    else if((m=r.match(/^t\/([^\/]+)\/([^\/]+)\//))){L.push(LS,['Periodic tables',BASE+'periodic-tables/'],[TABLES[m[1]]||m[1].replace(/-/g,' '),BASE+'periodic-tables/'+m[1]+'/'],[h1()])}
    else if(/^explainers\/(index\.html)?$/.test(r)){L.push(LS,['Explainers'])}
    else if((m=r.match(/^explainers\/([a-z-]+)\.html/))){
      var tech={'llm-answers':['AI','ai.html'],'quantum-hardware':['Quantum','quantum.html'],'web-request':['Cloud & DevOps','cloud-devops.html']};
      L.push(LS,['Explainers',BASE+'explainers/']);
      if(tech[m[1]])L.push([tech[m[1]][0],BASE+'explainers/'+tech[m[1]][1]],[h1()]);else L.push([h1()||'Explainers']);
    }else if(/^explainers\/(index\.html)?$/.test(r)){L.push(LS,['Explainers'])}
    else if(/^games\//.test(r)){L.push(LS,['Games'])}
    else if(/^videos\/(index\.html)?$/.test(r)){L.push(LS,['Videos'])}
    else if(/^decks\/(index\.html)?$/.test(r)){L.push(LS,['Decks'])}
    else if(/^periodic-tables\/(index\.html)?$/.test(r)){L.push(LS,['Periodic tables'])}
    else if(/^live\//.test(r)){L.push(['Live news'])}
    else if((m=r.match(/^brief\/(\d{4}-\d{2}-\d{2})\/(\d+)\//))){L.push(['Signal Brief',BASE+'#brief'],[dateLabel(m[1]),BASE+'brief/'],[h1()])}
    else if((m=r.match(/^brief\/(\d{4}-\d{2}-\d{2})\//))){L.push(['Signal Brief',BASE+'#brief'],[dateLabel(m[1])])}
    else if(/^brief\//.test(r)){L.push(['Signal Brief'])}
    else if(/^research\/[^\/]+\//.test(r)){L.push(['Articles',BASE+'#research'],[h1()])}
    else if(/^podcast\/[^\/]+\//.test(r)){L.push(['Podcast',BASE+'#podcast'],[h1()])}
    else L.push([h1()||document.title]);
    return L;
  }
  function bcHtml(L){return L.map(function(c,i){var last=i===L.length-1;if(last&&!c[1]&&!c[2])return '<span class="cur">'+esc(c[0])+'</span>';var s=c[2]?'<button type="button" data-menu="1">'+esc(c[0])+'</button>':'<a href="'+esc(c[1])+'">'+esc(c[0])+'</a>';return s+(last?'':'<span class="sep">›</span>')}).join('')}
  var mega=el('div','sg-mega');mega.setAttribute('role','menu');
  mega.innerHTML=MENU.map(function(c){return '<div class="sg-col"><h4><a href="'+esc(c.u)+'">'+esc(c.h)+'</a></h4>'+c.items.map(function(i){return '<a class="it" href="'+esc(BASE+i[1])+'">'+esc(i[0])+'</a>'}).join('')+(c.all?'<a class="it all" href="'+esc(BASE+c.all[1])+'">'+esc(c.all[0])+' ›</a>':'')+'</div>'}).join('');
  document.body.appendChild(mega);
  function openMenu(anchor){var r=anchor.getBoundingClientRect(),w=Math.min(1020,innerWidth-24);mega.classList.add('open');var left=Math.max(12,Math.min(r.left+scrollX,scrollX+innerWidth-w-12));mega.style.left=left+'px';mega.style.top=(r.bottom+scrollY+8)+'px'}
  function closeMenu(){mega.classList.remove('open')}
  document.addEventListener('click',function(e){var b=e.target.closest('[data-menu]');if(b){e.preventDefault();e.stopPropagation();if(mega.classList.contains('open'))closeMenu();else openMenu(b);return}if(!e.target.closest('.sg-mega'))closeMenu()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu()});
  addEventListener('resize',closeMenu);
  /* hide the old Back / Next / Home buttons and any bar that is left empty. Buttons that do a job inside a page (Previous part, Up next) are not touched. */
  function tidy(){
    var mount=document.querySelector('.ss-page-mount,#ssPageMount');
    document.querySelectorAll('.navcard,.brief-back,.ap-back').forEach(function(n){n.style.display='none'});
    document.querySelectorAll('.navside,.navrow,.backbar,.gbackbar,.brief-topbar').forEach(function(c){
      var kids=[].slice.call(c.children).filter(function(k){return !k.classList.contains('navcard')&&getComputedStyle(k).display!=='none'&&!(mount&&(k===mount||k.contains(mount)))});
      var hasText=kids.some(function(k){return (k.innerText||'').trim()||k.querySelector('input,button,select')});
      if(!hasText)c.classList.add('sg-gone');
    });
  }
  function isHome(){var r=rel();return r===''||r==='index.html'}
  if(isHome()){
    var row=el('div','sg-crumbrow');row.style.display='none';row.innerHTML='<div class="sg-in"><nav class="sg-bc" aria-label="Path"></nav></div>';
    var mh=document.querySelector('header.masthead,.masthead,header');if(mh&&mh.parentNode)mh.parentNode.insertBefore(row,mh.nextSibling);
    var names={learn:'Learning Space',podcast:'Podcast',research:'Articles',feed:'RSS Feed',brief:'Signal Brief'};
    function sync(){var a=document.querySelector('.top-tab.active');var v=a&&a.dataset.view;if(!v||v==='home'){row.style.display='none';return}
      row.querySelector('.sg-bc').innerHTML=bcHtml([['Home',BASE+'#home'],[names[v]||v]]);row.style.display=''}
    document.addEventListener('click',function(e){var t=e.target.closest('.top-tab[data-view="learn"]');if(t){e.preventDefault();e.stopPropagation();if(mega.classList.contains('open'))closeMenu();else openMenu(t)}},true);
    new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});addEventListener('hashchange',sync);sync();
    return;
  }
  var shell=el('div','sg-shell');
  var tabs=TABS.map(function(t){var on=false,r=rel();if(t[0]==='Learning Space')on=/learning-space\/|-deck\/|^periodic-tables|^t\/|^explainers|^games/.test(r);if(t[0]==='Signal Brief')on=/^brief\//.test(r);if(t[0]==='Articles')on=/^research\//.test(r);if(t[0]==='Podcast')on=/^podcast\//.test(r);if(t[0]==='Live news')on=/^live\//.test(r);
    if(t[0]==='Learning Space')return '<button type="button" class="sg-tab'+(on?' on':'')+'" data-menu="1"><span class="n">01</span>Learning Space <i>▾</i></button>';
    return '<a class="sg-tab'+(on?' on':'')+'" href="'+esc(t[1])+'">'+(t[2]?'<span class="n">'+t[2]+'</span>':'')+esc(t[0])+'</a>'}).join('');
  shell.innerHTML='<div class="sg-in"><div class="sg-top"><a class="sg-wm" href="'+esc(BASE)+'">The <em>Signal</em></a><nav class="sg-tabs" aria-label="Main">'+tabs+'</nav><button type="button" class="sg-menub" aria-label="Menu" aria-expanded="false">☰</button></div></div>';
  var sheet=el('div','sg-sheet');sheet.innerHTML='<a href="'+esc(BASE)+'">Home</a>'+MENU.map(function(c){return '<h4>'+esc(c.h)+'</h4><div class="sub">'+c.items.map(function(i){return '<a href="'+esc(BASE+i[1])+'">'+esc(i[0])+'</a>'}).join('')+'</div>'}).join('')+'<h4>More</h4><a href="'+esc(BASE+'#podcast')+'">Podcast</a><a href="'+esc(BASE+'#research')+'">Articles</a><a href="'+esc(BASE+'#feed')+'">RSS Feed</a><a href="'+esc(BASE+'#brief')+'">Signal Brief</a><a href="'+esc(BASE+'live/')+'">Live news</a>';
  shell.querySelector('.sg-menub').onclick=function(){sheet.classList.toggle('open')};
  var row2=el('div','sg-crumbrow');row2.innerHTML='<div class="sg-in"><nav class="sg-bc" aria-label="Path">'+bcHtml(crumbs())+'</nav><span class="sg-shareslot"></span></div>';
  var first=document.body.firstChild;document.body.insertBefore(row2,first);document.body.insertBefore(sheet,row2);document.body.insertBefore(shell,sheet);
  var mount=document.querySelector('.ss-page-mount,#ssPageMount');if(mount)row2.querySelector('.sg-shareslot').appendChild(mount);
  tidy();setTimeout(tidy,800);
})();
