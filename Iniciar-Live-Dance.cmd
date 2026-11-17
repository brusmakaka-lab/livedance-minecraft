@echo off
setlocal
cd /d "%~dp0"
node scripts/open-studio.mjs
if errorlevel 1 pause
