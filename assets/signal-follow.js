/* The Signal: copy buttons for the Follow in a news reader sections
   (Nov 26, 2026 fixes). One delegated listener for every .sg-copyfeed
   button on the page; the button turns into a check with "Copied" for
   1.5 seconds. Copy uses the clipboard API with a fallback. */
document.addEventListener('click',function(e){
  var b=e.target.closest('.sg-copyfeed');if(!b)return;var u=b.getAttribute('data-url');
  function done(){b.classList.add('done');clearTimeout(b._t);b._t=setTimeout(function(){b.classList.remove('done')},1500)}
  function fallback(){var t=document.createElement('textarea');t.value=u;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy')}catch(_){}document.body.removeChild(t);done()}
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(u).then(done,fallback);else fallback();
});
