param(
  [switch] $Remove
)

$pattern = 'ghp_[A-Za-z0-9_]+'

Write-Output "Searching workspace for pattern: $pattern"
$matches = Select-String -Path * -Pattern $pattern -Recurse -ErrorAction SilentlyContinue
if (-not $matches) {
  Write-Output "No matches found."
  exit 0
}

$grouped = $matches | Group-Object -Property Path
foreach ($g in $grouped) {
  Write-Output "\nFile: $($g.Name)"
  foreach ($m in $g.Group) {
    Write-Output "  Line $($m.LineNumber): $($m.Line.Trim())"
  }
}

if (-not $Remove) {
  Write-Output "\nRun with -Remove to backup and sanitize matching files (replaces matches with <REDACTED>)."
  exit 0
}

foreach ($g in $grouped) {
  $path = $g.Name
  $bak = "$path.bak"
  Copy-Item -LiteralPath $path -Destination $bak -Force
  (Get-Content -LiteralPath $path) -replace $pattern, '<REDACTED>' | Set-Content -LiteralPath $path
  Write-Output "Sanitized $path (backup: $bak)"
}

Write-Output "Done. Review changes and commit if correct."
