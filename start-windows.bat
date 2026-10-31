@echo off
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% equ 0 (node server.mjs & goto :done)
where py >nul 2>nul
if %errorlevel% equ 0 (py -3 server.py) else (python server.py)
:done
pause
