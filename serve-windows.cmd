@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18+ is required: https://nodejs.org/
  pause
  exit /b 1
)
node serve-sdk.mjs
if errorlevel 1 pause
