"""ラベルアンカー抽出エンジン（v1: 行ベース方式）。

docs/03-extraction-design.md 3.5 が想定していたbbox（座標）ベースの方式は、
実PDFの座標情報を使った検証がまだできていない（core/pdf.pyはbbox未対応）。
一方で実レポートのテキストは「項目名 値1 値2 ...」のように1行で完結することが多く、
まず行ベースの単純な方式で動くものを作り、精度が足りない場合にbbox方式へ進む方針にした
（2026/08/21、実データでの検証を踏まえた判断。docs/03-extraction-design.md に追記）。

設計:
- 各フィールドの `value_pattern` は、ラベルの文字列も含めて自己完結した正規表現にする
  （「ラベルを探してから近くの値を探す」のではなく、「ラベルと値をまとめて1つの正規表現で捕まえる」）。
  同じ行に複数の項目が並ぶ実レポート（例:
  "モードスイッチ 171 bpm 上限トラッキング130 bpm センスAV 150 ms"）で、
  隣の項目の数値を誤って拾わないようにするため。
- `take: first|last`（既定 first）— 同じパターンが複数箇所にマッチする場合にどちらを採るか。
  ページをまたいで同じ項目が繰り返し出る帳票が多いため。
- `parts: [field.a, field.b, ...]` — 1つのマッチに複数の捕捉グループがある場合
  （例: RA/RVの閾値が同じ行に並ぶ）、グループを別々のフィールドへ振り分ける。

CLAUDE.md 絶対4「抽出値を自動確定しない」「抽出できなかった項目はnullを返す」を守るため、
マッチしなかったフィールドは value=None, confidence=0.0 で返し、値を推測しない。
"""
from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any

from core.schema import ExtractionResult, FieldValue, Source

_MONTH_ABBR = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}
_DATE_RE = re.compile(r"^(\d{2})-([A-Za-z]{3})-(\d{4})$")


def _parse_date(raw: str) -> date | None:
    m = _DATE_RE.match(raw.strip())
    if not m or m.group(2) not in _MONTH_ABBR:
        return None
    day, mon, year = m.groups()
    return date(int(year), _MONTH_ABBR[mon], int(day))


def _coerce(raw: str, field_type: str | None) -> Any:
    raw = raw.strip()
    if field_type == "int":
        return int(re.sub(r"[^\d-]", "", raw))
    if field_type == "float":
        cleaned = raw.lstrip("<").strip()
        return float(cleaned)
    if field_type == "date":
        return _parse_date(raw)
    return raw


def _apply_unit(value: Any, raw: str, unit_map: dict[str, str] | None) -> Any:
    if not unit_map or not isinstance(value, (int, float)):
        return value
    for unit, rule in unit_map.items():
        if unit in raw:
            if rule == "months_x12":
                return value * 12
            if rule == "months":
                return value
    return value


def _in_range(value: Any, range_spec: list[float] | None) -> bool:
    if range_spec is None or not isinstance(value, (int, float)):
        return True
    lo, hi = range_spec
    return lo <= value <= hi


def _build_field_value(
    field_path: str,
    raw_group: str,
    spec: dict[str, Any],
    page: int,
    line: str,
    match_text: str | None = None,
) -> FieldValue:
    field_type = spec.get("type")
    try:
        value = _coerce(raw_group, field_type)
    except (ValueError, TypeError):
        return FieldValue(
            field_path=field_path, value=None, confidence=0.0, source=Source.TEXT_LAYER,
            raw_text=line, page=page, reason="type_coercion_failed",
        )
    # unit_map はキーとなる単位表記（例: "years"）を見て変換するため、捕捉グループではなく
    # マッチ全体（またはそれが無ければ行全体）の文字列を対象にする。
    # 捕捉グループは数字だけしか含まないことが多く、そこにunitの文字列自体は現れない。
    unit_source = match_text if match_text is not None else line
    value = _apply_unit(value, unit_source, spec.get("unit_map"))
    if value is None:
        return FieldValue(
            field_path=field_path, value=None, confidence=0.0, source=Source.TEXT_LAYER,
            raw_text=line, page=page, reason="unparsed_date",
        )
    confidence = 1.0 if _in_range(value, spec.get("range")) else 0.5
    reason = None if confidence == 1.0 else "out_of_range"
    return FieldValue(
        field_path=field_path, value=value, confidence=confidence, source=Source.TEXT_LAYER,
        raw_text=line, page=page, reason=reason,
    )


def _missing(field_path: str) -> FieldValue:
    return FieldValue(
        field_path=field_path, value=None, confidence=0.0, source=Source.TEXT_LAYER,
        reason="not_found",
    )


def extract(page_lines: list[tuple[int, str]], profile: dict[str, Any]) -> ExtractionResult:
    """(ページ番号, 行テキスト) の並びとプロファイルから ExtractionResult を作る。

    core/pdf.py の iter_page_lines() の出力、または単なるテキストファイルを
    1行ずつ (1, line) にした並びのどちらでも使える（pypdfium2に依存しない）。
    """
    result = ExtractionResult(manufacturer=profile.get("manufacturer", "unknown"))

    for field_path, spec in profile["fields"].items():
        pattern = re.compile(spec["value_pattern"])
        take = spec.get("take", "first")
        matches: list[tuple[int, str, re.Match]] = []
        for page, line in page_lines:
            for m in pattern.finditer(line):
                matches.append((page, line, m))

        if not matches:
            parts = spec.get("parts")
            if parts:
                for part_path in parts:
                    result.fields[part_path] = _missing(part_path)
            else:
                result.fields[field_path] = _missing(field_path)
            continue

        page, line, m = matches[0] if take == "first" else matches[-1]

        parts = spec.get("parts")
        if parts:
            groups = m.groups()
            if len(groups) != len(parts):
                for part_path in parts:
                    result.fields[part_path] = FieldValue(
                        field_path=part_path, value=None, confidence=0.0,
                        source=Source.TEXT_LAYER, raw_text=line, page=page,
                        reason="parts_group_count_mismatch",
                    )
                continue
            for part_path, group_val in zip(parts, groups):
                result.fields[part_path] = _build_field_value(
                    part_path, group_val, spec, page, line, match_text=m.group(0)
                )
        else:
            raw_group = m.group(1) if m.groups() else m.group(0)
            result.fields[field_path] = _build_field_value(
                field_path, raw_group, spec, page, line, match_text=m.group(0)
            )

    return result
