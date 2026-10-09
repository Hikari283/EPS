// popup.js — ポップアップのUI制御。実際のページ操作は content.js に依頼する。
const $ = (id) => document.getElementById(id);
let rows = []; // 取り込んだ結果 {id, params:{...}}

function setStatus(t, color) { const s = $('status'); s.textContent = t; s.style.color = color || '#fbbf24'; }

function renderTable() {
  if (!rows.length) { $('result').innerHTML = ''; return; }
  // 列は全行のキーの和集合
  const keys = [];
  rows.forEach(r => Object.keys(r.params || {}).forEach(k => { if (!keys.includes(k)) keys.push(k); }));
  let html = '<table><tr><th>患者ID</th>' + keys.map(k => `<th>${esc(k)}</th>`).join('') + '</tr>';
  rows.forEach(r => {
    html += '<tr><td>' + esc(r.id || '') + '</td>' +
      keys.map(k => `<td>${esc((r.params && r.params[k]) || '')}</td>`).join('') + '</tr>';
  });
  html += '</table>';
  $('result').innerHTML = html;
}
function esc(s){ return String(s).replace(/</g,'&lt;'); }

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// 現在の画面から取り込む（開いているレポートを content.js が innerText で解析）
$('scrape').onclick = async () => {
  setStatus('現在の画面を解析中…');
  try {
    const tab = await activeTab();
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'scrapeCurrent' });
    if (res && res.ok) {
      rows.push({ id: res.id || ('手動' + (rows.length + 1)), params: res.params });
      renderTable();
      setStatus('取り込みました（ID: ' + (res.id || '不明') + '）', '#34d399');
    } else {
      setStatus('このページからは数値を取れませんでした。レポート画面で試してください。');
    }
  } catch (e) {
    setStatus('content scriptに接続できません。CareLinkのタブで開いてください。');
  }
};

// 自動巡回（CareLinkの検索→レポートの流れが判明したら content.js の navigateAndScrape を実装）
$('run').onclick = async () => {
  const ids = $('ids').value.split(/\s+/).map(s => s.trim()).filter(Boolean);
  if (!ids.length) { setStatus('患者IDを入力してください。'); return; }
  setStatus('自動巡回は未実装です（CareLinkの画面構造を教えてください）。今は「現在の画面から取り込む」をご利用ください。');
};

// CSV出力
$('csv').onclick = () => {
  if (!rows.length) { setStatus('データがありません。'); return; }
  const keys = [];
  rows.forEach(r => Object.keys(r.params || {}).forEach(k => { if (!keys.includes(k)) keys.push(k); }));
  const head = ['患者ID', ...keys];
  const lines = [head.join(',')];
  rows.forEach(r => {
    lines.push([r.id, ...keys.map(k => csvCell((r.params && r.params[k]) || ''))].join(','));
  });
  const blob = new Blob(["﻿" + lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename: 'carelink_' + Date.now() + '.csv' }).catch(() => {
    const a = document.createElement('a'); a.href = url; a.download = 'carelink.csv'; a.click();
  });
};
function csvCell(v){ v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g,'""') + '"' : v; }
