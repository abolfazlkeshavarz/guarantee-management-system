# Starting the stack automatically after a reboot

## Why it is unreliable today

Three findings from this machine explain the "sometimes it works, sometimes I
have to start it myself" behaviour:

1. **Docker Desktop is installed per user**, at
   `C:\Users\Turbo\AppData\Local\Programs\DockerDesktop\`, not the machine-wide
   `C:\Program Files\Docker\Docker\`. A per-user install registers **no Windows
   service** — `Get-Service *docker*` returns nothing. The engine therefore
   lives inside a logged-in desktop session and cannot exist before someone
   signs in.

2. **The only autostart is a Run-key entry** under
   `HKCU\...\CurrentVersion\Run`. Run keys fire at logon, at the same moment as
   everything else that wants to start, with no ordering and no retry.

3. **The containers themselves are already correct.** `postgres`, `backend` and
   `frontend` all carry `restart: unless-stopped`, so once the engine is up they
   come back on their own. Nothing needs changing there.

So the failure is not the containers and not Compose. It is that the engine is
sometimes not ready — or not running at all — at the moment something asks for
it.

## The fix: a scheduled task at logon

`scripts/start-stack.ps1` removes the race. It starts Docker Desktop if it is
not running, polls `docker info` until the daemon genuinely answers (up to five
minutes), and only then runs `docker compose up -d`. It is safe to run
repeatedly — containers already healthy are left alone, and it never touches a
volume. Output goes to `logs/start-stack.log`.

Register it in an **elevated PowerShell**, once:

```powershell
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "D:\Abolfazl Keshavarz\guarantee-management-system\scripts\start-stack.ps1"'
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:COMPUTERNAME\Turbo"
$trigger.Delay = "PT30S"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 2) -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName "Evinki stack" -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Description "Waits for the Docker engine, then brings the Evinki stack up."
```

What each part buys you:

- `-AtLogOn` with a 30-second delay lets the session settle before Docker is asked for anything.
- `-RestartCount 3` retries if Docker is unusually slow to come up.
- `-StartWhenAvailable` runs the task if the machine was asleep at the scheduled moment.
- `-ExecutionTimeLimit` stops a hung run from lingering forever.

Test it without rebooting:

```powershell
Start-ScheduledTask -TaskName "Evinki stack"; Get-Content "D:\Abolfazl Keshavarz\guarantee-management-system\logs\start-stack.log" -Tail 20
```

Once this works you can remove the old Run-key entry, so Docker Desktop is
started by one thing rather than two:

```powershell
Remove-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" -Name "Docker Desktop"
```

To undo the whole thing:

```powershell
Unregister-ScheduledTask -TaskName "Evinki stack" -Confirm:$false
```

## The limitation you should know about

**This still requires someone to log in.** A logon task cannot run before a
logon. If the machine reboots at 3am and nobody signs in, `gms.evinki.com` stays
down until somebody does.

That is not a flaw in the task — it is what a per-user Docker Desktop install
means. Docker Desktop is a desktop application; the engine is part of a user
session by design.

Two ways to get genuinely unattended boot, in increasing order of effort and
robustness:

### Option A — enable automatic logon

Windows signs the account in by itself at boot, the logon task fires, and the
stack comes up. Simple, and it keeps everything else as it is.

The cost is real: the account's password is stored in the registry
(`DefaultPassword` under `Winlogon`) in a form that is recoverable by anyone
with administrator access or physical access to the disk. On a machine that now
serves a public website, weigh that before choosing it. Pair it with a locked
screen at startup (`Ctrl+Alt+Del` policy or a screensaver lock) so the desktop
is not left open.

### Option B — run Docker Engine inside WSL2 instead of Docker Desktop

You already have an `Ubuntu-26.04` WSL distro. Installing `docker-ce` inside it
gives you an engine that is not tied to a desktop session, started by a task
that runs **as SYSTEM at boot** rather than at logon:

```powershell
# trigger: -AtStartup, principal: SYSTEM
wsl.exe -d Ubuntu-26.04 -u root -e sh -c "service docker start && cd /mnt/d/... && docker compose up -d"
```

This is the arrangement to choose if the machine is meant to behave like a
server. It is more setup — installing the engine in WSL, moving or bind-mounting
the project, and re-pointing your Windows `docker` CLI or running Compose inside
WSL — and it should be done deliberately rather than in a hurry, because the
existing volumes live in Docker Desktop's own WSL distro and would need to be
migrated.

## Recommendation

Register the scheduled task now — it fixes the race, which is the cause of the
intermittent behaviour you are seeing, and costs nothing.

Then decide separately whether the machine needs to survive an unattended
reboot. If it does, Option B is the honest answer for a box serving a public
site; Option A is the quick one, with a password-at-rest trade-off you should
make consciously.
