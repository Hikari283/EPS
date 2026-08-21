@echo off
setlocal
cd /d "%~dp0"

rem ここに python-portable\python.exe があれば、それを使う（インストール不要・PATH不要）。
rem なければPCに入っているpythonコマンドを使う。
set PORTABLE_PY=%~dp0python-portable\python.exe
set VENDOR_DIR=%~dp0vendor

if exist "%PORTABLE_PY%" (
    set "PYEXE=%PORTABLE_PY%"
    set "PYTHONPATH=%~dp0src;%VENDOR_DIR%"
) else (
    where python >nul 2>nul
    if errorlevel 1 (
        echo Python が見つかりません。
        echo.
        echo このPCがインターネットに繋がっていない場合は、
        echo docs\08-offline-setup.md の「持ち込み版」の手順で
        echo python-portable フォルダと vendor フォルダを用意してください。
        echo.
        echo インターネットに繋がっている場合は、
        echo https://www.python.org/downloads/ からインストールしてください
        echo （「Add python.exe to PATH」に必ずチェック）。
        pause
        exit /b 1
    )
    set "PYEXE=python"
    set "PYTHONPATH=%~dp0src"
)

"%PYEXE%" -c "import pypdfium2" >nul 2>nul
if errorlevel 1 (
    if exist "%PORTABLE_PY%" (
        echo vendor フォルダに pypdfium2 が見つかりません。
        echo docs\08-offline-setup.md の手順で用意してください。
        pause
        exit /b 1
    )
    echo 初回セットアップ中（ライブラリのインストール）...しばらくお待ちください。
    "%PYEXE%" -m pip install --quiet pypdfium2
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
"%PYEXE%" -m cli.list_labels %* --out "%OUT%"

echo.
echo ============================================
echo 完了しました。labels.csv を開きます。
echo 内容に患者の氏名・ID・生年月日が含まれていないか、必ず確認してください。
echo ============================================
start "" "%OUT%"
pause
