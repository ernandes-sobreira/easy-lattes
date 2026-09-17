(() => {
  function clean(){
    const root=document.querySelector('#careerContent');
    if(!root||!document.querySelector('#academicV8'))return;
    root.querySelectorAll(':scope > .career-v4').forEach(el=>{el.hidden=true;el.style.display='none'});
  }
  function init(){const r=document.querySelector('#careerContent');if(!r)return;new MutationObserver(clean).observe(r,{childList:true});setInterval(clean,1200);clean()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,500));else setTimeout(init,500);
})();