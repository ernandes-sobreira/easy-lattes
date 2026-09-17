(() => {
  const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const attrFirst=(el,names)=>{for(const n of names){const v=el?.getAttribute?.(n);if(v)return v}return''};
  const yearOf=el=>{for(const n of [el,...qa('*',el)])for(const a of [...(n.attributes||[])])if(/(^ANO$|^ANO-|ANO-DO|ANO-DA)/i.test(a.name)&&/^(19|20)\d{2}$/.test(a.value))return Number(a.value);return null};
  const titleOf=el=>{const attrs=['TITULO-DO-ARTIGO','TITULO-DO-LIVRO','TITULO-DO-CAPITULO-DO-LIVRO','TITULO','NOME-DO-PROJETO','NOME-DO-EVENTO'];for(const n of [el,...qa('*',el)])for(const a of attrs){const v=n.getAttribute?.(a);if(v)return v}return''};
  const count=(doc,s)=>qa(s,doc).length;

  function toast(msg){const stack=q('#toastStack');if(!stack)return;const d=document.createElement('div');d.className='toast';d.textContent=msg;stack.appendChild(d);setTimeout(()=>d.remove(),3600)}

  function keywordList(doc){
    const stop=new Set('para sobre entre como uma umas uns mais menos muito muito artigo artigos projeto projetos pesquisa pesquisas trabalho trabalhos dados estudo estudos brasil brasileira brasileiro universidade'.split(/\s+/));
    const words=[];
    qa('PALAVRAS-CHAVE',doc).forEach(el=>[...el.attributes].forEach(a=>{if(/PALAVRA-CHAVE/i.test(a.name)&&a.value)words.push(a.value)}));
    qa('*',doc).forEach(el=>['TITULO-DO-ARTIGO','TITULO-DO-LIVRO','TITULO-DO-CAPITULO-DO-LIVRO','TITULO','NOME-DO-PROJETO'].forEach(a=>{const v=el.getAttribute?.(a);if(v)words.push(v)}));
    const m=new Map();
    const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
    words.flatMap(x=>norm(x).split(' ')).filter(w=>w.length>3&&!stop.has(w)&&!/^\d+$/.test(w)).forEach(w=>m.set(w,(m.get(w)||0)+1));
    return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,16).map(([term,count])=>({term,count}));
  }

  function areas(doc){
    const out=[];
    qa('AREA-DE-ATUACAO',doc).forEach(el=>['NOME-GRANDE-AREA-DO-CONHECIMENTO','NOME-DA-AREA-DO-CONHECIMENTO','NOME-DA-SUB-AREA-DO-CONHECIMENTO','NOME-DA-ESPECIALIDADE'].forEach(a=>{const v=el.getAttribute(a);if(v)out.push(v.replaceAll('_',' '))}));
    return [...new Set(out)].slice(0,12);
  }

  function collect(doc, selector){return qa(selector,doc).map(el=>({title:titleOf(el),year:yearOf(el)})).filter(x=>x.title).sort((a,b)=>(b.year||0)-(a.year||0)).slice(0,22)}

  function publicLeads(){
    return qa('.discover-card:not(.existing)').slice(0,12).map(card=>{
      const metas=qa('.discover-meta span',card).map(x=>x.textContent.trim());
      const confidence=parseInt(q('.discover-confidence strong',card)?.textContent||'0',10)||0;
      return {
        title:q('h4',card)?.textContent?.trim()||'',
        year:metas.find(x=>/^(19|20)\d{2}$/.test(x))||'',
        kind:'outra',
        source:metas[0]||'fonte pública',
        evidence:q('.discover-main p',card)?.textContent?.trim()||'',
        confidence
      };
    }).filter(x=>x.title);
  }

  function makePayload(){
    const doc=window.__easyLattesCurrentDoc;
    if(!doc)return null;
    const now=new Date().getFullYear(), years=[now-4,now-3,now-2,now-1,now], recent=Object.fromEntries(years.map(y=>[y,0]));
    qa('[SEQUENCIA-PRODUCAO]',doc).forEach(el=>{const y=yearOf(el);if(recent[y]!==undefined)recent[y]++});
    const dg=doc.querySelector('DADOS-GERAIS'), resumo=attrFirst(doc.querySelector('RESUMO-CV'),['TEXTO-RESUMO-CV-RH','TEXTO-RESUMO-CV-RH-EN'])||'';
    return {
      version:'easy-lattes-deep-v7',
      researcher:dg?.getAttribute('NOME-COMPLETO')||'',
      declared_summary:resumo.slice(0,3500),
      areas:areas(doc),
      counts:{
        artigos:count(doc,'ARTIGO-PUBLICADO'),
        livros:count(doc,'LIVRO-PUBLICADO-OU-ORGANIZADO'),
        capitulos:count(doc,'CAPITULO-DE-LIVRO-PUBLICADO'),
        orientacoes:count(doc,'ORIENTACOES-CONCLUIDAS-PARA-MESTRADO,ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO,OUTRAS-ORIENTACOES-CONCLUIDAS'),
        tecnica:count(doc,'PRODUCAO-TECNICA [SEQUENCIA-PRODUCAO]'),
        eventos:count(doc,'PARTICIPACAO-EM-EVENTOS-CONGRESSOS [SEQUENCIA-PRODUCAO]'),
        bancas:count(doc,'PARTICIPACAO-EM-BANCA-TRABALHOS-CONCLUSAO [SEQUENCIA-PRODUCAO],PARTICIPACAO-EM-BANCA-JULGADORA [SEQUENCIA-PRODUCAO]'),
        projetos:count(doc,'PROJETO-DE-PESQUISA'),
        apresentacoes:count(doc,'APRESENTACAO-DE-TRABALHO')
      },
      recent_by_year:years.map(year=>({year,count:recent[year]})),
      keywords:keywordList(doc),
      samples:{
        scientific:collect(doc,'ARTIGO-PUBLICADO,LIVRO-PUBLICADO-OU-ORGANIZADO,CAPITULO-DE-LIVRO-PUBLICADO'),
        orientations:collect(doc,'ORIENTACOES-CONCLUIDAS-PARA-MESTRADO,ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO,OUTRAS-ORIENTACOES-CONCLUIDAS'),
        technical:collect(doc,'PRODUCAO-TECNICA [SEQUENCIA-PRODUCAO]'),
        events_and_networks:collect(doc,'PARTICIPACAO-EM-EVENTOS-CONGRESSOS [SEQUENCIA-PRODUCAO],PARTICIPACAO-EM-BANCA-TRABALHOS-CONCLUSAO [SEQUENCIA-PRODUCAO]'),
        projects:collect(doc,'PROJETO-DE-PESQUISA')
      },
      public_leads:publicLeads()
    };
  }

  function endpoint(){
    const base=window.EASY_LATTES_AI_ENDPOINT||window.EASY_LATTES_CONFIG?.aiEndpoint||'';
    if(!base)return'';
    return base.replace(/\/careerAnalysis(?:\?.*)?$/,'/careerAnalysisDeep');
  }

  function itemList(items, cls=''){return `<div class="deep-list ${cls}">${(items||[]).map((x,i)=>`<article><span>${String(i+1).padStart(2,'0')}</span><p>${esc(typeof x==='string'?x:x?.text||x?.title||'')}</p></article>`).join('')}</div>`}

  function renderResult(data){
    const box=q('#aiCareerBoxV4');if(!box)return;
    const r=data?.result||{};
    const strengths=Array.isArray(r.strengths)?r.strengths:[];
    const leads=Array.isArray(r.public_leads_review)?r.public_leads_review:[];
    box.className='deep-report-v7';
    box.innerHTML=`
      <section class="deep-report-hero">
        <div><div class="deep-kicker">ANÁLISE GENERATIVA • EASY LATTES</div><h3>${esc(r.headline||'Sua trajetória acadêmica, em uma leitura estratégica.')}</h3><p>${esc(r.identity||'')}</p></div>
        <div class="deep-seal"><i data-lucide="brain-circuit"></i><span>IA + evidências</span></div>
      </section>
      <section class="deep-evidence"><span>O que sustenta esta leitura</span><p>${esc(r.evidence_summary||'Análise baseada nos registros estruturados do currículo.')}</p></section>
      <div class="deep-grid-two">
        <section class="deep-card dark"><div class="deep-label">FORÇAS DOCUMENTADAS</div>${strengths.map((x,i)=>`<article class="deep-strength"><span>${String(i+1).padStart(2,'0')}</span><div><strong>${esc(x?.title||'')}</strong><p>${esc(x?.evidence||'')}</p></div></article>`).join('')}</section>
        <section class="deep-card"><div class="deep-label">ONDE HÁ ESPAÇO PARA FORTALECER</div>${itemList(r.opportunities||[])}</section>
      </div>
      <section class="deep-card plan"><div class="deep-label">PRÓXIMOS 90 DIAS</div><h4>Um plano curto para melhorar o currículo sem virar outro trabalho.</h4>${itemList(r.next_90_days||[],'green')}</section>
      <div class="deep-grid-two">
        <section class="deep-card"><div class="deep-label">AÇÕES NO LATTES</div>${itemList(r.lattes_actions||[])}</section>
        <section class="deep-card"><div class="deep-label">PALAVRAS-CHAVE ESTRATÉGICAS</div><div class="deep-keywords">${(r.strategic_keywords||[]).map(x=>`<span>${esc(x)}</span>`).join('')}</div></section>
      </div>
      ${leads.length?`<section class="deep-card web"><div class="deep-label">O QUE APARECEU FORA DO LATTES</div><h4>Pistas públicas para você conferir — ainda não são fatos do currículo.</h4><div class="deep-web-list">${leads.map(x=>`<article class="${esc(x.verdict)}"><div><strong>${esc(x.title)}</strong><p>${esc(x.reason)}</p></div><span>${x.verdict==='priorizar_revisao'?'priorizar':x.verdict==='revisar_com_cautela'?'conferir':'baixa prioridade'}</span></article>`).join('')}</div><button class="btn neon" data-go="discovery"><i data-lucide="search-check"></i>Abrir Descobertas</button></section>`:''}
      <section class="deep-summary"><div><div class="deep-label">RESUMO PROFISSIONAL SUGERIDO</div><p id="deepSuggestedSummary">${esc(r.suggested_summary||'')}</p></div><button class="btn ghost" id="copyDeepSummary"><i data-lucide="copy"></i>Copiar</button></section>
      <footer class="deep-footer"><span>${esc(r.caution||'Revise a análise antes de usar qualquer sugestão.')}</span><span>${data?.meta?.model?`Modelo ${esc(data.meta.model)}`:''}${data?.meta?.estimated_cost_usd!=null?` • ~US$ ${Number(data.meta.estimated_cost_usd).toFixed(4)}`:''}${data?.meta?.cached?' • cache':''}</span></footer>`;
    q('#copyDeepSummary')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(q('#deepSuggestedSummary')?.textContent||'');toast('Resumo copiado.')}catch{toast('Não consegui copiar automaticamente.')}});
    window.lucide?.createIcons?.();
  }

  async function runDeep(){
    const payload=makePayload();
    if(!payload)return toast('Importe seu XML antes de gerar a análise.');
    const url=endpoint(),box=q('#aiCareerBoxV4');
    if(!url){
      if(box)box.insertAdjacentHTML('beforeend','<div class="deep-activation"><strong>A análise profunda está pronta no código.</strong><p>Falta apenas ativar o backend protegido uma única vez na aba Sistema. Depois disso, é só clicar e usar.</p></div>');
      return toast('Falta somente ativar o backend uma vez.');
    }
    if(box){box.className='deep-report-v7 loading';box.innerHTML='<div class="deep-loading"><div class="deep-pulse"></div><div><strong>Lendo sua trajetória de verdade…</strong><p>Cruzando produção, formação, atividade recente, palavras-chave e pistas públicas.</p></div></div>'}
    try{
      const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e?.message||`API ${res.status}`)}
      renderResult(await res.json());
    }catch(e){console.error(e);if(box)box.innerHTML='<div class="deep-error"><i data-lucide="triangle-alert"></i><div><strong>A IA não respondeu agora.</strong><p>A análise local continua disponível. Tente novamente depois de conferir a aba Sistema.</p></div></div>';window.lucide?.createIcons?.()}
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest('#deepAiBtnV4,#deepAiBtnV4Bottom');
    if(!btn)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    runDeep();
  },true);
})();
