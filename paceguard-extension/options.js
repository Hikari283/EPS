const $ = id => document.getElementById(id);
const DEF = { enabled: true, folder: 'LATITUDE', hosts: ['bostonscientific.com'], count: 0 };
async function load() {
  const c = { ...DEF, ...(await chrome.storage.local.get(null)) };
  $('enabled').checked = c.enabled; $('folder').value = c.folder; $('hosts').value = c.hosts.join(', ');
  $('status').innerHTML = `保存したPDF：<b>${c.count || 0}</b> 件${c.last ? '（最後：' + c.last + '）' : ''}` + (c.lastError ? `<div class="err">最後のエラー：${c.lastError}</div>` : '');
}
$('enabled').onchange = () => chrome.storage.local.set({ enabled: $('enabled').checked });
$('save').onclick = async () => {
  const folder = $('folder').value.replace(/[\\/:*?"<>|]/g, '').trim() || 'LATITUDE';
  const hosts = $('hosts').value.split(/[,\s、]+/).map(s => s.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^\*\./, '').trim()).filter(Boolean);
  const extra = hosts.filter(h => h !== 'bostonscientific.com').flatMap(h => [`https://${h}/*`, `https://*.${h}/*`]);
  if (extra.length && !(await chrome.permissions.request({ origins: extra }))) { $('msg').textContent = 'サイトへのアクセスが許可されませんでした'; return; }
  await chrome.storage.local.set({ folder, hosts: hosts.length ? hosts : DEF.hosts, lastError: '' });
  $('msg').textContent = '保存しました'; load();
};
load();
