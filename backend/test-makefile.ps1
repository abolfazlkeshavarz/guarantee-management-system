# test-makefile.ps1
# Comprehensive Makefile Test Script for Windows

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Guarantee Management System - Makefile Test" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$tests = @(
    # Basic Commands
    @{Name="Help"; Command="make help"},
    @{Name="Debug Config"; Command="make debug"},
    @{Name="Format Code"; Command="make fmt"},
    
    # Database Commands
    @{Name="Check Database Status"; Command="make db-status"},
    @{Name="Run Migrations"; Command="make migrate-up"},
    @{Name="Seed Database"; Command="make seed"},
    @{Name="Check Status After Seed"; Command="make db-status"},
    
    # Build and Run
    @{Name="Build Application"; Command="make build"},
    @{Name="Run Tests"; Command="make test"},
    @{Name="Run Linter"; Command="make lint"},
    @{Name="Generate Coverage"; Command="make coverage"},
    
    # Custom Query
    @{Name="Test Database Query"; Command="make db-query Q='SELECT COUNT(*) FROM admins;'"},
    
    # Cleanup
    @{Name="Clean Build"; Command="make clean"}
)

$passed = 0
$failed = 0

foreach ($test in $tests) {
    Write-Host "Testing: $($test.Name)" -ForegroundColor Yellow
    Write-Host "Command: $($test.Command)" -ForegroundColor Gray
    
    try {
        $startTime = Get-Date
        $result = Invoke-Expression $test.Command 2>&1
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[PASSED] ($duration seconds)" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "[FAILED] (Exit Code: $LASTEXITCODE)" -ForegroundColor Red
            if ($result) {
                Write-Host "Error: $($result | Out-String)" -ForegroundColor Red
            }
            $failed++
        }
    } catch {
        Write-Host "[FAILED] (Exception)" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        $failed++
    }
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Test Results:" -ForegroundColor Cyan
Write-Host "  Passed: $passed" -ForegroundColor Green
Write-Host "  Failed: $failed" -ForegroundColor Red
Write-Host "  Total:  $($tests.Count)" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some tests failed. Please review the errors above." -ForegroundColor Red
    exit 1
}