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
})();