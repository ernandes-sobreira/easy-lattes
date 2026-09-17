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
})();
