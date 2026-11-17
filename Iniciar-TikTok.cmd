@echo off
setlocal
cd /d "%~dp0"
if not exist "E:\Codex\Temp\Usuario" mkdir "E:\Codex\Temp\Usuario"
set "TEMP=E:\Codex\Temp\Usuario"
set "TMP=E:\Codex\Temp\Usuario"
node --env-file-if-exists=.env server.js
if errorlevel 1 pause
