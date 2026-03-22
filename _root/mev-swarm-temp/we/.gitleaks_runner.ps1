try {
    # Prefer direct download of the Windows release to avoid package-manager differences.
    Write-Output "Downloading latest gitleaks release from GitHub..."
    $rel = Invoke-RestMethod -UseBasicParsing 'https://api.github.com/repos/zricethezav/gitleaks/releases/latest'
    $asset = $rel.assets | Where-Object { $_.name -match 'windows' -and $_.name -match 'amd64|x86_64|64' } | Select-Object -First 1
    if (-not $asset) { $asset = $rel.assets | Where-Object { $_.name -match 'windows' } | Select-Object -First 1 }
    if (-not $asset) { Write-Error "No windows asset found in latest release"; exit 2 }
    $url = $asset.browser_download_url
    $out = '.gitleaks.zip'
    Invoke-WebRequest -Uri $url -OutFile $out
    Expand-Archive -Path $out -DestinationPath '.gitleaks' -Force
    $exe = Get-ChildItem -Path '.gitleaks' -Filter 'gitleaks.exe' -Recurse | Select-Object -First 1
    if (-not $exe) { Write-Error 'gitleaks.exe not found after extraction'; exit 3 }
    Write-Output "Running $($exe.FullName) detect..."
    & $exe.FullName detect --source . --report-path .gitleaks-report.json
    exit $LASTEXITCODE
} catch {
    Write-Error $_.Exception.Message
    exit 10
}