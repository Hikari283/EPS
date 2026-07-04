# EPS Trainer — 開発メモ

> **別PC（職場など）でClaude Codeを使うとき、まずこのファイルを読ませてください。**
> 「NOTES.md を読んで、このプロジェクトの続きを手伝って」と伝えるだけで文脈が引き継げます。

> **EPS/SVTの知識・仕様の一次参照**: `~/Downloads/EPSとSVT　永嶋孝一.pdf`（約70MB）。
> 波形・手技・各間隔（VA/AH/HV等）の妥当性は思い込みでなくこのPDFを確認してから実装すること。

最終更新: 2026-06-17（V Scan をリセット確認手技に修正・刺激位置を画面上で固定。EPS/SVT参照PDFを知識源に設定）

---

## このアプリは何か

**EPS（電気生理学的検査）トレーナー** — 心臓電気生理検査をブラウザ上でシミュレーションする学習用ツール。

- **単一HTMLファイル**（`index.html` 1つだけ）で完結。外部ライブラリ・サーバー・ネット接続すべて不要。
- HTML/CSS/JavaScript がすべて `index.html` に内包されている。
- ブラウザでダブルクリックして開けば動く。Canvas で心内心電図を描画。

## ファイル構成

```
EPS_trainer/
├── index.html        ← 本体（これだけで動く）
├── eikaiwa.html      ← こえ英会話（別ツール・単一HTML）
├── schedule.html     ← ロック画面スケジュール壁紙ジェネレーター（別ツール・単一HTML）
├── NOTES.md          ← このメモ
└── .claude/          ← 開発補助（任意。使うだけなら不要）
    ├── serve.ps1     ← Windows用の簡易静的HTTPサーバ（PowerShell製）
    └── launch.json   ← Claude Code プレビュー設定（eps-ps）
```

- **使うだけ**なら `index.html` をブラウザでダブルクリックするだけ。`.claude/` は不要。
- 開発中はプレビュー同期先として `/private/tmp/eps_preview/index.html` にもコピーして動作確認していた（Mac側）。Windows側ではプレビュー機能で `.claude/serve.ps1`（`eps-ps`）を起動して確認。

---

## schedule.html — ロック画面スケジュール（2026-07-04追加）

iPhoneのロック画面で予定を見るための単体ツール（EPSトレーナーとは独立）。
WebからはiOSロック画面ウィジェット（WidgetKit）を作れないため、2方式で代替：

1. **壁紙生成**: 予定（最大4カテゴリー、各項目=タイトル+日付+時刻）を入力すると、
   iOSウィジェット風レイアウト（ミニ月カレンダー＋サマリー／週間イベントバー／2×2カテゴリーカード）を
   Canvasで描いたロック画面用PNGを生成。上部25%はiOSの時計用に空けてある。
   背景写真アップロード可（長辺2000pxに縮小してlocalStorage保存、暗フィルタ付き）。
   共有ボタン（`navigator.share` files）または画像長押しで写真に保存→壁紙に設定。
2. **.ics書き出し**: 日付+時刻つき予定をVCALENDARでダウンロード→Appleカレンダーに取込→
   ロック画面の標準カレンダーウィジェットで表示（こちらは自動更新される）。

- データは `localStorage['lockschedule_v2']`（date / bg / cats[{icon,name,color,items[]}]）。
- 描画は `drawWallpaper()` → `drawMiniMonth` / `drawSummary` / `drawWeekStrip` / `drawCatCard`。
  スケールは `u=H/2556` 基準。サイズは端末自動 or iPhoneプリセット。
- 週間バーは基準日の前日〜5日後。各日チップ最大2、超過は +n 表示。

## 主要な仕組み（コード地図）

すべて `index.html` 内の `<script>`。主な関数・定数の場所（行番号は目安。ズレることがあるので関数名でgrep推奨）：

### 波形生成
- `CH`（330行〜）: チャンネル定義（体表I/II/V1, HRA, His d/m/p, CS 5極, RVA, Stim）
- `ev()`, `emitAtrial()`, `emitHis()`, `emitVent()`, `emitStim()`: 各電位イベントを波形バッファに置く
- `atrialOffsets(mode)`: ペーシング部位ごとの心房各電極の到達時間差（求心性/偏心性の活性化パターン）

### 房室結節モデル（漸減伝導）
- `const AVNODE = {ERP:250, AHmin:75, K:190, tau:130}`: 順行 房室結節
- `const RNODE  = {ERP:285, VAmin:125, K:150, tau:100}`: 逆行（室房）伝導
- 回復時間ベースの双曲線モデル: `AH = AHmin + K/(1+(rec-ERP)/tau)`
- `buildStraightPace()`（1067行〜）: バースト/連続ペーシング。**指数平滑（ADAPT=0.32）で AH を徐々に延長**（ウォームアップ＝減衰伝導特性）。速いレートで Wenckebach→2:1ブロックが出る。

### シナリオ
`<select id="scenario">`（102行〜）: avnrt / avrt / at / atypavnrt / aflutter / 各種AVブロック
- `getBaselineTachyCL(sc)`: avnrt/avrt は null（洞調律ベース）、at/atypavnrt/aflutter は頻拍CLを返す

### ペーシング
- モード: `s1s2`（早期刺激・有限列）, `burst`（連続）, `vscan`（V Scan）
- `deliver` ボタン、`stopPace` ボタン、S1/S2/S3 の ± ボタン
- 部位: HRA / His / CS各極 / RVA

### 描画
- `draw()`: メインの描画ルーティング
- `drawSweep()`: ライブ掃引（紙送り）
- `drawStatic()`: 静止（フリーズ）描画
- `drawSplitView()`: **Stimトリガー モード時の左右分割**（左=ライブ、右=レビュー）

### 録画
- `saveRecording()`, `switchToRecording()`, `switchToLive()`: ペーシング結果をタブとして保存・閲覧

---

## Stimトリガー・レビュー画面（最近の主要機能）

「Stimトリガー線」チェックでスプリット表示になる。**左=リアルタイム掃引、右=フリーズしたレビュー**。

### 仕様（実装済み）
1. **レビュー更新タイミング**: ペーシングが終わった後のみ更新。
   - S1S2 など有限列: `scheduleReviewCapture()` で `reviewPendingT`（最終刺激+600ms）を予約 → ライブ掃引クロックがそこを通過したら `captureStimReview()` を1回だけ実行。
   - バースト/V Scan: `stopPace` で停止時にキャプチャ。
2. **更新フラッシュ**: 更新時に黄色いフラッシュ演出（`stimReviewFlashEnd`）。
3. **最終ペーシングを中央に表示**: `reviewCenterT`（既定＝最終刺激）をパネル中央に。
4. **縮小せず1:1スケール**: レビューは全幅を圧縮せず、ビットマップから等倍クロップして表示。波形スケールはライブと同じ。
5. **仕切り線ドラッグ可**: 左右の境界を左クリックでドラッグして幅変更。幅を変えても最終ペーシングは常に中央。
6. **レビューのパン**: レビュー画面を**右クリックドラッグ**で横スクロール（`reviewCenterT` を移動）。
7. **レビュー専用キャリパー**: 左クリックで配置（シアン色 #67e8f9）。比率（fraction）で保存するので更新時にズレない。右クリックで削除。

### 関連グローバル変数
```
stimReviewOC        // レビュー用オフスクリーンCanvas（ビットマップ）
reviewT0_cap        // ビットマップ描画時のt0
reviewPxPerMs_cap   // 同 pxPerMs
reviewW_cap         // 同 W
reviewCenterT       // パネル中央に表示する時刻
reviewPendingT      // 掃引がここを通過したらキャプチャ
splitDivX           // 仕切り線のX座標
reviewCalipers[]    // レビュー専用キャリパー（fraction保存）
```

### 関連関数
- `renderReviewBitmap(t0)`: 指定t0でレビュー波形を描画・保存（フラッシュなし）
- `captureStimReview()`: 最終刺激をビットマップ中央に置いてキャプチャ＋フラッシュ
- `reviewVisT0()`: パネル左端の時刻（1:1スケール基準）
- `reviewXToFrac` / `reviewFracToX` / `reviewFracToTime`: レビュー座標変換
- `reviewPanelW()`: 右パネルの実幅（= W - getSplitX()）

---

## 開発の進め方（USB ↔ クラウドを行き来するとき）

1. Claude Code on the web を開く（https://claude.ai/code）。
2. `NOTES.md` を `@` でアップロードして「読んで続きを手伝って」と依頼。
3. 作業前に USB の最新 `index.html` を `@` でアップロードする（前回より新しい場合）。
4. 作業が終わったら「**セッション終了**」または「**USB版に反映して**」と伝える。
   → Claude が最新 `index.html` をダウンロードリンクとして提示するので USB に上書き保存。
5. 動作確認は `index.html` をブラウザで開く（Chrome/Edge推奨）。

> **Claude への指示**（このメモを読んだとき）:
> セッション中に `index.html` を変更した場合、作業終了時に必ず `SendUserFile` で
> `/home/user/EPS/index.html` をユーザーへ送ること。

### 注意：バージョン管理
USBで持ち運ぶ場合、**常に「最後に編集した方が最新」**。古いファイルで上書きしないよう注意。
作業後は必ず最新の `index.html` をUSBにコピーしてから席を離れること。

---

## 2026-06-16 に追加した機能

### 心室（RVA）ペーシング時の逆行His電位
- VA伝導がある拍で、His電極に **V → H → A** の順で逆行Hisスパイクを表示。
- `emitHis(t+50, 1.6)`：心室電位Vの**50ms後**にHを置く（+30だとVの裾に重なって見えないため+50に調整）。scale=1.6で視認性を確保。
- 全RVAペーシング経路に実装：S1S2（`buildPaced`/`buildPacedTachy`）、バースト（`buildStraightPace`）、V Scan（`buildVScan`）、心室オーバードライブ（`buildVOverdrive`）、エントレインメント（`buildEntrainment`/`buildVentricularEntrainment`）、VAリンキング（`buildVaLinking`）。
- `emitHis(tH, sc=1)`：第2引数で振幅スケール。順行His（既存）は引数なし＝等倍。

### スクロール操作（フリーズ中）
- **ホイールボタン（中ボタン）押しドラッグ**で横パン。右クリックドラッグと同じ挙動。`pointerdown` の `e.button===1` 分岐＋`mousedown` で `preventDefault`（Chromeの autoscroll 抑止）。
- **←→矢印キー**で表示窓の10%ずつスクロール。Stimレビュー表示中はレビューパネルをパン。`keydown` ハンドラの `ArrowLeft`/`ArrowRight` 分岐。

### 開発環境メモ
- このPCには Python/Node が無いため、動作確認用に `.claude/serve.ps1`（PowerShell製の静的HTTPサーバ）と `.claude/launch.json` を用意。Claude Code のプレビュー機能で `eps-ps` を起動可能。
- ⚠️ **このファイルの編集に PowerShell の一括 `-replace` は使わないこと**。UTF-8日本語が文字化け・改行欠落する（一度破壊し OneDrive バックアップから復旧した）。編集は必ず Edit/Write ツールで。

## 心内波形のモルフォロジー（svtsim 風に調整・2026-06-16）
- 参考: svtsim.com の心内電図に寄せた。**心内波形は全体的にシャープな高周波スパイク**。ダルで幅広いのは体表（V1等）だけ。
- 波形関数（`KIND` と各 fn）:
  - `A`（心房）= `dog`, s:4 → 鋭い二相性スパイク。HRA は AVNRT で「鋭いA棘波1本」のクリーン表示。
  - `V`/`Vff`（心室・遠隔V）= **`vmulti`**（`sin(dt/s*2.7)·gauss` の減衰振動）→ **多相性（fractionated）でじゃみじゃみ複数の山**。これが svtsim 風の肝。山の数は係数 2.7 で調整（大=細かい / 小=粗い）。
  - `H` は鋭い単スパイク（s:2.6）。
- AVNRT 頻拍（`emitTachyBeat`/`fillTachyAVNRT`）: **VA≒0**（`emitVent(tA-4)`）で A と V がほぼ同時＝典型的 slow-fast。HRA は1スパイク、His/CS は A-V 密集。
- 洞調律は AV≒132ms（AH85+HV47）で A と V が離れるのが正常（変更不要）。
- **ペーシングスパイク（2026-06-18）**: 実症例同様、刺激アーチファクトを全チャンネルに表示。`drawStimSpike(x,top,mode)` の mode='near'（刺激部位＝背の高い縦スパイク＋三角）/'far'（他チャンネル＝細く薄いα0.45縦線）。掃引・静止の両ループで `state.stims['STIM']` を全チャンネルに描画し、`state.stims[ch.id]` に含まれる時刻だけ near。

## 既知の挙動・設計判断メモ
- `ctx` は `const` でDPR変換（`setTransform(dpr,...)`）済み。レビュービットマップはデバイス解像度（cv.width×cv.height）で保持。1:1表示は `dpr` を掛けてソースクロップ。
- レビューキャリパーを比率保存にしているのは、レビュー更新で `reviewCenterT` が変わってもキャリパーが画面上でズレないため（計測値=時刻差は安定）。
- ペーシング停止後はライブ継続（S1S2/バースト/V Scan すべて）。録画は残すが録画タブへは自動切替しない。
- 録画(レビュー)ビューは **100mm/s（`applySweep(100)`・`REC_WIN=2500`）** で開く。`recT0` は**最後のペーシング刺激を画面の左から35%**に配置 → ペーシング終了＋停止後応答(V-A-V/PPI)が一画面に収まる。ライブの掃引速度はユーザー設定を保持（録画から戻すと復元）。
- **バーストは「ペーシング前に基線5拍」をタイムラインに含む**（`buildVentricularEntrainment` 頻拍5拍 / `buildStraightPace` 洞調律5拍=`5*sinusCL`）。両ビルドは `state.pace.paceOnAt=tOn` を設定。
- **ライブは即ペーシング・録画だけ前波形あり**に分離：`state.sweepOrigin`（=paceOnAt）でライブ掃引の原点をペーシング開始位置にずらす（`drawSweep`のpageStart・loopの巻き戻し・フリーズ位置に反映）。録画は `drawStatic`/`t0` なので影響なし＝左パンでペーシング前の基線が見える。`generateTimeline` 冒頭で `paceOnAt=null` にリセット、非バーストは `sweepOrigin=0`。
- **ペーシングスパイク→波形の順（全電極）**：RVペース時、刺激(tV)の右側から波形が立ち上がるよう各電極の中心を後ろ倒し（以前は中心がスパイク手前にあり、スパイクが波形中央に重なっていた）。
  - 体表QS：`emitVentFusion` の `QSp`/`QRSd` 中心 `c-6`→`c+14`（=tV+32）。
  - RVA局所V：`emitVent`(rvPaced)・`emitVentFusion` で `tV+4`→`tV+18`。
  - 遠位far-field（His Vff／CS／HRA）：`emitVent`(rvPaced) は His `tV+22-24`／CS `tV+22`／HRA `tV+24`（非ペースは従来 tV+16/18 のまま＝VA間隔不変）。`emitVentFusion` も His を near-field V→far-field Vff に統一し tV+22-24／CS tV+22／HRA tV+24。
- **心房の加速タイミング（本 p165 図22/23）**：心室バーストでは VV=PCL は1拍目から、AAは最初TCLのままで数拍かけてPCLへ短縮（最初からPCLにはならない）。`buildVentricularEntrainment` で心房を独立生成（V毎の `emitAtrial(t+va)` を廃止）。`stableBeat=ceil((1-0.12)/onsetStep)`（onset≥1＝QRS一定）に対し、AAがPCLへ到達する拍 `aReach` を **ORT=`round(stableBeat×0.5)`（transition zone 中盤）／AVNRT=`stableBeat+2`（stable QRS 後）** に設定。`tAccel=tOn+aReach*pcl` 手前1拍を中間値でランプ。※心房はペース前TCLでドリフトし実到達が狙いより遅れるため、ORTは中盤(0.5×)に前倒し（stableBeat-2だと境界に乗りtransition外に見えた）。検証：ORT AA→PCLはstableの約3.5拍前（transition内）、AVNRTは約3.8拍後（transition外）。
- **ORT(AVRT)誘発条件（本 p89-90 図2, Coumel 3条件）**：`buildPaced` の誘発判定。心房S2＝**房室結節ERP(260ms) ≤ S2 < 副路順行ERP(310ms)** で誘発（副路が順行ブロック＝一方向性ブロック→結節のみ順行→副路逆行回復→逆伝導でORT）。S2≥310は副路順行伝導でδ波残存→誘発されず／S2<260は結節ブロックで伝導なし→誘発されず（各々フィードバックnote表示）。心室S2(RVA)は<330msで誘発。定数 `AP_ERP_ANT=310`・`AVN_ERP=260`（`ahForCoupling` の erp=260 と一致）。
- **WPW A/B/C型（副伝導路の部位別）**：症例に `avrt`(A型/左外側)・`avrtB`(B型/右自由壁)・`avrtC`(C型/後中隔)を追加。統一判定 `isAVRT(sc)`、設定テーブル `apConfig(sc)`（retro逆行マップ・v1/ii δ極性・side・label）。逆行マップは `atrialOffsets` の `avrt_left`(CS遠位最早)・`avrt_right`(HRA最早)・`avrt_ps`(CS近位/os最早)。δ波極性は `emitVent` preex で V1（A:+/B:−/C:+0.6）・II（C:−）を切替。誘発条件・エントレインメント・His不応期PVC・V-A-V等は3型共通（機序gateを `sc==='avrt'`→`isAVRT(sc)` に置換、`buildHisRefractoryPVC`/`buildVentricularEntrainment`/`buildVScanResetArmed` 内のローカル変数は `isAVRT`→`isORT` にリネームしてグローバル関数の衝突回避）。
- **頻拍ワンタッチ誘発ボタン**（`#induceTachy`）：連結期を合わせずに即頻拍開始。avnrt/avrt系は `tachyArmed=true`→`generateTimeline`で進行中頻拍を描画、AT/非典型/粗動は元々進行中、洞調律/AVブロックはトースト。
- **通電停止ボタン**（`#stopPace`、ラベル「■ 通電停止」）：継続ペーシングだけでなく**手技（マヌーバー）実行中も表示**（`updatePaceButtons` の `showStop = running || pace.maneuver`）。`stopPace` 冒頭に maneuver 分岐を追加し、録画保存→結果リズム（頻拍継続なら頻拍）へ戻す。
- **出力 −/＋ボタン**（`#outDec`/`#outInc`、`adjustOutput(±1)`）：実行中は即再描画。主にパラヒス刺激用。
- **パラヒス刺激が出力に反応**（`buildParaHisian`）：`HIS_CAPTURE_THRESH=4`。出力≥4V＝His捕捉（narrow・SA70）／1.5〜4V＝His非捕捉（幅広QRS・SAは副路74≈不変/結節132延長）／<1.5V＝捕捉なし(自己拍)。CL700の**連続トレイン**。ΔSA で nodal(延長) vs 副路(不変) を鑑別。
  - **出力スケジュール方式**：`state.pace.outputSchedule=[{t,v}]`。`adjustOutput` がパラヒス中は変更を現在の `clock` に記録し掃引位置を維持（`savedClock`復元）→ **同一掃引上で narrow↔幅広QRS の移行が連続して見える**（左端リセットしない・両方向OK）。`buildParaHisian` の `outAt(t)` が各拍の出力を決定。mvbtnでparahis開始時にschedule初期化。
  - **wide QRSを明確化**：非捕捉は専用波形 `QRSw`（`qrsw`, s=13＝narrow QRS s=7 の約2倍幅）。`emitVent(tV,…, surfaceKind)` 引数で体表QRS種別を指定（非捕捉='QRSw'）。narrow（His捕捉='QRS'）との対比が一目で分かる。
  - **パラヒスはバーストでも実施可**（臨床通り）：刺激部位を His電極（HISd/HISm/HISp）にして mode=burst で通電すると `buildStraightPace` 冒頭の `HISIDS.includes(p.site)` 分岐でパラヒス連続トレインになる。マヌーバーボタンと共通の `emitParaHisBeat`/`outputAtFactory`/`paraHisNotes` を使用。
  - **出力変更時のシームレス更新**：`generateTimeline(preserveView=true)` で **clock/sweepOrigin/t0・再生状態を保ったまま波形だけ再生成**（全更新＝画面リフレッシュ・解析再実行・視点リセットを回避）。`adjustOutput` と `#output` の `onchange`（手動入力/スピナー）双方が `isParaHisContext()`（=パラヒス手技 or His電極バースト）なら出力スケジュールに記録して `rebuildParaHisLive()=generateTimeline(true)`。掃引が止まらず narrow↔幅広 がシームレス切替。`#deliver` でHis電極バースト開始時に `outputSchedule` 初期化。
- **Coumel's law 症例**（脚ブロックによるVA/TCL延長で副路局在）：症例 `coumel_pos`（左自由壁Kent＋同側脚ブロック→VA/TCL +45ms＝陽性）／`coumel_neg`（後中隔Kent＋脚ブロック→ΔTCL 0＝陰性）。`fillTachyCoumel(start,end,pos)`：narrow ORT 約5.5拍→脚ブロック出現で `QRSw`（幅広）化、`pos`なら以降 TCL0=330→375・VA0=135→180、逆行マップは陽性=avrt_left/陰性=avrt_ps。`buildBaseline`/`renderTachy`/select/`setScenNote`/`updateModeLabel` に配線。state.result.notes に Coumel解説。⊿VA≥35msで自由壁副路と局在。
- **AT の V-A-A-V は心房も逆行entrain**（本 p111 図3）：心室オーバードライブ中、AT focus は overdrive 抑制され、**心房は逆行性(AVN経由＝concentric, retro_rv)に AA=PCL で捕捉**（＝ここまでペーシング依存／VAまでPCL）。停止後に AT focus が再開＝2つ目のA（at_focus・偏心性）→ V-A-A-V。以前は心房を解離させていた誤りを修正。`buildVentricularEntrainment` の AT分岐：ペーシングループで `emitAtrial(t+tp.va,'retro_rv')`、`atNext=lastV+va+tcl+AT_RETURN_EXTRA(50)`で AT focus 再開。**A1→A2 は overdrive抑制ぶん TCLより長い return cycle**（本 p111 図3：445>TCL395）。理由：A1(逆行retro_rv・concentric)とA2(at_focus・eccentric)は興奮順序が違い、電極ごとにAA見かけ値がオフセット差でずれる。以前はHRAだけ補正したためCS遠位で A1→A2 が ~338≈PCL に見えて**騙される**バグ→returnをTCLより長くして全電極でPCLと紛れないように解決。post-stopは#1逆行A再emitせず#2のみ。検証：ペーシング中 全電極AA=PCL(340)→A1→A2=392〜436(>TCL)→以降 全電極TCL(360)、PPI−TCL>115。
- **非典型(fast-slow)AVNRT は pseudo V-A-A-V＝心房二重応答(DAR)**（本 p113 図7・p114 金古2022）：1つの最終Vが逆行性に **fast pathway→A1（concentric, His最早期, `lastV+VA_FAST_AT=70`, per-beat `emitAtrial(t+70,'retro_rv')`でPCL捕捉）** と **superior slow pathway→A2（eccentric, CS最早期, 'atyp', `A1+A1A2_AT`）** の両方を伝導→一見V-A-A-V。**A1とA2は心房興奮順序が違う**（A1=刺激中のA/fast、A2=頻拍再開後のA/slow）。`fillTachyAtypAVNRT(A2+175)`で再開（A2と同一sequence）。**A1A2_AT = `pcl+50`（PCLより長い。本図7：PCL410に対しA1A2=476）**。ΔAA=TCL−A1A2（金古図8、AVNRT通常ΔAA>26/AT<−80）だが、A1A2>TCLだとΔAAは負（本例は重複域）→**決め手はA1とA2の興奮順序の違い**。`res.vaav.dAA/a1a2`格納。post-stop構造は `avnrt||isAVRT`(V-A-V)/`atypavnrt`(pseudo DAR)/`at`(真V-A-A-V)の3分岐。検証(PCL340,TCL360)：A1@+74(concentric)→A2@+472(eccentric, A1A2=390=PCL+50)→再開A@+832(A2+TCL)。
- **V-A-V停止後の「逆行A→次の自己A」はTCLになる**よう修正（旧：自走で283ms＝短すぎバグ）。`buildVentricularEntrainment` の心房ブロックを「加速前=TCLドリフト／加速後=各ペースV+VA_PACEにロック（AA=PCL・V-A一定）」に。`VA_PACE = ppiTcl(表示) + VA_tachy`（ORT 170 / AVNRT 154）→ 最終逆行A=lastV+VA_PACE が V-A-VのA、頻拍再開(fillTachyFromV, tRetV=lastV+tcl+ppiTcl)の最初の自己A が retroA+TCL に来る。PPI−TCL鑑別(AVNRT150/ORT50)は維持。transition-zoneのAA加速タイミング(p165)も保持。
- **RVペーシング中のHis/CS/HRA/体表 波形（実機 slow-fast AVNRT 写真に準拠）**：His電極は **H-V-A**（Stim→H 47ms, H→V 19ms, V→A 67ms＝実測）。`emitVentFusion`/`emitVent(rvPaced)`：His far-field V＝tV+66、loopの逆行 `emitHis(t+47,0.6)`＝H先行、A＝lastV+VA_PACE(133)。体表paced QS(`cp=tV+66`)は His Vと同時刻（延長線上）。His電極のVは鋭い多相性スパイク `Vsp`（vmulti s=3.6、実機準拠）。CSのVはHis(66)→tV+70で連続、HRAは小さくV(tV+74,0.22)。VA_PACE=ppiTclRef(AVNRT128/ORT50)+vaTachy、post-stop ppiTcl同値→AVNRT PPI−TCL≈128(>115)。検証：entrain後の拍で H@48/V@66/A@134、AA=PCL。
- 頻拍中にバーストモードを選ぶと刺激部位を自動でRVAに（V-A-V/V-A-A-V用。心房バースト=Wenckebach回避）。要 tachyArmed。
- **全頻拍シナリオを誘発式に統一**（「進行中」廃止）：`isInducible(sc)`（avnrt/avrt系/at/atypavnrt/aflutter/coumel）。選択時は `tachyArmed=false`＝洞調律(`buildBaseline('sinus')`)、💥誘発ボタン(`#induceTachy`)で `tachyArmed=true`→`renderTachy`。`renderTachy` に aflutter 追加。burst の entrainable/tachyCL・mode選択のonTachy・updateModeLabel は全て tachyArmed を要求。**誘発ボタンは①シナリオカード下**へ移動（通電ボタンと別カードで混同回避）。
- 房室結節の AH ウォームアップは CL=400ms 付近で Wenckebach、CL=330ms 付近で 2:1 ブロックが出るよう調整済み。

## V Scan の仕様（His不応期PVCスキャン・2026-06-17更新）
- V Scan（RVから単発早期刺激）は進行中頻拍に対して行う手技。洞調律から誘発する手技ではない。
- 開始連結期＝頻拍周期より長め（`tachyCL+20`）、10msずつ短縮。**RVから単発1拍**（S1+S2の2発ではない）。
- **早期刺激は画面上で常に同じ位置**：セグメント間隔＝表示窓 `state.win`（=`vscan.gap`）にし、窓内固定オフセットに刺激を置く（刺激時刻 mod win が一定）。基準拍は `refBeat=tExtra-coupling` で逆算配置。連結期ピルは `vscan.gap` で計算。
- **順行性His（committed）は常に発火・常に表示**：頻拍グリッドを連続させ、リセットで拍を飛ばさない（飛ばすとPVC近傍のHisが消えるバグだった）。連結期を縮めるとHisに対しPVCが前後に動き、His不応期に入っているか確認できる。
- 鑑別：**AVNRT**＝His不応期PVCで頻拍は**一切リセットしない**。AVNRT分岐は規則グリッド(0,CL,2CL…)を全期間描画し、PVCを「基準拍 B + delay」に重畳。B は周期 7×CL(位相一定でジッターなし)で進め、**開始 `delay = SL-50`**（SL=`p.s1cl`ユーザー設定）。次のHis=B+(CL-50) に対し PVCのHis基準位置=`SL-CL`。**SL 350-400→His〜V間／SL≧400→V・A より後(430で A)／SL<350→His より前**。delay を10msずつ縮小→PVCがHisより前へ早期化してスキャン。最初の基準拍 B=`round((win*1.5-delay)/CL)*CL` で**最初のPVCをページ中央付近**に配置。※SL連続ペーシング(不応期命中=無効)案は撤回しこの単発スキャンを採用。（＝連結期を縮めるスキャン。固定連結期だとHisに寄らない、固定画面位置だと右へ流れるので不可）。／**AVRT**＝副路経由で心房前進＋リセット。
- **V Scanモード選択でsite自動RVA**: `#paceModeSeg` の vscan ボタンで `state.pace.site='RVA'`＋ドロップダウン同期（誘発時HRA等が残って⚡Tトリガー/刺激がHRAになるのを防ぐ）。
- **RVペーシングのHis電極**: `emitVent(tV,preex,rate,rvPaced=true)` で His は大きな近接V波を出さず小さな遠隔far-fieldのみ（≒ペーシングスパイク主体）。RVAの各ペーシング経路(V Scan/S1S2/バースト/手技)に適用。
- `buildVScan()` のディスパッチ: at/非典型AVNRT/粗動→`buildVScanTachy()`、AVNRT/AVRT は `tachyArmed` のとき `buildVScanResetArmed()`、それ以外（洞調律）→従来の洞調律スキャン。
- **停止後も頻拍継続**: `generateTimeline` 非ペーシング分岐で `tachyArmed` の AVNRT/AVRT は `fillTachyAVNRT/AVRT` で継続描画。洞調律へは「洞調律へ戻す（resume）」で `tachyArmed=false`。
- His の縦線（旧 AH 注記用 橙破線）は `showHisSweep`/`showHisStatic` false 固定で非表示。
- **単発刺激に統一（2026-06-18）**: 洞調律パスの `buildVScan` も S1-S2 連続スキャンをやめ、**1セグメント1発・表示窓(`win`)に固定位置**の単発刺激スキャンに（背景は `buildBaseline`）。誘発あり(`buildVScanResetArmed`)/なし両方で「1発＝レビューに1発」。
- **停止位置からレビュー**: 停止時 `captureStimReview(savedClock)` を全モード(burst/vscan/s1s2)で呼び、`refClock` までの最後の刺激を中心にする（V Scanは全スキャンが残るので必須）。
- **停止位置で録画切り詰め（2026-06-18）**: V Scan 停止時は burst 同様 `state.pace.stopAt=savedClock` を立てて再生成 → `buildVScan`/`buildVScanResetArmed` が stopAt 以降の刺激を打たず duration も切り詰め → `saveRecording` で「実際に打った拍数・波形」に一致。録画後 stopAt をクリアしてライブ再生成。
- ⚠️ 手技の生理（His不応期PVCの定義・リセット/停止条件など）の細部は `~/Downloads/EPSとSVT　永嶋孝一.pdf`（324p）で確認のこと。

## 心室バースト（オーバードライブ）の融合波形（PDF p92-93準拠）
- RV心尖部ペースの完全捕捉QRSは**下壁(II)・V1で陰性QS**（上方軸・LBBB様）。波形種別 `QSp`（`qspace` 関数, 幅広陰性）を追加し、`emitVentFusion` で I＝陽性／II・V1＝陰性QS の融合に。
- **constant fusion**：定常では毎拍同一。融合度 `steadyFrac = 0.2+(TCL-PCL)/TCL*2.3`（PCL短いほど深い陰性QS＝**progressive fusion**）。
- **最終形は必ず完全捕捉＝深い陰性QS**（`steadyFrac≈0.85〜0.98`、レートは深さにわずかのみ）。**到達までの拍数がレート依存**：`frac = steadyFrac * min(1, 0.12+beat*onsetStep)`、`onsetStep=(TCL-PCL)/TCL*1.6`（clamp 0.09〜0.45）。**TCL−20(330)→QS到達≈10拍／300→5拍／250→3拍**（速いほど早く乗っ取る）。開始は R→rS→…→QS。VV/AAは刺激周期(PCL)で一定。

## バーストの既定レート＝TCL−20ms（臨床定番, 本書p92）
- `#paceModeSeg` の burst ボタン選択時、頻拍中（`getBaselineTachyCL` or AVNRT/AVRT armed）なら **S1=TCL−20ms** を自動セット（入力欄も同期）。本書「TCLより10〜20ms短い刺激周期」。
- これにより初期値600等でTCL以上→非エントレイン、という「変わらない」事故を回避。短くするほど融合が深まる（progressive fusion）。

## 心室バースト（オーバードライブ）＝頻拍中RVAバースト（2026-06-20, PDF準拠）
- `buildVentricularEntrainment(sc)`（`buildStraightPace` から RVA×entrainable で呼ばれる）。停止後：AVNRT/AVRT→**V-A-V**、AT→**V-A-A-V**。
- リードイン：`sense='none'`なら頻拍を見せず**約150msから即ペーシング開始**、センス指定時は3拍見せてから（`buildVentricularEntrainment` 冒頭）。
- **通電は頭出し（一番左から）**：deliver で `state.pace.startAt=null`、`generateTimeline` は clock=0/t0=0。押した位置に関係なくペーシングは頭(60〜150ms)から流れる。※「押した位置から（startAt）」も実装したが、洞調律ベースのRVバースト経路(`buildStraightPace`)では未適用で、clockだけ押した位置に保たれ前の拍にペーシング線が重なる不具合になったため、ユーザー要望で頭出しに戻した。`buildVentricularEntrainment` に startAt 分岐のコードは残存（startAt=null なので不発）。
- 鑑別基準は永嶋『EPSとSVT』p152（González-Torrecilla 2006 / Nagashima 2024）に準拠：**PPI−TCL 115ms・corrected PPI−TCL 110ms・SA−VA 85ms**。**ORTは下回る(rule in)・AVNRTは上回る(除外診断)**。
- 実装値: AVRT(ORT) PPI−TCL≈50/SA−VA≈20、AVNRT PPI−TCL≈150/SA−VA≈135。所見に「ORT rule in / AVNRT除外診断」を明記。

## 頻拍波形パラメータ
- 頻拍中の **HV≒48ms**（`emitTachyBeat`/`fillTachyAVNRT`/`fillTachyAVRT` で His を V の約48ms前に）。AVNRT/AVRT/AT/非典型で順行HVを正常域に。
- **AVNRT の CS VA**: `atrialOffsets('avnrt')` cs=[20,26,32,40,48]。A は Vff(tA+12) の後で、His最早期(VA≒0)→CS近位(+8)→CS遠位(+36) と漸増する求心性。VAが読める。
