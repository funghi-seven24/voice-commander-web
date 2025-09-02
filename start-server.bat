@echo off
chcp 65001 >nul
echo Voice Commander - Local Web Server
echo.
echo Starting Python server...
echo Please access http://localhost:8000 in your browser
echo.
echo Press Ctrl+C to stop the server
echo.

REM Try Python 3 first
python -m http.server 8000 2>nul
if %errorlevel% neq 0 (
    REM Try Python 2
    python -m SimpleHTTPServer 8000 2>nul
    if %errorlevel% neq 0 (
        echo ERROR: Python not found
        echo.
        echo Alternative methods:
        echo 1. If you have Node.js: npx http-server -p 8000
        echo 2. If you have PHP: php -S localhost:8000
        echo 3. Please install Python
        pause
    )
)