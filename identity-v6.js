(() => {
  const previousFetch = window.fetch.bind(window);
  const firstAttr = (doc, names) => {
    if (!doc) return '';
    for (const el of [doc.documentElement, ...doc.querySelectorAll('*')]) {
      for (const name of names) {
        const value = el?.getAttribute?.(name);
        if (value) return value;
      }
    }
    return '';
  };
  window.fetch = function(input, init = {}) {
    try {
      const url = typeof input === 'string' ? input : input?.url || '';
      const endpoint = window.EASY_LATTES_WEB_DISCOVERY_ENDPOINT || window.EASY_LATTES_CONFIG?.webDiscoveryEndpoint || '';
      if (endpoint && url.startsWith(endpoint) && String(init.method || 'GET').toUpperCase() === 'POST' && typeof init.body === 'string') {
        const payload = JSON.parse(init.body);
        const doc = window.__easyLattesCurrentDoc;
        const orcid = firstAttr(doc, ['ORCID-ID','ORCID']);
        if (orcid && !payload.orcid) payload.orcid = orcid;
        init = { ...init, body: JSON.stringify(payload) };
      }
    } catch (_) {}
    return previousFetch(input, init);
  };

  const version = '20260917-1415';
  function addStyle(href,key){if(document.querySelector(`link[data-${key}]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=`${href}?v=${version}`;l.setAttribute(`data-${key}`,'1');document.head.appendChild(l)}
  function addScript(src,key){if(document.querySelector(`script[data-${key}]`))return;const s=document.createElement('script');s.src=`${src}?v=${version}`;s.setAttribute(`data-${key}`,'1');document.body.appendChild(s)}
  window.addEventListener('load',()=>{
    addStyle('academic-v8.css','easy-academic-v8');
    addScript('academic-v8.js','easy-academic-v8');
    addScript('intake-v8.js','easy-intake-v8');
    addScript('academic-ai-v8.js','easy-academic-ai-v8');
  });
})();