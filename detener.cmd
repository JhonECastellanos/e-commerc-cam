@echo off
setlocal
cd /d "%~dp0"
docker.exe compose -p e-commerc-cam --profile cloudflare stop
if errorlevel 1 exit /b 1
echo Servicios detenidos. Los datos se conservan.
