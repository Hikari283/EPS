// ページから受け取ったPDFを、拡張機能の本体（background）へ送る
window.addEventListener('message', e => {
  if (e.source !== window || !e.data || !e.data.__pgPdf || !(e.data.buf instanceof ArrayBuffer)) return;
  const u = new Uint8Array(e.data.buf); let s = '';
  for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
  chrome.runtime.sendMessage({ type: 'pdf', b64: btoa(s), how: e.data.how, page: location.href }).catch(() => {});
});

// 評価結果を、LATITUDEの画面の右上に表示する（Windowsの通知が止められていても見えるように）
chrome.runtime.onMessage.addListener(m => {
  if (!m || m.type !== 'toast' || window.top !== window) return;
  let host = document.getElementById('pg-toast-host');
  if (!host) {
    host = document.createElement('div'); host.id = 'pg-toast-host';
    host.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;max-width:380px';
    host.attachShadow({ mode: 'open' }).innerHTML = '<style>.t{font:14px/1.5 "Yu Gothic UI","Meiryo",sans-serif;color:#0f172a;background:#fff;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.25);padding:10px 34px 10px 14px;border-left:8px solid;position:relative;margin-bottom:8px;white-space:pre-line}.t b{display:block;font-size:15px}.x{position:absolute;top:4px;right:8px;border:0;background:none;font-size:18px;cursor:pointer;color:#64748b}</style><div id="w"></div>';
    (document.body || document.documentElement).appendChild(host);
  }
  const w = host.shadowRoot.getElementById('w'), t = document.createElement('div');
  t.className = 't'; t.style.borderLeftColor = m.level >= 2 ? '#dc2626' : m.level === 1 ? '#f59e0b' : '#16a34a';
  const b = document.createElement('b'); b.textContent = m.title; const p = document.createElement('div'); p.textContent = m.body;
  const x = document.createElement('button'); x.className = 'x'; x.textContent = '×'; x.onclick = () => t.remove();
  t.append(b, p, x); w.prepend(t);
  if (m.level < 2) setTimeout(() => t.remove(), m.level === 1 ? 30000 : 12000); // 要確認は×で閉じるまで残す
});
