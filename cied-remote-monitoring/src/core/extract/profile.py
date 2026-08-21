"""プロファイルYAMLの読み込み。

参照: docs/03-extraction-design.md 3.9（v1は行ベース方式に簡略化。同ファイル追記部分を参照）
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover - 環境依存
    raise ImportError(
        "PyYAML がインストールされていません。`pip install pyyaml` を実行してください。"
    ) from exc

REQUIRED_FIELD_KEYS = {"value_pattern"}


def load_profile(path: str | Path) -> dict[str, Any]:
    with open(path, encoding="utf-8") as f:
        profile = yaml.safe_load(f)
    _validate(profile, path)
    return profile


def _validate(profile: dict[str, Any], path: str | Path) -> None:
    if "fields" not in profile:
        raise ValueError(f"{path}: 'fields' がありません")
    for field_path, spec in profile["fields"].items():
        missing = REQUIRED_FIELD_KEYS - spec.keys()
        if missing:
            raise ValueError(f"{path}: フィールド '{field_path}' に必須キーが不足: {missing}")
