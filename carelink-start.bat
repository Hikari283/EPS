@echo off
rem CareLink launcher: opens Chrome with the profile named "CareLink".
rem Put this file in the CareLink folder (the folder for CareLink data).
rem If paceguard-carelink.html is in the same folder, it is opened too.
rem Optional: put the CareLink address after CL= below, to open CareLink at the same time.
setlocal
set "PROFILE_NAME=CareLink"
set "CL="
set "HTML=%~dp0paceguard-carelink.html"
set "URL="
if exist "%HTML%" set "URL=file:///%HTML:\=/%"
set "B="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "B=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined B if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "B=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined B if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "B=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined B goto nochrome
set "DIR="
for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "try{$j=Get-Content (Join-Path $env:LOCALAPPDATA 'Google\Chrome\User Data\Local State') -Raw -Encoding UTF8 | ConvertFrom-Json; ($j.profile.info_cache.PSObject.Properties | Where-Object { $_.Value.name -eq $env:PROFILE_NAME } | Select-Object -First 1).Name}catch{}"`) do set "DIR=%%P"
if not defined DIR goto noprofile
start "" "%B%" --profile-directory="%DIR%" %URL% %CL%
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
