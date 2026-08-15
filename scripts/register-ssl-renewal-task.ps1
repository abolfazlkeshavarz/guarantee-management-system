# One-time setup: registers a daily Windows Scheduled Task that keeps every
# acme.sh-managed certificate renewed automatically (renew-ssl-certs.ps1).
#
# Run this once, from an elevated ("Run as Administrator") PowerShell:
#   .\scripts\register-ssl-renewal-task.ps1
#
# The task runs as SYSTEM so it works whether or not anyone is logged in -
# appropriate for a machine acting as a server. It does not need the
# Arvan_Token env var: acme.sh already saved that token into its own account
# config the first time get-ssl-cert.sh ran successfully.

$ErrorActionPreference = "Stop"

$taskName = "GMS-SSL-Cert-Renewal"
$scriptPath = Join-Path $PSScriptRoot "renew-ssl-certs.ps1"

if (-not (Test-Path $scriptPath)) {
    throw "renew-ssl-certs.ps1 not found next to this script at $scriptPath"
}

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

$trigger = New-ScheduledTaskTrigger -Daily -At "03:30AM"

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 15)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Force `
    -Description "Renews Let's Encrypt certs issued via scripts/get-ssl-cert.sh (ArvanCloud DNS-01) and reloads nginx when one renews."

Write-Output "Registered scheduled task '$taskName' - runs daily at 03:30."
Write-Output "Test it immediately with: Start-ScheduledTask -TaskName '$taskName'"
Write-Output "Then check logs under C:\acme.sh\renew-logs\"
