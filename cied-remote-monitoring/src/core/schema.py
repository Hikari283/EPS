"""共通データ構造。core/ 全体で使う。UI・DB・Webには依存しない。

参照: docs/02-architecture.md 2.5, docs/03-extraction-design.md 3.1/3.5
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Source(Enum):
    TEXT_LAYER = "text_layer"
    OCR = "ocr"


@dataclass(frozen=True)
class OcrToken:
    """PDFのテキストレイヤー、またはOCRから得られる1トークン。

    bboxはページ座標系（原点は左下、単位はPDFポイント）。
    """

    text: str
    bbox: tuple[float, float, float, float]  # x0, y0, x1, y1
    page: int
    confidence: float = 1.0  # テキストレイヤー由来は1.0固定。OCR由来はエンジンの信頼度


@dataclass(frozen=True)
class LabelCandidate:
    """ラベル抽出スクリプト（cli.list_labels）の出力単位。

    まだ「これがラベルである」と確定したものではなく、人が目視確認するための候補。
    この段階では行単位のテキストのみを扱い、bboxは持たない。
    座標付きのラベルアンカー抽出は後続の core/extract/engine.py（未実装）で行う。
    参照: docs/06-roadmap.md 6.1-E, docs/03-extraction-design.md 3.5
    """

    text: str
    first_page: int  # 最初に出現したページ（1始まり）
    count: int  # 文書内での出現回数（同じラベルが複数ページ/複数リードで繰り返す帳票が多いため）
