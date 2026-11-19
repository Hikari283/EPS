@echo off
rem PaceGuard LATITUDE launcher
rem Opens paceguard-latitude.html (same folder as this file) in the Chrome profile named "LATITUDE".
rem Works even if Chrome is already running, and does not depend on Chrome's startup-page setting.
rem Optional: put the LATITUDE address after LAT= below, to open LATITUDE at the same time.
setlocal
set "PROFILE_NAME=LATITUDE"
set "LAT="
set "HTML=%~dp0paceguard-latitude.html"
if not exist "%HTML%" goto notfound
set "URL=file:///%HTML:\=/%"
set "B="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "B=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined B if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "B=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined B if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "B=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined B goto nochrome
set "DIR="
for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "try{$j=Get-Content (Join-Path $env:LOCALAPPDATA 'Google\Chrome\User Data\Local State') -Raw -Encoding UTF8 | ConvertFrom-Json; ($j.profile.info_cache.PSObject.Properties | Where-Object { $_.Value.name -eq $env:PROFILE_NAME } | Select-Object -First 1).Name}catch{}"`) do set "DIR=%%P"
if not defined DIR goto noprofile
if defined LAT (start "" "%B%" --profile-directory="%DIR%" "%URL%" "%LAT%") else (start "" "%B%" --profile-directory="%DIR%" "%URL%")
exit /b 0

:noprofile
echo Chrome profile "%PROFILE_NAME%" was not found.
echo Open Chrome, check the profile name (top-right person icon), and change PROFILE_NAME in this file.
pause
exit /b 1

:nochrome
echo Google Chrome was not found.
pause
exit /b 1

:notfound
echo paceguard-latitude.html was not found next to this file.
echo Put this file in the same folder as paceguard-latitude.html.
pause
exit /b 1
