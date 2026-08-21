# 08. オフラインPCでのセットアップ（持ち込み版）

**対象**: `run_label_extraction.bat` を動かしたいPCがインターネットに繋がっていない場合。

このPCには何もインストールしません。**インターネットに繋がる別の端末**（スマホ、自宅PC、
IT部門のPCなど。患者データには一切触れないもので構いません）で2つのファイルを用意し、
このプロジェクトのフォルダの中にコピーしてからUSBで運びます。

## 用意するもの

| 番号 | ダウンロードするもの | 置き場所 |
|---|---|---|
| ① | Python本体（インストーラ不要版） | `cied-remote-monitoring\python-portable\` |
| ② | pypdfium2（PDFを読むためのライブラリ） | `cied-remote-monitoring\vendor\` |

## ①Python本体

1. インターネットに繋がる端末のブラウザで
   `https://www.python.org/downloads/windows/` を開く
2. **「Windows embeddable package (64-bit)」** というリンクを探してダウンロードする
   （ファイル名は `python-3.12.x-embed-amd64.zip` のような形。バージョン番号(3.12.x)はどれでもよい）
   - まぎらわしい類似項目に注意: 「Windows installer (64-bit)」ではなく
     **embeddable package** を選ぶこと（これはインストール不要でそのまま動く版）
3. ダウンロードしたzipを展開（右クリック→すべて展開）する
4. 中身（`python.exe` などのファイル群）を、このプロジェクトフォルダの中の
   `python-portable` というフォルダに**そのままコピー**する
   - `python-portable` フォルダが無ければ新規作成してよい
   - できあがりの形: `cied-remote-monitoring\python-portable\python.exe` が存在する状態

## ②pypdfium2

1. 同じ端末のブラウザで `https://pypi.org/project/pypdfium2/#files` を開く
2. 一覧の中から、ファイル名が次の条件に**すべて**合うものを探してダウンロードする
   - `cp312` または使っているPythonのバージョンに合う番号が含まれる
     （①で 3.12.x をダウンロードしたなら `cp312`）
   - `win_amd64` を含む（Windows 64bit用という意味）
   - 拡張子が `.whl`
   - 例: `pypdfium2-4.30.0-py3-none-win_amd64.whl` のようなファイル名
     （`py3-none` のように特定バージョンを指定しない版があればそれでもよい）
3. ダウンロードした `.whl` ファイルは**展開せず**、
   `cied-remote-monitoring\vendor\` フォルダの中に入れる
4. コマンドプロンプト（Windowsキー→「cmd」と入力→Enter）で、
   ダウンロードした端末上で以下を実行し、`.whl` の中身をvendorフォルダに展開する

   ```
   cd 展開先のパス\cied-remote-monitoring
   tar -xf vendor\pypdfium2-*.whl -C vendor
   ```

   （`.whl` の正体はzipファイルなので、`tar` の代わりに「エクスプローラーで拡張子を
   `.whl` → `.zip` に変えてから右クリック展開」でもよい）

## ③設定ファイルを1か所だけ編集する（重要・忘れると動かない）

Python本体（embeddable package）は、そのままでは `python-portable` フォルダの外を
一切見られないようになっている。`src`（このアプリのコード）と `vendor`（pypdfium2）を
見つけられるように、設定ファイルに2行追加する。

1. `python-portable` フォルダの中にある `python312._pth` のようなファイル
   （数字の部分はバージョンにより異なる。例: `python313._pth`）を**メモ帳で開く**
2. 中身の一番下に、次の2行をそのまま追記して保存する

   ```
   ..\src
   ..\vendor
   ```

   （すでに `#import site` のようなコメント行があるが、そこは触らなくてよい）

これで `python-portable\python.exe` を実行すると、`src` と `vendor` の中身を
自動的に読み込めるようになる。

## 運ぶ

`cied-remote-monitoring` フォルダ一式（`python-portable` と `vendor` を含む）を
**院内専用USBメディア**にコピーし、オフラインのPCへ運ぶ。

## 確認

オフラインのPCで `run_label_extraction.bat` をダブルクリックし、
「使い方: ...ドラッグ&ドロップしてください」と表示されればセットアップ成功。
（エラーが出る場合は、`python-portable\python.exe` と `vendor\pypdfium2` フォルダが
本当にその場所にあるか確認する。）

あとは通常どおり、レポートPDFをこのファイルにドラッグ&ドロップすれば `labels.csv` が出力される。
