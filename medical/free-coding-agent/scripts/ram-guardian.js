/**
 * RAM Guardian - Self-Throttling Resource Manager
 * 
 * Monitors system resources and automatically throttles/kills processes
 * to prevent crashes on constrained hardware (16GB RAM).
 * 
 * Usage: node scripts/ram-guardian.js
 * 
 * Thresholds:
 * - WARN: < 3GB free RAM
 * - CRITICAL: < 1.5GB free RAM
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    thresholds: {
        warn: 3 * 1024 * 1024 * 1024, // 3GB
        critical: 1.5 * 1024 * 1024 * 1024 // 1.5GB
    },
    intervals: {
        check: 5000, // 5 seconds
        cleanup: 60000, // 60 seconds
        checkpoint: 300000 // 5 minutes
    },
    killList: [
        'lm-studio.exe',
        'node.exe'
    ],
    mode: 'normal', // normal, strain, survival
    logPath: './logs/ram-guardian.log'
};

// Ensure log directory exists
const logDir = path.dirname(CONFIG.logPath);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

function log(level, message) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(CONFIG.logPath, entry);
    console.log(entry.trim());
}

function getFreeMemory() {
    return new Promise((resolve, reject) => {
        exec('wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /Value', (err, stdout) => {
            if (err) {
                // Fallback for PowerShell
                exec('powershell -Command "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1KB"', (err2, stdout2) => {
                    if (err2) resolve({ free: 0, total: 16 * 1024 * 1024 * 1024 });
                    else {
                        const freeKB = parseFloat(stdout2.trim());
                        resolve({ free: freeKB * 1024, total: 16 * 1024 * 1024 * 1024 });
                    }
                });
                return;
            }
            
            const lines = stdout.split('\n');
            let free = 0, total = 0;
            
            for (const line of lines) {
                if (line.startsWith('FreePhysicalMemory=')) {
                    free = parseInt(line.split('=')[1]) * 1024;
                } else if (line.startsWith('TotalVisibleMemorySize=')) {
                    total = parseInt(line.split('=')[1]) * 1024;
                }
            }
            
            resolve({ free, total });
        });
    });
}

function getProcessList() {
    return new Promise((resolve) => {
        exec('powershell -Command "Get-Process | Select-Object Name, Id, @{N=\'Memory(MB)\';E={[math]::Round($_.WorkingSet64/1MB,2)}} | ConvertTo-Json"', (err, stdout) => {
            if (err) resolve([]);
            else {
                try {
                    const parsed = JSON.parse(stdout);
                    resolve(Array.isArray(parsed) ? parsed : [parsed]);
                } catch {
                    resolve([]);
                }
            }
        });
    });
}

async function killProcess(name) {
    return new Promise((resolve) => {
        exec(`taskkill /F /IM ${name}`, (err) => {
            if (err) {
                log('warn', `Failed to kill ${name}: ${err.message}`);
                resolve(false);
            } else {
                log('info', `Killed process: ${name}`);
                resolve(true);
            }
        });
    });
}

async function cleanupNonEssential() {
    log('info', 'Running cleanup: closing non-essential processes...');
    
    const processes = await getProcessList();
    
    // Find high-memory non-essential processes
    const targets = processes
        .filter(p => p['Memory(MB)'] > 500)
        .filter(p => !['Code', 'explorer', 'System', 'Registry'].includes(p.Name))
        .sort((a, b) => b['Memory(MB)'] - a['Memory(MB)'])
        .slice(0, 3);
    
    for (const proc of targets) {
        log('info', `Killing non-essential: ${proc.Name} (${proc['Memory(MB)']} MB)`);
        await killProcess(proc.Name + '.exe');
    }
}

async function survivalMode() {
    log('WARN', 'SURVIVAL MODE ACTIVATED');
    CONFIG.mode = 'survival';
    
    // Aggressive cleanup
    for (const procName of CONFIG.killList) {
        await killProcess(procName);
    }
    
    // Kill high-memory processes
    await cleanupNonEssential();
}

async function strainMode() {
    log('WARN', 'STRAIN MODE ACTIVATED');
    CONFIG.mode = 'strain';
    
    // Light cleanup
    await cleanupNonEssential();
}

let cycleCount = 0;

async function main() {
    log('info', 'RAM Guardian started');
    log('info', `Thresholds - WARN: ${(CONFIG.thresholds.warn / 1024 / 1024 / 1024).toFixed(1)}GB, CRITICAL: ${(CONFIG.thresholds.critical / 1024 / 1024 / 1024).toFixed(1)}GB`);
    
    setInterval(async () => {
        const mem = await getFreeMemory();
        const freeGB = (mem.free / 1024 / 1024 / 1024).toFixed(2);
        const totalGB = (mem.total / 1024 / 1024 / 1024).toFixed(1);
        const usedPercent = ((1 - mem.free / mem.total) * 100).toFixed(0);
        
        // Update mode based on memory
        const prevMode = CONFIG.mode;
        
        if (mem.free < CONFIG.thresholds.critical) {
            CONFIG.mode = 'survival';
            if (prevMode !== 'survival') {
                await survivalMode();
            }
        } else if (mem.free < CONFIG.thresholds.warn) {
            CONFIG.mode = 'strain';
            if (prevMode !== 'strain') {
                await strainMode();
            }
        } else {
            CONFIG.mode = 'normal';
        }
        
        // Log status
        log('info', `Memory: ${freeGB}GB / ${totalGB}GB free (${usedPercent}% used) | Mode: ${CONFIG.mode}`);
        
        // Cycle counter for periodic cleanup
        cycleCount++;
        if (cycleCount % 10 === 0) {
            log('info', `Cycle ${cycleCount}: Periodic checkpoint`);
        }
        
    }, CONFIG.intervals.check);
}

main().catch(err => {
    log('error', `Fatal error: ${err.message}`);
    process.exit(1);
});
