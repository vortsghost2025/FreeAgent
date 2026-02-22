$content = Get-Content .env.local -Raw
if ($content -match 'GITHUB_TOKEN=(.+)') {
  $tok = $matches[1].Trim()
} else {
  Write-Error 'Token not found in .env.local'
  exit 2
}

$env:GITHUB_TOKEN = $tok
Write-Output ("Token length: {0}" -f $tok.Length)

& .\.venv-py312\Scripts\python.exe .\tools\update_pr_body.py
