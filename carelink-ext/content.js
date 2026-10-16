// content.js — CareLinkのページ内で動作。popup からの依頼で数値を抽出する。
// 方針：ページの innerText をラベルベースで解析（DOM構造に依存しにくい）。
// 実レポートのラベルが分かり次第、LABELS を調整して精度を上げる。

// 抽出したい項目のラベル候補（日本語/英語）。実データに合わせて追加・修正してください。
const LABELS = [
  { key: '患者ID',            re: /(?:患者ID|Patient ID|ID)\D{0,6}(\d{6,10})/i },
  { key: '電池電圧(V)',        re: /(?:電池電圧|Battery Voltage|電池)\D{0,10}([\d.]+)\s*V/i },
  { key: '電池残量',          re: /(?:電池状態|電池残量|Battery Status)\D{0,10}([A-Za-z一-鿿]+)/i },
  // 心房リード
  { key: '心房 P波高(mV)',     re: /(?:心房|Atrial|A)[^\n]{0,20}(?:P波高|P-?Wave|Sensing|感度)\D{0,10}([\d.]+)\s*mV/i },
  { key: '心房 閾値(V)',       re: /(?:心房|Atrial|A)[^\n]{0,20}(?:閾値|Threshold|捕捉閾値)\D{0,10}([\d.]+)\s*V/i },
  { key: '心房 インピーダンス(Ω)', re: /(?:心房|Atrial|A)[^\n]{0,20}(?:インピーダンス|Impedance|抵抗)\D{0,10}(\d{2,4})\s*(?:Ω|ohm)/i },
  // 心室リード
  { key: '心室 R波高(mV)',     re: /(?:心室|Ventric|RV|V)[^\n]{0,20}(?:R波高|R-?Wave|Sensing|感度)\D{0,10}([\d.]+)\s*mV/i },
  { key: '心室 閾値(V)',       re: /(?:心室|Ventric|RV|V)[^\n]{0,20}(?:閾値|Threshold|捕捉閾値)\D{0,10}([\d.]+)\s*V/i },
  { key: '心室 インピーダンス(Ω)', re: /(?:心室|Ventric|RV|V)[^\n]{0,20}(?:インピーダンス|Impedance|抵抗)\D{0,10}(\d{2,4})\s*(?:Ω|ohm)/i },
  // ショックリード（ICD）
  { key: 'ショック インピーダンス(Ω)', re: /(?:ショック|Shock|HV|除細動)\D{0,20}(?:インピーダンス|Impedance)\D{0,10}(\d{1,4})\s*(?:Ω|ohm)/i },
  { key: 'ペーシング率(%)',    re: /(?:ペーシング率|Pacing|%Paced|ペース)\D{0,10}([\d.]+)\s*%/i },
];

function extractFromText(text) {
  const t = text.replace(/[ \t]+/g, ' ');
  const params = {};
  for (const L of LABELS) {
    const m = t.match(L.re);
    if (m) params[L.key] = m[1];
  }
  const id = (t.match(/(?:患者ID|Patient ID|ID)\D{0,6}(\d{6,10})/i) || [])[1] || '';
  return { id, params };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'scrapeCurrent') {
    try {
      const text = document.body ? document.body.innerText : '';
      const { id, params } = extractFromText(text);
      sendResponse({ ok: Object.keys(params).length > 0, id, params, rawLen: text.length });
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
    return true;
  }
  // navigateAndScrape は CareLink の検索フローが判明次第ここに実装する
});
