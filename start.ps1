# PowerShell script to launch all services in separate windows
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting Intelligent Legal Service Platform" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

Write-Host "Starting AI Service on port 8001..." -ForegroundColor Yellow
$aiPython = "$root\ai-service\venv\Scripts\python.exe"
if (-not (Test-Path $aiPython)) { $aiPython = "python" }
Start-Process cmd.exe -ArgumentList "/k", "title AI Service (8001) && cd /d `"$root\ai-service`" && `"$aiPython`" -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"

Write-Host "Starting AI Recommendation Service on port 8002..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k", "title Recommendation AI (8002) && cd /d `"$root\ai-service`" && `"$aiPython`" -m uvicorn lawyer_recommendation.app:app --host 0.0.0.0 --port 8002 --reload"

Write-Host "Starting Backend API on port 5000 / 5295..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k", "title Backend API (5000/5295) && cd /d `"$root\backend\LegalService.API`" && dotnet run --launch-profile http"

Write-Host "Starting Frontend on port 5173..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k", "title Frontend (5173) && cd /d `"$root\frontend`" && npm run dev"

Write-Host "========================================================" -ForegroundColor Green
Write-Host "All services launched in separate windows!" -ForegroundColor Green
Write-Host "Frontend:               http://localhost:5173" -ForegroundColor Green
Write-Host "Backend API:            http://localhost:5000/swagger (or http://localhost:5295/swagger)" -ForegroundColor Green
Write-Host "AI Service:             http://localhost:8001" -ForegroundColor Green
Write-Host "Recommendation Service: http://localhost:8002" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
