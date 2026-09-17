(() => {
  const originalParse = DOMParser.prototype.parseFromString;
  let captureArmed = false;
  let importSeq = 0;

  // Só uma importação REAL do usuário (ou o demo) pode atualizar o XML global.
  // Releituras internas usadas para validação, serialização e auditoria não disparam xml-ready.
  const armNextRealImport = () => { captureArmed = true; };
  document.addEventListener('change', e => {
    if (e.target?.id === 'xmlInput' && e.target?.files?.length) armNextRealImport();
  }, true);
  document.addEventListener('click', e => {
    if (e.target?.closest?.('#demoBtn')) armNextRealImport();
  }, true);

  DOMParser.prototype.parseFromString = function (source, type) {
    const doc = originalParse.call(this, source, type);
    try {
      const isXml = /xml/i.test(String(type || ''));
      const root = doc?.documentElement;
      const isLattes = isXml && root && (root.tagName === 'CURRICULO-VITAE' || doc.querySelector?.('CURRICULO-VITAE'));
      if (isLattes && captureArmed) {
        captureArmed = false;
        importSeq += 1;
        window.__easyLattesCurrentDoc = doc;
        window.__easyLattesCurrentXmlText = String(source || '');
        window.__easyLattesImportSeq = importSeq;
        window.dispatchEvent(new CustomEvent('easy-lattes:xml-ready', {
          detail: { doc, source: String(source || ''), importSeq, reason: 'user-import' }
        }));
      }
    } catch (_) {}
    return doc;
  };

  // Segunda barreira: não deixa o mesmo toast se empilhar em rajada.
  function installToastGuard() {
    const stack = document.querySelector('#toastStack');
    if (!stack || stack.dataset.guardInstalled === '1') return;
    stack.dataset.guardInstalled = '1';
    const recent = new Map();
    const obs = new MutationObserver(records => {
      const now = Date.now();
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          const text = (node.textContent || '').trim();
          if (!text) continue;
          const last = recent.get(text) || 0;
          if (now - last < 1200) {
            node.remove();
            continue;
          }
          recent.set(text, now);
        }
      }
      for (const [k, t] of recent) if (now - t > 5000) recent.delete(k);
    });
    obs.observe(stack, { childList: true });
  }

  window.addEventListener('load', () => {
    installToastGuard();
    const version = '20260917-1052';
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
    addStyle('easy-career-deep-v7', 'career-deep-v7.css');
    addScript('easy-career-deep-v7', 'career-deep-v7.js');
  });
})();
