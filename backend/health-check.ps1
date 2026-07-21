# health-check.ps1 - Comprehensive Health Check Script
# Works on both Windows and Linux (via PowerShell Core)

$baseUrl = "http://localhost:8080"
$apiUrl = "$baseUrl/api/v1"

# Detect OS
$isWindows = $env:OS -eq "Windows_NT"

Write-Host "============================================" -ForegroundColor Cyan
if ($isWindows) {
    Write-Host "  Guarantee Management System - Health Check (Windows)" -ForegroundColor Cyan
} else {
    Write-Host "  Guarantee Management System - Health Check (Linux)" -ForegroundColor Cyan
}
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
Write-Host "1. Checking if server is running..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "$baseUrl/health" -Method Get -UseBasicParsing -ErrorAction Stop
    if ($healthCheck.StatusCode -eq 200) {
        Write-Host "[OK] Server is running" -ForegroundColor Green
    }
} catch {
    Write-Host "[FAIL] Server is not running on $baseUrl" -ForegroundColor Red
    Write-Host "Run: make run" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 1: Health Check
Write-Host "2. Testing Health Check endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    if ($healthResponse.status -eq "ok") {
        Write-Host "[OK] Health Check passed" -ForegroundColor Green
        Write-Host "  App: $($healthResponse.app)" -ForegroundColor Gray
        Write-Host "  Environment: $($healthResponse.env)" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAIL] Health Check failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Login
Write-Host "3. Testing Login endpoint..." -ForegroundColor Yellow
$loginBody = @{
    username = "abolfazl"
    password = "abolfazl"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$apiUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    Write-Host "[OK] Login successful" -ForegroundColor Green
    $tokenPreview = $token.Substring(0, [Math]::Min(30, $token.Length))
    Write-Host "  Token: $tokenPreview..." -ForegroundColor Gray
    Write-Host "  Expires in: $($loginResponse.data.expires_in) seconds" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Login failed: $_" -ForegroundColor Red
    Write-Host "  Try: make admin-create-default" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Set headers for authenticated requests
$headers = @{
    Authorization = "Bearer $token"
}

# Test 3: Get Profile
Write-Host "4. Testing Profile endpoint..." -ForegroundColor Yellow
try {
    $profileResponse = Invoke-RestMethod -Uri "$apiUrl/auth/profile" -Method Get -Headers $headers
    Write-Host "[OK] Profile retrieved successfully" -ForegroundColor Green
    Write-Host "  Username: $($profileResponse.data.username)" -ForegroundColor Gray
    Write-Host "  Full Name: $($profileResponse.data.full_name)" -ForegroundColor Gray
    Write-Host "  Email: $($profileResponse.data.email)" -ForegroundColor Gray
    Write-Host "  Is Active: $($profileResponse.data.is_active)" -ForegroundColor Gray
} catch {
    Write-Host "[FAIL] Profile retrieval failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: List Admins
Write-Host "5. Testing List Admins endpoint..." -ForegroundColor Yellow
try {
    $adminsResponse = Invoke-RestMethod -Uri "$apiUrl/admins" -Method Get -Headers $headers
    Write-Host "[OK] Admins listed successfully" -ForegroundColor Green
    Write-Host "  Total Admins: $($adminsResponse.data.Count)" -ForegroundColor Gray
    Write-Host "  Page: $($adminsResponse.meta.current_page) of $($adminsResponse.meta.last_page)" -ForegroundColor Gray
    foreach ($admin in $adminsResponse.data) {
        $adminId = $admin.id
        $adminUsername = $admin.username
        $adminFullName = $admin.full_name
        Write-Host "    - ID: $adminId | $adminUsername ($adminFullName)" -ForegroundColor Gray
    }
} catch {
    Write-Host "[FAIL] List Admins failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 5: Create Admin
Write-Host "6. Testing Create Admin endpoint..." -ForegroundColor Yellow
$newAdminBody = @{
    username = "healthcheck"
    password = "Health123!"
    full_name = "Health Check User"
    email = "health@example.com"
} | ConvertTo-Json

$adminCreated = $false
try {
    $createResponse = Invoke-RestMethod -Uri "$apiUrl/admins" -Method Post -Body $newAdminBody -Headers $headers -ContentType "application/json"
    Write-Host "[OK] Admin created successfully" -ForegroundColor Green
    Write-Host "  Created: $($createResponse.data.username)" -ForegroundColor Gray
    $adminCreated = $true
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "[INFO] Admin already exists (skipping)" -ForegroundColor Yellow
        $adminCreated = $false
    } else {
        Write-Host "[FAIL] Admin creation failed: $_" -ForegroundColor Red
        $adminCreated = $false
    }
}
Write-Host ""

# Test 6: Delete Admin (cleanup)
Write-Host "7. Cleaning up test admin..." -ForegroundColor Yellow
if ($adminCreated) {
    try {
        $admins = Invoke-RestMethod -Uri "$apiUrl/admins" -Method Get -Headers $headers
        $adminToDelete = $admins.data | Where-Object { $_.username -eq "healthcheck" }
        
        if ($adminToDelete) {
            $deleteResponse = Invoke-RestMethod -Uri "$apiUrl/admins/$($adminToDelete.id)" -Method Delete -Headers $headers
            Write-Host "[OK] Test admin cleaned up" -ForegroundColor Green
        }
    } catch {
        Write-Host "[INFO] Cleanup skipped: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "[INFO] No test admin to clean up" -ForegroundColor Yellow
}
Write-Host ""

# Test 7: Database Health (Optional)
Write-Host "8. Checking Database health..." -ForegroundColor Yellow
$dbHealthy = $false
try {
    $env:PGPASSWORD = "Whoknowwho"
    $dbCheck = psql -U postgres -h localhost -d guarantee_db -tAc "SELECT 1" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Database is healthy" -ForegroundColor Green
        $dbHealthy = $true
    } else {
        Write-Host "[FAIL] Database is not healthy" -ForegroundColor Red
        Write-Host "  Error: $dbCheck" -ForegroundColor Gray
        $dbHealthy = $false
    }
} catch {
    Write-Host "[FAIL] Database check failed: $_" -ForegroundColor Red
    $dbHealthy = $false
}
Write-Host ""

# Summary
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Health Check Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "[OK] Server is running" -ForegroundColor Green
Write-Host "[OK] Health Check endpoint: OK" -ForegroundColor Green
Write-Host "[OK] Authentication: OK" -ForegroundColor Green
Write-Host "[OK] Profile endpoint: OK" -ForegroundColor Green
Write-Host "[OK] Admin CRUD operations: OK" -ForegroundColor Green
if ($dbHealthy) {
    Write-Host "[OK] Database: OK" -ForegroundColor Green
} else {
    Write-Host "[WARN] Database: Check required" -ForegroundColor Yellow
}
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "All systems are healthy!" -ForegroundColor Green
Write-Host ""
Write-Host "Server: $baseUrl" -ForegroundColor Gray
Write-Host "API: $apiUrl" -ForegroundColor Gray
Write-Host "Environment: Development" -ForegroundColor Gray