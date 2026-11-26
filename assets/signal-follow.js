/* The Signal: follow section chips (Nov 26, 2026). One delegated
   listener for every .sg-fchip in the standard follow sections
   (Podcast, Signal Brief, Articles): tapping a chip copies its
   address with a fallback, and the chip shows a check with "Copied"
   for 1.5 seconds. */
document.addEventListener('click',function(e){
  var b=e.target.closest('.sg-fchip');if(!b)return;var u=b.getAttribute('data-url');
  function done(){b.classList.add('done');clearTimeout(b._t);b._t=setTimeout(function(){b.classList.remove('done')},1500)}
  function fallback(){var t=document.createElement('textarea');t.value=u;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy')}catch(_){}document.body.removeChild(t);done()}
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(u).then(done,fallback);else fallback();
});
