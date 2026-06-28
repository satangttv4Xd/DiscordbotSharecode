@echo off
title CodeShare Backend
echo Killing process on port 8787...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8787 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo Starting backend...
cd /d "%~dp0..\codeshare-discord-oauth\backend"
node dist/index.js
pause
