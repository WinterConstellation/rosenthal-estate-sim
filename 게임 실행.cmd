@echo off
cd /d "%~dp0"

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js is required.
  echo Install Node.js LTS from https://nodejs.org and run this file again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Preparing the first launch...
  call npm.cmd install
  if errorlevel 1 (
    echo Setup failed.
    pause
    exit /b 1
  )
)

echo Opening Eldroa Estate...
echo Closing this window will stop the game.
call npm.cmd start

if errorlevel 1 (
  echo The game stopped with an error.
  pause
)
