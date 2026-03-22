// autonomous-lore-logger.js
import fs from 'fs';

class AutonomousLoreLogger {
    constructor(filename = 'lore-saga.log') {
        this.filename = filename;
    }

    logSagaEntry(entry) {
        const line = `[${new Date().toISOString()}] ${entry}\n`;
        fs.appendFileSync(this.filename, line);
    }

    logAgentAction(agent, action, details = '') {
        const entry = `Agent ${agent} performed: ${action}${details ? ' — ' + details : ''}`;
        this.logSagaEntry(entry);
    }

    logCycle(cycleNumber, summary) {
        const entry = `Cycle ${cycleNumber}: ${summary}`;
        this.logSagaEntry(entry);
    }

    logLore(lore) {
        this.logSagaEntry(`LORE: ${lore}`);
    }
}

export { AutonomousLoreLogger };