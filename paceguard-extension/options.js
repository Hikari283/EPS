const $ = id => document.getElementById(id);
const DEF = { enabled: true, folder: 'LATITUDE', hosts: ['bostonscientific.com', 'bostonscientific.jp'], count: 0 };
async function load() {
  const c = { ...DEF, ...(await chrome.storage.local.get(null)) };
  $('enabled').checked = c.enabled; $('folder').value = c.folder; $('hosts').value = c.hosts.join(', ');
  const today = new Date().toLocaleDateString('ja-JP'), tc = c.todayDate === today ? (c.todayCount || 0) : 0;
  $('status').innerHTML = `今日保存したPDF：<b>${tc}</b> 件（これまでの合計 ${c.count || 0} 件）${c.last ? '<br>最後：' + c.last : ''} <button id="resetCnt" style="font-size:11px;padding:1px 6px">数を0に戻す</button>` + (c.lastError ? `<div class="err">最後のエラー：${c.lastError}</div>` : '');
}
$('enabled').onchange = () => chrome.storage.local.set({ enabled: $('enabled').checked });
$('save').onclick = async () => {
  const folder = $('folder').value.replace(/[\\/:*?"<>|]/g, '').trim() || 'LATITUDE';
  const hosts = $('hosts').value.split(/[,\s、]+/).map(s => s.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^\*\./, '').trim()).filter(Boolean);
  const extra = hosts.filter(h => !DEF.hosts.includes(h)).flatMap(h => [`https://${h}/*`, `https://*.${h}/*`]);
  if (extra.length && !(await chrome.permissions.request({ origins: extra }))) { $('msg').textContent = 'サイトへのアクセスが許可されませんでした'; return; }
  await chrome.storage.local.set({ folder, hosts: hosts.length ? hosts : DEF.hosts, lastError: '' });
  $('msg').textContent = '保存しました'; load();
};
load();

chrome.storage.local.get({ autoArrange: true }).then(c => { $('autoArrange').checked = c.autoArrange; });
$('autoArrange').onchange = () => chrome.storage.local.set({ autoArrange: $('autoArrange').checked });
$('arrangeNow').onclick = async () => { const r = await chrome.runtime.sendMessage({ type: 'arrange' }); $('arrMsg').textContent = r === 'OK' ? '並べました' : (r || ''); };

// 自動レポート（試験中）
chrome.storage.local.get({ autoReport: false, autoStart: false, saveManual: false, autoSeen: {}, autoLast: '' }).then(c => {
  $('autoReport').checked = c.autoReport; $('autoStart').checked = c.autoStart; $('saveManual').checked = c.saveManual;
  const n = Object.keys(c.autoSeen).length; $('seenMsg').textContent = n ? `記録済みの患者 ${n} 人` : '';
  $('autoLast').textContent = c.autoLast ? '最後の自動作成：' + c.autoLast : '';
});
for (const k of ['autoReport', 'autoStart', 'saveManual']) $(k).onchange = () => chrome.storage.local.set({ [k]: $(k).checked });
$('resetSeen').onclick = async () => {
  if (!confirm('どのイベントを保存したかの記録を消します。次回は全部のイベントを作り直します。よろしいですか？')) return;
  await chrome.storage.local.set({ autoSeen: {}, autoLastRun: {} }); $('seenMsg').textContent = '消しました';
};

document.addEventListener('click', async e => { if (e.target.id !== 'resetCnt') return;
  await chrome.storage.local.set({ count: 0, todayCount: 0 }); chrome.action.setBadgeText({ text: '' }); load(); });
