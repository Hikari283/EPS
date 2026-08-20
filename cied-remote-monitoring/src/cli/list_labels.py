"""PDFから項目名（ラベル）らしき文字列を一覧化するスクリプト。

ロードマップの最初の実装ステップ（docs/06-roadmap.md 6.1-E）。
出力はプロファイルYAML（docs/04-data-model.md 4.4）を書くための材料。

使い方:
    python -m cli.list_labels report1.pdf report2.pdf --out labels.csv
    python -m cli.list_labels samples/redacted/ --out labels.csv   # ディレクトリ内の*.pdfをまとめて処理

重要: 出力後、必ず目視で患者の識別情報（氏名・ID・生年月日等）が
混入していないか確認してから人に共有すること（CLAUDE.md参照）。
項目名の抽出だけを目的としており、値そのものは扱わない設計だが、
帳票のヘッダ/フッタに患者名が印字されている場合は行単位でそのまま拾ってしまう。
"""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

from core.labels import extract_label_candidates
from core.pdf import has_text_layer, iter_page_lines


def _collect_pdf_paths(inputs: list[str]) -> list[Path]:
    paths: list[Path] = []
    for raw in inputs:
        p = Path(raw)
        if p.is_dir():
            paths.extend(sorted(p.glob("*.pdf")))
        elif p.suffix.lower() == ".pdf":
            paths.append(p)
        else:
            print(f"警告: PDFではないので無視します: {p}", file=sys.stderr)
    return paths


def run(inputs: list[str], out_path: str) -> int:
    pdf_paths = _collect_pdf_paths(inputs)
    if not pdf_paths:
        print("エラー: 対象のPDFが見つかりませんでした。", file=sys.stderr)
        return 1

    rows: list[dict[str, object]] = []
    for pdf_path in pdf_paths:
        if not has_text_layer(pdf_path):
            print(
                f"警告: テキストレイヤーが薄い/無いため読み飛ばします（OCR未実装）: {pdf_path}",
                file=sys.stderr,
            )
            continue
        page_lines = iter_page_lines(pdf_path)
        candidates = extract_label_candidates(page_lines)
        for c in candidates:
            rows.append(
                {
                    "doc": pdf_path.name,
                    "first_page": c.first_page,
                    "count": c.count,
                    "text": c.text,
                }
            )
        print(f"{pdf_path.name}: 候補 {len(candidates)} 件", file=sys.stderr)

    with open(out_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=["doc", "first_page", "count", "text"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n出力: {out_path}（{len(rows)}行）", file=sys.stderr)
    print(
        "★共有前に必ず目視確認: 患者氏名・ID・生年月日等が紛れ込んでいないか確認してください。",
        file=sys.stderr,
    )
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inputs", nargs="+", help="PDFファイル、またはPDFを含むディレクトリ")
    parser.add_argument("--out", default="labels.csv", help="出力CSVパス（既定: labels.csv）")
    args = parser.parse_args()
    sys.exit(run(args.inputs, args.out))


if __name__ == "__main__":
    main()
