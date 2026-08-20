"""ラベルらしき行を判定・集計する純粋関数群。

PDFライブラリに依存しない。テキスト行のリストを受け取って判定するだけなので、
pypdfium2 なしでもユニットテストできる（tests/test_labels.py）。

参照: docs/06-roadmap.md 6.1-E「PDFから項目名（ラベル）の一覧を出すスクリプト」
"""
from __future__ import annotations

import re
import unicodedata
from collections import OrderedDict
from collections.abc import Iterable

from core.schema import LabelCandidate

# 数字・単位・記号だけの行（値そのもの）を弾くためのパターン。
# 例: "12.3", "0012339", "12/34", "---", "1.5 V", "45%"
_VALUE_ONLY_RE = re.compile(
    r"^[\s\d.,:\-/%°ΩΩ~〜±]*"
    r"(?:[VvAaHhzZ%°]|ms|bpm|mV|kΩ|kOhm|Ohm|ヶ月|ヵ月|months?|yrs?|年|月|日)?"
    r"[\s\d.,:\-/%°Ω~〜±]*$"
)

# 文末が句点・ピリオドで終わる、または読点を複数含む行は説明文とみなして除外する。
_SENTENCE_END_RE = re.compile(r"[。.．]\s*$")


def _visible_len(text: str) -> int:
    """全角文字を2、半角文字を1として数えた見かけの長さ。"""
    width = 0
    for ch in text:
        width += 2 if unicodedata.east_asian_width(ch) in "FWA" else 1
    return width


def is_label_like(
    line: str,
    *,
    min_len: int = 3,
    max_visible_len: int = 40,
) -> bool:
    """1行のテキストが帳票の項目名（ラベル）らしいかを判定する。

    人が目視確認する前段のフィルタなので、**過剰除外より過剰採用を優先する**。
    誤って弾いた候補は人の目に触れる機会自体を失うが、
    誤って採用した候補は一覧を見た人が読み飛ばすだけで済むため。
    """
    text = line.strip()
    if len(text) < min_len:
        return False
    if _visible_len(text) > max_visible_len:
        return False
    if _VALUE_ONLY_RE.match(text):
        return False
    if _SENTENCE_END_RE.search(text):
        return False
    # 読点が2つ以上ある行は説明文の可能性が高い
    if text.count("、") >= 2 or text.count(",") >= 3:
        return False
    # 文字（かな漢字英字）を1つも含まない行は記号・罫線の可能性が高い
    if not re.search(r"[A-Za-z぀-ヿ一-鿿]", text):
        return False
    return True


def extract_label_candidates(
    page_lines: Iterable[tuple[int, str]],
    **filter_kwargs: object,
) -> list[LabelCandidate]:
    """(ページ番号, 行テキスト) の並びからラベル候補を抽出・集計する。

    同一テキストは最初に出現したページを記録しつつ出現回数を積算する。
    順序は初出順（辞書順や頻度順ではない。目視確認時にPDFをめくる順と合わせるため）。
    """
    seen: "OrderedDict[str, LabelCandidate]" = OrderedDict()
    for page, raw_line in page_lines:
        for line in raw_line.splitlines():
            text = line.strip()
            if not text or not is_label_like(text, **filter_kwargs):  # type: ignore[arg-type]
                continue
            existing = seen.get(text)
            if existing is None:
                seen[text] = LabelCandidate(text=text, first_page=page, count=1)
            else:
                seen[text] = LabelCandidate(
                    text=existing.text,
                    first_page=existing.first_page,
                    count=existing.count + 1,
                )
    return list(seen.values())
