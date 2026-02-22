// GameState.js — The Ledger Titan
export let gameState = {
    player: {
        name: 'Player',
        energy: 100,
        shards: 0,
        progress: 0
    },
    agents: [],
    zones: [],
    events: [],
    upgrades: [],
    log: [],
    tick: 0, // Tick counter
    version: 1
};

export function loadGame() {
    try {
        const data = localStorage.getItem('federationGameSave');
        if (data) {
            gameState = JSON.parse(data);
        }
    } catch (e) {
        console.warn('Failed to load game:', e);
    }
}

export function saveGame() {
    try {
        localStorage.setItem('federationGameSave', JSON.stringify(gameState));
    } catch (e) {
        console.warn('Failed to save game:', e);
    }
}
