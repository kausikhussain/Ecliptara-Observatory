@echo off
cd /d "%~dp0"

where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Starting Ecliptara Observatory via Node.js...
    node scripts/serve.js
    goto :end
)

where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Starting Ecliptara Observatory via Python...
    py -m http.server 4173
    goto :end
)

where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Starting Ecliptara Observatory via Python...
    python -m http.server 4173
    goto :end
)

echo Error: Neither Node.js nor Python was found on PATH.
echo Please install Node.js (https://nodejs.org) or Python to run the local server.
pause

:end
