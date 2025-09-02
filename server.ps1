# Voice Commander - PowerShell Server Launcher
Write-Host "Voice Commander - Local Web Server" -ForegroundColor Green
Write-Host ""

# Try different server options
$serverStarted = $false

# Option 1: Python 3
Write-Host "Trying Python 3..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python 3") {
        Write-Host "Found Python 3: $pythonVersion" -ForegroundColor Green
        Write-Host "Starting server at http://localhost:8000" -ForegroundColor Cyan
        Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
        Write-Host ""
        python -m http.server 8000
        $serverStarted = $true
    }
} catch {
    Write-Host "Python 3 not found" -ForegroundColor Red
}

# Option 2: Python 2 (fallback)
if (-not $serverStarted) {
    Write-Host "Trying Python 2..." -ForegroundColor Yellow
    try {
        python -m SimpleHTTPServer 8000
        $serverStarted = $true
    } catch {
        Write-Host "Python 2 not found" -ForegroundColor Red
    }
}

# Option 3: Node.js
if (-not $serverStarted) {
    Write-Host "Trying Node.js..." -ForegroundColor Yellow
    try {
        $nodeVersion = node --version 2>&1
        if ($nodeVersion) {
            Write-Host "Found Node.js: $nodeVersion" -ForegroundColor Green
            Write-Host "Installing http-server..." -ForegroundColor Cyan
            npx http-server -p 8000 -c-1
            $serverStarted = $true
        }
    } catch {
        Write-Host "Node.js not found" -ForegroundColor Red
    }
}

# Option 4: PHP
if (-not $serverStarted) {
    Write-Host "Trying PHP..." -ForegroundColor Yellow
    try {
        $phpVersion = php --version 2>&1
        if ($phpVersion -match "PHP") {
            Write-Host "Found PHP" -ForegroundColor Green
            Write-Host "Starting server at http://localhost:8000" -ForegroundColor Cyan
            php -S localhost:8000
            $serverStarted = $true
        }
    } catch {
        Write-Host "PHP not found" -ForegroundColor Red
    }
}

# No server found
if (-not $serverStarted) {
    Write-Host "" 
    Write-Host "ERROR: No suitable server found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install one of the following:" -ForegroundColor Yellow
    Write-Host "1. Python 3: https://www.python.org/downloads/"
    Write-Host "2. Node.js: https://nodejs.org/"
    Write-Host "3. PHP: https://www.php.net/downloads"
    Write-Host ""
    Write-Host "Or use VS Code with Live Server extension"
    Read-Host "Press Enter to exit"
}