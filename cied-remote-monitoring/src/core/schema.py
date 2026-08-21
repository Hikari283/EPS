"""共通データ構造。core/ 全体で使う。UI・DB・Webには依存しない。

参照: docs/02-architecture.md 2.5, docs/03-extraction-design.md 3.1/3.5
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Source(Enum):
    TEXT_LAYER = "text_layer"
    OCR = "ocr"
    MANUAL = "manual"


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


@dataclass
class FieldValue:
    """抽出エンジン（core/extract/engine.py）が1フィールドについて返す値。

    抽出できなかった場合は value=None, confidence=0.0 で返す。推測で埋めない
    （CLAUDE.md 絶対5）。UIはこれをそのまま確定させず、必ず人の確認を経由させる
    （CLAUDE.md 絶対4）。

    参照: docs/04-data-model.md 4.3
    """

    field_path: str  # 例: "battery.voltage"
    value: Any
    confidence: float  # 0.0-1.0。0.0はfield未検出
    source: Source
    raw_text: str | None = None  # マッチした元の行テキスト（確認画面での表示・デバッグ用）
    page: int | None = None
    reason: str | None = None  # 未検出/低信頼の理由（例: "label_not_found", "pattern_mismatch"）


@dataclass
class ExtractionResult:
    """1つのレポートに対する抽出結果一式。"""

    manufacturer: str
    fields: dict[str, FieldValue] = field(default_factory=dict)

    def get(self, field_path: str) -> FieldValue | None:
        return self.fields.get(field_path)
