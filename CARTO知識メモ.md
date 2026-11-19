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
- **取説からの実装（2026-11-18）**：OCTARAYのTPIフィルター（Either/Distal/Both。取得される電極の数が 40→34→28 に減ることを確認）、Tag Index の3段階の色（Low/High）、LVV の矢印の大きさ（1〜11、既定5）、通電タグの既定 3 mm。

---

## 10. 追加で読めた取説（2026-11-19）【確認済】
### TRUPULSE ジェネレータ（ソフトウェア 2.2.4、84ページ）
- PFA は不可逆エレクトロポレーション。心筋はしきい値が低く、血管筋・内皮・神経は高い。**1アプリケーションは1秒未満**、複数の超短パルス・二相・双極性パルスを、選んだ電極の範囲で電極ペアに交互に供給。出力測定 **900〜1800 V ±20 %**。
- 電極は**最大10個**（VARIPULSE）。新しい手技の開始時は全部が未選択（灰色）。**開始には連続した6電極以上が必要**。通電ごとに、選択は全部に戻る（「再選択」で前回と同じ）。
- 開始ボタンのドラッグ（またはペダル）→ プレアブレーション 1〜2 秒 → **繰り返しアプリケーション 4回（間隔 1 秒）** → ポストアブレーション 4〜10 秒。**PFA %** が100%で自動停止。nGEN ポンプでイリゲーション（低流量／高流量）。
- エラー例：電極の重なり（301、303）、高/低インピーダンス、電圧・電流の異常。電極が重なると通電しない（アーク防止）。
### THERMOCOOL SMARTTOUCH SF（RFの使い方）
- 心房細動：出力 **15〜45 W**、1回 **60 秒以内**（ドラッグ時も）。左房後壁（食道に近い）は **25 W 以下で開始、20 秒以内に有効なら移動、最大 35 W**。心房の上限は **45 W／60 秒**。冠静脈洞内は 35 W 以下、20 秒以内。
- イリゲーション：常時 2 mL/分、30 W 以下の通電時は 8 mL/分、30 W 超は 15 mL/分。通電開始5秒前に高流量へ。コンタクトフォース：心房の最小 **5〜10 g**（HRS 2017）、**40 g 以上は穿孔・タンポナーデのリスク**、炭化・血栓予防は 5〜25 g を目安。
- VISITAG の推奨：呼吸調整 有効、安定 2〜3 mm・3 秒、Force-Over-Time 25 %／3 g、タグの大きさ 3 mm（前の SURPOINT 取説と同じ）。
### FDA 510(k) K231207（CARTO 3 V8.0）— 保存したPDFで原文を確認
- **Multipolar Mapping**：Wavefront に追加の注釈。局所の興奮と遠距離電位を見分けやすくして、LATと電圧を安定させる。
- **Auto Pattern Acquisition**：入ってくる拍を、波形が似たものでグループ化して、パターンごとに別のマップを作る（心室・心房）。
- **Complex Signals Identification（CSI）**：機械学習で、分裂した心内電位を自動でタグ付け（連続マッピング中または後から）。心房の定型・非定型粗動の症例で学習。
- **CARTOSOUND FAM**：**右房（卵円窩）または右室流出路**から取った、複数の2D超音波フレーム（ゲーティング済み）から、左房の編集できる3D形状と3Dのセグメンテーションを自動で作る。深層学習。
- **LAT Velocity Vectors（LVV）**：3Dマップ上に、伝わる速度と向きを矢印で表示。
- **Compensated VISITAG Stability**：呼吸による動きをリアルタイムで推定して差し引き、通電の初めに VISITAG が早く出る（従来は ACCURESP による呼気終末の位置のため、呼吸1周期ごと）。
- **SmartMap（CONFIDENSE）**：各点に **Smart Index**（パターンの一致、呼吸、LATの安定、位置の安定、組織との近さ、信号の鋭さ）を付け、**良い点が優先して残る**（従来は先に取った点が残る）。QDOT Micro の対応の改善、OPTRELL（SPU経由）・LASSOSTAR NAV の対応。

→ ビューアへの反映：VARIPULSE風のPFA通電（連続6電極以上、4回連続、通電ごとに選択が戻る、再選択）。通電タグは水色。
- **RFの注意の実装（2026-11-19）**：焼灼の結果に「出力35 W超（左房後壁・冠静脈洞の上限）」「60秒超（心房の上限）」「接触力40 g超（穿孔・タンポナーデ）」の警告を表示。イリゲーションは、30 W 以下で 8 mL/分、30 W 超で 15 mL/分と表示（SMARTTOUCH SF の取説）。

---

## 11. CARTO 3 取説 V7.5（UG-5400-3775H、2023年7月）から読んだこと【確認済：先生の添付 1-100ページ分】
注：このPDFは文字の層が文字化けしているため、ページを画像にして読みました（印刷ページ＝PDF番号−18）。目次は iii〜vi。

### 精度（ロケーション）
- 磁気ロケーションの平均精度：**1 mm**。ACL（アドバンストカテーテルロケーション）の平均精度：**3 mm**。
- 背部パッチの精度ゾーン：ロケーションパッドの **100〜210 mm** 上。胸部パッチ：**190〜600 mm**。
- マッピングカテーテルの精度ゾーン：**127〜460 mm**（互換カテーテルの平均精度 1 mm、LASSO は 3 mm）。**460〜600 mm は精度が下がる**（マップは作れるが精度低下）。
- パッチの配置：パッチどうしは **約10 cm** 離す（必ず **5 cm 以上**）。パッチは心臓を三角形に囲む。背部パッチは頭側に頂点。ICD などの上には置かない。
- パッチ間の距離が推奨より近いと、ACL の精度が下がり、患者の動きでマップがずれやすい。

### マッピングの基本
- **カテーテル表示モード：Stable（安定）**＝直前 **1秒**のロケーションの平均。**Gated（ゲート）**＝アノテーションの時間に測る（焼灼カテーテルのみ）。FAM のジオメトリーは **Stable のときだけ**。
- カテーテル表示：電極がシースの中は黒、シースの外はグレー。**正しく表示するには、4つ以上の電極がシースの外にある必要**。精度が落ちると、カテーテル表示に線が入る。
- **Acquisition パネル**：マップの種類（Point-by-Point、FAM）と取得の種類（マニュアル、連続、CARTOFINDER）で見た目が変わる。ボタン：マニュアル EA、連続マッピング（オレンジ＝取得中）、FAM 取得、両方、フィルター（Preferences の Acquisition Filters）。
- **ペダル**：標準 EA は**右＝取得、左＝削除**。FAM は**右＝開始／停止**。
- **Readings Dashboard**：マッピング用（LAT、CL、Bi、Imp、Force）とアブレーション用（Sec、Imp、Power、Stability、Temp 等）の2構成。
- **マップの色分け**：LAT、バイポーラ、ユニポーラ、インピーダンスなど。Main Map Viewer と Additional Map Viewer で別々に選べる。
- **電極の使用条件**：描出できる、シースで覆われていない、マッピングに選択されている、の3つ。バイポーラのペアの両方がこれを満たすとポイントができる。
- 事前定義の電極（間隔）：ペア（例 2-6-2）は奇数番目の遠位電極、偶数（例 4-4）は使える全バイポーラの遠位電極。
- **Selected Point Viewer**：ポイントやグループの表示と編集。多極カテーテルでは、グループ内の全ポイントを表示でき、投影距離外のポイントは赤線。

### RF（焼灼）と取得
- RF が検出されると、焼灼カテーテルは自動的にマッピングカテーテルになり、チップの色が緑→赤に変わる。**焼灼の最初の 1秒以内に手動で取った点は、前のマッピングカテーテルで取られる**。
- **RF が無効になる条件**：Initialize クリック後 40 秒以内、PIU オフ、Continue Study 後 40 秒以内、BCS 移動後 40 秒以内、PIU との通信断後 40 秒以内、パッチの外れ後 40 秒。
- **ペーシングと RF**：同じ電極で同時に行うと細動のリスクがあるので、ペーシングのスティミュレータを別の電極に、または無効にする（MAP 1-2 に配線すると、ハードウェアが RF のラインを自動で外す）。

### FAM（ファースト アナトミカル マッピング）
- ロケーションデータは、取ったポイントの外表面（ボリューム）から、連続的に幾何学を作る。カテーテル操作と並行して進む。
- **解像度のレベル（Details Level）**：高いと、データに近い詳細な形。低いと、補間が大きい大まかな形。**スライダーで、全体または領域ごとに変えられる**。滑らかで密度の低い所は下げ、曲線の多い所や高密度の穴は上げる。手技中いつでも変更可能。
- 同じ FAM マップは、複数マップを 1 つにまとめられる。FAM マップの編集ツールで、部分削除やボリューム・表面の編集ができる。
- 注意：**LASSO は到達しにくい領域がある**。到達できない状態でマッピングすると、不完全な結果になる。
- LASSO NAV は、肺静脈で使うなど、手技の途中で他のカテーテルと交換できる。

### EA（電気解剖学的マッピング）・多極マッピング（MEM）
- EA は point-by-point で取る。ポイントは、アブレーションカテーテルか、MEM カテーテルのロケーションと電気データを組み合わせる。
- **MEM**：1回の取得で、各マッピング電極ごとに複数のポイントができる。これらは**ポイントグループ**として扱える。
- **注意：グループ内の1点でも基準アノテーション（リファレンス）を変えると、グループの全点が再計算される。** Selected Point Viewer での編集も全点に影響。
- ALT で、ポイントグループを選べる。

→ 今のシミュレーターとの差：
- 精度の「1 mm（磁気）／3 mm（ACL）」は、シミュレーターのカテーテル位置の揺れに使える（まだ未実装）。
- 「4つ以上の電極がシース外」は、円形カテーテルの表示条件に使える（未実装）。
- 「RF の最初の 1 秒の点は前のマッピング」は、点の取り扱いに使える（未実装）。
- FAM の Details Level は、シミュレーターの形の細かさに使える（未実装）。

### 第11章の続き：印刷ページ95〜117（先生の添付 101-200ページ分のうち、95〜117）【確認済】
**Setup 画面の構成**：HW、Loc.（ロケーション設定）、Study（患者詳細・テンプレート・全般）、Cath.（カテーテル設定）、Map（マップ設定）。Study Setup の値は、他の手順に進む前に**すべて入力が必要**。入力は英数字・スペース・_・- のみ（英語のテキスト入力は非対応）。
**Location Setup**：緑の丸＝背部パッチ、黄色＝胸部パッチ。磁気センサーが精度ゾーン外のとき「Out of Range（範囲外）」と表示。パッチが正しくないと、仮想の磁気リファレンスが動き、カテーテル表示が不正確になる。
**Catheter Setup**：PIU 画像、ソケットの接続状態、定義済みカテーテル、マッピングチャネル、近接度の設定。**Catheter Definition Tool**で、製造者の値（フレンチ、電極数、電極間隔、電極幅など）を入力。**誤った値は、心筋損傷の危険があり、表示も歪む**。
**Map Setup**：Map Type（Point by point、または **FAM がデフォルト**）、既定のロケーション処理 **Stable**、LAT Hybrid、事前定義マップの追加（左房、左右の上肺静脈、左右の下肺静脈）、マッピングカテーテル、関心チャンバー、リファレンス、マッピングアノテーション、Window of Interest（LAT WOI とボルテージ WOI のリンク）、Fast Mapping（FAM データを取得中に、EA ポイントを自動で形に組み込むか）。**Map 作成後は、Study 中でもマップの Criterion とカテーテルを変更できる**。
**Initialize**：アブレーションのパッチ、高周波出力発生装置がオンであることを事前確認。X線透視が近すぎると位置の正確性が落ちる。Initialize 中は RF が無効（短時間）。
**Study の終了**：原発性の不整脈を記録。新規患者の Study は、処置ごと、または 1 日の終わりにバックアップ。
**レビューモード**：取得後の Study を見て編集できる。ポイント安定性、周期、LAT、ボルテージ、リファレンスと心内心電図、取得時刻を見られる。**レビューでの変更は自動で保存**。
**以前の Study からのマップの読み込み**：Study Setup の段階で、Additional Map Viewer に読み込む（Initialize の前）。

**Study バックアップ（Study Archiver）**：外付けメディア（CD、DVD、USB）と病院ネットワーク（PACS）に保存。**外付けは暗号化、病院ネットワークは暗号化されない**。V3.1.1 以上から復元可能。**患者データのコピーを 2 つ作る**。USB のバックアップフォルダの名前は変えない（変えると復元できない）。ハードディスクの空きが 5 % 未満だと、Continue Study 等が使えなくなる。
**データのエクスポート（106ページ）**：Study 時のデータは、スクリーンキャプチャ（jpg）、ビデオクリップ（mp4）、ログファイル。Study > Export Study Data でテキストファイル化（レビューモード）。Study > Media Export で、関連する全メディアを USB へ。**データは暗号化され、パスワード（8〜15 文字、英数字を最低 1 つずつ含む）で保護**。暗号化しない輸出は可能だが、医療情報の保護について責任を負うことへの同意が必要。パスワードを失うと、データは回復できない。
**セキュリティ**：Windows 10、ファイアウォール（既定で有効）、セキュアログイン（既定で無効）、ウイルス対策（McAfee、既定で有効）。Study 中は定期スキャンなし。
**ACCURESP（呼吸ゲート）**：患者の呼吸を学習（トレーニング、最大 40 秒）し、閾値を設定。**EA ポイントと FAM データは、閾値内（呼気末）で取得**でき、呼吸による動きを最小限に抑える。モード：**Respiration Gated（取得フィルター）**、**Respiration Filter**（FAM）、Exclude respiration data（マップショートカット）。Point List の Respiration 列に、閾値内（✔）か閾値外（●）。閾値外のポイントは、マップから除外する選択もできる。
- 再トレーニングが必要：Initialize の後、カテーテル表示のリセット後、パッチエラー、アラート時、トレーニング失敗時。
- **患者の呼吸が 30 回/分以上だと、ACCURESP は正しく機能しない**。
- 人工呼吸器では、Mechanical ventilation を選ぶと、初期のゲート値で 1 呼吸サイクル内に取得し、2 呼吸目以降に確定。

**ARA（アドバンスト リファレンス アノテーション）**：リファレンス（最大 5 つの心内バイポーラと体表 V1〜V6）から、エネルギーの重心を使って、リファレンスのタイミングを自動で決める。**心房細動、IC リファレンスの AVNRT・WPW、心室内の IC カテーテルをリファレンスにすると、性能が落ちる**。その場合は別のリファレンス基準を使う。CARTOUNIVU のシネモードは使えない。

→ 今のシミュレーターとの関係：
- **ACCURESP の閾値内だけ取得**は、シミュレーターの「取得条件」の改善に使える（呼吸のゆれを入れて、閾値の外の点を除く）。
- **Catheter Definition の値**は、シミュレーターの円形・オクタレイの寸法の正しさに直結する。
- **レビューモードは自動保存**、**Study 終了時の原発性不整脈の記録**は、ME 向けの練習の記録に使える。

### 第11章の続き：CARTO PRIME モジュール（印刷ページ283〜291）【確認済：先生の添付 2e1a6edf…_400.pdf（PDF301〜400＝印刷283〜382）の前半】
- **Continuous Mapping の時間枠（Retroactive）**：タイムライン上で、Continuous Mapping の開始と終了を指定して、その時間の点を後から取得できる。取得中のアブレーションのセッションには、取得フィルターは使われない。マップが最大ポイント数に達すると、Retroactive な取得は止まる。FAM 取得は CARTOREPLAY では使えない。
- **取得フィルターの評価**：Continuous Mapping の中で、各候補の点を「Activation（PVC）」「Location（直前の心拍が正常な洞調律と一致）」「Position Stability と LAT Stability（PVC の直前の 2 つの連続する洞調律に適用）」などで評価。**どれか1つでも失敗すると、その点は破棄**。
- **LAT Hybrid マップ**（心室マップのみ）：PVC の LAT 値を、洞調律の位置にあるハイブリッドポイントとして取る。Filters Status で PVC（PVC PTRN）と洞調律（NSR PTRN）、NO PACE、POS（位置の安定性、既定 **4 mm**）、DEN（密度）、RESP などを表示。最良の結果のため、取得中はカテーテルの安定を確認する。
- **マップのマージ（Map Merge）**：以前の Study の VISITAG とアブレーションを、現在の Study と一緒に表示（茶色の静的レイヤー）。以前のマップは読み取り専用で、取得のアクティブマップにはできない。**以前の Study のロード前には、レビューモードで以前のマップを開いて、プリセットを設定する**。患者情報が一致しないと警告が出る。
- **レジストレーション**：以前のマップは、新しいマップに Match Previous Map で関連付け、ランドマーク（3 組以上）で位置を合わせる。合わないと「UNREGISTERED.Prev」と赤い境界線。
→ シミュレーターへの関係：「取得フィルター（位置の安定 4 mm、密度）」と「以前の Study との重ね合わせ」は、後の拡張の候補。

**残り**：印刷ページ292〜382（PRIME の残り）、201-300 の PDF（印刷183〜282）、101-200 の前半（印刷83〜94：連続マッピングのフィルターの既定値）。

### 第12章：CONFIDENSE モジュール（印刷ページ183〜192）【確認済：先生の添付 201-300 の前半】
- **Continuous Mapping の起動**：Acquisition パネルのボタン（マップ種類で位置が変わる）。オレンジ＝取得中。左クリックで停止、右クリックで Filters Status。**FAM と同時取得**もできる。
- **Continuous Mapping が使えないとき**：RF の通電を検出したとき、呼吸ゲートのトレーニングが必要なとき（フィルターが有効なら）、マップまたは Study のポイント数が上限に近いとき、CFAE が有効なとき、CARTOREPLAY の再生モードのとき。
- **Continuous Mapping の並び**：Point List が番号以外の順で並ぶと、取得が止まるまで並びは更新されない。
- **フィルターの評価順**：**周期（安定または範囲）→ ペーシング → Pattern Matching → 組織近接度 → 位置の安定性 → LAT 安定性 → 密度**。フィルターがアクティブでない行は非表示。緑＝閾値を満たす、赤＝満たさない、グレー＝評価されない。**全条件を満たす点だけが緑**。
- **Filters Status の編集**：周期は CL（Range）、ノーペーシング（NO PACE）、PTRN（相関 0.93 など）、POS（位置の安定性、mm、既定 **4 mm**）、LAT（安定性、ms、既定 **4 ms**）、DEN（密度、mm）、RESP（呼吸）。LASSO などスパインが 1 つの MEM は、マッピングチャネルごとに表示。
- **密度（DEN）**：Respiration Gated を使うと、Density は連続して適用されない（呼吸末期のポイントにだけ適用）。

**Pattern Matching（パターンマッチング）**
- **パターンの種類**：BS PTRN（体表 12 誘導の加重相関）、IC PTRN（心内の選んだユニポーラ、既定 10 チャネル）。
- **キャプチャ**：Pattern Capture → 62.5 秒の記録を取る → Pattern Bank に自動で POI（関心パターン）が提案される。**Study の初期化後、マッピングレイアウトがアクティブになるまでキャプチャできない**。
- **POI の決まり方**：BS は、リファレンスを囲む 12 誘導のオンセットからオフセットまで。IC は、リファレンスの周りの興奮のオンセットからオフセット（ARA のときは最後のアノテーションに最も近い心室興奮）。ペーシング時はスパイクを中心に。
- **保存**：Study 1 つにつき最大 40 パターン。
- **マップへの適用**：Acquisition Filters の Pattern Matching で、パターンと閾値（既定例 0.75）を選ぶ。**ロックされたパターンは、そのマップで変えられない**（ポイントが全部消えると解除）。
- **Pattern Matching Viewer**：Play（リアルタイム重ね表示）と Stop（静止）。相関に使うリードは変更でき、外したチャネルは暗い色で表示。
- **IC Pattern Matching** には、心内電極の位置が安定していること（CS カテーテルを推奨）。

→ シミュレーターへの関係：Pattern Matching（パターンの相関 0.75 以上）、Filters Status、POS 4 mm、LAT 4 ms、密度 は、**取得条件を本物に近づける具体的な数値**。次に実装するなら、①取得の評価順（周期→位置→LAT→密度）、②位置の安定 4 mm、LAT の安定 4 ms、を入れると良い。
**残り**：印刷ページ193〜282（Acquisition Filters の既定値の表、CARTOMERGE、CARTOSEG、CARTOSOUND、CARTOUNIVU、CFAE、PASO など）。

### 第12章の続き（印刷ページ193〜200）【確認済】
- **表43 デフォルトのフィルタ設定**（不整脈のタイプ別。Pattern Bank から新しいマップを作ったとき）：

| 不整脈（既定のマップ名） | CL（範囲） | PTRN 閾値（BS） | PTRN 閾値（IC） | 位置の安定性 | LAT 安定性 | ペーシングなし |
|---|---|---|---|---|---|---|
| 心室洞調律（V SR） | オフ | 0.9 | N/A | 4 mm | 4 ms | オン |
| 心室性期外収縮（PVC） | オフ | 0.97 | N/A | オフ | オフ | オン |
| 心室頻脈（VT） | オフ | 0.9 | N/A | 4 mm | 4 ms | オン |
| 心室ペーシング（V Pace） | オフ | 0.9 | N/A | 4 mm | 4 ms | オフ |
| 心房洞調律（A SR） | CL ± 20 | 0.9 | 0.75 | 4 mm | 4 ms | オン |
| 心房粗動（AFL） | CL ± 10 | 0.9 | 0.75 | 4 mm | 4 ms | オン |
| 心房性頻脈（AT） | CL ± 20 | 0.9 | 0.75 | 4 mm | 4 ms | オン |
| 心房ペーシング（A Pace） | オフ | 0.9 | 0.75 | 4 mm | 4 ms | オフ |

  - パターンマッチングが新しいマップで自動でオン、フォース（FRC）はオフ、密度（DEN）は 1 mm。
  - **ロック解除**：ポイントの全部がリサイクルビンから消えると解除。
- **PASO との関係**：Pattern Matching は PASO から独立して動くが、両方がインストールされていると、同じ番号は共有されない（プレフィックスが違う：BS PTRN 3 と IS 3）。番号は全体通し番号で編集不可。
- **Continuous Mapping 中の手動取得**：Tissue Proximity と Respiration Gated の現在の設定が、手動取得にも適用される。手動取得の点は Point List と Selected Point Viewer で区別される。
- **組織近接度（TPI）**：インピーダンスで電極の近さを判定。距離が電極の半径未満なら接触とみなす。使えるのは PENTARAY NAV、LASSO NAV ファミリー、HD カテーテル。局所治療用カテーテルでは使えない。**20 POLE A、20 POLE B、DECA、QUAD B のソケットでサポート**。近接度の決定は、電極の「遠位」「両方」「いずれか」の 3 つから選ぶ（Catheter Setup で設定）。**RF 通電中は表示されない**。
→ シミュレーターへの関係：表43の数値（位置 4 mm、LAT 4 ms、PTRN 0.9、AFL の CL ± 10、AT・A SR の CL ± 20）は、**マップの種類別の取得条件の既定値**として、シミュレーターに入れられる。
### 印刷ページ201〜208【確認済】
- **組織近接度の表示（表44）**：Main Map Viewer は、電極の周りの白い枠＝近接、枠なし＝非近接、茶色の枠＝不明。Point List は緑系のハート（近接）、暗いハート（非近接）、黒のハート（不明）。既定でオン。Study 中に切り替え可能。**TPI が不正確と思ったら Catheter > Reset TPI**、カテーテルを動かして再トレーニング。オート ID のカテーテルは接続・切断で自動リセット。
- **MEM の組織近接フィルタ**：Continuous Mapping と手動 MEM 取得の両方に適用。ペーシング中は、ペーシング電極と近くの電極も影響を受ける。**Internal Points フィルタと同時に使える**。
- **Wavefront マッピング アノテーション**：各遠位ユニポーラの最大の陰性波（-dV/dt）を探して、LAT の基準にする。**Bipolar Noise Level（既定 0.03 mV）より低い電圧はノイズとして扱い、考慮しない**。内部ユニポーラが明確でノイズがないことを確認する。推奨の心拍数は、多極カテーテルでは「アノテーションされたチャネルの最大数と最大の減少率の平均」、フォーカルでは「最大の減少率の平均」。
- **マップ整合性（Map Consistency）**：周囲の点の LAT と合わない外れ値を見つける（2 ステップ）。外れ値は LAT の色には影響せず、マップにも投影されない。**計算に入るのは、マップに反映されるポイントだけ**（スカー、アブレーション点、浮動点、ロケーションだけの点、LAT なしの連続点、手動で編集した LAT は除外）。計算には最小数の隣接点が必要。Map > Filtering の Point Filtering で設定：Show LAT Outlier Points、Narrow Results、Automatic（既定・取得中に自動計算）、Calculate、Calculate and Delete、Mark low density points など。
→ シミュレーターへの関係：外れ値（周囲と合わない LAT）を除く処理は、マップの荒れを減らす処理として使える。
### 印刷ページ209〜216【確認済】
- **外れ値の削除**：Selected Point Viewer で外れ値の線をクリック、またはアノテーションを編集すると、外れ値マーカーが消え、LAT マップに使われる。
- **リップルマップ**：バイポーラ電位図データを、マップ表面に垂直なバーとして動的に表示。リップル WOI（既定は Main Map Viewer の LAT WOI）で、ループ表示される区間を決める。**リップルの既定値：バーを表示する閾値 0.03 mV、クリップ 0.25 mV、サイズ係数 ×8**。Study とテンプレートに保存される。**浮動点やアブレーション、スカー、位置だけのタグの点にはバーは出ない**。
- **ポイントのマーク**：Ripple Viewer に、取得時のリード II とバイポーラ表示を並べる。**BS ECG リード II は Ripple Viewer から消せない**。
- **EP レコーディングシステムとのインターフェイス**：通信状態は4つ（接続解除、スタンバイ、Passive Interfaced＝受信のみ、Active Interfaced＝双方向）。患者データ入力は**ラテン文字、数字、ダッシュ、下線のみ**（他の文字は空欄になる）。**Gender は空欄にできない**（空欄なら CARTO でランダムに設定）。マップ名は **30 文字以内**。インポートできるポイント数に上限がある機器あり。
- **ペーシング終わりのデータ**：最低 **4 回**のペーシングパルスがあるペーシングシーケンスを検出し、ペーシング電極のペア、PCL（周期）、過去 5 回の過度なペーシングの期間を送る。終わりの判定は Post-stimulation Detection Interval Criterion（構成可能）。
- **PASO（ペースマッピング）**：患者の誘発性または自発性の不整脈で取った 12 誘導の心電図を、他の誘発シグナル（IS）やペースマッピングのシグナルと比べる。**PASO は右室の不整脈のアブレーション向けのマッピングで、臨床的な効果は臨床試験で証明されていない**。PASO の設定はテンプレートとして使われ、Study が終わるまで表示され続ける。
### 印刷ページ217〜224【確認済】
- **PASO 誘導シグナル（IS）**：局所アブレーションカテーテルの接続は不要。Study Setup の完了後いつでも取得可。各 IS の取得で、全体表面リードを 62.5 秒記録（取得後 2.5 秒が相関計算に、取得前 60 秒が ECG バッファ）。**関心形態（MOI）は ± 150 ms に固定**。最初の IS は、リード II の最後の 2.5 秒の初期ピークに設定。
- **リファレンス IS**：最初に記録した IS が既定でリファレンス。相関が低いと、新しい IS がリファレンスになる。
- **PM シグナル（ペースマッピング）**：取得後 2.5 秒・取得前 7.5 秒の全体表面記録（10 秒）。**相関の計算は 2.5 秒の窓**（既定）。PM は 1 つのポイントに 1 つだけ関連付け。
- **比較**：PM ごとに、最も相関の高い IS セットを自動で特定。閾値（PASO プリファレンス）以上なら一致（緑）、未満なら不一致（オレンジ）。
- **PASO のワークフロー**：プリファレンス設定 → IS キャプチャ（不整脈を記録して誘導）→ ペースマッピング（**PM は必ずマップ上の点と関連付けられる**）→ 比較（PASO Viewer、相関マップ）。
- **PASO の注意**：Study 中に相関の閾値を変えると、全データが再計算され、編集内容（MOI など）が失われる。
- **SMARTTOUCH（コンタクトフォース）**：フォースと方向（先端の軸線から）を測定。**正確なフォースには 4 つのチップ電極すべてがシース外にあること**（SH の表示）。ゼロ化（カテーテルが関心チャンバー内、先端にフォースがかかっていない、他のカテーテルが近くにない）の後で、上限・下限の閾値を設定。**FAM データ取得中、上限を超えたフォースでボリューム取得をブロックできる**。最大フォース閾値を超えると Main Map Viewer の背景が点滅。
- **フォースの表示**：ベクトル、フォースマップ、折れ線グラフ、ダッシュボード（接触角度と g）、Point List の Frc 列。
- **アラート 84**：頻発するなら、マットレスを厚いものに替えるか、ロケーションパッドホルダーにスペーサーを使う。
### 印刷ページ225〜232【確認済】
- **SMARTTOUCH の表示**：Force ダッシュボード（現在のフォース g、角度、上限を超えた割合、不確かなら HI）、Graphs Viewer（時系列。アブレーション中は電力・温度・インピーダンスも）、ベクトル（グレー＝下限未満、緑＝閾値内、赤＝上限超）、フォースマップ、Point List の Frc 列。
- **コンタクトフォースのチップ**：4 つのチップ電極と 2 つのシャフト電極。チップのみ、またはカテーテル全体の表示を選べる。
- **FAM からの除外**：フォースが上限閾値を超えた状態で取った FAM ボリュームは、ジオメトリーから除外できる（Acquisition Filters の「フォースが上限閾値を超えた場合を除く」）。呼吸ゲートも使える。
- **SMARTTOUCH での Study**：Study 開始前にフォースのプリファレンスを設定。ダッシュボード、ベクトル、フォースグラフを見ながら取得し、閾値を超える/下回るポイントを Point List やフォースマップで識別して削除。
- **VISITAG（アブレーションの位置の記録）**：RF 通電中に、フィルター条件を満たしたカテーテル位置を連続で記録し、1 つのアブレーション部位（**VISITAG サイト**）にまとめる。VISITAG サイトは ABL タグに似た要素。**条件が満たされなくなると、サイトは分離し、新しいサイトができる**。
- **グリッドセル**：1 mm 立方の中で、全セッションの位置の累積を表示（球）。Minimum Time の閾値に達したときに表示。**VISITAG は RF の有効性を示さない**。
- **VISITAG のプリファレンス（主要なフィルター）**：
  - **Location Stability（ロケーションの安定性）**：**Minimum Time（最小時間）**より長く、かつ、**Maximum Distance Change（最長距離の変化）**の範囲内にあるとき安定。**2 つの条件が両方満たされたときだけ**サイトができる。
  - **Force Over Time（時系列フォース）**：Minimum Time のうち、**Minimum Force（最小フォース）**を超えた割合が閾値以上のときだけ表示。
  - **Respiration Adjustment（呼吸調整）**：位置を呼気末期の平均として記録し、呼吸の影響を抑える。
  - **Gated（ACCURESP）VISITAG Stability** を選ぶと、位置は呼気末期に累積され、表示が遅れる。
  - **Presets**：フィルターの組み合わせを名前付きで保存。**Global Preset**（全 Study に適用）または **Multiple Presets**（RF セッションごと）。RF 通電中はプリセットを変えられない。
→ シミュレーターへの関係：「安定性（移動 2〜3 mm・3 秒）＋フォース 3 g 以上が 25 % 以上」は、VISITAG サイトができる条件そのもの。今の simulator は通電ごとに 1 サイトなので、この条件で「サイトが作れるか」を判定すると、実際に近い。
### 印刷ページ233〜240【確認済】
- **RF 通電前の安定性アイコン（表50）**：不安定／安定／安定だがフォース閾値未満（フォース CTH のみ圧力を含む）／使用不可（範囲が未設定か、カテーテル位置がない）。
- **RF 通電中（表51）**：不安定／安定だが時間閾値未満／安定だが時間・圧力閾値未満／安定でサイトができた（数字はサイト数）。
- **累積データ（表52）**：ID、時間(s)、電力(W) と温度(℃)（VISITAG サイトは範囲と中央値）、インピーダンス（最低値に対する基準値とドロップ）、フォース(g)（VISITAG サイトは平均）、FTI（g·sec、現行値）。**RF 中に出力が切れると「Lost communication」、データが不完全の可能性**。
- **投影**：サイトやグリッドセルを投影して、マップ上の同じ位置にまとめられる。**75 % 以上重なったサイトは、投影を作らず、濃い色のサイトに従う**。
- **距離測定**：Catheter（カテーテル先端と前回のサイトの距離。**15 mm 以内の対象のみ**）、Standard（2 点間の距離。サイト・グリッド・点など）。**距離は、カテーテル先端の中心点どうしの直線**。
- **CARTO VIZIGO（シース表示）**：シースに 4 つの電極があり、曲線に沿って配置。シースの電極はポイント取得・シグナル・ペーシングには使えない。Paired Visualization（磁気センサー付き電極が挿入されると自動でペアリング）。**シースの中のカテーテルは磁気の表示が必要**なので、マトリクスを作るにはカテーテルをシース外に出す。
→ シミュレーターへの関係：距離測定の「カテーテル先端から 15 mm 以内」は、シミュレーターの VISITAG の距離表示に使える。
### 印刷ページ241〜248【確認済】
- **CARTO VIZIGO の接続**：シースのコネクタケーブルを、PIU の REF/DECA、20 POLE A、20 POLE B、QUAD B のいずれかに。接続状態の変化は、最大 10 秒で Catheter Setup と Main Map Viewer に表示。
- **シース表示の設定（表53）**：Sheath Image（シースの画像。Tip Only ではシャフトなし）、Label（遠位端、最大 5 文字）、Shaft Color、Paired with（None または MAP）。
- **シース表示の見方（表55）**：4 つのリングがシース電極の位置。先端はペアリング中ならカテーテルの先端のバレル、ペアリングなしなら X。**シースの電極はポイント取得・シグナル・ペーシングには使えない**。
- **精度低下の斜線**：マトリクスのデータ不足、パッチ移動、磁気干渉で表示。
- **トラブルシュート**：シースが出ない→Sheath Image を確認、マトリクスを作る。カテーテルの再接続後にシースが消える→表示が戻るまで待つ。S 字やループの曲線→シャフト表示が乱れる。
- **通常の流れ**：シースの IFU に従って準備 → 血管にアクセス → シースをケーブルに → PIU へ → 対応するアブレーションカテーテルを MAP ソケットへ → 磁気センサー付きカテーテル（治療用または診断用）でマトリクスを作成してシースを表示。
- **CARTOFINDER / COHERENT の章の目次**（PRIME 章、印刷 248〜）：CARTOFINDER（サイトとROI電極の表示、CL マップ、Dynamic マップ）、COHERENT マッピング（周期の変更、再計算）、Parallel Mapping、Map Replay、CARTOREPLAY の Continuous Mapping。
### 印刷ページ249〜256（CARTO PRIME：CARTOFINDER）【確認済】
- **CARTOFINDER**：複数の同時心電図（**PENTARAY NAV** のみ対応）を分析し、ユニポーラのアノテーションから、高密度の動的マップ。フォーカル（早期の連続的な QS 形態）と回転（Rotational）の興奮パターンを検出。**AF の複雑な興奮は必ずしも検出されない**（診断目的のみ）。
- **プリファレンス**：Automatically Acquire EA Points（既定オフ）、**Discard Low Quality Signals（既定オン）**（接触不良、重度のスカー、低振幅を除外）、CL マッピングフィルターの最大 CL 標準偏差。
- **レコーディング**：Tools > CARTOFINDER Module On で Acquisition パネルに追加。**最初の 10 秒は、10 秒経つ前に止めるとサイトができない。30 秒で自動停止**（20 秒以上を推奨）。無効になる条件：サポート外のカテーテル、体表電極の断線、FAM 取得中など。
- **サイトの表示**：中心はリング状のタグ（計算完了で白）、電極は ROI（関心領域）を囲む長方形（ROI が検出されないと白）。計算中は灰色から白へ変わる。動きが閾値を超えたサイトは縞模様。Focal の電極は**緑**、Rotational の電極は**青**に拡大。
- **表示設定（Visualization Setup）**：Site Indications（既定オン）、All ROI electrodes（既定オン）、Apply to All Maps。
- **サイトはマップの電位情報のみを持ち、ジオメトリーには影響しない**（色分けのみ）。
### 印刷ページ257〜264（CARTOFINDER の表示と色分け）【確認済】
- **チャネル**：各サイトに独自のユニポーラとバイポーラのセット。チャネルを外すと、そのサイトだけに影響（体表チャネルは全サイトに影響）。除外されたチャネルはマップの色分けに影響しない。
- **Focal / Rotational の表示**：Focal は **緑**（ライト〜ダーク＝低〜高強度）、Rotational は **青**（同）、白は両方なし。電極が両方あれば緑の中心と青の境界線。
- **マップの色分けの種類**：CARTOFINDER、CARTOFINDER CL（周期）、CARTOFINDER Dynamic（時間に沿った LAT の伝播）。**Isochronal、Propagation、Early Meets Late は無効**。CARTO の色分けで **CTRL + F** で切替（Main Map Viewer のみ）。
- **注意（規定）**：Rotational の特定は、局所サイクル長の 50 % 以上をカバーし、2 回以上の連続した繰り返し。**臨床的な意味はまだ確立していない**。**局所の電位を必ず確認**。
- **CL マップ**：周期の標準偏差（既定しきい値 19 ms 程度）を超える電極は、白で投影されてフィルターで除外できる（Preferences の CARTOFINDER タブ）。
- **Dynamic マップ**：再生のタイムスタンプごとの LAT を表示。最小 −250 ms〜最大 0 ms のスライダーで範囲を変更。**FAM 取得中は再生できない（どちらかが止まる）**。
→ シミュレーターへの関係：CARTOFINDER は PENTARAY NAV 専用。シミュレーターに入れるなら、Focal／Rotational の表示と、CL の標準偏差フィルターが候補。
### 印刷ページ265〜272（CARTOFINDER の臨床ワークフロー、COHERENT マッピング）【確認済】
- **推奨ワークフロー（AF、左房、PENTARAY NAV）**：PENTARAY を接続 → FAM の **Resolution Level 17 以上**、呼吸ゲート有効 → 通常のマッピング → Anatomical Structures → 肺静脈の隔離 → チャンバー壁に PENTARAY を置き、スパインが均等に広がっていることを確認 → TPI で接触を確認 → CARTOFINDER の記録を開始（**30 秒で自動停止、20 秒未満は削除して取り直し**）→ サイトとマップ、チャネルを確認。
- **Coherent Mapping**：周期的な不整脈の興奮伝播を、**マップ全点の LAT を使ったグローバルな反復計算**で求める。伝導ブロック（遅延伝導部位や非伝導部位）を、色とベクトルで表示。対象は**通常型の心房粗動、非通常型の心房粗動、Focal 型の心房頻拍**。**AF では検証されていない**。
- **入力条件**：スカー（Low Potential）、Double-Potential の点、点が均等に分布したチャンバーの高密度マップ。Double-Potential とスカーには適切なタグを付ける。Anatomical Structures をマークする。
- **計算中**：ポイント取得は無効になり、一部の表示（VISITAG など）は遅れる。エラー時はマップが灰色。
- **カラーサイクルバー**：Automatic（既定。最も早い LAT から開始、終わりは開始 + COHERENT 周期）、Manual（最早と最遅の LAT の 2 つのスライダー）、Custom（既定 −200〜200）。**色の範囲の変更は表示のみ、実際の LAT は変わらない**。
- **Propagation マップ**の再生は、Automatic／Manual の両方で使える。
→ シミュレーターへの関係：Coherent は、LAT と伝導の矢印（LVV の元の考え方）の全体最適化。今のシミュレーターの「伝導速度の矢印」は、各点の局所計算なので、将来は全体最適化に寄せられる。
