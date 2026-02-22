import { PlayerActions } from './PlayerActions.js';
import { UISystem } from './UISystem.js';
import { ResourceSystem } from './ResourceSystem.js';
import { EventSystem } from './EventSystem.js';
import { ZoneSystem } from './ZoneSystem.js';
import { ProgressionSystem } from './ProgressionSystem.js';
import { AgentSystem } from './AgentSystem.js';
import { PersistenceSystem } from './PersistenceSystem.js';

let gameState = PersistenceSystem.load();

function gameLoop() {
    gameState.world.tick++;
    ResourceSystem.update(gameState);
    EventSystem.update(gameState);
    ZoneSystem.update(gameState);
    ProgressionSystem.update(gameState);
    AgentSystem.update(gameState);
    UISystem.update(gameState);

    // Autosave every 30 ticks
    if (gameState.world.tick % 30 === 0) {
        PersistenceSystem.save(gameState);
    }

    setTimeout(gameLoop, 2000); // 2 seconds per tick
}

function gameAction(action) {
    if (action === "explore") {
        PlayerActions.explore(gameState);
    } else if (action === "rest") {
        PlayerActions.rest(gameState);
    } else if (action === "unlockLore") {
        PlayerActions.unlockLore(gameState);
    }
}

function saveGame() {
    PersistenceSystem.save(gameState);
    UISystem.update(gameState);
}

function loadGame() {
    gameState = PersistenceSystem.load();
    UISystem.update(gameState);
}

// ⭐ MAKE ALL THREE FUNCTIONS GLOBAL ⭐
window.gameAction = gameAction;
window.saveGame = saveGame;
window.loadGame = loadGame;

// Start game loop
UISystem.update(gameState);
gameLoop();