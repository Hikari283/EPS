"""core.extract.engine のテスト。

フィクスチャは、ユーザーが共有してくれた実レポート3ページ分のテキストをそのまま使う
（氏名・ID・シリアル番号・医師名は元からダミー値に置換済み。実患者データは含まない）。
PDFライブラリは使わず、行のリストを直接エンジンに渡すので pypdfium2 は不要。
"""
from core.extract.engine import extract

# --- 実レポート ページ1: Quick Look II ---
PAGE1 = """\
Quick Look II
デバイス： Azure™ XT DR MRI W2DR01 シリアル番号：BBB
 送信日時： 20-Aug-2026 19:28:59
患者名：A
ID： 0000000
医師： A
既往： 洞房結節機能障害、 正常なAV伝導
デバイスステータス (植込み日：01-Apr-2025)
予測寿命 10.7 years (20-Aug-2026)
(イニシャルインテロゲーションに基づく)
RA(3830) RV
リードインピーダンス 380 Ω 532 Ω
ペーシング閾値 1.500 V (0.40 ms) 1.000 V (0.40 ms)
測定日 20-Aug-2026 20-Aug-2026
電圧/パルス幅設定値 3.00 V / 0.40 ms 2.00 V / 0.40 ms
P/R波高値 2.5 mV 18.0 mV
センシング感度設定値 0.30 mV 0.90 mV
パラメータサマリ
モード AAI<=>DDD 基本レート 60 bpm ペースAV 180 ms
モードスイッチ 171 bpm 上限トラッキング130 bpm センスAV 150 ms
上限センサ 130 bpm
検出 レート 治療
AT/AF モニタ >171 bpm 全Rx Off
VT モニタ >150 bpm
臨床ステータス 16-Jul-2026 以降のデータ
治療済みイベント
AT/AF(モニタ)
モニタ済みイベント
VT (>4 beat) 0
Fast A&V 0
AT/AF 0
AT/AF時間 <0.1 hr/day (<0.1%)
身体機能 前週
患者アクティビティ 6.6 hr/day
Cardiac Compassトレンド(Jun-2025～Aug-2026)
治療サマリ AT/AF
ペーシングで停止したエピソード 0
ペーシング 16-Jul-2026からの時間%
VP < 0.1% (MVP On)
AP 62.0%
オブザベーション(0)
・最新のインテロゲーションでのオブザベーションはありません。
CareLinkネットワーク 患者個人情報 21-Aug-2026 02:14:13
Copyright © 2001-2026 Medtronic, Inc ページ 1
"""

# --- 実レポート ページ2: 電池およびリード測定 ---
PAGE2 = """\
電池およびリード測定
デバイス： Azure™ XT DR MRI W2DR01 シリアル番号： BBB 送信日時： 20-Aug-2026 19:28:59
患者名： A ID： 00000000 医師：A
前回のインテロゲーション：20-Aug-2026 19:28:59
予測寿命 20-Aug-2026
推定値： 10.7 years
最小値： 10.2 years
最大値： 11.2 years
(イニシャルインテロゲーションに基づく)
電池電圧 20-Aug-2026
電圧 3.01 V
(RRT=2.63V)
センシング・インテグリティ・カウンタ 開始日： 16-Jul-2026
短いV-Vインターバル 0
(カウントが300を超える場合は、センシング確認)
心房リードポジションチェック 20-Aug-2026
ポジションチェック 成功
リードインピーダンス
Aペーシング (バイポーラ) 380 Ω 20-Aug-2026
RVペーシング (バイポーラ) 532 Ω 20-Aug-2026
センシング
P波高値 2.5 mV 20-Aug-2026
R波高値 18.0 mV 20-Aug-2026
CareLinkネットワーク 患者個人情報 21-Aug-2026 02:14:02
Copyright © 2001-2026 Medtronic, Inc ページ 1
"""

# --- 実レポート ページ3: レートヒストグラム ---
PAGE3 = """\
レートヒストグラム
デバイス： Azure™ XT DR MRI W2DR01 シリアル番号： BBB 送信日時： 20-Aug-2026 19:28:59
患者名：A ID： 00000000 医師：A
前回チェックまで 前回チェック以降
06-Jul-2026～16-Jul-2026 16-Jul-2026～20-Aug-2026
10 days 35 days
時間% 総VP < 0.1% < 0.1%
総AP 52.9% 62.0%
時間% AS-VS 47.1% 38.1%
(AT/AF外) AS-VP < 0.1% < 0.1%
AP-VS 52.9% 61.9%
AP-VP < 0.1% < 0.1%
前回チェックまで 前回チェック以降
06-Jul-2026～16-Jul-2026 16-Jul-2026～20-Aug-2026
10 days 35 days
AT/AF時間 = 2 sec AT/AF時間 = 4 sec
CareLinkネットワーク 患者個人情報 21-Aug-2026 02:14:07
Copyright © 2001-2026 Medtronic, Inc ページ 1
"""


def _page_lines(text: str, page: int) -> list[tuple[int, str]]:
    return [(page, line) for line in text.splitlines()]


def all_pages() -> list[tuple[int, str]]:
    return _page_lines(PAGE1, 1) + _page_lines(PAGE2, 2) + _page_lines(PAGE3, 3)


def load_test_profile():
    from pathlib import Path

    import yaml

    profile_path = Path(__file__).parent.parent / "src" / "profiles" / "medtronic_carelink.yaml"
    with open(profile_path, encoding="utf-8") as f:
        return yaml.safe_load(f)


class TestMedtronicExtraction:
    def setup_method(self):
        self.profile = load_test_profile()
        self.result = extract(all_pages(), self.profile)

    def _value(self, field_path):
        fv = self.result.get(field_path)
        assert fv is not None, f"{field_path} が結果に存在しない"
        return fv

    def test_device_model_name_and_number_split(self):
        assert self._value("device.model_name").value == "Azure™ XT DR MRI"
        assert self._value("device.model_number").value == "W2DR01"

    def test_serial_number(self):
        assert self._value("device.serial_number").value == "BBB"

    def test_implant_date(self):
        from datetime import date
        assert self._value("device.implant_date").value == date(2025, 4, 1)

    def test_programmed_mode_and_rates(self):
        assert self._value("device.programmed_mode").value == "AAI<=>DDD"
        assert self._value("device.lower_rate").value == 60
        assert self._value("device.upper_rate").value == 130  # "トラッキング130"（空白なし）

    def test_battery_longevity(self):
        assert self._value("battery.remaining_months").value == 10.7 * 12
        assert self._value("battery.remaining_months_min").value == 10.2 * 12
        assert self._value("battery.remaining_months_max").value == 11.2 * 12

    def test_battery_voltage(self):
        assert self._value("battery.voltage").value == 3.01

    def test_battery_rrt_voltage(self):
        assert self._value("battery.rrt_voltage").value == 2.63

    def test_lead_impedance(self):
        assert self._value("leads.RA.impedance").value == 380
        assert self._value("leads.RV.impedance").value == 532

    def test_lead_threshold_pair(self):
        assert self._value("leads.RA.threshold_voltage").value == 1.5
        assert self._value("leads.RA.threshold_pulse_width").value == 0.4
        assert self._value("leads.RV.threshold_voltage").value == 1.0
        assert self._value("leads.RV.threshold_pulse_width").value == 0.4

    def test_sensing_amplitude(self):
        assert self._value("leads.RA.sensing_amplitude").value == 2.5
        assert self._value("leads.RV.sensing_amplitude").value == 18.0

    def test_pacing_percentages_take_since_last_check(self):
        # 「前回チェックまで／前回チェック以降」の2値のうち、後者（新しい方）を採る
        assert self._value("pacing.as_vs_percent").value == 38.1
        assert self._value("pacing.as_vp_percent").value == 0.1
        assert self._value("pacing.ap_vs_percent").value == 61.9
        assert self._value("pacing.ap_vp_percent").value == 0.1

    def test_total_vp_ap(self):
        assert self._value("pacing.ventricular_pacing_percent").value == 0.1
        assert self._value("pacing.atrial_pacing_percent").value == 62.0

    def test_vt_episode_count(self):
        assert self._value("arrhythmia.vt_episode_count").value == 0

    def test_missing_field_returns_null_not_guess(self):
        # このプロファイルに未定義の項目を問い合わせるテストではなく、
        # 実在フィールドが「万一マッチしなかった場合にnullになる」ことを
        # missing()相当の経路で確認する意図のテスト。
        from core.extract.engine import _missing
        fv = _missing("dummy.field")
        assert fv.value is None
        assert fv.confidence == 0.0
        assert fv.reason == "not_found"
