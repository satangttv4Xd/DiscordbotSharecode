@echo off
title Build Extension
echo Building extension...
cd /d "%~dp0..\codeshare-discord-oauth\extension"
call npm run compile
if %errorlevel% neq 0 (
    echo Compile failed!
    pause
    exit /b 1
)
echo Packaging VSIX...
call npx vsce package --no-dependencies --no-yarn
if %errorlevel% neq 0 (
    echo Package failed!
    pause
    exit /b 1
)
echo.
echo Done! VSIX file is in:
echo %~dp0..\codeshare-discord-oauth\extension\
echo.
pause
