# test-everything.ps1
# ============================================
#  Guarantee Management System - Full Test Suite
# ============================================
# Tests every currently implemented backend module:
#   - Health check
#   - Auth (login, profile)
#   - Admin CRUD
#   - Customer CRUD + search + pagination
#   - Dashboard stats
#   - CORS preflight (the thing that bit us earlier)
#
# NOTE: Products, Technicians, Guarantees, and Repairs are not yet
# exposed as API modules (no routes registered in cmd/api/main.go),
# so they are not tested here. Add sections for them as those
# modules get built.
#
# Usage:
#   .\test-everything.ps1
#   .\test-everything.ps1 -Username admin -Password "Admin123!"
#   .\test-everything.ps1 -BaseUrl "http://localhost:8080" -FrontendOrigin "http://localhost:5173"

param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$FrontendOrigin = "http://localhost:5173",
    [string]$Username = "abolfazl",
    [string]$Password = "abolfazl"
)

$ApiUrl = "$BaseUrl/api/v1"
$Passed = 0
$Failed = 0
$Skipped = 0
$FailedTests = @()

function Write-Section($title) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
}

function Write-Pass($name, $detail = "") {
    Write-Host "[PASS] $name" -ForegroundColor Green -NoNewline
    if ($detail) { Write-Host "  $detail" -ForegroundColor Gray } else { Write-Host "" }
    $script:Passed++
}

function Write-Fail($name, $errorMsg) {
    Write-Host "[FAIL] $name" -ForegroundColor Red
    Write-Host "       $errorMsg" -ForegroundColor Gray
    $script:Failed++
    $script:FailedTests += $name
}

function Write-Skip($name, $reason) {
    Write-Host "[SKIP] $name" -ForegroundColor Yellow -NoNewline
    Write-Host "  $reason" -ForegroundColor Gray
    $script:Skipped++
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )
    $uri = "$ApiUrl$Path"
    $params = @{
        Uri     = $uri
        Method  = $Method
        Headers = $Headers
    }
    if ($Body) {
        $params["Body"] = ($Body | ConvertTo-Json)
        $params["ContentType"] = "application/json"
    }
    return Invoke-RestMethod @params
}

Write-Host ""
Write-Host "############################################" -ForegroundColor Magenta
Write-Host "#  GMS Full Test Suite" -ForegroundColor Magenta
Write-Host "#  Target: $BaseUrl" -ForegroundColor Magenta
Write-Host "############################################" -ForegroundColor Magenta

# ============================================
# 0. Server availability
# ============================================
Write-Section "0. Server Availability"

try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get
    if ($health.status -eq "ok") {
        Write-Pass "Server is reachable" "app=$($health.app) env=$($health.env)"
    } else {
        Write-Fail "Server is reachable" "Unexpected health response: $($health | ConvertTo-Json -Compress)"
    }
} catch {
    Write-Fail "Server is reachable" $_.Exception.Message
    Write-Host ""
    Write-Host "Server is not responding on $BaseUrl. Start it with 'go run cmd/api/main.go' and re-run this script." -ForegroundColor Red
    Write-Host ""
    Write-Host "Passed: $Passed | Failed: $Failed | Skipped: $Skipped" -ForegroundColor White
    exit 1
}

# ============================================
# 1. CORS preflight
# ============================================
Write-Section "1. CORS Preflight"

try {
    $resp = Invoke-WebRequest -Uri "$ApiUrl/customers?page=1&limit=10" -Method Options -Headers @{
        "Origin"                          = $FrontendOrigin
        "Access-Control-Request-Method"   = "GET"
        "Access-Control-Request-Headers"  = "authorization"
    } -UseBasicParsing

    if ($resp.StatusCode -eq 204 -and $resp.Headers["Access-Control-Allow-Origin"]) {
        Write-Pass "OPTIONS preflight returns 204 with CORS headers" "Allow-Origin: $($resp.Headers['Access-Control-Allow-Origin'])"
    } else {
        Write-Fail "OPTIONS preflight returns 204 with CORS headers" "Status=$($resp.StatusCode), Allow-Origin header missing"
    }
} catch {
    Write-Fail "OPTIONS preflight returns 204 with CORS headers" $_.Exception.Message
}

# ============================================
# 2. Auth: Login
# ============================================
Write-Section "2. Auth Module"

$token = $null
try {
    $loginResp = Invoke-Api -Method Post -Path "/auth/login" -Body @{ username = $Username; password = $Password }
    $token = $loginResp.data.token
    if ($token) {
        Write-Pass "Login with $Username" "token acquired, expires_in=$($loginResp.data.expires_in)s"
    } else {
        Write-Fail "Login with $Username" "No token in response"
    }
} catch {
    Write-Fail "Login with $Username" $_.Exception.Message
    Write-Host ""
    Write-Host "Cannot continue without a valid token. Check -Username/-Password params match a seeded admin." -ForegroundColor Red
    Write-Host "Passed: $Passed | Failed: $Failed | Skipped: $Skipped" -ForegroundColor White
    exit 1
}

$authHeaders = @{ Authorization = "Bearer $token" }

# Reject bad credentials
try {
    Invoke-Api -Method Post -Path "/auth/login" -Body @{ username = $Username; password = "definitely-wrong-password" } | Out-Null
    Write-Fail "Login rejects bad password" "Expected 401 but request succeeded"
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Pass "Login rejects bad password" "401 as expected"
    } else {
        Write-Fail "Login rejects bad password" $_.Exception.Message
    }
}

# Reject missing token
try {
    Invoke-RestMethod -Uri "$ApiUrl/auth/profile" -Method Get | Out-Null
    Write-Fail "Protected route rejects missing token" "Expected 401 but request succeeded"
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Pass "Protected route rejects missing token" "401 as expected"
    } else {
        Write-Fail "Protected route rejects missing token" $_.Exception.Message
    }
}

# Get profile
try {
    $profile = Invoke-Api -Method Get -Path "/auth/profile" -Headers $authHeaders
    Write-Pass "GET /auth/profile" "username=$($profile.data.username), active=$($profile.data.is_active)"
} catch {
    Write-Fail "GET /auth/profile" $_.Exception.Message
}

# ============================================
# 3. Admin CRUD (self-cleaning)
# ============================================
Write-Section "3. Admin Module"

$testAdminUsername = "testadmin_$(Get-Random -Maximum 99999)"
$createdAdminId = $null

try {
    $admins = Invoke-Api -Method Get -Path "/admins?page=1&limit=10" -Headers $authHeaders
    Write-Pass "GET /admins (list)" "total=$($admins.meta.total)"
} catch {
    Write-Fail "GET /admins (list)" $_.Exception.Message
}

try {
    $created = Invoke-Api -Method Post -Path "/admins" -Headers $authHeaders -Body @{
        username  = $testAdminUsername
        password  = "TestPass123!"
        full_name = "Automated Test Admin"
        email     = "$testAdminUsername@example.com"
    }
    $createdAdminId = $created.data.id
    Write-Pass "POST /admins (create)" "id=$createdAdminId, username=$testAdminUsername"
} catch {
    Write-Fail "POST /admins (create)" $_.Exception.Message
}

if ($createdAdminId) {
    try {
        Invoke-Api -Method Put -Path "/admins/$createdAdminId" -Headers $authHeaders -Body @{
            full_name = "Automated Test Admin (Updated)"
        } | Out-Null
        Write-Pass "PUT /admins/:id (update)" "id=$createdAdminId"
    } catch {
        Write-Fail "PUT /admins/:id (update)" $_.Exception.Message
    }

    try {
        Invoke-Api -Method Delete -Path "/admins/$createdAdminId" -Headers $authHeaders | Out-Null
        Write-Pass "DELETE /admins/:id (cleanup)" "id=$createdAdminId"
    } catch {
        Write-Fail "DELETE /admins/:id (cleanup)" $_.Exception.Message
        Write-Host "       WARNING: test admin '$testAdminUsername' may still exist, remove manually." -ForegroundColor Yellow
    }
} else {
    Write-Skip "PUT /admins/:id (update)" "create step failed"
    Write-Skip "DELETE /admins/:id (cleanup)" "create step failed"
}

# Duplicate username should be rejected
try {
    Invoke-Api -Method Post -Path "/admins" -Headers $authHeaders -Body @{
        username  = $Username
        password  = "AnyPass123!"
        full_name = "Duplicate Test"
        email     = "dup@example.com"
    } | Out-Null
    Write-Fail "POST /admins rejects duplicate username" "Expected 409 but request succeeded"
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Pass "POST /admins rejects duplicate username" "409 as expected"
    } else {
        Write-Fail "POST /admins rejects duplicate username" $_.Exception.Message
    }
}

# ============================================
# 4. Customer CRUD + Search + Pagination
# ============================================
Write-Section "4. Customer Module"

$testPhone = "09$(Get-Random -Minimum 100000000 -Maximum 999999999)"
$testNationalId = "TST$(Get-Random -Minimum 100000 -Maximum 999999)"
$createdCustomerId = $null

try {
    $list = Invoke-Api -Method Get -Path "/customers?page=1&limit=10" -Headers $authHeaders
    Write-Pass "GET /customers (list)" "total=$($list.meta.total)"
} catch {
    Write-Fail "GET /customers (list)" $_.Exception.Message
}

try {
    $created = Invoke-Api -Method Post -Path "/customers" -Headers $authHeaders -Body @{
        full_name   = "Automated Test Customer"
        phone       = $testPhone
        national_id = $testNationalId
        province    = "Tehran"
        city        = "Tehran"
        address     = "123 Test Street"
    }
    $createdCustomerId = $created.data.id
    Write-Pass "POST /customers (create)" "id=$createdCustomerId"
} catch {
    Write-Fail "POST /customers (create)" $_.Exception.Message
}

if ($createdCustomerId) {
    try {
        $fetched = Invoke-Api -Method Get -Path "/customers/$createdCustomerId" -Headers $authHeaders
        if ($fetched.data.phone -eq $testPhone) {
            Write-Pass "GET /customers/:id" "phone matches"
        } else {
            Write-Fail "GET /customers/:id" "phone mismatch"
        }
    } catch {
        Write-Fail "GET /customers/:id" $_.Exception.Message
    }

    try {
        Invoke-Api -Method Put -Path "/customers/$createdCustomerId" -Headers $authHeaders -Body @{
            city = "Isfahan"
        } | Out-Null
        Write-Pass "PUT /customers/:id (update)" "city -> Isfahan"
    } catch {
        Write-Fail "PUT /customers/:id (update)" $_.Exception.Message
    }

    try {
        $searchResults = Invoke-Api -Method Get -Path "/customers/search?q=$testNationalId" -Headers $authHeaders
        if ($searchResults.data.Count -ge 1) {
            Write-Pass "GET /customers/search" "found $($searchResults.data.Count) match(es)"
        } else {
            Write-Fail "GET /customers/search" "expected at least 1 result, got 0"
        }
    } catch {
        Write-Fail "GET /customers/search" $_.Exception.Message
    }

    # Duplicate national ID should be rejected
    try {
        Invoke-Api -Method Post -Path "/customers" -Headers $authHeaders -Body @{
            full_name   = "Duplicate Customer"
            phone       = "0900000$(Get-Random -Minimum 1000 -Maximum 9999)"
            national_id = $testNationalId
        } | Out-Null
        Write-Fail "POST /customers rejects duplicate national_id" "Expected 409 but request succeeded"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 409) {
            Write-Pass "POST /customers rejects duplicate national_id" "409 as expected"
        } else {
            Write-Fail "POST /customers rejects duplicate national_id" $_.Exception.Message
        }
    }

    try {
        Invoke-Api -Method Delete -Path "/customers/$createdCustomerId" -Headers $authHeaders | Out-Null
        Write-Pass "DELETE /customers/:id (cleanup)" "id=$createdCustomerId"
    } catch {
        Write-Fail "DELETE /customers/:id (cleanup)" $_.Exception.Message
        Write-Host "       WARNING: test customer id=$createdCustomerId may still exist, remove manually." -ForegroundColor Yellow
    }
} else {
    Write-Skip "GET /customers/:id" "create step failed"
    Write-Skip "PUT /customers/:id (update)" "create step failed"
    Write-Skip "GET /customers/search" "create step failed"
    Write-Skip "POST /customers rejects duplicate national_id" "create step failed"
    Write-Skip "DELETE /customers/:id (cleanup)" "create step failed"
}

# Validation: missing required fields should be rejected
try {
    Invoke-Api -Method Post -Path "/customers" -Headers $authHeaders -Body @{
        full_name = "No Phone Or National ID"
    } | Out-Null
    Write-Fail "POST /customers rejects missing required fields" "Expected 400 but request succeeded"
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Pass "POST /customers rejects missing required fields" "400 as expected"
    } else {
        Write-Fail "POST /customers rejects missing required fields" $_.Exception.Message
    }
}

# ============================================
# 5. Dashboard
# ============================================
Write-Section "5. Dashboard Module"

try {
    $stats = Invoke-Api -Method Get -Path "/dashboard/stats" -Headers $authHeaders
    if ($stats.success) {
        Write-Pass "GET /dashboard/stats" "total_guarantees=$($stats.data.total_guarantees)"
    } else {
        Write-Fail "GET /dashboard/stats" "success=false in response"
    }
} catch {
    Write-Fail "GET /dashboard/stats" $_.Exception.Message
}

# ============================================
# 6. Not-yet-implemented modules (informational only)
# ============================================
Write-Section "6. Modules Not Yet Wired Up"

$pendingModules = @("/products", "/product-categories", "/technicians", "/guarantees", "/repairs")
foreach ($path in $pendingModules) {
    try {
        Invoke-Api -Method Get -Path $path -Headers $authHeaders | Out-Null
        Write-Host "[INFO] $path responded - module may already be implemented, consider adding real tests for it" -ForegroundColor Cyan
    } catch {
        $status = $_.Exception.Response.StatusCode
        if ($status -eq 404) {
            Write-Skip "$path" "not implemented yet (404) - expected for now"
        } else {
            Write-Host "[INFO] $path returned $status" -ForegroundColor Cyan
        }
    }
}

# ============================================
# Summary
# ============================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Passed:  $Passed" -ForegroundColor Green
Write-Host "  Failed:  $Failed" -ForegroundColor Red
Write-Host "  Skipped: $Skipped" -ForegroundColor Yellow
Write-Host "  Total:   $($Passed + $Failed + $Skipped)" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan

if ($Failed -gt 0) {
    Write-Host ""
    Write-Host "Failed tests:" -ForegroundColor Red
    foreach ($t in $FailedTests) {
        Write-Host "  - $t" -ForegroundColor Red
    }
    Write-Host ""
    exit 1
} else {
    Write-Host ""
    Write-Host "All implemented modules passed!" -ForegroundColor Green
    Write-Host ""
    exit 0
}
