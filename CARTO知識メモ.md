# CARTO 知識メモ（CARTO Viewer / シミュレーター用）

> **別のPCや新しい会話で作業するときは、まず `NOTES.md` と、このファイルを読んでください。**
> ここは「確認できたこと」と「私の想定」を分けて書いています。想定は、確認できたら【確認済】に移してください。
> 最終更新：2026-11-18 ／ 作業ファイル：`carto-viewer.html`、`carto-viewer-la-data.js`

---

## 1. 本物のCARTO Exportの形式【確認済：OpenEPのテストデータ（Zenodo 6651600、CC BY 4.0、ブタ）で実物を読んで確認】

フォルダ構成（1症例）：
```
Export_Study-…/
  Study 1 11_25_2021 15-01-32.xml     ← 症例全体（下の「Study XML」）
  <マップ名>.mesh                      ← 3Dの形（1マップに1つ）
  <マップ名>_car.txt                   ← ポイントの一覧
  <マップ名>_Points_Export.xml         ← ポイント番号 → 詳細XMLのファイル名
  <マップ名>_P<番号>_Point_Export.xml  ← ポイントごとの詳細（注釈、WOI、電圧、インピーダンス）
  <マップ名>_P<番号>_ECG_Export.txt    ← ポイントごとの電位（約2.5秒）
  VisiTagExport/Sites.txt ほか         ← 焼灼点（RF）。AllPositionInGrids.txt は 180 MB と大きい
```

### .mesh
- 1行目 `#TriangulatedMeshVersion2.0`。セクション：`[GeneralAttributes] [VerticesSection] [TrianglesSection] [VerticesColorsSection] [VerticesAttributesSection]`。
- 頂点行：`番号 = X Y Z 法線X 法線Y 法線Z GroupID`。三角形行：`番号 = v0 v1 v2 法線X 法線Y 法線Z GroupID`（GroupID が -1000000 の三角形は非表示）。
- `[GeneralAttributes]` に `ColorsNames = Unipolar Bipolar LAT Impedance A1 A2 A2-A1 SCI ICL ACL Force Paso µBi`（13個）。
- `[VerticesColorsSection]` の各行は**14個**の値（名前は13個。最後の1個は名前なし）。`-10000` は無効値。名前の行の末尾に `[ColorsScaleSection]` が同じ行にくっついている（コメント行の扱いに注意）。
- 文字コードは Latin-1（µ が 0xB5）。UTF-8 では読めない。
- 座標の単位は mm。ブタの例では、マップの大きさ 約 50×120×30 mm。

### _car.txt（VERSION_5_0）【旧実装が間違えていた箇所】
1行目 `VERSION_5_0 <マップ名>`、以降 `P` で始まる行（タブ区切り）：
`P, 0, ポイント番号, 0, X, Y, Z, 向き×3, Unipolar, Bipolar, LAT, Impedance, …`（0始まりで **2=番号、4〜6=X,Y,Z、10=Uni、11=Bi、12=LAT、13=Imp**）。`-10000` は無効。

### Point_Export.xml（ポイントごと）
`<Annotations StartTime="…" Reference_Annotation="2000" Map_Annotation="-8000" />`、`<WOI From="20" To="180" />`、`<Voltages Unipolar= Bipolar= />`、`<Impedances …>`。
- `Reference_Annotation` は ECG の**サンプル番号**（ブタの例では 2000。ECGは2500サンプル）。LAT ＝ `Map_Annotation − Reference_Annotation`。
- `Map_Annotation − Reference_Annotation ≈ −10000` は無効（LATなし）。

### ECG_Export.txt
- 1行目 `ECG_Export_4.0`、2行目 `Raw ECG to MV (gain) = 0.003000`、3行目 `Unipolar Mapping Channel=M1 Bipolar Mapping Channel=M1-M2 Reference Channel=I`、4行目 チャンネル名 `M1(1) M2(2) …`、以降は整数（× gain で mV）。サンプリングは 1 kHz と想定（【未確認】）。
- マッピングのBipolarは、名前の組（`M1-M2`）で表され、列として存在しない場合がある → 2つのUnipolarの差で作る。

### VisiTagExport/Sites.txt
列：`Session ChannelID SiteIndex X Y Z DurationTime AverageForce MaxTemperature MaxPower BaseImpedance ImpedanceDrop FTI RFIndex TagIndexStatus …`。Session は大きな番号（例 34398）。PFA（VARIPULSE）の焼灼点が同じ形式で出るかは【未確認】。

### Study XML（`Study … .xml`）【ビューアはまだ読んでいない】
- ルート `<Study name=…>`：`<Units Distance="mm" Angle="radian">`、`<Maps Count>`。
- `<ColoringTable>`：色の種類 13個（Unipolar, Bipolar, LAT, Impedance, A1, A2, A2-A1, SCI, ICL, **ACI**, Force(**gr**), Paso, µBi）。単位は mV / ms / ohm。LAT は `Propagation=1`。
- `<TagsTable>`（26種）：肺静脈のタグ `LIPV/LSPV/RIPV/RSPV`（100〜103）と、入口 `… OS`（200〜203）、`MA`（僧帽弁輪 104）、`TA`（三尖弁輪 105）、`ABL`(9)、`FS` 分裂電位(8)、`DP` 二重電位(7)、`SCR` 瘢痕(10)、`C.Split`(50)、`C.Multi`(51)、`EOS`(13)、`SIA`(14) など。各タグに色と半径（既定 2）。
- `<Map Name Index Visible FileNames Volume>`：`Volume` は体積（mL と思われる【単位は未確認】）。`<ColoringRangeTable>`（色の範囲。`99999 / -99999` は未設定）、`<RefAnnotationConfig Algorithm Channel SingleChannelCriterion>`、`<CartoPoints Count>`（`Id, Position3D, CathOrientation, Cath_Id`、`<Tags>`、`<VirtualPoint>`）。
- `<SurfaceErrorTable>`：表面からの距離のしきい値 良 0 / 中 5 / 悪 10 mm。

### ほかの出力
`.vtk`（心腔の補助メッシュ）、`RF_*.txt`、`ContactForceInRF_*.txt`（通電中の接触力）など。

---

## 2. メーカー（J&J）の製品ページで確認できたこと【出典：jnj.co.jp/jjmkk/medical-professionals/biosense/products/…（2026-11-18に確認）】

| 製品 | 確認できた内容 |
|---|---|
| **OCTARAY** | **48極**、**8本のスプライン**（＝1本あたり電極6つ、双極5つ）。電極 **0.5 mm**。基準電極 TRUEref。電極の並びは3種類「**2-2-2-2-2 / 2-5-2-5-2 / 3-3-3-3-3**」（単位の記載なし。mmと想定）。広げたときの直径は**書かれていない**。 |
| PENTARAY NAV ECO | 5本のスプライン、20極（電極サイズ・間隔の記載なし。OCTARAYのページに「旧PENTARAYは1 mm電極」とある） |
| LASSO | 10極または20極、可変ループの直径 **15〜25 mm** |
| VARIPULSE | **10極のスパイラル型PFAカテーテル**（静脈の周囲を輪状に焼灼）。発生装置 TRUPULSE。寸法の記載なし |
| THERMOCOOL SMARTTOUCH SF | 多孔性の先端、SMARTTOUCH（接触力）。電極サイズの記載なし |
| CARTO 3 System | 位置は磁気センサー（精度 **±1 mm**）、カテーテルの描画はACL（平均 **±3 mm**） |
| **CARTO 3 V8** | V8 Base（**Local Velocity Vectors**、**VISITAG Stability+**）、CARTO ELEVATE（**Multipolar Mapping**、**Complex Signal Identification**、**Enhanced CONFIDENSE**、**Automatic Pattern Acquisition**）、CARTOSOUND FAM |
| CONFIDENSE | 自動マッピング支援、Ripple Mapping、伝播の表示（異常電位・Slow Conduction Zone） |
| VISITAG SURPOINT | Tag Index（Ablation Index）＝**接触力・出力・通電時間**から計算 |
| CARTOREPLAY | 過去の時点に戻って確認・ポイントを取れる（Retrospective Point Acquisition）、2画面対応 |
| CARTOUNIVU | 透視画像の上に、カテーテルと3Dマップを重ねる |
| CARTOSEG CT | CTから4つの心腔などを半自動で分割 |
| CARTONET | 症例データのクラウド管理・解析（エクスポートの記載なし） |

ほとんどのページは機能の紹介のみで、画面の細かい数値は載っていない。

### 取扱説明書（e-ifu.com）— 医療関係者向け・利用規約の同意が必要。自動では開けない
- CARTO3 取説 V7.5：https://www.e-ifu.com/ja/shared-document/14922/1/0/shared?langcode=ja&country=7501
- OCTARAY サポート取説：…/shared-document/52416/1/0/shared?langcode=ja&country=7501
- VISITAG SURPOINT 取説：…/shared-document/52336/…　／　LAM 取説：…/52320/…　／　OPTRELL 48：…/52322/…
- TRUPULSE Generator 取説：…/52419/1/3/…　／　THERMOCOOL SMARTTOUCH SF 取説：…/52335/1/0/…
- 期待している内容：Exportの手順と匿名化、取得の条件の初期値、色・しきい値の初期値、OCTARAYの寸法。**まだ誰も読めていない**（先生がPDFを保存するか、文章を貼ると反映できる）。

---

## 3. 先生のCARTOの画面で分かっていること（写真から。患者情報なし）
- 上部メニュー：`Study / Map / Point / Catheter / ECG / Display / Imaging / Window / Tools / Help`。各メニューの項目は、`carto-viewer.html` の `MENUS` に、写真の順で入れてある。
- 段階タブ：`Setup（HW/Study/Loc./Cath./Map）/ Mapping / Ablation / Verification`。
- System Tools（Tools → Administration Tools）：**Study Archiver / Error Reporting / Export Data... / DICOM Network / Open Logs / Security Update / User Management**、右列：**Tech. Tools / Simulator / Catheter Definition Tool / Monitor Setup / Export System Settings / Site Information / Hot Corner Settings**。**症例のExportは「Export Data...」。Study Archiverは、症例を丸ごと固めるバックアップで、匿名化されない（ログに `IsAnonymous: False`）**。
- Study メニュー → **Export Study Data...**（症例が開いているとき）。
- チャンネル名：OCTARAY の双極は **`SPU A1-A2`〜`SPU H5-H6`**（8本×5）。Refは `REF 1-2` など。CS は `CS 1-2` 形式。数字つきの旧形式 `20A_7-8` もある。
- 症例：AF、PFA（VARIPULSE）。マップ名は `6-LA` の形式。
- 右の点の一覧の列：`# / LAT / Elect. / CL / F… / Tag / Ty…`。数値の帯：`CL / LAT(ms) / Loc / Bi(mV) / µBi(mV)`。
- Bipolar表示の範囲：心房 **0.08〜0.50 mV**（写真）、Tag：`Tag.Idx`（薄いピンク→赤）。

---

## 4. 公開データ・ソフト（使えるもの）
| 名前 | 内容 | ライセンス |
|---|---|---|
| OpenEP テストデータ | 本物のCARTO Export（ブタ）。Zenodo 6651600、`carto.zip` 10.5 MB | CC BY 4.0 |
| 人の左房メッシュ | 患者7例（P1〜P7）の左房/右房。Zenodo 10726677（`data.zip` 1.6 GB のうち、`meshes/P*/P*_with_erp_lat_bi.vtk` が 0.8〜1.7 MB）。zipの中の一部だけを、HTTPのRangeで取れる。`bi`・`cv`・`lat` 配列つき | CC BY 4.0（**出典表示が必要**。`carto-viewer-la-data.js` の冒頭とAboutに記載済み） |
| ARGO | VT 9例、CARTO 3、PhysioNet | オープン |
| OpenEP / pyCEPS / cartoreader-lite | CARTO Exportを読む公開ソフト（cartoreader-lite は PyPI から入手可。ソースの読み方は `low_level/study.py`、`read_mesh.py`） | 各ライセンス |

---

## 5. 私の想定（【未確認】）— 実物・資料で確認したいこと
1. **座標の向き**：「+X＝患者の左、+Y＝後方、+Z＝頭側」を仮定（AP/PA/LAO/RAOと、L/Rの名前に影響）。
2. **OCTARAYの広がり**：中心から約4〜17 mm、最初の電極は中心から3 mm（資料なし）。
3. **取得の条件**：「直前から9 mm以内、既存点から3 mm以上」。CARTOの条件（ECGの一致、安定性、壁との距離など）とは違う。
4. **電圧・伝導速度**：簡易モデルは私の想定値。「実際の形」は公開データの値（患者のEAM由来）。
5. **通電（RF）のAI・ブロックの条件**：簡易式。PFAは未実装。
6. **ECGのサンプリング、ポイントの時間窓**：ブタの例（2500サンプル、Ref=2000）のみ確認。
7. **点の色・Tagの色の初期値**：写真の見た目に合わせたもので、数値の初期値は未確認。

---

## 6. 次にやること（候補）
- Study XML を読んで、**ポイントのタグ**、**マップごとの色の範囲**、**肺静脈のタグ（LIPV OS など）**を表示する。
- シミュレーターの通電に **VARIPULSE（10極スパイラル）** を追加（先生の症例はPFA）。
- 座標の向き・OCTARAYの寸法を、取説で確認して直す。
- 本物のAF症例のExport（匿名化）で、読み込みを確認する（ブタのデータは、LATや電位が少ない）。

---

## 7. V8の機能の詳細【確認済：J&J MedTech 公式ページ jnjmedtech.com/en-US/products/cardiovascular/carto/software/ 、2026-11-18】
先生のCARTOは **V8**（確認済み）。
- **V8 Base**：信号解析の強化、基質（瘢痕など）の評価の改善、超音波の連携。
- **LAT Velocity Vectors（LVV）**：洞調律またはペーシング中のマップ上に、興奮の伝わる速度を矢印で表示。名前は「Local」ではなく **LAT**。VTの瘢痕内の LAVA を見つけるための機能（虚血性VT 16例で15例でLAVAが消えた、という脚注あり）。
- **Stability+**：呼吸による動きとカテーテル自体の動きを分け、安定の判定と VISITAG の表示を早くする。
- **CARTO ELEVATE**：機械学習で信号を解析。**Complex Signal Identification** は、**心房粗動**の症例で、分裂電位を自動で取得してタグ付けする。**OPTRELL**（多電極カテーテル）と併用し、単極の遠距離成分を減らしてLATと電圧を安定させる。
- **Enhanced CONFIDENSE**：**Smart Index** を使ったマッピングで、マップを自動で最適化し続ける。Smart Index が高いほど、マップの質が高い。
- **CARTOSOUND FAM**：深層学習で、超音波カテーテルを数回転させるだけで左房の形を自動で作る（フレームの自動選択、呼吸ゲート）。
- **VISITAG**：通電中のデータ（出力・接触力・時間）。Tag Index は効果を示すものではない（ユーザー設定）。
- 公式のFDA届出（K231207, V8.0）は、PDFが圧縮されていて読めなかった（原文は未確認）。
- ビューアへの反映：メニュー名を LVV／Complex Signal Identification に修正。シミュレーターに「Smart Index風（マップの充実度）」を追加（実際の計算式は非公開なので、色が付いた面積の割合で代用）。

### 先生の運用メモ（先生から聞いたこと）
- **CARTOSOUND FAM（超音波カテーテルで左房の形を自動作成）を使う**。したがってシミュレーターは、MRI/CTの取り込みではなく「超音波で形を作る → その上でOCTARAYでマッピング → PVI」の流れに合わせること。
- 形の作成に使う部分（FAM）は未実装。実装するなら、超音波カテーテルを心房内で回転させる操作 → 形が自動で現れる、という見た目にする（公式：フレーム選択・左房の主要構造の自動識別・呼吸ゲート）。
- **FAM風の実装（2026-11-18）**：シミュレーターのパネルに「CARTOSOUND FAM風」。症例を始めると形は空で、超音波カテーテルの回転（スライダー／自動）で、扇形に壁が現れ、360°で確定。実際のFAMのフレーム選択・構造の自動識別・呼吸ゲートは未実装（簡易表現）。

---

## 8. 取扱説明書で確認できたこと【確認済：先生がくれたPDF 4冊（2026-11-18）】
### OCTARAY カテーテル サポート（UG-5070-0475M、V7.5、2023年7月）
- **表1（カテーテル定義）**：スパイン長 **2 cm**／電極の間隔 **3-3-3-3-3 mm**、スパイン長 **2 cm**／**2-5-2-5-2 mm**、スパイン長 **1.5 cm**／**2-2-2-2-2 mm**。いずれもスパイン8本、電極51個（48＋シャフト電極 S1 遠位・S2・S3 近位）。D/Fカーブ。→ 電極の間隔は **mm と確定**。広げた直径は書かれていない。
- **チャンネル**：ユニポーラ48、**隣り合うバイポーラ40**（スパインに沿って、各スパイン5つ）。**スパイン間のバイポーラはサポートされない**。電極名は **A1〜H6**（A〜Hがスパイン、1が先端側）。ラベルは既定 **Multi**（症例では `SPU` 表記の例あり）。20 POLE A/B の2ソケットに接続。
- **TPI（Tissue Proximity Indication）**：インピーダンスで組織との近さを判定（距離が電極半径未満＝接触）。既定でオン。TPIフィルターがオンのとき、`B5, B6, C5, C6, E5, E6, F5, F6, G5, G6, H5, H6` は使えず、これらを含むバイポーラは取得されない（Distal/Either 選択時は B5-6, C5-6, E5-6, F5-6, G5-6, H5-6、Both 選択時はさらに B4-B5 など）。
- 記録装置には36チャンネルまで出せる。**組織近接表示(TPI)は36チャンネル**に対応。
- 使える機能：CARTOFINDER（PRIMEの一部）、CONFIDENSE、**FAM Dx**。OCTARAY と VIZIGO シースのペアリングは非対応。**S1電極がシース外のときに、マトリックスの作成とマッピングができる**。
- 対応：マッピングは **FAM と EA（電気的）** の両方。ペーシングも可。

### OPTRELL マッピング カテーテル（UG-5404-0175M、V7.5.1）
- 3ループ、**電極間隔 2.4 mm × 2.4 mm**、**ユニポーラ48／隣接バイポーラ42**（スパイン沿い）、S1/S2/S3。スパインA-D、B-E、C-Fがループ。**ローカル伝導ベクトル（LCV）**：伝導の向き・速度・低電位を **OPTRELL の3D画像上にリアルタイムで表示**。**Mapping Criterion が WaveFront／Late Annotation** のときだけ使える。設定：Color（LAT／Solid）、Size（1〜11、既定5）、**Bipolar Scar Threshold 0.15 mV**（既定）。速度の種類は3つ：**遅延伝導／高速・標準伝導／非伝導（瘢痕）**。

### VISITAG SURPOINT モジュール（UG-5420-017M、V7.1.80以上）
- **Tag Index**：アブレーション出力・コンタクトフォース・時間の独自の式。**推奨設定（心房の1点ずつの通電）**：Respiration Adjustment **有効**、Location Stability の **Maximum Distance Change 2〜3 mm**、**Minimum Time 3 秒**、Force Over Time **25 %** で **Minimum Force 3 g**、VISITAGロケーションのサイズ **3 mm**。条件を満たすと、通電開始の約3秒後にロケーションが現れる。
- 表示：Readings Dashboard（Sec、Power、Temp、Imp、Force、Stability、Tag Index）。Tag Index の色は**3段階**（Low未満＝薄い、Low〜High＝中間、High超＝濃い。グラデーションではない）。累積データのポップアップ（Location 番号、秒、W、℃、Ω、g、g·sec、Tag Index）。
- 注意：Tag Index は同じ設定で作ったもの同士しか比べられない。通電の有効性や焼灼巣の大きさは示さない。
### Late Annotation Mapping（LAM、UG-5405-0175M）
- WOI を Late Boundary（既定：リファレンスから −5 ms）で前後に分け、LBより右（遅い側）で見つかった遅延電位に注釈を付ける。感度 Normal／High／Highest。**Local Voltage** 関心ウィンドウ（Late Annotation の前後 ±20 ms から静かな区間を探して決める）。Point List に **Late**（紫の点）と **Late Sens.** の列。心室（洞調律・ペーシング）で検証されたもので、AFのPVIとは別。

→ ビューアへの反映：OCTARAYの説明（mm）と、通電タグの大きさの既定を 3 mm に変更。
- 残りのページも確認済み（2026-11-18）：OPTRELL の LCV は「Show Catheter → LCV」でカテーテル陰影の上に矢印を重ねて表示。点の WOI・リファレンス・マッピングのアノテーションを変えると遡って再計算される。LAMは、連続取得中に Filter Status の紫の点で Late Annotation を示す。いずれもAFのPVIの実装には影響なし。

---

## 9. 資料の読了状況とURL（2026-11-18時点）
**読了（先生から受け取り、全ページ確認）**：OCTARAY サポート（UG-5070-0475M）、OPTRELL 48 サポート（UG-5404-0175M）、VISITAG SURPOINT（UG-5420-017M）、LAM（UG-5405-0175M）。PDFに文字が入っていれば `pdftotext -layout` で全文を取り出せる。画像で読むときは1回20ページまで。

**未読（優先順）** — e-ifu.com は利用規約の同意が必要で、私は開けない。先生がPDFを保存して渡す。**アプリの添付は1ファイル100ページまで**（CARTO 3 本体は401ページ→分割するか、目次＋必要な章だけ）。
1. CARTO 3 システム 取説（V7.5 または V8）：https://www.e-ifu.com/ja/shared-document/14922/1/0/shared?langcode=ja&country=7501 　※手元に `BWJ-C3V75ML-02` あり（401ページ。未送信）。期待：点の取得条件、色の既定値、Export、タグ、FAM。
2. TRUPULSE Generator（VARIPULSEの発生装置）：https://www.e-ifu.com/ja/shared-document/52419/1/3/shared?langcode=ja&country=7501 　期待：PFAの通電の仕組み・寸法。
3. THERMOCOOL SMARTTOUCH SF：https://www.e-ifu.com/ja/shared-document/52335/1/0/shared?langcode=ja&country=7501 　期待：接触力・RFの条件。
4. FDA 510(k) K231207（V8.0）：https://www.accessdata.fda.gov/cdrh_docs/pdf23/K231207.pdf 　PDFが圧縮されていて自動では読めなかった。先生がブラウザで開いて保存すれば読める可能性あり。
