@echo off
setlocal
cd /d "%~dp0"
docker.exe compose -p instalacam-integracion-local stop
echo Servicios detenidos. Los datos se conservan.
