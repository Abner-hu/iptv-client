@echo off
cd /d "%~dp0.."
start "IPTV Server" cmd /c npm run start
timeout /t 3 /nobreak >nul
npx electron .
