@echo off
setlocal
cd /d "%~dp0"
set PYTHONPATH=%~dp0src

where python >nul 2>nul
if errorlevel 1 (
    echo Python が見つかりません。
    echo https://www.python.org/downloads/ からインストールしてください。
    echo インストール時に「Add python.exe to PATH」に必ずチェックを入れてください。
    pause
    exit /b 1
)

python -c "import pypdfium2" >nul 2>nul
if errorlevel 1 (
    echo 初回セットアップ中（ライブラリのインストール）...しばらくお待ちください。
    python -m pip install --quiet pypdfium2
    if errorlevel 1 (
        echo インストールに失敗しました。インターネット接続を確認してください。
        pause
        exit /b 1
    )
)

if "%~1"=="" (
    echo 使い方: このファイル run_label_extraction.bat に、PDFファイルをドラッグ^&ドロップしてください。
    echo 複数のPDFをまとめてドロップしても構いません。
    pause
    exit /b 0
)

set OUT=%~dp0labels.csv
python -m cli.list_labels %* --out "%OUT%"

echo.
echo ============================================
echo 完了しました。labels.csv を開きます。
echo 内容に患者の氏名・ID・生年月日が含まれていないか、必ず確認してください。
echo ============================================
start "" "%OUT%"
pause
