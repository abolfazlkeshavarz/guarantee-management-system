# test-technician.ps1
# Test Technician Auth and Dashboard

param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$TechnicianUsername = "abol",
    [string]$TechnicianPassword = "abolfazl"
)

$ApiUrl = "$BaseUrl/api/v1"
$Passed = 0
$Failed = 0

function Write-Section($title) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
}

function Write-Pass($name) {
    Write-Host "[PASS] $name" -ForegroundColor Green
    $script:Passed++
}

function Write-Fail($name, $errorMsg) {
    Write-Host "[FAIL] $name" -ForegroundColor Red
    Write-Host "       $errorMsg" -ForegroundColor Gray
    $script:Failed++
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
        Uri = $uri
        Method = $Method
        Headers = $Headers
        ErrorAction = 'Stop'
    }
    if ($Body) {
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
        $params["ContentType"] = "application/json"
    }
    return Invoke-RestMethod @params
}

# ============================================
# 1. Technician Login
# ============================================
Write-Section "1. Technician Login"

try {
    $loginResp = Invoke-Api -Method Post -Path "/technician/login" -Body @{
        username = $TechnicianUsername
        password = $TechnicianPassword
    }
    $Token = $loginResp.data.token
    $Technician = $loginResp.data.technician
    
    if ($Token) {
        Write-Pass "Technician login successful"
        Write-Host "  Technician: $($Technician.full_name) ($($Technician.username))" -ForegroundColor Gray
    } else {
        Write-Fail "Technician login" "No token received"
        exit 1
    }
} catch {
    Write-Fail "Technician login" $_.Exception.Message
    exit 1
}

$authHeaders = @{ Authorization = "Bearer $Token" }

# ============================================
# 2. Get Technician Profile
# ============================================
Write-Section "2. Technician Profile"

try {
    $profile = Invoke-Api -Method Get -Path "/technician/profile" -Headers $authHeaders
    if ($profile.data.id -eq $Technician.id) {
        Write-Pass "Get technician profile"
        Write-Host "  Full Name: $($profile.data.full_name)" -ForegroundColor Gray
        Write-Host "  Username: $($profile.data.username)" -ForegroundColor Gray
        Write-Host "  Active: $($profile.data.is_active)" -ForegroundColor Gray
    } else {
        Write-Fail "Get technician profile" "ID mismatch"
    }
} catch {
    Write-Fail "Get technician profile" $_.Exception.Message
}

# ============================================
# 3. Get Technician's Repairs
# ============================================
Write-Section "3. Technician Repairs"

try {
    $repairs = Invoke-Api -Method Get -Path "/technician/repairs" -Headers $authHeaders
    $total = $repairs.meta.total
    Write-Pass "Get technician repairs"
    Write-Host "  Total repairs: $total" -ForegroundColor Gray
    
    # Show status breakdown
    $statusGroups = $repairs.data | Group-Object status
    foreach ($group in $statusGroups) {
        Write-Host "  $($group.Name): $($group.Count)" -ForegroundColor Gray
    }
} catch {
    Write-Fail "Get technician repairs" $_.Exception.Message
}

# ============================================
# 4. Update Repair Status
# ============================================
Write-Section "4. Update Repair Status"

# Get first repair that can be updated
try {
    $repairs = Invoke-Api -Method Get -Path "/technician/repairs" -Headers $authHeaders
    $repair = $repairs.data | Where-Object { $_.status -ne "Completed" -and $_.status -ne "Cancelled" } | Select-Object -First 1
    
    if ($repair) {
        # Try to update to InProgress
        try {
            $update = Invoke-Api -Method Put -Path "/technician/repairs/$($repair.id)" -Headers $authHeaders -Body @{
                status = "InProgress"
            }
            Write-Pass "Update repair to InProgress"
            Write-Host "  Repair #$($repair.id): $($repair.status) -> InProgress" -ForegroundColor Gray
            
            # Update to Completed
            try {
                $update = Invoke-Api -Method Put -Path "/technician/repairs/$($repair.id)" -Headers $authHeaders -Body @{
                    status = "Completed"
                }
                Write-Pass "Update repair to Completed"
                Write-Host "  Repair #$($repair.id): InProgress -> Completed" -ForegroundColor Gray
            } catch {
                Write-Fail "Update repair to Completed" $_.Exception.Message
            }
        } catch {
            Write-Fail "Update repair to InProgress" $_.Exception.Message
        }
    } else {
        Write-Host "[INFO] No updatable repairs found" -ForegroundColor Yellow
    }
} catch {
    Write-Fail "Get repairs for update" $_.Exception.Message
}

# ============================================
# 5. Test Security (Technician Can't Access Admin Routes)
# ============================================
Write-Section "5. Security Tests"

try {
    Invoke-Api -Method Get -Path "/technicians" -Headers $authHeaders | Out-Null
    Write-Fail "Technician accessing admin route" "Should have been forbidden"
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Pass "Technician blocked from admin routes (403 Forbidden)"
    } else {
        Write-Fail "Security test" "Expected 403, got $($_.Exception.Response.StatusCode)"
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
Write-Host "  Total:   $($Passed + $Failed)" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan

if ($Failed -gt 0) {
    Write-Host ""
    Write-Host "Some tests failed. Please review the errors above." -ForegroundColor Red
    exit 1
} else {
    Write-Host ""
    Write-Host "All technician tests passed!" -ForegroundColor Green
    exit 0
}