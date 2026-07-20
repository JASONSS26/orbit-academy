@echo off
rem =====================================================================
rem  ORBIT ACADEMY launcher (Windows) - double-click this file to start.
rem  It checks that Node.js is installed, starts the course server, and
rem  opens your browser to it. Close this window to stop the server.
rem =====================================================================
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed ^(or not on your PATH^).
  echo.
  echo   1. Your browser is opening https://nodejs.org - download the
  echo      green "LTS" installer and run it ^(next, next, finish^).
  echo   2. Close this window, then double-click start-academy.bat again.
  echo      ^(A fresh window is needed after installing - the system PATH
  echo       only updates for newly opened windows.^)
  echo.
  start "" https://nodejs.org
  pause
  exit /b 1
)

echo.
echo   ORBIT ACADEMY starting at http://localhost:8080
echo   Your browser will open in a moment.
echo   KEEP THIS WINDOW OPEN - closing it stops the server.
echo.
start "" /min cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:8080"
node server.js
echo.
echo   The server has stopped.
pause
