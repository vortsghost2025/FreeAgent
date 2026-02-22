// ResourceSystem.js — The cosmic flow of resources
let zonesData = null;
async function loadResourceSystemData() {
    if (!zonesData) {
        const resp = await fetch('./data/zones.json');
        zonesData = await resp.json();
    }
}
import { ParallelFXEngine } from './parallelFXEngine.js';

async function getZoneModifiers(gs) {
    await loadResourceSystemData();
    const zone = (gs.currentZone || 'Federation Core');
    const z = zonesData.find(z => z.name === zone);
    return (z && z.modifiers) ? z.modifiers : { energyRegen: 1.0, shardRate: 1.0 };
}

    async update(gameState) {
        const mods = await getZoneModifiers(gameState);
        // Passive energy regeneration (max 100)
        const baseRegen = gameState.player.energyRegen || 2;
        const regen = baseRegen * (mods.energyRegen || 1.0);
        if (typeof gameState.player.energy === 'number') {
            const before = gameState.player.energy;
            gameState.player.energy = Math.min(gameState.player.energy + regen, 100);
            if (gameState.player.energy > before) {
                ParallelFXEngine.applyResourceFX('energy', 'gain');
            }
            if (gameState.player.energy === 100 && before < 100) {
                ParallelFXEngine.applyResourceFX('energy', 'max');
            }
            if (gameState.player.energy < 20 && before >= 20) {
                ParallelFXEngine.applyResourceFX('energy', 'low');
            }
        }
        // Passive shard generation
        if (!('shards' in gameState.player)) {
            gameState.player.shards = 0;
        }
        const baseShardRate = gameState.player.shardRate || 1;
        const shardChance = 0.2 * (mods.shardRate || 1.0);
        if (Math.random() < shardChance) {
            const before = gameState.player.shards;
            gameState.player.shards += baseShardRate;
            ParallelFXEngine.applyResourceFX('shards', 'gain');
            if (gameState.player.shards >= 100 && before < 100) {
                ParallelFXEngine.applyResourceFX('shards', 'max');
            }
            if (gameState.world && gameState.world.events) {
                gameState.world.events.push('A cosmic shard materializes!');
            }
        }
        // Tick-based logic: can add more here (timed effects, bonuses)
    }
};
