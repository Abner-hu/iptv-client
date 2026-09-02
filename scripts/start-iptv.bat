@echo off
cd /d "%~dp0.."
echo Development helper: starts the web server then the Electron window.
echo For a standalone EXE, run npm run dist:win and open release\IPTV-Client-*-portable.exe
start "IPTV Server" cmd /c npm run start
timeout /t 3 /nobreak >nul
npx electron .
