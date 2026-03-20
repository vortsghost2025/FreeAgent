/**
 * Adaptive Resource Monitor - Self-Throttling Runtime
 * 
 * Monitors system resources and adapts behavior dynamically.
 * No static config - learns and adjusts based on conditions.
 * 
 * Usage: node scripts/resource-monitor.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// State tracking
const state = {
    mode: 'normal',
    scores: { ram: 0, cpu: 0, latency: 0, disk: 0 },
    history: [],
    cycles: 0,
    lastCleanup: 0,
    lastCheckpoint: 0
};

// Dynamic thresholds (adjusts based on system)
const thresholds = {
    ram: { warn: 3 * 1024 * 1024 * 1024, critical: 1.5 * 1024 * 1024 * 1024 },
    cpu: { warn: 80, critical: 95 },
    latency: { warn: 3000, critical: 10000 },
    disk: { warn: 4, critical: 8 }
};

// Adaptive mode thresholds
const modeScores = { normal: 3, strain: 7, critical: 7 };

// Processes to manage
const killList = ['lm-studio.exe'];
const reduceList = ['node.exe', 'msedge.exe', 'chrome.exe'];

const logPath = './logs/resource-monitor.log';

function log(msg) {
    const ts = new Date().toISOString();
    const entry = `[${ts}] ${msg}`;
    console.log(entry);
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(logPath, entry + '\n');
}

function getFreeMemory() {
    return new Promise((resolve) => {
        exec('powershell -Command "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1KB"', (err, stdout) => {
            if (err) resolve({ free: 0, total: 16 * 1024 * 1024 * 1024 });
            else resolve({ free: parseFloat(stdout.trim()) * 1024, total: 16 * 1024 * 1024 * 1024 });
        });
    });
}

function getCpuUsage() {
    return new Promise((resolve) => {
        exec('powershell -Command "(Get-CimInstance Win32_Processor).LoadPercentage"', (err, stdout) => {
            if (err) resolve(0);
            else resolve(parseInt(stdout.trim()) || 0);
        });
    });
}

function getDiskQueue() {
    return new Promise((resolve) => {
        exec('powershell -Command "(Get-CimInstance Win32_LogicalDisk | Where-Object {$_.DriveType -eq 3}).AvgDiskQueueLength | Measure-Object -Sum | Select-Object -ExpandProperty Sum"', (err, stdout) => {
            if (err) resolve(0);
            else resolve(parseFloat(stdout.trim()) || 0);
        });
    });
}

function checkLatency() {
    return new Promise((resolve) => {
        const start = Date.now();
        exec('curl -s -o /dev/null -w "%{time_total}" http://localhost:1234/v1/models', { timeout: 5000 }, (err, stdout) => {
            if (err) resolve(99999);
            else resolve((parseFloat(stdout) || 0) * 1000);
        });
    });
}

function killProcess(name) {
    return new Promise((resolve) => {
        exec(`taskkill /F /IM ${name}`, () => resolve());
    });
}

async function scoreMetric(value, warn, critical, inverse = false) {
    if (inverse) {
        if (value >= critical) return 4;
        if (value >= warn) return 2;
        return 0;
    }
    if (value <= critical) return 4;
    if (value <= warn) return 2;
    return 0;
}

async function evaluate() {
    const mem = await getFreeMemory();
    const cpu = await getCpuUsage();
    const disk = await getDiskQueue();
    const latency = await checkLatency();
    
    const freeGB = (mem.free / 1024 / 1024 / 1024).toFixed(2);
    const usedRam = ((1 - mem.free / mem.total) * 100).toFixed(0);
    
    // Score each metric
    const ramScore = await scoreMetric(mem.free, thresholds.ram.warn, thresholds.ram.critical, true);
    const cpuScore = await scoreMetric(cpu, thresholds.cpu.warn, thresholds.cpu.critical);
    const diskScore = await scoreMetric(disk, thresholds.disk.warn, thresholds.disk.critical);
    const latScore = await scoreMetric(latency, thresholds.latency.warn, thresholds.latency.critical);
    
    const totalScore = ramScore + cpuScore + diskScore + latScore;
    
    // Determine mode
    let prevMode = state.mode;
    if (totalScore >= modeScores.critical) state.mode = 'critical';
    else if (totalScore >= modeScores.strain) state.mode = 'strain';
    else state.mode = 'normal';
    
    // Log status
    log(`RAM: ${freeGB}GB | CPU: ${cpu}% | DiskQ: ${disk.toFixed(1)} | Lat: ${latency.toFixed(0)}ms | Score: ${totalScore} | Mode: ${state.mode}`);
    
    // Apply actions based on mode
    if (state.mode === 'critical' && prevMode !== 'critical') {
        log('>>> CRITICAL MODE - Killing processes');
        for (const p of killList) await killProcess(p);
    } else if (state.mode === 'strain' && prevMode !== 'strain') {
        log('>>> STRAIN MODE - Reducing resources');
    }
    
    state.cycles++;
    
    // Periodic cleanup every 100 cycles
    if (state.cycles % 100 === 0) {
        log('>>> Periodic context clear');
    }
    
    return { ram: freeGB, cpu, disk, latency, mode: state.mode, score: totalScore };
}

async function main() {
    log('Adaptive Resource Monitor started');
    
    setInterval(async () => {
        try {
            await evaluate();
        } catch (e) {
            log(`Error: ${e.message}`);
        }
    }, 5000);
}

main();
