@echo off
rem CARTO Viewer launcher: opens carto-viewer.html in its own app window
rem (no address bar or tabs) using Microsoft Edge or Google Chrome.
rem Keep this file in the same folder as carto-viewer.html.
setlocal
set "HTML=%~dp0carto-viewer.html"
if not exist "%HTML%" goto notfound
set "URL=file:///%HTML:\=/%"
set "B="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "B=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined B if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "B=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined B if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "B=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined B if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "B=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined B if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "B=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined B goto plain
start "" "%B%" --app="%URL%" --start-maximized
exit /b 0

:plain
rem Edge/Chrome not found: open in the default browser instead
start "" "%HTML%"
exit /b 0

:notfound
echo carto-viewer.html was not found next to this file.
echo Put carto-viewer.bat and carto-viewer.html in the same folder.
pause
exit /b 1
