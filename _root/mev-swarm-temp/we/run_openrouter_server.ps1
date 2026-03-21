<#
Prompts for the OpenRouter API key securely (input hidden), sets it only for
the current session, and starts the real free-coding agent server.

This script does NOT write the key to disk. If you prefer a persistent
per-user key, create a file named ~/.openrouter_key and protect it with
file-system permissions (the server will read it if present).
#>

# Read secure string
$secure = Read-Host "Enter OpenRouter API key (input hidden)" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$key = [Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)

# Export for child process only
$env:OPENROUTER_API_KEY = $key
Write-Host "Starting server with provided OpenRouter key (not saved to disk)."

try {
    node .\we\free-coding-agent-server-real.js
} finally {
    # Remove the env var from this session after the process exits
    Remove-Item Env:OPENROUTER_API_KEY -ErrorAction SilentlyContinue
}