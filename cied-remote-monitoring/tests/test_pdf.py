"""core.pdf の結合テスト。pypdfium2 が必要。

開発サンドボックスではPyPIに到達できずインストール検証できていないため、
未インストール環境ではskipする。`pip install pypdfium2` した環境（実機）で必ず一度は流すこと。
"""
import pytest

pytest.importorskip("pypdfium2")

from tests.pdf_fixtures import make_text_pdf  # noqa: E402

from core.labels import extract_label_candidates  # noqa: E402
from core.pdf import has_text_layer, iter_page_lines  # noqa: E402


@pytest.fixture
def dummy_pdf(tmp_path):
    pdf_bytes = make_text_pdf(
        [
            "Battery Status",
            "OK",
            "Model Name",
            "Example Model 1234",
            "Serial Number",
            "12345678",
            "Remaining Longevity",
            "8.5 yrs",
        ]
    )
    path = tmp_path / "dummy_report.pdf"
    path.write_bytes(pdf_bytes)
    return path


def test_has_text_layer_true_for_text_pdf(dummy_pdf):
    assert has_text_layer(dummy_pdf) is True


def test_iter_page_lines_reads_content(dummy_pdf):
    lines = iter_page_lines(dummy_pdf)
    texts = [text for _page, text in lines]
    assert "Battery Status" in texts
    assert "Model Name" in texts


def test_end_to_end_label_extraction(dummy_pdf):
    lines = iter_page_lines(dummy_pdf)
    candidates = extract_label_candidates(lines)
    texts = {c.text for c in candidates}
    assert "Battery Status" in texts
    assert "Model Name" in texts
    assert "Serial Number" in texts
    assert "Remaining Longevity" in texts
    # 値そのもの（型番・数値）はラベル候補に出てこない
    assert "12345678" not in texts
