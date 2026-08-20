"""PDFのテキストレイヤー読み込み。

採用ライブラリは pypdfium2（docs/02-architecture.md 2.5 で決定）。
外部バイナリ不要・ライセンスがクリーンなため。OCRフォールバック（core/ocr/）は未実装。

このモジュールは開発サンドボックスの制約で pypdfium2 を実機テストできていない
（社内ネットワークからPyPIへ到達できなかった）。実際のPDFで動かす前に
`pip install pypdfium2` の上、samples/redacted/ の帳票で必ず確認すること。
"""
from __future__ import annotations

from pathlib import Path

try:
    import pypdfium2 as pdfium
except ImportError as exc:  # pragma: no cover - 環境依存
    raise ImportError(
        "pypdfium2 がインストールされていません。`pip install pypdfium2` を実行してください。"
    ) from exc


def iter_page_lines(pdf_path: str | Path) -> list[tuple[int, str]]:
    """PDFの各ページからテキストレイヤーの行を取り出す。

    戻り値は (ページ番号[1始まり], 行テキスト) のリスト。
    テキストレイヤーが無い/薄いページは空文字列を返す（呼び出し側で has_text_layer を先に見ること）。
    """
    result: list[tuple[int, str]] = []
    pdf = pdfium.PdfDocument(str(pdf_path))
    try:
        for page_index in range(len(pdf)):
            page = pdf[page_index]
            textpage = page.get_textpage()
            try:
                text = textpage.get_text_range()
            finally:
                textpage.close()
            page.close()
            for line in text.splitlines():
                result.append((page_index + 1, line))
    finally:
        pdf.close()
    return result


def has_text_layer(pdf_path: str | Path, *, min_chars_per_page: int = 20) -> bool:
    """PDFに実用的なテキストレイヤーがあるかを判定する。

    ★仮の閾値: ページあたり平均20文字以上の非空白文字があればテキストPDFとみなす。
    実サンプルで画像PDF/テキストPDFを見比べてから調整すること
    （docs/03-extraction-design.md 3.2「要確認」参照）。
    """
    pdf = pdfium.PdfDocument(str(pdf_path))
    try:
        page_count = len(pdf)
        if page_count == 0:
            return False
        total_chars = 0
        for page_index in range(page_count):
            page = pdf[page_index]
            textpage = page.get_textpage()
            try:
                text = textpage.get_text_range()
            finally:
                textpage.close()
            page.close()
            total_chars += len("".join(text.split()))
        return (total_chars / page_count) >= min_chars_per_page
    finally:
        pdf.close()
