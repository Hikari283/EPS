@echo off
rem PaceGuard LATITUDE: download pdf.js 3.11.174 into the "pdfjs" folder next to this file (offline mode)
cd /d "%~dp0"
if not exist pdfjs mkdir pdfjs
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference=Stop; [Net.ServicePointManager]::SecurityProtocol=Tls12; $b=https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/; foreach($f in pdf.min.js,pdf.worker.min.js){ Invoke-WebRequest ($b+$f) -OutFile (pdfjs\+$f) -UseBasicParsing }"
if errorlevel 1 (echo. & echo FAILED. Please check the internet connection. & pause & exit /b 1)
echo.
echo OK: pdfjs\pdf.min.js and pdfjs\pdf.worker.min.js are ready.
echo Reopen paceguard-latitude.html. The top bar will show "offline".
pause
