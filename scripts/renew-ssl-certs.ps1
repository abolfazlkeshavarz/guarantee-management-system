# Runs acme.sh's renewal check for every certificate it manages (not just
# gms.evinki.com - any future domain issued via get-ssl-cert.sh is covered
# too). acme.sh only actually renews a cert once it's within 30 days of
# expiry, so running this daily is cheap and safe.
#
# Meant to be called by a Windows Scheduled Task (see
# register-ssl-renewal-task.ps1), not run interactively - use get-ssl-cert.sh
# directly for that.

$ErrorActionPreference = "Stop"

$bash = "C:\Program Files\Git\usr\bin\bash.exe"
$acmeHome = "C:/acme.sh"
$logDir = "C:/acme.sh/renew-logs"
$logFile = Join-Path $logDir ("renew-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))

New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$cronCmd = "'$acmeHome/acme.sh' --cron --home '$acmeHome' --config-home '$acmeHome/data'"
& $bash -lc $cronCmd *>&1 | Tee-Object -FilePath $logFile

# Keep only the last 30 log files so this doesn't grow forever.
Get-ChildItem $logDir -Filter "renew-*.log" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 30 |
    Remove-Item -Force
