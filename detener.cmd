@echo off
setlocal
cd /d "%~dp0"
docker.exe compose -p e-commerc-cam stop
echo Servicios detenidos. Los datos se conservan.
