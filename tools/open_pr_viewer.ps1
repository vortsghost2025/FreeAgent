param(
  [string] $NotesPath = "PR_UPDATE_NOTES.md",
  [int] $FontSize = 32
)

# Locate notes file
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$workspaceRoot = Resolve-Path "$scriptDir\.." | Select-Object -ExpandProperty Path
$notesFull = Join-Path $workspaceRoot $NotesPath

if (-not (Test-Path $notesFull)) {
  Write-Error "Notes file not found: $notesFull"
  exit 2
}

# Read and HTML-escape the content
$raw = Get-Content -Raw -LiteralPath $notesFull
function Escape-HTML($s) {
  $s = $s -replace '&','&amp;'
  $s = $s -replace '<','&lt;'
  $s = $s -replace '>','&gt;'
  return $s
}
$escaped = Escape-HTML $raw

# Load template and inject
$templatePath = Join-Path $scriptDir 'pr_viewer_template.html'
if (-not (Test-Path $templatePath)) {
  Write-Error "Template missing: $templatePath"
  exit 3
}
$template = Get-Content -Raw -LiteralPath $templatePath
# Inject content and adjust font-size in the template
$out = $template -replace '<!-- PR_CONTENT_PLACEHOLDER -->', $escaped
$out = $out -replace 'font-size:22px', "font-size:${FontSize}px"

# Write to temp file and open in default browser
$outPath = Join-Path ([IO.Path]::GetTempPath()) "pr_viewer_$(Get-Random).html"
Set-Content -LiteralPath $outPath -Value $out -Encoding UTF8

Start-Process $outPath
Write-Output "Opened viewer: $outPath"
