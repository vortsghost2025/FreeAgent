// MEV Swarm Telemetry Dashboard
// Real-time monitoring during YOLO mode execution

import fs from 'fs';
import path from 'path';

class TelemetryMonitor {
    constructor() {
        this.startTime = Date.now();
        this.metrics = {
            opportunities: 0,
            approvals: 0,
            rejections: 0,
            websocketReconnects: 0,
            memoryUsage: [],
            gasPrices: [],
            executionTimes: []
        };
        
        this.logFile = path.join(process.cwd(), 'telemetry', 'session-log.json');
        this.ensureLogDirectory();
        this.startMonitoring();
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    startMonitoring() {
        // Memory usage tracking
        setInterval(() => {
            const memUsage = process.memoryUsage();
            this.metrics.memoryUsage.push({
                timestamp: Date.now(),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
            });
            
            // Keep only last 100 readings
            if (this.metrics.memoryUsage.length > 100) {
                this.metrics.memoryUsage.shift();
            }
        }, 30000); // Every 30 seconds

        // Periodic summary logging
        setInterval(() => {
            this.logSessionSummary();
        }, 300000); // Every 5 minutes
    }

    recordOpportunity(opportunity) {
        this.metrics.opportunities++;
        console.log(`📊 OPPORTUNITY #${this.metrics.opportunities}: ${opportunity.pool} | Δ: ${opportunity.delta.toFixed(4)}%`);
    }

    recordConsensus(result) {
        if (result.status === 'approved') {
            this.metrics.approvals++;
        } else {
            this.metrics.rejections++;
        }
        console.log(`⚖️  CONSENSUS: ${result.status.toUpperCase()} (${result.yesVotes}/${result.totalVotes})`);
    }

    recordReconnect() {
        this.metrics.websocketReconnects++;
        console.log(`🔌 WEBSOCKET RECONNECT #${this.metrics.websocketReconnects}`);
    }

    logSessionSummary() {
        const duration = Math.floor((Date.now() - this.startTime) / 1000 / 60); // minutes
        const avgMemory = this.metrics.memoryUsage.length > 0 ? 
            this.metrics.memoryUsage.reduce((sum, m) => sum + m.heapUsed, 0) / this.metrics.memoryUsage.length : 0;
        
        const summary = {
            timestamp: new Date().toISOString(),
            sessionDuration: `${duration} minutes`,
            opportunitiesDetected: this.metrics.opportunities,
            consensusApprovals: this.metrics.approvals,
            consensusRejections: this.metrics.rejections,
            websocketReconnects: this.metrics.websocketReconnects,
            averageMemoryMB: Math.round(avgMemory),
            opportunitiesPerMinute: (this.metrics.opportunities / duration).toFixed(2)
        };

        console.log('\n📈 TELEMETRY SUMMARY:');
        console.log(`⏱️  Duration: ${summary.sessionDuration}`);
        console.log(`📊 Opportunities: ${summary.opportunitiesDetected}`);
        console.log(`✅ Approvals: ${summary.consensusApprovals}`);
        console.log(`❌ Rejections: ${summary.consensusRejections}`);
        console.log(`🔌 Reconnects: ${summary.websocketReconnects}`);
        console.log(`💾 Avg Memory: ${summary.averageMemoryMB}MB`);
        console.log(`⚡ Rate: ${summary.opportunitiesPerMinute} ops/min\n`);

        // Save to log file
        fs.appendFileSync(this.logFile, JSON.stringify(summary, null, 2) + ',\n');
    }

    getSessionReport() {
        const duration = Math.floor((Date.now() - this.startTime) / 1000 / 60);
        return {
            sessionStarted: new Date(this.startTime).toISOString(),
            durationMinutes: duration,
            totalOpportunities: this.metrics.opportunities,
            approvalRate: this.metrics.opportunities > 0 ? 
                ((this.metrics.approvals / this.metrics.opportunities) * 100).toFixed(1) : '0.0',
            stabilityMetrics: {
                websocketReconnects: this.metrics.websocketReconnects,
                maxMemoryMB: Math.max(...this.metrics.memoryUsage.map(m => m.heapUsed), 0),
                avgMemoryMB: this.metrics.memoryUsage.length > 0 ? 
                    Math.round(this.metrics.memoryUsage.reduce((sum, m) => sum + m.heapUsed, 0) / this.metrics.memoryUsage.length) : 0
            }
        };
    }
}

// Export singleton instance
export const telemetry = new TelemetryMonitor();

// Graceful shutdown handler
process.on('SIGINT', () => {
    console.log('\n🛑 Telemetry session ending...');
    const finalReport = telemetry.getSessionReport();
    console.log('\n🏁 FINAL SESSION REPORT:');
    console.log(JSON.stringify(finalReport, null, 2));
    process.exit(0);
});