# test-backend-full.ps1
# ============================================
#  Guarantee Management System - Full Backend Test Suite
# ============================================
# Tests ALL currently implemented backend modules:
#   - Health check
#   - CORS
#   - Auth (login, profile, password change)
#   - Admin CRUD
#   - Customer CRUD + search + pagination
#   - Product Categories CRUD + active list
#   - Products CRUD + filtering by category
#   - Dashboard stats
#   - Error handling (validation, duplicates, not found)
#
# Usage:
#   .\test-backend-full.ps1
#   .\test-backend-full.ps1 -BaseUrl "http://localhost:8080"
#   .\test-backend-full.ps1 -Username admin -Password "Admin123!" -Verbose
#
# FIX LOG (vs original):
#   1. Invoke-Api no longer swallows exceptions when -NoThrow is passed.
#      Previously it caught the error internally and RETURNED the
#      exception object instead of re-throwing it, so every "rejects X"
#      test's outer try/catch never saw the error and always fell through
#      to Write-Fail, regardless of what the API actually returned.
#      Now Invoke-Api always re-throws, and -NoThrow has been dropped
#      from all call sites (it no longer does anything useful).
#   2. The "duplicate product name in category" test previously reused
#      $testProductName after the product had already been renamed via
#      PUT to "Updated $testProductName". That meant the "duplicate" POST
#      didn't actually collide with anything and silently created an
#      orphan product, which then made the category cleanup DELETE fail
#      with 400 (category still in use). The test now checks against the
#      product's *current* name.

param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$Username = "abolfazl",
    [string]$Password = "abolfazl",
    [switch]$Verbose
)

$ApiUrl = "$BaseUrl/api/v1"
$Passed = 0
$Failed = 0
$Skipped = 0
$FailedTests = @()
$Global:TestData = @{}
$Global:Token = $null

# Color functions
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

function Write-Debug($msg) {
    if ($Verbose) {
        Write-Host "[DEBUG] $msg" -ForegroundColor DarkGray
    }
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [switch]$NoThrow  # kept for call-site compatibility; no longer changes behavior
    )
    $uri = "$ApiUrl$Path"
    $params = @{
        Uri     = $uri
        Method  = $Method
        Headers = $Headers
        ErrorAction = 'Stop'
    }
    if ($Body) {
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
        $params["ContentType"] = "application/json"
    }

    Write-Debug "$Method $Path"

    # FIX: always let the exception propagate. Callers that expect an
    # error (e.g. "rejects duplicate X" tests) handle it in their own
    # try/catch and inspect $_.Exception.Response.StatusCode. Swallowing
    # it here and returning the exception object instead of throwing
    # made every such test pass through to the "unexpected success"
    # branch even when the API correctly rejected the request.
    return Invoke-RestMethod @params
}

# ============================================
# 0. Server availability
# ============================================
Write-Section "0. Server Availability"

try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get -ErrorAction Stop
    if ($health.status -eq "ok") {
        Write-Pass "Server is reachable" "app=$($health.app) env=$($health.env)"
    } else {
        Write-Fail "Server is reachable" "Unexpected health response"
    }
} catch {
    Write-Fail "Server is reachable" $_.Exception.Message
    Write-Host ""
    Write-Host "Server is not responding on $BaseUrl. Start it with 'make run' and re-run this script." -ForegroundColor Red
    Write-Host ""
    exit 1
}

# ============================================
# 1. CORS preflight
# ============================================
Write-Section "1. CORS Preflight"

try {
    $resp = Invoke-WebRequest -Uri "$ApiUrl/customers?page=1&limit=10" -Method Options -Headers @{
        "Origin"                          = "http://localhost:5173"
        "Access-Control-Request-Method"   = "GET"
        "Access-Control-Request-Headers"  = "authorization"
    } -UseBasicParsing -ErrorAction Stop

    if ($resp.StatusCode -eq 204 -or $resp.StatusCode -eq 200) {
        if ($resp.Headers["Access-Control-Allow-Origin"]) {
            Write-Pass "OPTIONS preflight passes CORS" "Allow-Origin: $($resp.Headers['Access-Control-Allow-Origin'])"
        } else {
            Write-Fail "OPTIONS preflight CORS headers" "Access-Control-Allow-Origin header missing"
        }
    } else {
        Write-Fail "OPTIONS preflight status" "Status=$($resp.StatusCode)"
    }
} catch {
    Write-Fail "CORS preflight" $_.Exception.Message
}

# ============================================
# 2. Auth: Login
# ============================================
Write-Section "2. Auth Module"

try {
    $loginResp = Invoke-Api -Method Post -Path "/auth/login" -Body @{ username = $Username; password = $Password }
    $Global:Token = $loginResp.data.token
    if ($Global:Token) {
        Write-Pass "Login with $Username" "token acquired, expires_in=$($loginResp.data.expires_in)s"
    } else {
        Write-Fail "Login with $Username" "No token in response"
    }
} catch {
    Write-Fail "Login with $Username" $_.Exception.Message
    Write-Host ""
    Write-Host "Cannot continue without a valid token. Check credentials." -ForegroundColor Red
    exit 1
}

$authHeaders = @{ Authorization = "Bearer $Global:Token" }

# Reject bad credentials
try {
    Invoke-Api -Method Post -Path "/auth/login" -Body @{ username = $Username; password = "wrong-password" } | Out-Null
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
    Invoke-RestMethod -Uri "$ApiUrl/auth/profile" -Method Get -ErrorAction Stop | Out-Null
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
    $Global:TestData.AdminId = $profile.data.id
} catch {
    Write-Fail "GET /auth/profile" $_.Exception.Message
}

# Change password (test with invalid old password)
try {
    Invoke-Api -Method Post -Path "/auth/change-password" -Headers $authHeaders -Body @{
        old_password = "wrong-old-password"
        new_password = "NewPass123!"
    } | Out-Null
    Write-Fail "Change password rejects wrong old password" "Expected 401 but request succeeded"
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Pass "Change password rejects wrong old password" "401 as expected"
    } else {
        Write-Fail "Change password rejects wrong old password" $_.Exception.Message
    }
}

# ============================================
# 3. Admin CRUD (self-cleaning)
# ============================================
Write-Section "3. Admin Module"

$testAdminUsername = "testadmin_$(Get-Random -Maximum 99999)"
$createdAdminId = $null

# List admins
try {
    $admins = Invoke-Api -Method Get -Path "/admins?page=1&limit=10" -Headers $authHeaders
    Write-Pass "GET /admins (list)" "total=$($admins.meta.total)"
} catch {
    Write-Fail "GET /admins (list)" $_.Exception.Message
}

# Create admin
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

# Update admin
if ($createdAdminId) {
    try {
        $updated = Invoke-Api -Method Put -Path "/admins/$createdAdminId" -Headers $authHeaders -Body @{
            full_name = "Automated Test Admin (Updated)"
            email     = "updated_$testAdminUsername@example.com"
        }
        Write-Pass "PUT /admins/:id (update)" "full_name updated"
    } catch {
        Write-Fail "PUT /admins/:id (update)" $_.Exception.Message
    }

    # Get single admin
    # NOTE: this will still 404 until GET /admins/:id is registered on the
    # backend (routes.go currently has no handler for it). See writeup.
    try {
        $single = Invoke-Api -Method Get -Path "/admins/$createdAdminId" -Headers $authHeaders
        if ($single.data.id -eq $createdAdminId) {
            Write-Pass "GET /admins/:id" "found admin $createdAdminId"
        } else {
            Write-Fail "GET /admins/:id" "ID mismatch"
        }
    } catch {
        Write-Fail "GET /admins/:id" $_.Exception.Message
    }

    # Delete admin (cleanup)
    try {
        Invoke-Api -Method Delete -Path "/admins/$createdAdminId" -Headers $authHeaders | Out-Null
        Write-Pass "DELETE /admins/:id (cleanup)" "id=$createdAdminId"
    } catch {
        Write-Fail "DELETE /admins/:id (cleanup)" $_.Exception.Message
        Write-Host "       WARNING: test admin may still exist, remove manually." -ForegroundColor Yellow
    }
} else {
    Write-Skip "PUT /admins/:id (update)" "create step failed"
    Write-Skip "GET /admins/:id" "create step failed"
    Write-Skip "DELETE /admins/:id (cleanup)" "create step failed"
}

# Duplicate username rejection
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

# List customers
try {
    $list = Invoke-Api -Method Get -Path "/customers?page=1&limit=10" -Headers $authHeaders
    Write-Pass "GET /customers (list)" "total=$($list.meta.total)"
} catch {
    Write-Fail "GET /customers (list)" $_.Exception.Message
}

# Create customer
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

# Test customer operations
if ($createdCustomerId) {
    # Get by ID
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

    # Update
    try {
        Invoke-Api -Method Put -Path "/customers/$createdCustomerId" -Headers $authHeaders -Body @{
            city = "Isfahan"
            province = "Isfahan"
        } | Out-Null
        Write-Pass "PUT /customers/:id (update)" "city -> Isfahan"
    } catch {
        Write-Fail "PUT /customers/:id (update)" $_.Exception.Message
    }

    # Search
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

    # Duplicate national ID rejection
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

    # Cleanup
    try {
        Invoke-Api -Method Delete -Path "/customers/$createdCustomerId" -Headers $authHeaders | Out-Null
        Write-Pass "DELETE /customers/:id (cleanup)" "id=$createdCustomerId"
    } catch {
        Write-Fail "DELETE /customers/:id (cleanup)" $_.Exception.Message
        Write-Host "       WARNING: test customer may still exist, remove manually." -ForegroundColor Yellow
    }
} else {
    Write-Skip "GET /customers/:id" "create step failed"
    Write-Skip "PUT /customers/:id (update)" "create step failed"
    Write-Skip "GET /customers/search" "create step failed"
    Write-Skip "POST /customers rejects duplicate national_id" "create step failed"
    Write-Skip "DELETE /customers/:id (cleanup)" "create step failed"
}

# Validation: missing required fields
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
# 5. Product Categories CRUD
# ============================================
Write-Section "5. Product Categories Module"

$testCategoryName = "Test Category $(Get-Random -Maximum 99999)"
$createdCategoryId = $null

# List categories
try {
    $list = Invoke-Api -Method Get -Path "/product-categories?page=1&limit=10" -Headers $authHeaders
    Write-Pass "GET /product-categories (list)" "total=$($list.meta.total)"
} catch {
    Write-Fail "GET /product-categories (list)" $_.Exception.Message
}

# Create category
try {
    $created = Invoke-Api -Method Post -Path "/product-categories" -Headers $authHeaders -Body @{
        name        = $testCategoryName
        description = "Test category for automated testing"
        is_active   = $true
    }
    $createdCategoryId = $created.data.id
    Write-Pass "POST /product-categories (create)" "id=$createdCategoryId, name=$testCategoryName"
} catch {
    Write-Fail "POST /product-categories (create)" $_.Exception.Message
}

if ($createdCategoryId) {
    # Get by ID
    try {
        $fetched = Invoke-Api -Method Get -Path "/product-categories/$createdCategoryId" -Headers $authHeaders
        if ($fetched.data.name -eq $testCategoryName) {
            Write-Pass "GET /product-categories/:id" "name matches"
        } else {
            Write-Fail "GET /product-categories/:id" "name mismatch"
        }
    } catch {
        Write-Fail "GET /product-categories/:id" $_.Exception.Message
    }

    # List active categories (for dropdowns)
    try {
        $active = Invoke-Api -Method Get -Path "/product-categories/active" -Headers $authHeaders
        # Find our category in the active list
        $found = $active.data | Where-Object { $_.id -eq $createdCategoryId }
        if ($found) {
            Write-Pass "GET /product-categories/active" "found category in active list"
        } else {
            Write-Fail "GET /product-categories/active" "category not in active list"
        }
    } catch {
        Write-Fail "GET /product-categories/active" $_.Exception.Message
    }

    # Update category
    $updatedName = "Updated $testCategoryName"
    try {
        Invoke-Api -Method Put -Path "/product-categories/$createdCategoryId" -Headers $authHeaders -Body @{
            name        = $updatedName
            description = "Updated test category"
            is_active   = $false
        } | Out-Null
        Write-Pass "PUT /product-categories/:id (update)" "name updated"
    } catch {
        Write-Fail "PUT /product-categories/:id (update)" $_.Exception.Message
    }

    # Duplicate category name rejection
    # (compares against $updatedName, i.e. the category's *current* name
    # after the PUT above — this was already correct in the original)
    try {
        Invoke-Api -Method Post -Path "/product-categories" -Headers $authHeaders -Body @{
            name        = $updatedName
            description = "Duplicate category"
            is_active   = $true
        } | Out-Null
        Write-Fail "POST /product-categories rejects duplicate name" "Expected 409 but request succeeded"
    } catch {
        if ($_.Exception.Response.StatusCode -eq 409) {
            Write-Pass "POST /product-categories rejects duplicate name" "409 as expected"
        } else {
            Write-Fail "POST /product-categories rejects duplicate name" $_.Exception.Message
        }
    }

    # Cleanup - Delete category (should work since no products assigned)
    try {
        Invoke-Api -Method Delete -Path "/product-categories/$createdCategoryId" -Headers $authHeaders | Out-Null
        Write-Pass "DELETE /product-categories/:id (cleanup)" "id=$createdCategoryId"
    } catch {
        Write-Fail "DELETE /product-categories/:id (cleanup)" $_.Exception.Message
        Write-Host "       WARNING: test category may still exist, remove manually." -ForegroundColor Yellow
    }
} else {
    Write-Skip "GET /product-categories/:id" "create step failed"
    Write-Skip "GET /product-categories/active" "create step failed"
    Write-Skip "PUT /product-categories/:id (update)" "create step failed"
    Write-Skip "POST /product-categories rejects duplicate name" "create step failed"
    Write-Skip "DELETE /product-categories/:id (cleanup)" "create step failed"
}

# ============================================
# 6. Products CRUD
# ============================================
Write-Section "6. Products Module"

# First, create a category to assign products to
$productCategoryName = "Product Test Cat $(Get-Random -Maximum 99999)"
$productCategoryId = $null

try {
    $catCreated = Invoke-Api -Method Post -Path "/product-categories" -Headers $authHeaders -Body @{
        name        = $productCategoryName
        description = "Category for product testing"
        is_active   = $true
    }
    $productCategoryId = $catCreated.data.id
    Write-Pass "Setup: Created product test category" "id=$productCategoryId"
} catch {
    Write-Fail "Setup: Failed to create product test category" $_.Exception.Message
}

if ($productCategoryId) {
    $testProductName = "Test Product $(Get-Random -Maximum 99999)"
    $createdProductId = $null

    # List products
    try {
        $list = Invoke-Api -Method Get -Path "/products?page=1&limit=10" -Headers $authHeaders
        Write-Pass "GET /products (list)" "total=$($list.meta.total)"
    } catch {
        Write-Fail "GET /products (list)" $_.Exception.Message
    }

    # Create product
    try {
        $created = Invoke-Api -Method Post -Path "/products" -Headers $authHeaders -Body @{
            name        = $testProductName
            description = "Test product for automated testing"
            category_id = $productCategoryId
            is_active   = $true
        }
        $createdProductId = $created.data.id
        Write-Pass "POST /products (create)" "id=$createdProductId, name=$testProductName"
    } catch {
        Write-Fail "POST /products (create)" $_.Exception.Message
    }

    if ($createdProductId) {
        # Get by ID
        try {
            $fetched = Invoke-Api -Method Get -Path "/products/$createdProductId" -Headers $authHeaders
            if ($fetched.data.name -eq $testProductName) {
                Write-Pass "GET /products/:id" "name matches"
            } else {
                Write-Fail "GET /products/:id" "name mismatch"
            }
        } catch {
            Write-Fail "GET /products/:id" $_.Exception.Message
        }

        # Update product — name is now "Updated $testProductName"
        $updatedProductName = "Updated $testProductName"
        try {
            Invoke-Api -Method Put -Path "/products/$createdProductId" -Headers $authHeaders -Body @{
                name        = $updatedProductName
                description = "Updated test product"
                is_active   = $false
            } | Out-Null
            Write-Pass "PUT /products/:id (update)" "name updated"
        } catch {
            Write-Fail "PUT /products/:id (update)" $_.Exception.Message
        }

        # Filter products by category
        try {
            $filtered = Invoke-Api -Method Get -Path "/products?category_id=$productCategoryId" -Headers $authHeaders
            $found = $filtered.data | Where-Object { $_.id -eq $createdProductId }
            if ($found) {
                Write-Pass "GET /products (filter by category)" "found product in category filter"
            } else {
                Write-Fail "GET /products (filter by category)" "product not found in filtered results"
            }
        } catch {
            Write-Fail "GET /products (filter by category)" $_.Exception.Message
        }

        # Duplicate product name in same category rejection
        # FIX: must compare against the product's CURRENT name
        # ($updatedProductName), not the pre-rename $testProductName —
        # otherwise this silently creates an orphan product instead of
        # triggering the duplicate check.
        try {
            Invoke-Api -Method Post -Path "/products" -Headers $authHeaders -Body @{
                name        = $updatedProductName
                description = "Duplicate product"
                category_id = $productCategoryId
                is_active   = $true
            } | Out-Null
            Write-Fail "POST /products rejects duplicate name in category" "Expected 409 but request succeeded"
        } catch {
            if ($_.Exception.Response.StatusCode -eq 409) {
                Write-Pass "POST /products rejects duplicate name in category" "409 as expected"
            } else {
                Write-Fail "POST /products rejects duplicate name in category" $_.Exception.Message
            }
        }

        # Cleanup - Delete product
        try {
            Invoke-Api -Method Delete -Path "/products/$createdProductId" -Headers $authHeaders | Out-Null
            Write-Pass "DELETE /products/:id (cleanup)" "id=$createdProductId"
        } catch {
            Write-Fail "DELETE /products/:id (cleanup)" $_.Exception.Message
            Write-Host "       WARNING: test product may still exist, remove manually." -ForegroundColor Yellow
        }
    } else {
        Write-Skip "GET /products/:id" "create step failed"
        Write-Skip "PUT /products/:id (update)" "create step failed"
        Write-Skip "GET /products (filter by category)" "create step failed"
        Write-Skip "POST /products rejects duplicate name in category" "create step failed"
        Write-Skip "DELETE /products/:id (cleanup)" "create step failed"
    }

    # Cleanup: Delete test category
    try {
        Invoke-Api -Method Delete -Path "/product-categories/$productCategoryId" -Headers $authHeaders | Out-Null
        Write-Pass "Cleanup: Deleted product test category" "id=$productCategoryId"
    } catch {
        Write-Fail "Cleanup: Failed to delete product test category" $_.Exception.Message
        Write-Host "       WARNING: test category may still exist, remove manually." -ForegroundColor Yellow
    }
} else {
    Write-Skip "Products tests" "Failed to create test category"
}

# ============================================
# 7. Dashboard
# ============================================
Write-Section "7. Dashboard Module"

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
# 8. Modules Not Yet Wired Up (Informational)
# ============================================
Write-Section "8. Modules Not Yet Wired Up"

$pendingModules = @(
    @{Path="/technicians"; Name="Technicians"},
    @{Path="/guarantees"; Name="Guarantees"},
    @{Path="/repairs"; Name="Repairs"}
)

foreach ($module in $pendingModules) {
    try {
        Invoke-Api -Method Get -Path $module.Path -Headers $authHeaders | Out-Null
        Write-Host "[INFO] $($module.Name) responded - module may be implemented, consider adding tests" -ForegroundColor Cyan
    } catch {
        $status = $_.Exception.Response.StatusCode
        if ($status -eq 404) {
            Write-Skip "$($module.Name) ($($module.Path))" "not implemented yet (404)"
        } else {
            Write-Host "[INFO] $($module.Name) returned $status" -ForegroundColor Cyan
        }
    }
}

# ============================================
# 9. Summary
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
    Write-Host "Some tests failed. Please review the errors above." -ForegroundColor Red
    exit 1
} else {
    Write-Host ""
    Write-Host "All implemented modules passed!" -ForegroundColor Green
    Write-Host ""
    exit 0
}