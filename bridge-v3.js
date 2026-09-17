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
    const version = '20260917-1205';
    const addStyle = (key, href) => {
      if (document.querySelector(`link[data-${key}]`)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `${href}?v=${version}`;
      link.setAttribute(`data-${key}`, '1');
      document.head.appendChild(link);
    };
    const addScript = (key, src, module = false) => {
      if (document.querySelector(`script[data-${key}]`)) return;
      const script = document.createElement('script');
      script.src = `${src}?v=${version}`;
      if (module) script.type = 'module';
      script.setAttribute(`data-${key}`, '1');
      document.body.appendChild(script);
    };

    addStyle('easy-platform-v6', 'platform-v6.css');
    addScript('easy-platform-v6', 'platform-v6.js');
    addScript('easy-identity-v6', 'identity-v6.js');
    addStyle('easy-career-v4', 'career-v4.css');
    addScript('easy-career-v4', 'career-v4.js', true);
    addStyle('easy-discovery-v5', 'discovery-v5.css');
    addScript('easy-discovery-v5', 'discovery-v5.js', true);
  });
})();