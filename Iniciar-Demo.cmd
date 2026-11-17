@echo off
setlocal
cd /d "%~dp0"
if not exist "E:\Codex\Temp\Usuario" mkdir "E:\Codex\Temp\Usuario"
set "TEMP=E:\Codex\Temp\Usuario"
set "TMP=E:\Codex\Temp\Usuario"
set "DEMO_MODE=1"
set "TIKTOK_ENABLED=0"
node --env-file-if-exists=.env server.js
if errorlevel 1 pause
