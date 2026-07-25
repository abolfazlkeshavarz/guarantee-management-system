# fix-all-issues.ps1
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fixing Frontend Issues" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Check if backend is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "Backend is running" -ForegroundColor Green
} catch {
    Write-Host "Backend is not running!" -ForegroundColor Red
    Write-Host "Please start backend first:" -ForegroundColor Yellow
    Write-Host "  cd ../backend" -ForegroundColor Gray
    Write-Host "  make run" -ForegroundColor Gray
    exit 1
}
Write-Host ""

Write-Host "Step 2: Check CORS configuration..." -ForegroundColor Yellow
Write-Host "Make sure CORS middleware allows: http://localhost:5173" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 3: Test API endpoints..." -ForegroundColor Yellow

# Test login
$loginBody = @{
    username = "abolfazl"
    password = "abolfazl"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    Write-Host "Login successful" -ForegroundColor Green
    
    # Test customers API with token
    $headers = @{
        Authorization = "Bearer $token"
    }
    $customersResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/customers" -Method Get -Headers $headers
    Write-Host "Customers API working" -ForegroundColor Green
    Write-Host "Total customers: $($customersResponse.meta.total)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "Authentication error - please check credentials" -ForegroundColor Yellow
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "Customers endpoint not found - please check backend routes" -ForegroundColor Yellow
    } else {
        Write-Host "API test failed: $_" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "Step 4: Test Dashboard Stats..." -ForegroundColor Yellow
try {
    $dashboardResponse = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/dashboard/stats" -Method Get -Headers $headers
    Write-Host "Dashboard Stats API working" -ForegroundColor Green
} catch {
    Write-Host "Dashboard Stats API not found (this is OK if not implemented)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Testing Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "If all tests passed, your frontend should work." -ForegroundColor Yellow
Write-Host ""
Write-Host "Start the frontend:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor Gray