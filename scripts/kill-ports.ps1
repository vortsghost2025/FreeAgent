# Kill existing processes on common ports
# Used before starting FreeAgent swarm

$ErrorActionPreference = 'Continue'

Write-Host 'Cleaning up existing processes...' -ForegroundColor Yellow

# Ports used by FreeAgent
$ports = @(3000, 3001, 3002, 1234, 6379, 8080, 8081, 5000)

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    
    if ($connections) {
        foreach ($conn in $connections) {
            $procId = $conn.OwningProcess
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            
            if ($proc) {
                Write-Host "  Stopping PID $procId on port $port" -ForegroundColor Gray
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

Write-Host 'Cleanup complete' -ForegroundColor Green
