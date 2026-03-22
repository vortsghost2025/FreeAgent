// EventSystem.js — The universe reacting (ParallelFXEngine integrated)
import { ParallelFXEngine } from './parallelFXEngine.js';
let zonesData = null;
async function loadEventSystemData() {
    if (!zonesData) {
        const resp = await fetch('./data/zones.json');
        zonesData = await resp.json();
    }
}

// Data-driven event pool with rarity
const eventPool = [
    { type: 'flavor', text: 'A distant star flickers.', rarity: 'common' },
    { type: 'flavor', text: 'You sense a shift in the cosmic fabric.', rarity: 'common' },
    { type: 'flavor', text: 'A shadow passes across the Federation boundary.', rarity: 'uncommon' },
    { type: 'reward', text: 'You find a cosmic shard.', rarity: 'uncommon', effect: (gs) => { gs.player.shards = (gs.player.shards || 0) + 1; } },
    { type: 'reward', text: 'You absorb ambient energy.', rarity: 'common', effect: (gs) => { gs.player.energy = Math.min((gs.player.energy || 0) + 2, 100); } },
    { type: 'hint', text: 'You feel the presence of the Spreadseer.', rarity: 'rare' },
    { type: 'hint', text: 'The Shadow Domain whispers your name.', rarity: 'epic' },
    { type: 'hint', text: 'A breach trembles at the edge of reality.', rarity: 'mythic' }
];

async function getZoneModifiers(gs) {
    await loadEventSystemData();
    const zone = (gs.currentZone || 'Federation Core');
    const z = zonesData.find(z => z.name === zone);
    return (z && z.modifiers) ? z.modifiers : { eventRate: 1.0 };
}

function weightedRandomEvent() {
    // Use polish.json rarityWeights for true data-driven rarity
    const weights = ParallelFXEngine.data.events.rarityWeights;
    const poolByRarity = {};
    for (const e of eventPool) {
        if (!poolByRarity[e.rarity]) poolByRarity[e.rarity] = [];
        poolByRarity[e.rarity].push(e);
    }
    const rarities = Object.keys(weights);
    let r = Math.random();
    for (const rarity of rarities) {
        const w = weights[rarity];
        if (r < w) {
            const pool = poolByRarity[rarity] || [];
            if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
            break;
        }
        r -= w;
    }
    // fallback
    return eventPool[Math.floor(Math.random() * eventPool.length)];
}

    async update(gameState) {
        const mods = await getZoneModifiers(gameState);
        const baseEventRate = gameState.player.eventRate || 0.01;
        const eventChance = baseEventRate * (mods.eventRate || 1.0);
        if (Math.random() < eventChance) {
            const event = weightedRandomEvent();
            if (event.effect) event.effect(gameState);
            // Rarity FX/audio
            ParallelFXEngine.applyEventFX(event.rarity || 'common');
            // Log event (styled if rare)
            const entry = {
                text: event.text,
                eventType: event.type,
                timestamp: gameState.world && gameState.world.tick,
                rarity: event.rarity
            };
            if (event.rarity && ['rare','epic','mythic'].includes(event.rarity)) {
                ParallelFXEngine.styleLogEntry(entry);
            }
            if (gameState.world && gameState.world.events) {
                gameState.world.events.push(event.text);
            }
        }
    }
};
