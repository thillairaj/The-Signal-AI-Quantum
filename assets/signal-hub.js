/* Hub tools: technology chips from 12 items, search from 30 items. Order is fixed by the page markup. */
(function(){
  var cards=[].slice.call(document.querySelectorAll('.sg-card')),groups=[].slice.call(document.querySelectorAll('.sg-group')),tools=document.querySelector('.sg-tools');if(!tools)return;
  var n=cards.length,state={t:'all',q:''};
  if(n>=12){tools.innerHTML='<button class="sg-chip on" data-t="all">All</button>'+groups.map(function(g){return '<button class="sg-chip" data-t="'+g.dataset.t+'">'+g.dataset.name+'</button>'}).join('')}
  if(n>=30){var s=document.createElement('input');s.className='sg-search';s.type='search';s.placeholder='Search';s.setAttribute('aria-label','Search');tools.appendChild(s);s.addEventListener('input',function(){state.q=s.value.toLowerCase();apply()})}
  tools.addEventListener('click',function(e){var b=e.target.closest('.sg-chip');if(!b)return;state.t=b.dataset.t;tools.querySelectorAll('.sg-chip').forEach(function(c){c.classList.toggle('on',c===b)});apply()});
  function apply(){var any=false;groups.forEach(function(g){var show=state.t==='all'||g.dataset.t===state.t,vis=0;g.querySelectorAll('.sg-card').forEach(function(c){var ok=show&&(!state.q||c.textContent.toLowerCase().indexOf(state.q)>=0);c.style.display=ok?'':'none';if(ok)vis++});g.style.display=vis?'':'none';if(vis)any=true});var em=document.querySelector('.sg-empty');if(em)em.style.display=any?'none':'block'}
})();
