@echo off
cd /d "%~dp0"
where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
    py -m http.server 4173
) else (
    python -m http.server 4173
)
pause
