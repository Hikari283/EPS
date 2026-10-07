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
    // 件数：今日の件数（日付が変わると0から）と、これまでの合計
    const today = new Date().toLocaleDateString('ja-JP'), st = await chrome.storage.local.get({ todayDate: '', todayCount: 0 });
    const todayCount = (st.todayDate === today ? st.todayCount : 0) + 1, count = (cfg.count || 0) + 1;
    await chrome.storage.local.set({ count, todayDate: today, todayCount, last: new Date().toLocaleString('ja-JP') });
    chrome.action.setBadgeBackgroundColor({ color: '#2563eb' }); chrome.action.setBadgeText({ text: String(todayCount) }); // 判定が出たら OK／!／!! に変わる
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

// ③ ツールの評価結果を知らせる：LATITUDEの画面の右上に表示＋拡張機能のアイコンに印＋Windowsの通知（出せる場合）
chrome.runtime.onMessage.addListener((m, sender) => {
  if (!m || m.type !== 'notify') return;
  if (!sender.url || !sender.url.startsWith('file:')) return;
  const title = m.title.slice(0, 120), body = m.body.slice(0, 300);
  (async () => {
    const cfg = await getCfg();
    const urls = cfg.hosts.flatMap(h => [`https://${h}/*`, `https://*.${h}/*`]);
    try { for (const t of await chrome.tabs.query({ url: urls })) chrome.tabs.sendMessage(t.id, { type: 'toast', title, body, level: m.level }).catch(() => {}); } catch (_) {}
  })();
  chrome.action.setBadgeBackgroundColor({ color: m.level >= 2 ? '#dc2626' : m.level === 1 ? '#f59e0b' : '#16a34a' });
  chrome.action.setBadgeText({ text: m.level >= 2 ? '!!' : m.level === 1 ? '!' : 'OK' });
  chrome.action.setTitle({ title: title + '\n' + body });
  try { chrome.notifications.create('pg-' + Date.now(), { type: 'basic', iconUrl: 'icon128.png', title, message: body, priority: m.level >= 2 ? 2 : 0, requireInteraction: m.level >= 2 }); } catch (_) {}
});

// ④ 開いた時に「左：ツール／右：LATITUDE」に自動で並べる
async function arrange() {
  const cfg = await getCfg();
  const tabs = await chrome.tabs.query({});
  const tool = tabs.find(t => t.url && t.url.startsWith('file:') && /paceguard-latitude/i.test(t.url));
  const lat = tabs.find(t => t.url && hostOk(t.url, cfg));
  if (!tool || !lat) return '見つからない：' + (!tool ? 'ツールのタブ ' : '') + (!lat ? 'LATITUDEのタブ' : '');
  const ds = await chrome.system.display.getInfo(); const wa = (ds.find(d => d.isPrimary) || ds[0]).workArea;
  const half = Math.floor(wa.width / 2);
  const left = { left: wa.left, top: wa.top, width: half, height: wa.height };
  const right = { left: wa.left + half, top: wa.top, width: wa.width - half, height: wa.height };
  let toolWin = tool.windowId;
  if (tool.windowId === lat.windowId) toolWin = (await chrome.windows.create({ tabId: tool.id, focused: false, ...left })).id;
  for (const [id, r] of [[toolWin, left], [lat.windowId, right]]) {
    await chrome.windows.update(id, { state: 'normal' });
    await chrome.windows.update(id, r);
  }
  await chrome.tabs.update(lat.id, { active: true }); await chrome.windows.update(lat.windowId, { focused: true });
  return 'OK';
}
chrome.runtime.onMessage.addListener((m, sender, reply) => {
  if (!m) return;
  if (m.type === 'toolReady') { // ツールのタブが開いた：このChromeを起動して最初の1回だけ自動で並べる
    (async () => {
      const cfg = await chrome.storage.local.get({ autoArrange: true }); if (!cfg.autoArrange) return;
      const s = await chrome.storage.session.get('arranged'); if (s.arranged) return;
      for (let i = 0; i < 10; i++) { // LATITUDEのタブが開くのを少し待つ
        await new Promise(r => setTimeout(r, 1000));
        if ((await arrange()) === 'OK') { await chrome.storage.session.set({ arranged: true }); return; }
      }
    })();
  }
  if (m.type === 'arrange') { arrange().then(r => reply && reply(r)); return true; }
});
