// PaceGuard LATITUDE（ローカルのツール）からの「通知して」を受け取り、拡張機能の本体へ渡す
document.documentElement.dataset.pgExt = '1';
window.addEventListener('message', e => {
  if (e.source !== window || !e.data || !e.data.__pgNotify) return;
  chrome.runtime.sendMessage({ type: 'notify', title: String(e.data.title || ''), body: String(e.data.body || ''), level: e.data.level | 0 }).catch(() => {});
});

chrome.runtime.sendMessage({ type: 'toolReady' }).catch(() => {});
window.addEventListener('message', e => {
  if (e.source === window && e.data && e.data.__pgArrange) chrome.runtime.sendMessage({ type: 'arrange' }).catch(() => {});
});

// 自動レポート：拡張機能から「この患者の保存済みイベントは？」と聞かれたら、ツールの画面に聞いて答える
chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (!m || m.type !== 'askSeen') return;
  const req = Math.random().toString(36).slice(2);
  const on = e => { if (e.source !== window || !e.data || e.data.__pgSeenReply !== req) return; window.removeEventListener('message', on); clearTimeout(t); reply({ ok: !!e.data.ok, ids: e.data.ids || [], msg: e.data.msg || '' }); };
  const t = setTimeout(() => { window.removeEventListener('message', on); reply({ ok: false }); }, 8000);
  window.addEventListener('message', on);
  window.postMessage({ __pgAskSeen: req, pid: String(m.pid || '') }, '*');
  return true;
});
