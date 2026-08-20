"""core.labels の純粋関数のテスト。PDFライブラリ不要（サンドボックスでも実行できる）。"""
from core.labels import extract_label_candidates, is_label_like


class TestIsLabelLike:
    def test_japanese_label_accepted(self):
        assert is_label_like("バッテリー残存期間")

    def test_english_label_accepted(self):
        assert is_label_like("Battery Status")

    def test_pure_number_rejected(self):
        assert not is_label_like("12.3")

    def test_number_with_unit_rejected(self):
        assert not is_label_like("12.3 V")
        assert not is_label_like("45%")
        assert not is_label_like("0012339")

    def test_date_like_rejected(self):
        assert not is_label_like("2026/08/20")

    def test_too_long_line_rejected(self):
        long_sentence = "本装置は植込み型心臓electronic機器の遠隔モニタリングレポートであり" * 2
        assert not is_label_like(long_sentence)

    def test_sentence_with_period_rejected(self):
        assert not is_label_like("この帳票は自動生成されたものです。")

    def test_sentence_with_many_commas_rejected(self):
        assert not is_label_like("氏名、患者ID、生年月日、施設名")

    def test_symbols_only_rejected(self):
        assert not is_label_like("----------")
        assert not is_label_like("===")

    def test_too_short_rejected(self):
        assert not is_label_like("A")

    def test_empty_rejected(self):
        assert not is_label_like("")
        assert not is_label_like("   ")


class TestExtractLabelCandidates:
    def test_dedup_and_count_across_pages(self):
        page_lines = [
            (1, "Battery Status"),
            (1, "OK"),
            (2, "Battery Status"),
            (2, "12.3 V"),
            (3, "Battery Status"),
        ]
        candidates = extract_label_candidates(page_lines)
        by_text = {c.text: c for c in candidates}

        assert "Battery Status" in by_text
        assert by_text["Battery Status"].count == 3
        assert by_text["Battery Status"].first_page == 1
        # 数値だけの行は候補に出てこない
        assert "12.3 V" not in by_text
        assert "OK" not in by_text  # 短すぎて除外される

    def test_preserves_first_occurrence_order(self):
        page_lines = [(1, "Model Name"), (1, "Serial Number"), (2, "Model Name")]
        candidates = extract_label_candidates(page_lines)
        assert [c.text for c in candidates] == ["Model Name", "Serial Number"]

    def test_multiline_input_is_split(self):
        page_lines = [(1, "Model Name\nSerial Number\n12.3 V")]
        candidates = extract_label_candidates(page_lines)
        assert {c.text for c in candidates} == {"Model Name", "Serial Number"}

    def test_empty_input(self):
        assert extract_label_candidates([]) == []
