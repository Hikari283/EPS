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

document.addEventListener('click', async e => { if (e.target.id !== 'resetCnt') return;
  await chrome.storage.local.set({ count: 0, todayCount: 0 }); chrome.action.setBadgeText({ text: '' }); load(); });
