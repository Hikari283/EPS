// ページの中で作られるPDF（blob）を見つけて、拡張機能に渡す（ページの世界で動く）
(() => {
  if (window.__pgHooked) return; window.__pgHooked = true;
  const seen = new WeakSet();
  const send = (blob, how) => {
    if (!(blob instanceof Blob) || seen.has(blob) || blob.size < 100 || blob.size > 60e6) return;
    seen.add(blob);
    blob.slice(0, 5).text().then(h => {
      if (h !== '%PDF-') return;
      blob.arrayBuffer().then(buf => window.postMessage({ __pgPdf: true, buf, how }, '*', [buf]));
    }).catch(() => {});
  };
  const orig = URL.createObjectURL;
  URL.createObjectURL = function (obj) { try { send(obj, 'blob'); } catch (_) {} return orig.apply(this, arguments); };
})();
