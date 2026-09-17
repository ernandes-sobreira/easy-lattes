(() => {
  const originalParse = DOMParser.prototype.parseFromString;
  DOMParser.prototype.parseFromString = function (source, type) {
    const doc = originalParse.call(this, source, type);
    try {
      const isXml = /xml/i.test(String(type || ''));
      const root = doc?.documentElement;
      const isLattes = isXml && root && (root.tagName === 'CURRICULO-VITAE' || doc.querySelector?.('CURRICULO-VITAE'));
      if (isLattes) {
        window.__easyLattesCurrentDoc = doc;
        window.__easyLattesCurrentXmlText = source;
        window.dispatchEvent(new CustomEvent('easy-lattes:xml-ready', { detail: { doc, source } }));
      }
    } catch (_) {}
    return doc;
  };

  window.addEventListener('load', () => {
    const version = '20260917-1045';
    if (!document.querySelector('link[data-easy-career-v4]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `career-v4.css?v=${version}`;
      link.dataset.easyCareerV4 = '1';
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[data-easy-career-v4]')) {
      const script = document.createElement('script');
      script.src = `career-v4.js?v=${version}`;
      script.type = 'module';
      script.dataset.easyCareerV4 = '1';
      document.body.appendChild(script);
    }
    if (!document.querySelector('link[data-easy-discovery-v5]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `discovery-v5.css?v=${version}`;
      link.dataset.easyDiscoveryV5 = '1';
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[data-easy-discovery-v5]')) {
      const script = document.createElement('script');
      script.src = `discovery-v5.js?v=${version}`;
      script.type = 'module';
      script.dataset.easyDiscoveryV5 = '1';
      document.body.appendChild(script);
    }
  });
})();
