// GameLoop.js — The Orchestrator
import { AgentSystem } from './AgentSystem.js';
import { EventSystem } from './EventSystem.js';
import { ZoneSystem } from './ZoneSystem.js';
import { ResourceSystem } from './ResourceSystem.js';
import { ParallelFXEngine } from './parallelFXEngine.js';
import { AnomalySystem } from './AnomalySystem.js';
import { PrestigeSystem } from './PrestigeSystem.js';
import { MetaProgressionSystem } from './MetaProgressionSystem.js';

async function gameLoop() {
    gameState.tick++;
    // Canonical system order (await async updates)
    await ZoneSystem.update(gameState);
    await AgentSystem.update(gameState);
    await ResourceSystem.update(gameState);
    await EventSystem.update(gameState);
    await AnomalySystem.update(gameState);
    // Milestone tick FX
    if (gameState.tick % 100 === 0) {
        ParallelFXEngine.applyTickMilestoneFX();
    }
    if (gameState.tick % 60 === 0) {
        console.log(`Tick: ${gameState.tick}`);
    }
    requestAnimationFrame(gameLoop);
}

async function initGame() {
    loadGame();
    await gameLoop();
}

window.addEventListener('DOMContentLoaded', initGame);
window.addEventListener('beforeunload', saveGame);
