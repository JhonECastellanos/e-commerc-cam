@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\iniciar-cloudflare.ps1" %*
set "taskExit=%errorlevel%"
pause
exit /b %taskExit%
