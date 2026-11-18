@echo off
rem CareLink launcher: opens Chrome with the profile named "CareLink".
rem Put this file in the CareLink folder (the folder for CareLink data).
rem If paceguard-carelink.html is in the same folder, it is opened too.
rem Optional: put the CareLink address after CL= below, to open CareLink at the same time.
rem If the profile is not found by name: open chrome://version in the CareLink window,
rem look at the last part of the profile path (e.g. Profile 2) and put it after PROFILE_DIR= below.
setlocal
set "PROFILE_NAME=CareLink"
set "PROFILE_DIR="
set "CL="
set "HTML=%~dp0paceguard-carelink.html"
set "URL="
if exist "%HTML%" set "URL=file:///%HTML:\=/%"
set "B="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "B=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined B if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "B=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined B if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "B=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined B goto nochrome
set "DIR=%PROFILE_DIR%"
if defined DIR goto run
for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "try{$n=$env:PROFILE_NAME.Trim();$j=Get-Content (Join-Path $env:LOCALAPPDATA 'Google\Chrome\User Data\Local State') -Raw -Encoding UTF8 | ConvertFrom-Json; ($j.profile.info_cache.PSObject.Properties | Where-Object { ([string]$_.Value.name).Trim() -ieq $n -or ([string]$_.Value.shortcut_name).Trim() -ieq $n } | Select-Object -First 1).Name}catch{}"`) do set "DIR=%%P"
if not defined DIR goto noprofile
:run
start "" "%B%" --profile-directory="%DIR%" %URL% %CL%
exit /b 0

:noprofile
echo Chrome profile "%PROFILE_NAME%" was not found.
echo.
echo Profiles on this PC  (folder : name):
powershell -NoProfile -ExecutionPolicy Bypass -Command "try{$j=Get-Content (Join-Path $env:LOCALAPPDATA 'Google\Chrome\User Data\Local State') -Raw -Encoding UTF8 | ConvertFrom-Json; $j.profile.info_cache.PSObject.Properties | ForEach-Object { '  ' + $_.Name + ' : ' + $_.Value.name }}catch{ '  (could not read Chrome profile list: ' + $_.Exception.Message + ')' }"
echo.
echo Put the folder name (e.g. Profile 2) after PROFILE_DIR= in this file, or fix PROFILE_NAME.
pause
exit /b 1

:nochrome
echo Google Chrome was not found.
pause
exit /b 1
