// AgentSystem.js — Fully integrated with ParallelFXEngine
let agentsData = null;
let zonesData = null;
async function loadAgentSystemData() {
    if (!agentsData) {
        const resp = await fetch('./data/agents.json');
        agentsData = await resp.json();
    }
    if (!zonesData) {
        const resp = await fetch('./data/zones.json');
        zonesData = await resp.json();
    }
}
import { ParallelFXEngine } from './parallelFXEngine.js';

function meetsUnlock(unlock, gs) {
    if (!unlock) return true;
    if (unlock.shards !== undefined && (gs.player.shards || 0) < unlock.shards) return false;
    if (unlock.zone !== undefined && (!gs.zones || !gs.zones.includes(unlock.zone))) return false;
    if (unlock.milestone !== undefined && (!gs.player.milestones || !gs.player.milestones.includes(unlock.milestone))) return false;
    return true;
}

function getAgentState(gs, agentId) {
    if (!gs.player.agentState) gs.player.agentState = {};
    if (!gs.player.agentState[agentId]) gs.player.agentState[agentId] = { cooldown: 0 };
    return gs.player.agentState[agentId];
}

export const AgentSystem = {
    async update(gameState) {
        await loadAgentSystemData();
        if (!gameState.player.agents) gameState.player.agents = [];
        if (!gameState.player.agentState) gameState.player.agentState = {};
        // 1. Awakening agents
        function logAgentAction(agentId, text, rare = false) {
            if (!gameState.log) gameState.log = [];
            const entry = {
                text,
                agent: agentId,
                timestamp: gameState.world && gameState.world.tick,
                rare
            };
            // Use ParallelFXEngine for log styling
            ParallelFXEngine.styleLogEntry(entry);
            gameState.log.push(entry);
        }
        for (const agent of agentsData) {
            if (!gameState.player.agents.includes(agent.name) && meetsUnlock(agent.unlock, gameState)) {
                gameState.player.agents.push(agent.name);
                logAgentAction(agent.name, `Agent awakened: ${agent.name}!`);
            }
        }
        // 2. Apply passive abilities and FX
        const zone = (gameState.currentZone || 'federation_core');
        const z = zonesData.find(z => z.name.toLowerCase().replace(/\s/g, '_') === zone.toLowerCase().replace(/\s/g, '_'));
        const mods = (z && z.modifiers) ? z.modifiers : { agentCooldown: 1.0 };
        for (const agentName of gameState.player.agents) {
            const agent = agentsData.find(a => a.name === agentName);
            if (!agent) continue;
            if (agent.passive) {
                if (agent.passive.energyRegen) gameState.player.energyRegen = (gameState.player.energyRegen || 2) + agent.passive.energyRegen * (mods.agentCooldown || 1.0);
                if (agent.passive.shardRate) gameState.player.shardRate = (gameState.player.shardRate || 1) + agent.passive.shardRate * (mods.agentCooldown || 1.0);
                if (agent.passive.eventRate) gameState.player.eventRate = (gameState.player.eventRate || 0.01) + agent.passive.eventRate * (mods.agentCooldown || 1.0);
                if (agent.passive.cooldownReduction) gameState.player.cooldownReduction = (gameState.player.cooldownReduction || 0) + agent.passive.cooldownReduction * (mods.agentCooldown || 1.0);
                if (agent.passive.resourceDecay) gameState.player.resourceDecay = (gameState.player.resourceDecay || 0) + agent.passive.resourceDecay * (mods.agentCooldown || 1.0);
                // Passive FX/audio (rate-limited)
                ParallelFXEngine.applyAgentFX(agent.id, "passive");
                // Zone affinity FX
                ParallelFXEngine.applyAgentZoneFX(agent.id, zone);
            }
        }
        // 3. Cooldown management & active abilities
        for (const agentName of gameState.player.agents) {
            const agent = agentsData.find(a => a.name === agentName);
            if (!agent || !agent.active) continue;
            const state = getAgentState(gameState, agent.id);
            // Cooldown reduction by zone affinity and upgrades
            let cooldownMod = 1;
            if (agent.zoneAffinity && gameState.currentZone && agent.zoneAffinity[gameState.currentZone]) {
                cooldownMod *= agent.zoneAffinity[gameState.currentZone];
            }
            if (mods.agentCooldown) {
                cooldownMod *= mods.agentCooldown;
            }
            if (gameState.player.cooldownReduction) {
                cooldownMod *= (1 - gameState.player.cooldownReduction);
            }
            if (state.cooldown > 0) {
                state.cooldown -= cooldownMod;
            } else {
                // Trigger active ability
                let rare = false;
                let rarityLevel = 'common';
                if (agent.active.type === 'triggerEvent') {
                    rare = true; rarityLevel = 'rare';
                    logAgentAction(agent.name, `${agent.name} triggers a cosmic event!`, rare);
                } else if (agent.active.type === 'stabilizeLoop') {
                    gameState.player.energy = Math.min((gameState.player.energy || 0) + 10, 100);
                    logAgentAction(agent.name, `${agent.name} stabilizes the loop!`);
                } else if (agent.active.type === 'protectResources') {
                    logAgentAction(agent.name, `${agent.name} shields resources from decay!`);
                } else if (agent.active.type === 'speedUpTicks') {
                    rare = true; rarityLevel = 'rare';
                    logAgentAction(agent.name, `${agent.name} accelerates the flow of time!`, rare);
                }
                // Active FX/audio
                ParallelFXEngine.applyAgentFX(agent.id, "active");
                // Rare FX/audio
                if (rare) {
                    ParallelFXEngine.applyAgentFX(agent.id, "rare");
                }
                // Reset cooldown
                state.cooldown = agent.active.cooldown || 10;
                if (agent.active.zoneAffinity && gameState.currentZone && agent.active.zoneAffinity[gameState.currentZone]) {
                    state.cooldown *= agent.active.zoneAffinity[gameState.currentZone];
                }
            }
        }
    }
};
