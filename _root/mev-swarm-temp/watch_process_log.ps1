$log = 'C:\Users\seand\OneDrive\workspace\_root\mev-swarm-temp\process_trace.log'
$summary = 'C:\Users\seand\OneDrive\workspace\_root\mev-swarm-temp\process_matches.log'
if (-not (Test-Path $summary)) { New-Item -Path $summary -ItemType File -Force | Out-Null }
$seen = @{}
$buffer = ''
Get-Content -Path $log -Wait -Tail 0 | ForEach-Object {
  $buffer += $_ + "`n"
  if ($_ -eq '---') {
    $block = $buffer.Trim()
    $buffer = ''
    if ($block -match 'PID:(\d+)') { $procId = $matches[1] } else { $procId = 'unknown' }
    if ($block -match 'CMD:(.*)') { $cmd = $matches[1].Trim() } else { $cmd = '' }
    if ([string]::IsNullOrWhiteSpace($cmd)) { continue }
    if ($seen.ContainsKey($cmd)) { continue }
    $seen[$cmd] = $true
    $ts = (Get-Date).ToString('o')
    $line = "{0} FOUND PID:{1} CMD:{2}" -f $ts, $procId, $cmd
    $line | Out-File -Append -FilePath $summary -Encoding utf8
    $matches = [regex]::Matches($cmd, '([\\/\\w\\-.]+\\.js)')
    if ($matches.Count -gt 0) {
      foreach ($m in $matches) {
        $script = [System.IO.Path]::GetFileName($m.Value)
        try {
          $results = Select-String -Path 'C:\\Users\\seand\\OneDrive\\workspace\\_root\\mev-swarm-temp\\**\\*' -Pattern $script -SimpleMatch -List -ErrorAction SilentlyContinue
          if ($results) {
            "{0} MATCH {1} -> {2}:{3}" -f $ts, $script, $results.Path, $results.LineNumber | Out-File -Append -FilePath $summary -Encoding utf8
          } else {
            "{0} NO_MATCH {1}" -f $ts, $script | Out-File -Append -FilePath $summary -Encoding utf8
          }
        } catch {
          $err = $_.ToString()
          "{0} ERROR searching for {1}: {2}" -f $ts, $script, $err | Out-File -Append -FilePath $summary -Encoding utf8
        }
      }
    } else {
      $tokens = $cmd -split '\\s+'
      $limit = [math]::Min(4,$tokens.Length-1)
      for ($i=0;$i -le $limit;$i++) {
        $t = $tokens[$i]
        if ($t.Length -lt 3) { continue }
        try {
          $results = Select-String -Path 'C:\\Users\\seand\\OneDrive\\workspace\\_root\\mev-swarm-temp\\**\\*' -Pattern $t -SimpleMatch -List -ErrorAction SilentlyContinue
          if ($results) {
            "{0} PARTIAL_MATCH {1} -> {2}:{3}" -f $ts, $t, $results.Path, $results.LineNumber | Out-File -Append -FilePath $summary -Encoding utf8
            break
          }
        } catch {}
      }
    }
  }
}