#!/bin/bash
cd "$(dirname "$0")"
export PYTHONPATH="$(pwd)/src"

if ! command -v python3 &>/dev/null; then
  echo "Python3 が見つかりません。"
  echo "https://www.python.org/downloads/ からインストールしてください。"
  read -p "Enterキーで終了します..." _
  exit 1
fi

if ! python3 -c "import pypdfium2" &>/dev/null; then
  echo "初回セットアップ中（ライブラリのインストール）...しばらくお待ちください。"
  python3 -m pip install --quiet pypdfium2
  if [ $? -ne 0 ]; then
    echo "インストールに失敗しました。インターネット接続を確認してください。"
    read -p "Enterキーで終了します..." _
    exit 1
  fi
fi

if [ "$#" -eq 0 ]; then
  echo "使い方: このファイル run_label_extraction.command に、PDFファイルをドラッグ&ドロップしてください。"
  echo "複数のPDFをまとめてドロップしても構いません。"
  read -p "Enterキーで終了します..." _
  exit 0
fi

OUT="$(pwd)/labels.csv"
python3 -m cli.list_labels "$@" --out "$OUT"

echo ""
echo "============================================"
echo "完了しました。labels.csv を開きます。"
echo "内容に患者の氏名・ID・生年月日が含まれていないか、必ず確認してください。"
echo "============================================"
open "$OUT"
read -p "Enterキーで終了します..." _
