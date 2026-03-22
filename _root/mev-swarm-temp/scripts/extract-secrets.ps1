$out = 'C:\Users\seand\OneDrive\workspace\_root\mev-swarm-temp\.local_secrets.env'
if (Test-Path $out) { Remove-Item $out -Force }
$seen = @{}
Get-ChildItem -Path 'C:\Users\seand\Documents' -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
  try {
    $results = Select-String -Path $_.FullName -Pattern 'PRIVATE_KEY|private_key|0x[a-fA-F0-9]{64}' -AllMatches -ErrorAction SilentlyContinue
    foreach ($r in $results) {
      foreach ($m in $r.Matches) {
        $v = $m.Value.Trim()
        if (-not $seen.ContainsKey($v)) {
          $seen[$v] = $true
          if ($v -match '^0x[a-fA-F0-9]{64}$') {
            Add-Content -Path $out -Value ("PRIVATE_KEY=$v")
          } else {
            Add-Content -Path $out -Value $v
          }
        }
      }
    }
  } catch {
    # ignore unreadable files
  }
}
if (Test-Path $out) { Write-Output "WROTE:$out" } else { Write-Output "NO_MATCHES" }
