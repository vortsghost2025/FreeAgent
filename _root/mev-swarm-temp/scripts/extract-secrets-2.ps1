$out = 'C:\Users\seand\OneDrive\workspace\_root\mev-swarm-temp\.local_secrets.env'
if (Test-Path $out) { Remove-Item $out -Force }
$seen = @{}
$paths = @('C:\Users\seand\Documents','C:\Users\seand\Desktop','C:\Users\seand\Downloads','C:\Users\seand\OneDrive')
$exts = '*.txt','*.env','*.json','*.js','*.mjs','*.md','*.log','*.pem','*.key','*.csv','*.conf','*.ini','*.toml','*.yml','*.yaml','*.keystore','*.docx'

foreach ($p in $paths) {
  if (-not (Test-Path $p)) { continue }
  foreach ($ext in $exts) {
    Get-ChildItem -Path $p -Recurse -Include $ext -File -ErrorAction SilentlyContinue | ForEach-Object {
      try {
        $file = $_.FullName
        if ($file -match '\.docx$') {
          try {
            $zip = [System.IO.Compression.ZipFile]::OpenRead($file)
            $entry = $zip.Entries | Where-Object Name -eq 'word/document.xml'
            if ($entry) {
              $txt = (New-Object System.IO.StreamReader($entry.Open())).ReadToEnd()
              $matches = Select-String -InputObject $txt -Pattern 'PRIVATE_KEY|private_key|0x[a-fA-F0-9]{64}|mnemonic|seed phrase|seed=' -AllMatches -ErrorAction SilentlyContinue
              foreach ($m in $matches) { foreach ($mm in $m.Matches) { $v=$mm.Value.Trim(); if (-not $seen.ContainsKey($v)) { $seen[$v]=1; if ($v -match '^0x[a-fA-F0-9]{64}$') { Add-Content -Path $out -Value ("PRIVATE_KEY=$v") } else { Add-Content -Path $out -Value $v } } } }
            }
            $zip.Dispose()
          } catch { }
        } else {
          $content = Get-Content -Path $file -Raw -ErrorAction SilentlyContinue
          if ($null -eq $content) { continue }
          $patterns = @("PRIVATE_KEY","private_key","mnemonic","seed phrase","seed=","0x[a-fA-F0-9]{64}","m/44")
          foreach ($pat in $patterns) {
            $matches = Select-String -InputObject $content -Pattern $pat -AllMatches -ErrorAction SilentlyContinue
            foreach ($m in $matches) { foreach ($mm in $m.Matches) { $v=$mm.Value.Trim(); if (-not $seen.ContainsKey($v)) { $seen[$v]=1; if ($v -match '^0x[a-fA-F0-9]{64}$') { Add-Content -Path $out -Value ("PRIVATE_KEY=$v") } else { Add-Content -Path $out -Value $v } } } }
          }
        }
      } catch { }
    }
  }
  # Also look for keystore JSON files by name
  Get-ChildItem -Path $p -Recurse -Include 'UTC--*' -File -ErrorAction SilentlyContinue | ForEach-Object {
    try { Add-Content -Path $out -Value ("KEYSTORE_FILE=" + $_.FullName) } catch { }
  }
}

if (Test-Path $out) { Write-Output "WROTE:$out" } else { Write-Output "NO_MATCHES" }
