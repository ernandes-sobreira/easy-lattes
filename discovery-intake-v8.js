(() => {
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-discover-review]');
    if(!btn)return;
    const card=btn.closest('.discover-card');
    const type=card?.querySelector('.discover-type');
    const kind=type?.classList?.contains('artigo')?'artigo':type?.classList?.contains('banca')?'banca':type?.classList?.contains('curso')?'curso':type?.classList?.contains('apresentacao')?'apresentacao':type?.classList?.contains('evento')?'evento':'';
    if(!kind)return;
    [120,240].forEach(ms=>setTimeout(()=>{
      const select=document.querySelector('#intakeType');
      const modal=document.querySelector('#intakeModal');
      if(!select||!modal||modal.hidden)return;
      if(kind==='artigo'&&select.querySelector('option[value="artigo"]')){select.value='artigo';select.dispatchEvent(new Event('change',{bubbles:true}))}
    },ms));
  },true);
})();