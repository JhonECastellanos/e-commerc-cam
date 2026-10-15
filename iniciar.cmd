@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\prepare-local.ps1"
if errorlevel 1 exit /b 1
docker.exe info >nul 2>&1
if errorlevel 1 (
  echo Inicia Docker Desktop y vuelve a ejecutar este archivo.
  exit /b 1
)
docker.exe compose -p e-commerc-cam up --build -d
if errorlevel 1 exit /b 1
if exist "%~dp0.local\cloudflare-url.txt" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\iniciar-cloudflare.ps1"
  if errorlevel 1 exit /b 1
)
echo.
echo Plataforma local: http://localhost:8094
echo Panel: http://localhost:8094/admin/login
echo Las credenciales locales estan en .env. No las compartas en el chat.
