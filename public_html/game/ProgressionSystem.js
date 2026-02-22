// ProgressionSystem.js — The evolution of the player
export const ProgressionSystem = {
    update(gameState) {
        // ProgressionSystem.js — The Ascension Engine
        import progressionData from './data/progression.json' assert { type: 'json' };

        function meetsUnlock(unlock, gs) {
            if (!unlock) return true;
            if (unlock.tick !== undefined && gs.world.tick < unlock.tick) return false;
            if (unlock.energy !== undefined && (gs.player.energy || 0) < unlock.energy) return false;
            if (unlock.shards !== undefined && (gs.player.shards || 0) < unlock.shards) return false;
            if (unlock.zone !== undefined && gs.zones && !gs.zones.includes(unlock.zone)) return false;
            return true;
        }

        function getEntryById(id) {
            return progressionData.find(e => e.id === id);
        }

        if (!gameState.player.upgrades) gameState.player.upgrades = [];
        if (!gameState.player.milestones) gameState.player.milestones = [];
        if (!gameState.player.loreUnlocked) gameState.player.loreUnlocked = [];
        if (!gameState.player.agents) gameState.player.agents = [];

        // 1. Check milestones
        for (const entry of progressionData) {
            if (entry.type === 'milestone' && !gameState.player.milestones.includes(entry.id) && meetsUnlock(entry.unlock, gameState)) {
                gameState.player.milestones.push(entry.id);
                if (gameState.world && gameState.world.events) gameState.world.events.push(`Milestone reached: ${entry.name}!`);
            }
        }

        // 2. Check upgrade availability (auto-grant for now)
        for (const entry of progressionData) {
            if (entry.type === 'upgrade' && !gameState.player.upgrades.includes(entry.id) && meetsUnlock(entry.unlock, gameState)) {
                if (entry.cost && entry.cost.shards && (gameState.player.shards || 0) < entry.cost.shards) continue;
                gameState.player.upgrades.push(entry.id);
                if (gameState.world && gameState.world.events) gameState.world.events.push(`Upgrade unlocked: ${entry.name}!`);
            }
        }

        // 3. Apply passive upgrade effects
        for (const upgId of gameState.player.upgrades) {
            const upg = getEntryById(upgId);
            if (upg && upg.effect) {
                if (upg.effect.energyRegen) gameState.player.energyRegen = (gameState.player.energyRegen || 2) + upg.effect.energyRegen;
                if (upg.effect.shardMultiplier) gameState.player.shardMultiplier = upg.effect.shardMultiplier;
            }
        }

        // 4. Trigger lore unlocks
        for (const entry of progressionData) {
            if (entry.type === 'lore' && !gameState.player.loreUnlocked.includes(entry.id) && meetsUnlock(entry.unlock, gameState)) {
                gameState.player.loreUnlocked.push(entry.id);
                if (gameState.world && gameState.world.events) gameState.world.events.push(`Lore unlocked: ${entry.name}!`);
            }
        }

        // 5. Trigger agent awakenings
        for (const entry of progressionData) {
            if (entry.type === 'agent' && !gameState.player.agents.includes(entry.name) && meetsUnlock(entry.unlock, gameState)) {
                gameState.player.agents.push(entry.name);
                if (gameState.world && gameState.world.events) gameState.world.events.push(`Agent unlocked: ${entry.name}!`);
            }
        }
    },

    purchaseUpgrade(gameState, id) {
        const entry = getEntryById(id);
        if (!entry || entry.type !== 'upgrade') return false;
        if (gameState.player.upgrades.includes(id)) return false;
        if (!meetsUnlock(entry.unlock, gameState)) return false;
        if (entry.cost && entry.cost.shards && (gameState.player.shards || 0) < entry.cost.shards) return false;
        gameState.player.shards -= entry.cost.shards;
        gameState.player.upgrades.push(id);
        if (entry.effect) {
            if (entry.effect.energyRegen) gameState.player.energyRegen = (gameState.player.energyRegen || 2) + entry.effect.energyRegen;
            if (entry.effect.shardMultiplier) gameState.player.shardMultiplier = entry.effect.shardMultiplier;
        }
        if (gameState.world && gameState.world.events) gameState.world.events.push(`Upgrade purchased: ${entry.name}!`);
        return true;
    },

    isUpgradeAvailable(gameState, id) {
        const entry = getEntryById(id);
        if (!entry || entry.type !== 'upgrade') return false;
        return meetsUnlock(entry.unlock, gameState) && !gameState.player.upgrades.includes(id);
    },

    isMilestoneReached(gameState, id) {
        return gameState.player.milestones && gameState.player.milestones.includes(id);
    },

    unlockLore(gameState, id) {
        if (!gameState.player.loreUnlocked.includes(id)) {
            gameState.player.loreUnlocked.push(id);
            if (gameState.world && gameState.world.events) gameState.world.events.push(`Lore unlocked: ${id}!`);
        }
    },

    unlockAgent(gameState, id) {
        const entry = getEntryById(id);
        if (entry && entry.type === 'agent' && !gameState.player.agents.includes(entry.name)) {
            gameState.player.agents.push(entry.name);
            if (gameState.world && gameState.world.events) gameState.world.events.push(`Agent unlocked: ${entry.name}!`);
        }
    }
};
    }
};
