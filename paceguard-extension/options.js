const $ = id => document.getElementById(id);
const DEF = { enabled: true, folder: 'LATITUDE用/LATITUDE', hosts: ['bostonscientific.com', 'bostonscientific.jp'], count: 0,
  clEnabled: true, clFolder: 'CareLink用/CareLink', clHosts: ['medtronic.com', 'medtroniccarelink.net'] };
const safePath = s => String(s || '').split(/[\\/]+/).map(x => x.replace(/[:*?"<>|\r\n]/g, '').trim()).filter(x => x && x !== '.' && x !== '..').join('/');
async function load() {
  const c = { ...DEF, ...(await chrome.storage.local.get(null)) };
  $('enabled').checked = c.enabled; $('folder').value = c.folder; $('hosts').value = c.hosts.join(', ');
  $('clEnabled').checked = c.clEnabled; $('clFolder').value = c.clFolder; $('clHosts').value = (c.clHosts || DEF.clHosts).join(', ');
  const today = new Date().toLocaleDateString('ja-JP'), tc = c.todayDate === today ? (c.todayCount || 0) : 0;
  $('status').innerHTML = `今日保存したPDF：<b>${tc}</b> 件（これまでの合計 ${c.count || 0} 件）${c.last ? '<br>最後：' + c.last : ''} <button id="resetCnt" style="font-size:11px;padding:1px 6px">数を0に戻す</button>` + (c.lastError ? `<div class="err">最後のエラー：${c.lastError}</div>` : '');
}
$('enabled').onchange = () => chrome.storage.local.set({ enabled: $('enabled').checked });
$('clEnabled').onchange = () => chrome.storage.local.set({ clEnabled: $('clEnabled').checked });
$('save').onclick = async () => {
  const folder = safePath($('folder').value) || DEF.folder, clFolder = safePath($('clFolder').value) || DEF.clFolder;
  const clHosts = $('clHosts').value.split(/[,\s、]+/).map(s => s.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^\*\./, '').trim()).filter(Boolean);
  const hosts = $('hosts').value.split(/[,\s、]+/).map(s => s.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^\*\./, '').trim()).filter(Boolean);
  const extra = hosts.filter(h => !DEF.hosts.includes(h)).flatMap(h => [`https://${h}/*`, `https://*.${h}/*`]);
  if (extra.length && !(await chrome.permissions.request({ origins: extra }))) { $('msg').textContent = 'サイトへのアクセスが許可されませんでした'; return; }
  await chrome.storage.local.set({ folder, hosts: hosts.length ? hosts : DEF.hosts, clFolder, clHosts: clHosts.length ? clHosts : DEF.clHosts, lastError: '' });
  $('msg').textContent = '保存しました'; load();
};
load();

chrome.storage.local.get({ autoArrange: true }).then(c => { $('autoArrange').checked = c.autoArrange; });
$('autoArrange').onchange = () => chrome.storage.local.set({ autoArrange: $('autoArrange').checked });
$('arrangeNow').onclick = async () => { const r = await chrome.runtime.sendMessage({ type: 'arrange' }); $('arrMsg').textContent = r === 'OK' ? '並べました' : (r || ''); };

document.addEventListener('click', async e => { if (e.target.id !== 'resetCnt') return;
  await chrome.storage.local.set({ count: 0, todayCount: 0 }); chrome.action.setBadgeText({ text: '' }); load(); });
