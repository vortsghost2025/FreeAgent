import { UISystem } from './UISystem.js';

export const PlayerActions = {
    explore(gameState) {
        gameState.player.energy -= 10;
        gameState.world.events.push("You explore the universe.");
        UISystem.update(gameState);
    },

    rest(gameState) {
        gameState.player.energy += 5;
        gameState.world.events.push("You rest and recover energy.");
        UISystem.update(gameState);
    },

    unlockLore(gameState) {
        if (!gameState.player.loreUnlocked.includes("creature-codex")) {
            gameState.player.loreUnlocked.push("creature-codex");
            gameState.world.events.push("Lore unlocked: Creature Codex!");
        } else {
            gameState.world.events.push("You have already unlocked this lore.");
        }
        UISystem.update(gameState);
    },

    save(gameState) {
        localStorage.setItem("federationGameState", JSON.stringify(gameState));
        gameState.world.events.push("Game saved!");
        UISystem.update(gameState);
    },

    load(gameState) {
        const saved = localStorage.getItem("federationGameState");
        if (saved) {
            const loaded = JSON.parse(saved);
            Object.assign(gameState, loaded);
            gameState.world.events.push("Game loaded!");
        } else {
            gameState.world.events.push("No saved game found.");
        }
        UISystem.update(gameState);
    },

    setZone(gameState, zoneName) {
        import('./ZoneSystem.js').then(({ ZoneSystem }) => {
            ZoneSystem.setZone(gameState, zoneName);
            UISystem.update(gameState);
        });
    }
};