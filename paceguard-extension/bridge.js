// ページから受け取ったPDFを、拡張機能の本体（background）へ送る
window.addEventListener('message', e => {
  if (e.source !== window || !e.data || !e.data.__pgPdf || !(e.data.buf instanceof ArrayBuffer)) return;
  const u = new Uint8Array(e.data.buf); let s = '';
  for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
  chrome.runtime.sendMessage({ type: 'pdf', b64: btoa(s), how: e.data.how, page: location.href }).catch(() => {});
});
