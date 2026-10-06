// PaceGuard LATITUDE 取り込み：LATITUDEで開いたPDFを ダウンロード\<フォルダ>\ に自動保存する
const DEF = { enabled: true, folder: 'LATITUDE', hosts: ['bostonscientific.com', 'bostonscientific.jp'], count: 0 };
const getCfg = async () => { const c = { ...DEF, ...(await chrome.storage.local.get(Object.keys(DEF))) }; c.hosts = [...new Set([...DEF.hosts, ...(c.hosts || [])])]; return c; };
const hostOk = (url, cfg) => { try { const h = new URL(url).hostname; return cfg.hosts.some(d => h === d || h.endsWith('.' + d)); } catch (_) { return false; } };
const recent = new Map(); // 同じPDFを二重に保存しない
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; };
const safe = s => String(s || '').replace(/[\\/:*?"<>|\r\n]/g, '').trim();

async function save(opts, key) {
  const now = Date.now();
  for (const [k, t] of recent) if (now - t > 20000) recent.delete(k);
  if (recent.has(key)) return; recent.set(key, now);
  const cfg = await getCfg(); if (!cfg.enabled) return;
  const filename = `${safe(cfg.folder) || 'LATITUDE'}/LATITUDE_${stamp()}_${Math.random().toString(36).slice(2, 6)}.pdf`;
  try {
    await chrome.downloads.download({ ...opts, filename, conflictAction: 'uniquify', saveAs: false });
    const count = (cfg.count || 0) + 1; await chrome.storage.local.set({ count, last: new Date().toLocaleString('ja-JP') });
    chrome.action.setBadgeBackgroundColor({ color: '#16a34a' }); chrome.action.setBadgeText({ text: String(count % 1000) });
  } catch (e) { chrome.storage.local.set({ lastError: String(e && e.message || e) }); }
}

// ① サーバーから届くPDF（別タブ・枠の中で開くもの）
const bodies = new Map();
chrome.webRequest.onBeforeRequest.addListener(d => {
  if (d.method === 'POST' && d.requestBody) bodies.set(d.requestId, d.requestBody);
}, { urls: ['<all_urls>'], types: ['main_frame', 'sub_frame', 'object', 'other'] }, ['requestBody']);
chrome.webRequest.onHeadersReceived.addListener(d => {
  (async () => {
    const body = bodies.get(d.requestId); bodies.delete(d.requestId);
    if (d.statusCode !== 200) return;
    const cfg = await getCfg();
    if (!cfg.enabled || !(hostOk(d.url, cfg) || (d.initiator && hostOk(d.initiator, cfg)))) return;
    const hv = n => ((d.responseHeaders || []).find(h => h.name.toLowerCase() === n) || {}).value || '';
    if (!/application\/(pdf|x-pdf)/i.test(hv('content-type')) && !/\.pdf/i.test(hv('content-disposition'))) return;
    const opts = { url: d.url };
    if (d.method === 'POST') {
      opts.method = 'POST';
      if (body && body.formData) {
        const p = new URLSearchParams(); for (const [k, vs] of Object.entries(body.formData)) for (const v of vs) p.append(k, v);
        opts.body = p.toString(); opts.headers = [{ name: 'Content-Type', value: 'application/x-www-form-urlencoded' }];
      } else if (body && body.raw && body.raw[0] && body.raw[0].bytes) {
        opts.body = new TextDecoder().decode(body.raw[0].bytes);
      }
    }
    save(opts, d.method + ' ' + d.url + ' ' + (opts.body || ''));
  })();
}, { urls: ['<all_urls>'], types: ['main_frame', 'sub_frame', 'object', 'other'] }, ['responseHeaders']);

// ② ページの中で作られるPDF（blob）
chrome.runtime.onMessage.addListener((m, sender) => {
  if (m && m.type === 'pdf' && m.b64) {
    getCfg().then(cfg => { if (sender.url && !hostOk(sender.url, cfg)) return;
      save({ url: 'data:application/pdf;base64,' + m.b64 }, 'blob ' + m.b64.length + ' ' + m.b64.slice(-64)); });
  }
});

// 追加したサイトにも、ページ内PDFの見張りを入れる
async function syncScripts() {
  const cfg = await getCfg();
  const extra = cfg.hosts.filter(h => !DEF.hosts.includes(h)).flatMap(h => [`https://${h}/*`, `https://*.${h}/*`, `http://${h}/*`, `http://*.${h}/*`]);
  try { await chrome.scripting.unregisterContentScripts({ ids: ['pg-hook', 'pg-bridge'] }); } catch (_) {}
  if (!extra.length) return;
  try {
    await chrome.scripting.registerContentScripts([
      { id: 'pg-hook', matches: extra, js: ['hook.js'], world: 'MAIN', runAt: 'document_start', allFrames: true },
      { id: 'pg-bridge', matches: extra, js: ['bridge.js'], runAt: 'document_start', allFrames: true }]);
  } catch (e) { chrome.storage.local.set({ lastError: '追加サイトの設定：' + (e.message || e) }); }
}
chrome.runtime.onInstalled.addListener(syncScripts);
chrome.storage.onChanged.addListener(ch => { if (ch.hosts) syncScripts(); });

// ③ ツールの評価結果をWindowsの通知で知らせる（ファイルとして開いたページからは通知が出せないため、拡張機能が代わりに出す）
chrome.runtime.onMessage.addListener((m, sender) => {
  if (!m || m.type !== 'notify') return;
  if (!sender.url || !sender.url.startsWith('file:')) return;
  chrome.notifications.create('pg-' + Date.now(), {
    type: 'basic', iconUrl: 'icon128.png', title: m.title.slice(0, 120), message: m.body.slice(0, 300),
    priority: m.level >= 2 ? 2 : 0, requireInteraction: m.level >= 2
  });
});
