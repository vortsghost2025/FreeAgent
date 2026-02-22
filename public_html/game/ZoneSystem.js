// ZoneSystem.js — The geography of the Federation
let zonesData = null;
async function loadZoneSystemData() {
    if (!zonesData) {
        const resp = await fetch('./data/zones.json');
        zonesData = await resp.json();
    }
}
import { ParallelFXEngine } from './parallelFXEngine.js';

function isZoneUnlocked(zone, gs) {
    if (!zone.unlock) return true;
    if (zone.unlock.tick !== undefined && gs.world.tick < zone.unlock.tick) return false;
    if (zone.unlock.shards !== undefined && (gs.player.shards || 0) < zone.unlock.shards) return false;
    return true;
}

export const ZoneSystem = {
    async update(gameState) {
        await loadZoneSystemData();
        if (!gameState.zones) gameState.zones = [];
        if (!gameState.currentZone) gameState.currentZone = 'Federation Core';

        for (const zone of zonesData) {
            if (!gameState.zones.includes(zone.name) && isZoneUnlocked(zone, gameState)) {
                gameState.zones.push(zone.name);

                if (gameState.world && gameState.world.events) {
                    gameState.world.events.push(`A new region reveals itself: ${zone.name}.`);
                }
            }
        }
    },

    async setZone(gameState, zoneName) {
        await loadZoneSystemData();
        if (gameState.zones && gameState.zones.includes(zoneName)) {
            gameState.currentZone = zoneName;

            const zoneId = zoneName.toLowerCase().replace(/\s/g, '_');
            ParallelFXEngine.applyZoneFX(zoneId);

            if (gameState.world && gameState.world.events) {
                gameState.world.events.push(`You travel to: ${zoneName}.`);
            }
        }
    }
};