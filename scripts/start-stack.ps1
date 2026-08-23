<#
    Brings the Evinki stack up after a reboot.

    Docker Desktop on this machine is a per-user install, so there is no
    Windows service behind it: the engine lives inside the logged-in session
    and nothing exists until someone signs in. The Run-key entry that starts it
    also fires at the same moment as everything else at logon, which is why the
    stack comes up sometimes and not others -- `docker compose` is asked for an
    engine that has not finished booting and simply fails.

    This script removes the race. It starts Docker Desktop if it is not already
    running, waits until the engine actually answers, and only then brings the
    stack up. It is safe to run repeatedly: containers already running are left
    alone, and nothing here ever removes a volume.

    Run it from Task Scheduler at logon (see docs/AUTOSTART.md).
#>

[CmdletBinding()]
param(
    # How long to wait for the engine before giving up, in seconds.
    [int]$TimeoutSeconds = 300
)

$ErrorActionPreference = 'Stop'

$ProjectDir  = Split-Path -Parent $PSScriptRoot
$DockerHome  = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop'
$DockerExe   = Join-Path $DockerHome 'resources\bin\docker.exe'
$DesktopExe  = Join-Path $DockerHome 'Docker Desktop.exe'
$LogFile     = Join-Path $ProjectDir 'logs\start-stack.log'

New-Item -ItemType Directory -Force -Path (Split-Path $LogFile) | Out-Null

function Write-Log {
    param([string]$Message)
    $line = "{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
    Write-Output $line
    Add-Content -Path $LogFile -Value $line -Encoding utf8
}

Write-Log "=== start-stack ==="

if (-not (Test-Path $DockerExe)) {
    Write-Log "ERROR: docker CLI not found at $DockerExe"
    exit 1
}

# 1. Make sure Docker Desktop is running. Starting it when it is already up is
#    harmless -- it focuses the existing instance rather than launching a second.
$running = Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue
if (-not $running) {
    if (-not (Test-Path $DesktopExe)) {
        Write-Log "ERROR: Docker Desktop not found at $DesktopExe"
        exit 1
    }
    Write-Log "Docker Desktop is not running; starting it"
    Start-Process -FilePath $DesktopExe | Out-Null
} else {
    Write-Log "Docker Desktop is already running"
}

# 2. Wait for the engine itself, not just the UI process. `docker info` is the
#    honest test: it only succeeds once the daemon can actually serve requests.
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$ready = $false
while ((Get-Date) -lt $deadline) {
    & $DockerExe info --format '{{.ServerVersion}}' *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 5
}

if (-not $ready) {
    Write-Log "ERROR: engine did not become ready within $TimeoutSeconds seconds"
    exit 1
}

$version = & $DockerExe info --format '{{.ServerVersion}}'
Write-Log "engine ready (server $version)"

# 3. Bring the stack up. Compose is declarative, so this reconciles whatever is
#    already running rather than restarting healthy containers.
#
#    Compose reports progress on stderr. Windows PowerShell turns a native
#    command's stderr into error records once it is redirected, so an ordinary
#    "Container gms-backend Running" line would surface as a failure and stop
#    the script. The stream is left alone; the exit code is what gets checked.
Set-Location $ProjectDir
$ErrorActionPreference = 'Continue'

& $DockerExe compose up -d
$composeExit = $LASTEXITCODE

if ($composeExit -ne 0) {
    Write-Log "ERROR: compose up failed with exit code $composeExit"
    exit $composeExit
}

# `compose ps` writes to stdout, so this is safe to capture and log.
foreach ($line in (& $DockerExe compose ps --format '{{.Name}} {{.Status}}')) {
    Write-Log $line
}
Write-Log "=== done ==="
