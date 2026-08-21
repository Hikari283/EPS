# 04. データモデル / 抽出項目

> **この章はたたき台です。** 実際にカルテへ転記している項目を現場で洗い出して確定させる必要があります。
> 表記ゆれ（`labels`）も、実帳票を見て埋めるまでは推測です。

## 4.1 設計方針

**2層構造にする。**

- **共通スキーマ**: 全メーカーで意味が一致する項目。UI表示・推移グラフ・カルテ転記文はここだけを見る
- **メーカー固有拡張**: OptiVol（Medtronic）、CorVue（Abbott）など、他社に対応物がない項目。
  `extras: dict[str, Any]` に格納し、UIでは「その他」セクションに出す

無理に共通化しない。似て非なる指標を同じ列に入れると、推移グラフが臨床的に誤った解釈を生む。

## 4.2 台帳のデータモデル

**レポートから抽出する項目とは別に、台帳として持つ項目がある。**
これらはレポートPDFに載っていない、または人が管理する情報なので、
手入力・CSV取込で登録し、レポート取り込みでは上書きしない。

> **患者IDは7桁の数字だが、必ず `str` で保持する。**
> 先頭ゼロ（`0012339`）が意味を持つため、`int` にすると別人になる。
> DBの型も `TEXT`。詳細と事故ポイントは
> [01. FR-6](01-requirements.md#患者idの形式確定) を参照。

```python
@dataclass
class DeviceRegistry:
    """台帳の1レコード = 1デバイス。レポートとは独立して存在する。"""
    patient_id: str                   # ★7桁の数字。先頭ゼロを守るため必ず文字列
    patient_name: str
    birth_date: date | None

    device_type: DeviceType           # PM / ICD / CRT-P / CRT-D / ILR / WCD
    manufacturer: Manufacturer
    model_name: str
    serial_number: str
    implant_date: date | None

    # --- 遠隔モニタリングの状態（台帳の中核） ---
    remote_status: RemoteStatus       # ACTIVE(遠隔中) / NONE(未導入) / STOPPED(中止)
    remote_started_at: date | None
    remote_stopped_at: date | None
    remote_stopped_reason: str | None

    # --- 台帳として管理する情報（レポートには載らない）---
    mri_conditional: bool | None      # MRI条件付き撮像可否
    implant_facility: str | None      # 植込み施設（他院植込みの把握）
    attending_doctor: str | None
    indication: str | None            # 適応（洞不全、房室ブロック、一次予防 等）
    next_followup_date: date | None
    next_followup_type: FollowupType  # 遠隔 / 外来
    note: str | None

    # --- 導出項目（計算で求める。保存しない）---
    # last_followup_date : 遠隔の最終送信日と外来チェック日のうち新しい方
    # last_followup_type : その種別
```

### `remote_status` が中核

この1項目で「遠隔患者一覧」と「遠隔なし患者一覧」を分けられる。
中止した患者を `NONE` に戻さず `STOPPED` として区別するのが要点。
中止理由（患者の希望、通信環境、転院、デバイス抜去など）は運用改善の材料になる。

### `last_followup_date` を遠隔・外来で統一する

**フォロー漏れの検出を全患者で効かせるための設計。**
遠隔患者は最終送信日、外来のみの患者は最終外来チェック日を、同じ「最終フォロー日」として扱う。
こうすると「90日以上フォローがない患者」という1つの問い合わせで、遠隔・非遠隔をまたいで拾える。

### 登録経路は2つ

| 経路 | 対象 | 挙動 |
|---|---|---|
| CSV一括取込 | 既存の全患者（初期投入） | **必須。** 112台以上を手入力するのは非現実的 |
| 手入力（登録画面） | 新規植込み、遠隔なし患者 | |
| レポート取り込み時の自動追加 | 遠隔患者 | 台帳に無い患者IDが来たら自動で作る。ただし台帳固有項目（MRI可否等）は空のままにし、人が埋める |

**レポート取り込みが台帳の項目を上書きしないこと。** 台帳側の情報は人が管理するものであり、
OCR/抽出の結果で勝手に書き換わると台帳の信頼性が失われる。

## 4.3 レポートの共通スキーマ

```python
@dataclass
class Report:
    # --- 患者 ---
    patient_id: str | None            # 院内ID
    patient_name: str | None
    birth_date: date | None

    # --- レポート ---
    manufacturer: Manufacturer
    report_date: date | None          # レポート作成日
    transmission_date: date | None    # 送信日
    session_type: SessionType         # 定期 / アラート / 患者起動 / 外来

    # --- デバイス ---
    device: DeviceInfo
    battery: BatteryInfo
    leads: list[LeadInfo]
    pacing: PacingInfo
    arrhythmia: ArrhythmiaInfo
    therapy: TherapyInfo

    extras: dict[str, FieldValue]     # メーカー固有
```

各値は生値ではなく `FieldValue` で包む:

```python
@dataclass
class FieldValue:
    value: Any
    confidence: float
    source: Literal["text_layer", "ocr", "manual"]
    bbox: tuple[int, int, int, int] | None   # 元PDF上の位置（確認画面のハイライト用）
    raw_text: str | None                     # OCRが読んだ生文字列（デバッグ用）
```

`bbox` を持たせることで、確認画面で「この値はPDFのここから取った」を提示できる。
これが人による検証コストを大きく下げる。

### DeviceInfo

| フィールド | 型 | 想定ラベル（要実測） |
|---|---|---|
| `device_type` | enum: PM / ICD / CRT-P / CRT-D / ILR / WCD | 機種種別 |
| `model_name` | str | 機種名, Model, デバイス名 |
| `model_number` | str | 型番, Model Number |
| `serial_number` | str | シリアル番号, S/N, Serial |
| `implant_date` | date | 植込み日, Implant Date |
| `programmed_mode` | str | モード, Mode（DDD, VVI, AAI 等） |
| `lower_rate` | int (bpm) | 基本レート, Lower Rate |
| `upper_rate` | int (bpm) | 上限レート, Upper Tracking Rate |

### BatteryInfo

| フィールド | 型 | 備考 |
|---|---|---|
| `status` | enum: OK / RRT(ERI) / EOL | メーカーで呼称が異なる（ERI/RRT/Elective Replacement） |
| `remaining_months` | float | 「残存期間」。年表記のメーカーがあるため月に正規化 |
| `voltage` | float (V) | |
| `impedance` | float (Ω) | 電池内部インピーダンス。機種による |

**`status` は最重要項目のひとつ。** ERI/EOL の見落としは臨床的に重大なので、
抽出できなかった場合は必ず赤フラグにする。

### LeadInfo（リードごとに1レコード）

| フィールド | 型 | 備考 |
|---|---|---|
| `chamber` | enum: RA / RV / LV / HIS / LBB | |
| `sensing_amplitude` | float (mV) | P波高 / R波高 |
| `threshold_voltage` | float (V) | 閾値。`@ pulse_width` とセットで意味を持つ |
| `threshold_pulse_width` | float (ms) | |
| `impedance` | float (Ω) | ペーシングインピーダンス |
| `shock_impedance` | float (Ω) | ICD/CRT-Dのショックリード |

**閾値は「0.75V @ 0.4ms」のように2値セット。** 単独の数値として抽出すると意味が失われるため、
value_pattern で両方を1回で捕まえる設計にする。

### PacingInfo

| フィールド | 型 |
|---|---|
| `atrial_pacing_percent` | float (%) |
| `ventricular_pacing_percent` | float (%) |
| `biv_pacing_percent` | float (%) — CRTのみ |

CRTの両室ペーシング率は臨床上きわめて重要（低下＝要介入）。閾値アラートの対象にする。

### ArrhythmiaInfo

| フィールド | 型 | 備考 |
|---|---|---|
| `af_burden_percent` | float (%) | AT/AF burden |
| `af_longest_duration` | timedelta | 最長持続時間 |
| `mode_switch_count` | int | |
| `at_af_episode_count` | int | |
| `vt_episode_count` | int | |
| `vf_episode_count` | int | |
| `nsvt_count` | int | |

### TherapyInfo

| フィールド | 型 |
|---|---|
| `atp_count` | int |
| `shock_count` | int |
| `appropriate_shock_count` | int |
| `inappropriate_shock_count` | int |

適切/不適切の判別は帳票に記載がない場合が多い。**抽出できなければ空欄**とし、
医師の判断入力欄として持つ。システムが推測しない。

### メーカー固有（extras の例）

| メーカー | 項目 |
|---|---|
| Medtronic | OptiVol（胸腔内液体貯留指標）、Cardiac Compass、AdaptivCRT |
| Abbott | CorVue、DeviceSync |
| Boston Scientific | HeartLogic（心不全指標）、RESPIRE |
| WCD (ZOLL) | 装着時間（時間/日）、コンプライアンス率、検出エピソード数、ショック実施回数 |

**WCDは他と構造が大きく異なる。** 植込みデバイスではないためリード情報がなく、
代わりに「装着コンプライアンス」が主要な管理項目になる。
共通スキーマに無理に押し込めず、WCD専用のサブスキーマを持たせる。

## 4.4 表記ゆれの管理

同じ意味の項目がメーカーで別名になる。プロファイルYAMLの `labels` に列挙して吸収する。

| 共通フィールド | 表記の例（**要実測**） |
|---|---|
| `battery.remaining_months` | バッテリ残存期間 / 推定残存期間 / Longevity / Estimated Remaining Longevity |
| `battery.status` | 電池状態 / Battery Status / ERI / RRT / Replacement Indicator |
| `pacing.ventricular_pacing_percent` | 心室ペーシング率 / V. Pacing / RV Pacing (%) / %VP |
| `arrhythmia.af_burden_percent` | AF burden / 心房細動負荷 / AT/AF 総時間 |

**この表を埋める作業が、サンプル帳票入手後の最初のタスクになる。**

### Medtronic CareLink（Quick Look II）実測分

ユーザーが実レポート（イベントなしの基本パターン、氏名・ID・シリアル番号等は置換済み）を
確認して得られた項目名。`src/profiles/medtronic_carelink.yaml` に反映済み。

| 共通フィールド | Medtronic表記（実測） |
|---|---|
| `battery.remaining_months` | 予測寿命／推定値 |
| `battery.voltage` | 電池電圧 |
| `leads.RA/RV.impedance` | リードインピーダンス（Aペーシング／RVペーシング、バイポーラ） |
| `leads.RA/RV.threshold` | ペーシング閾値（`1.500 V (0.40 ms)` の形で電圧とパルス幅がセット） |
| `leads.RA/RV.sensing_amplitude` | P波高値／R波高値（1ページ目では「P/R波高値」表記） |
| `arrhythmia.af_burden_percent` | AT/AF時間（要約ページは `%`、レートヒストグラムページは `= n sec` と書式が異なる） |
| `pacing.ventricular/atrial_pacing_percent` | 総VP／総AP |

Medtronic固有（`extras` 扱い、今回はプロファイル未反映）:
センシング・インテグリティ・カウンタ（短いV-Vインターバル）、心房リードポジションチェック、
AS-VS/AS-VP/AP-VS/AP-VP（レートヒストグラム詳細）、Cardiac Compassトレンド、オブザベーション。

**注意:** 今回の情報源はPDFではなく、ユーザーがPDFビューアでコピーしたテキストの貼り付け。
実PDFのbbox（座標）情報が無いため、YAML中の `direction`/`window`（ラベルから見た値の相対位置）は
未検証の仮置き。実PDFで `core/pdf.py` 経由のトークンを使って動作確認するまでは
「項目名の対応表」としてのみ信頼してよい。

## 4.5 DBスキーマ（概略）

```
patients        (id, hospital_patient_id, name_encrypted, birth_date, ...)
devices         (id, patient_id, device_type, manufacturer, model_name, serial_number,
                 implant_date, remote_status, remote_started_at, remote_stopped_at,
                 remote_stopped_reason, mri_conditional, implant_facility,
                 attending_doctor, indication, next_followup_date, next_followup_type, note)
reports         (id, device_id, session_type, report_date, transmission_date,
                 source_pdf_path, pdf_sha256, status, created_by, confirmed_by, confirmed_at)
report_fields   (id, report_id, field_path, value_json, confidence, source, bbox_json)
field_edits     (id, report_field_id, old_value, new_value, edited_by, edited_at)
audit_logs      (id, user_id, action, target, at, detail)
```

### 設計上のポイント

- **`report_fields` を縦持ち（EAV）にする。** 項目定義がまだ確定しておらず、メーカーごとに
  増減するため。横持ちにすると項目追加のたびにマイグレーションが必要になる。
  推移グラフ用に頻用フィールドだけ後からビュー/マテビューを作れば性能は足りる
- **`field_edits` に人の修正履歴を残す。** 「どのフィールドがよく直されるか」が
  抽出ルール改善の最良のデータになる
- **`pdf_sha256` で重複取り込みを検出**
- 患者氏名は暗号化して保存（[05](05-security-and-compliance.md)）
- **`devices` は `reports` が1件も無くても存在できる。** 遠隔なし患者は台帳にだけ載る。
  外来チェックを記録した場合は `reports.session_type = 外来` として同じテーブルに入れ、
  フォロー履歴を遠隔・外来で統一して扱う
- `devices.serial_number` と `model_name` に索引を張る（リコール該当者検索のため）
