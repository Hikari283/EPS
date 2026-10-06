// PaceGuard LATITUDE（ローカルのツール）からの「通知して」を受け取り、拡張機能の本体へ渡す
document.documentElement.dataset.pgExt = '1';
window.addEventListener('message', e => {
  if (e.source !== window || !e.data || !e.data.__pgNotify) return;
  chrome.runtime.sendMessage({ type: 'notify', title: String(e.data.title || ''), body: String(e.data.body || ''), level: e.data.level | 0 }).catch(() => {});
});
