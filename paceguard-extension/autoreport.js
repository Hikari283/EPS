// 自動レポート作成（試験中）：S-ICDの患者画面で、人の代わりにボタンを押してPDFを作る
//   ① レポートメニュー → ☑Quick Notes/S-ICDサマリ ☑最新のEGM/S-ECG表示 → レポートを作成
//   ② イベントタブ → 表示範囲「植込み」 → まだ保存していないイベントに☑ → 選択したイベントのレポートを作成
// 進み具合はタブごとの sessionStorage に持つ（画面が切り替わっても続きから動く）。設定でオフなら何もしない。
(() => {
  if (window.__pgAuto) return; window.__pgAuto = true;
  const KEY = 'pgAutoRun', STEP_MAX = 90000, MAX_EVENTS = 50;
  const LBL = {
    menu: 'レポートメニュー', create: 'レポートを作成',
    summary: 'Quick Notesレポート/S-ICDサマリレポート', secg: '最新のEGM/S-ECG表示レポート', secgMark: 'S-ECG表示レポート',
    evTab: 'イベント', logbook: '不整脈ログブック', range: '植込み', evCreate: '選択したイベントのレポートを作成'
  };
  const norm = s => String(s || '').replace(/\s+/g, '').trim();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const getRun = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (_) { return null; } };
  const setRun = r => { try { r ? sessionStorage.setItem(KEY, JSON.stringify(r)) : sessionStorage.removeItem(KEY); } catch (_) {} };
  const bodyText = () => (document.body && document.body.innerText) || '';
  const visible = el => !!(el && el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';

  // 押せるもの（ボタン・リンク）を、文字の完全一致で探す。似た名前のボタンを押さないため。
  function findClickable(label, scope = document) {
    const want = norm(label);
    const els = scope.querySelectorAll('button,a,input[type=button],input[type=submit],[role=button],[role=tab],[onclick]');
    for (const el of els) {
      if (el.closest('th')) continue;
      const t = norm(el.tagName === 'INPUT' ? el.value : el.textContent);
      if (t === want && visible(el)) return el;
    }
    return null;
  }
  // チェックボックスを、すぐ横の文字で探す（その行の中に他のチェックボックスが無い範囲だけを見る）
  function checkboxText(cb) {
    let el = cb, best = '';
    for (let i = 0; i < 4 && el.parentElement; i++) {
      el = el.parentElement;
      if (el.querySelectorAll('input[type=checkbox]').length > 1) break;
      best = el.textContent;
    }
    return norm(best);
  }
  function findCheckbox(label) {
    const want = norm(label);
    for (const cb of document.querySelectorAll('input[type=checkbox]')) if (checkboxText(cb).startsWith(want)) return cb;
    return null;
  }
  function setChecked(cb, on) {
    if (!cb || cb.disabled || cb.checked === on) return;
    cb.click(); // ページ側の処理も動くように、クリックで切り替える
    if (cb.checked !== on) { cb.checked = on; cb.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  const patientId = () => (bodyText().match(/[（(](\d{8})[）)]/) || [])[1] || '';

  // 画面右下の小さなパネル（状態表示と開始ボタン）
  let panel;
  function ui(msg, level = 0) {
    if (window.top !== window && !findClickable(LBL.menu) && !getRun()) return;
    if (!panel) {
      panel = document.createElement('div'); panel.id = 'pg-auto-panel';
      panel.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483646';
      panel.attachShadow({ mode: 'open' }).innerHTML = '<style>.p{font:13px/1.5 "Yu Gothic UI","Meiryo",sans-serif;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-left:6px solid #2563eb;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.18);padding:8px 10px;max-width:320px}button{font:inherit;padding:4px 10px;border-radius:6px;border:1px solid #2563eb;background:#2563eb;color:#fff;cursor:pointer;margin-top:4px}button.s{background:#fff;color:#334155;border-color:#94a3b8}.m{white-space:pre-line}.t{font-size:11px;color:#64748b}</style><div class="p"><div class="t">PaceGuard 自動レポート（試験中）</div><div class="m" id="m"></div><div id="b"></div></div>';
      (document.body || document.documentElement).appendChild(panel);
    }
    const r = panel.shadowRoot, box = r.querySelector('.p');
    box.style.borderLeftColor = level >= 2 ? '#dc2626' : level === 1 ? '#f59e0b' : '#2563eb';
    r.getElementById('m').textContent = msg;
    const b = r.getElementById('b'); b.innerHTML = '';
    if (getRun()) { const s = document.createElement('button'); s.className = 's'; s.textContent = '中止'; s.onclick = () => stop('中止しました'); b.append(s); }
    else if (findClickable(LBL.menu)) { const g = document.createElement('button'); g.textContent = '📄 S-ICDレポートを自動作成'; g.onclick = () => start(true); b.append(g); }
  }
  async function stop(msg, level = 0) {
    setRun(null); chrome.runtime.sendMessage({ type: 'autoWindow', on: false }).catch(() => {});
    ui(msg, level);
    chrome.runtime.sendMessage({ type: 'autoLog', msg }).catch(() => {});
  }
  async function start(byHand) {
    const pid = patientId();
    setRun({ step: 'menu', pid, t: Date.now(), byHand: !!byHand, made: 0 });
    chrome.runtime.sendMessage({ type: 'autoWindow', on: true }).catch(() => {});
    if (pid) chrome.storage.local.get({ autoLastRun: {} }).then(c => { c.autoLastRun[pid] = new Date().toLocaleDateString('ja-JP'); chrome.storage.local.set({ autoLastRun: c.autoLastRun }); });
    tick();
  }

  // PDFが保存されたら background から知らせが来る
  let savedAt = 0;
  chrome.runtime.onMessage.addListener(m => { if (m && m.type === 'pgSaved') savedAt = Date.now(); });
  async function waitSaved(since, ms) { const end = Date.now() + ms; while (Date.now() < end) { if (savedAt > since) return true; await sleep(500); } return false; }

  let busy = false;
  async function tick() {
    const run = getRun(); if (!run || busy) return;
    if (Date.now() - run.t > STEP_MAX * 6) return stop('時間がかかりすぎたので止めました', 1);
    busy = true;
    try {
      // ① レポートメニュー画面：S-ICDかを確かめて、2つにチェック → レポートを作成
      if (findCheckbox(LBL.secg) || findCheckbox(LBL.summary)) {
        if (run.step !== 'menu' && run.step !== 'menuCheck') return;
        const sum = findCheckbox(LBL.summary), sec = findCheckbox(LBL.secg);
        if (!sum || !sec || sum.disabled || sec.disabled) return stop('S-ICD以外の患者のため、何もしませんでした');
        for (const cb of document.querySelectorAll('input[type=checkbox]')) if (cb !== sum && cb !== sec) setChecked(cb, false);
        setChecked(sum, true); setChecked(sec, true); await sleep(300);
        const go = findClickable(LBL.create); if (!go) return stop('「レポートを作成」ボタンが見つかりません', 2);
        ui('① サマリとS-ECGのレポートを作成中…');
        const since = Date.now(); setRun({ ...run, step: 'waitMenuPdf', t: Date.now() });
        go.click();
        const ok = await waitSaved(since, STEP_MAX);
        const r2 = getRun(); if (!r2) return;
        setRun({ ...r2, step: 'events', made: r2.made + (ok ? 1 : 0), t: Date.now() });
        ui(ok ? '① 保存しました。イベントを確認します…' : '① PDFの保存を確認できませんでした。イベントへ進みます…', ok ? 0 : 1);
        await sleep(800);
        if (!findClickable(LBL.evTab)) history.back();
        return;
      }
      // ② イベント一覧（不整脈ログブック）：表示範囲を「植込み」に → まだのイベントに☑ → 作成
      if (run.step === 'events' && norm(bodyText()).includes(norm(LBL.logbook)) && document.querySelector('select')) {
        const sel = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => norm(o.text) === norm(LBL.range)));
        if (sel && norm(sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].text) !== norm(LBL.range)) {
          if (run.rangeTried) return stop('表示範囲を「植込み」に変えられませんでした', 2);
          setRun({ ...run, rangeTried: true, t: Date.now() });
          sel.value = [...sel.options].find(o => norm(o.text) === norm(LBL.range)).value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          ui('② 表示範囲を「植込み」にしました…'); await sleep(2500); busy = false; return tick();
        }
        const seenAll = (await chrome.storage.local.get({ autoSeen: {} })).autoSeen, key = run.pid || 'unknown', seen = new Set(seenAll[key] || []);
        const rows = [];
        for (const tr of document.querySelectorAll('tr')) {
          const cb = tr.querySelector('input[type=checkbox]'); if (!cb || cb.disabled) continue;
          const t = tr.innerText || '', no = (t.match(/(?:^|\s)(\d{3})(?:\s|$)/) || [])[1], dt = (t.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}:\d{2})/) || [])[0];
          if (!no || !dt) continue;
          rows.push({ cb, id: no + ' ' + norm(dt) });
        }
        const todo = rows.filter(r => !seen.has(r.id)).slice(0, MAX_EVENTS);
        if (!todo.length) return stop(`完了しました（PDF ${run.made} 件）\n新しいイベントはありません`);
        for (const r of rows) setChecked(r.cb, todo.includes(r));
        await sleep(300);
        const go = findClickable(LBL.evCreate); if (!go || go.disabled) return stop('「選択したイベントのレポートを作成」が押せません', 2);
        ui(`② 新しいイベント ${todo.length} 件のレポートを作成中…`);
        const since = Date.now(); setRun({ ...run, step: 'waitEventPdf', t: Date.now() });
        go.click();
        const ok = await waitSaved(since, STEP_MAX * 2);
        if (ok) { for (const r of todo) seen.add(r.id); seenAll[key] = [...seen]; await chrome.storage.local.set({ autoSeen: seenAll }); }
        const r2 = getRun(); if (!r2) return;
        if (!ok) return stop(`イベントのPDFの保存を確認できませんでした（PDF ${r2.made} 件）`, 1);
        const rest = rows.length - rows.filter(r => seen.has(r.id)).length;
        if (rest > 0) { setRun({ ...r2, step: 'events', made: r2.made + 1, t: Date.now() }); ui(`残り ${rest} 件を続けて作成します…`); await sleep(1500); busy = false; return tick(); }
        return stop(`完了しました（PDF ${r2.made + 1} 件・イベント ${todo.length} 件）`);
      }
      // 患者画面：手順に応じてボタンやタブを押す
      if (run.step === 'menu') { const b = findClickable(LBL.menu); if (b) { ui('① レポートメニューを開きます…'); b.click(); } return; }
      if (run.step === 'events') { const b = findClickable(LBL.evTab); if (b) { ui('② イベントを開きます…'); b.click(); } return; }
    } catch (e) { stop('止まりました：' + (e && e.message || e), 2); }
    finally { busy = false; }
  }

  // 起動：設定がオンのときだけ
  async function boot() {
    const cfg = await chrome.storage.local.get({ autoReport: false, autoStart: false, autoLastRun: {} });
    if (!cfg.autoReport) { setRun(null); return; }
    hookPrint(true);
    if (getRun()) { ui('続きを実行中…'); tick(); }
    else if (findClickable(LBL.menu)) {
      const pid = patientId();
      if (cfg.autoStart && pid && cfg.autoLastRun[pid] !== new Date().toLocaleDateString('ja-JP')) { ui('S-ICDレポートの自動作成を始めます…'); start(false); }
      else ui(pid && cfg.autoLastRun[pid] === new Date().toLocaleDateString('ja-JP') ? '今日はこの患者のレポートを作成済みです' : 'ボタンを押すと、S-ICDのレポートを自動で作成します');
    }
  }
  // 自動作成中は印刷画面を出さない（ページの世界の hook.js に合図する）
  function hookPrint(on) { document.documentElement.dataset.pgAutoReport = on ? '1' : ''; }

  let tries = 0;
  const loop = setInterval(() => { tries++; if (getRun()) tick(); else if (!panel && tries < 20) boot(); if (tries > 2000) clearInterval(loop); }, 1500);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
