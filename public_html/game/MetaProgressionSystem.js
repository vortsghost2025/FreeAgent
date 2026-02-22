// MetaProgressionSystem.js — Permanent meta-progression (integrated with ParallelFXEngine)
import { ParallelFXEngine } from './parallelFXEngine.js';

const metaUpgrades = [
  {
    id: 'event_rate_boost',
    name: 'Event Rate Boost',
    cost: 1,
    effect: (gs) => { gs.player.metaEventRate = (gs.player.metaEventRate || 0) + 0.05; },
    desc: 'Permanently increase event rate by 0.05.'
  },
  {
    id: 'energy_cap_increase',
    name: 'Energy Cap Increase',
    cost: 2,
    effect: (gs) => { gs.player.metaEnergyCap = (gs.player.metaEnergyCap || 100) + 10; },
    desc: 'Permanently increase max energy by 10.'
  }
];

export const MetaProgressionSystem = {
  getAvailableUpgrades(gameState) {
    return metaUpgrades.filter(u => !(gameState.player.metaUpgrades || []).includes(u.id));
  },
  purchaseUpgrade(gameState, upgradeId) {
    if (!gameState.player.ascensions || gameState.player.ascensions < 1) return false;
    const upgrade = metaUpgrades.find(u => u.id === upgradeId);
    if (!upgrade) return false;
    if ((gameState.player.metaUpgrades || []).includes(upgradeId)) return false;
    if (!gameState.player.metaUpgrades) gameState.player.metaUpgrades = [];
    if (!gameState.player.metaCurrency) gameState.player.metaCurrency = gameState.player.ascensions;
    if (gameState.player.metaCurrency < upgrade.cost) return false;
    upgrade.effect(gameState);
    gameState.player.metaUpgrades.push(upgradeId);
    gameState.player.metaCurrency -= upgrade.cost;
    ParallelFXEngine.applyTickMilestoneFX();
    if (gameState.world && gameState.world.events) {
      gameState.world.events.push(`Meta-upgrade purchased: ${upgrade.name}`);
    }
    return true;
  }
};