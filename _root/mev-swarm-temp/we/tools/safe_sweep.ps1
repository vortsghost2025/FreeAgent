Write-Output "Starting safe system sweep (preserving VS Code and PowerShell)..."

# Shutdown WSL
try { wsl --shutdown } catch {}

# Stop Docker service (may require elevation)
try { Stop-Service -Name com.docker.service -ErrorAction SilentlyContinue } catch {}
Start-Sleep -Seconds 2

# Kill common high-memory apps but exclude VS Code and PowerShell
$killNames = @('chrome','msedge','firefox','opera','brave','node','python','java','vmmem','dockerd','docker')
$exclude = @('Code','pwsh','powershell','pwsh-preview')
$toKill = Get-Process | Where-Object { $killNames -contains $_.Name -and ($exclude -notcontains $_.Name) } | Select-Object -ExpandProperty Name -Unique
if ($toKill) { Stop-Process -Name $toKill -Force -ErrorAction SilentlyContinue }

# Run Sysinternals EmptyStandbyList if available
$esl = Join-Path $env:ProgramFiles 'Sysinternals\EmptyStandbyList.exe'
if (Test-Path $esl) { & $esl workingset 2>$null }

# Show top 10 memory consumers
Get-Process | Sort-Object -Descending WS | Select-Object -First 10 Name,Id,@{Name='WS(MB)';Expression={[math]::round($_.WS/1MB,2)}} | Format-Table -AutoSize

Write-Output "Sweep complete"
