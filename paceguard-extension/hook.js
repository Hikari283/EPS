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
  // 自動レポート作成中は印刷画面を出さない（キャンセルと同じ）。人が操作しているときは今までどおり出る
  const auto = () => {
    try { if (document.documentElement.dataset.pgAutoReport === '1' && sessionStorage.getItem('pgAutoRun')) return true; } catch (_) {}
    try { const o = window.opener || (window.top !== window && window.top); return !!(o && o.document.documentElement.dataset.pgAutoReport === '1' && o.sessionStorage.getItem('pgAutoRun')); } catch (_) { return false; }
  };
  const origPrint = window.print;
  window.print = function () { if (auto()) return; return origPrint.apply(this, arguments); };
  const orig = URL.createObjectURL;
  URL.createObjectURL = function (obj) { try { send(obj, 'blob'); } catch (_) {} return orig.apply(this, arguments); };
})();
