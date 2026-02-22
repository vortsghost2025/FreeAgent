// PrestigeSystem.js — Ascension/Prestige layer (integrated with ParallelFXEngine)
import { ParallelFXEngine } from './parallelFXEngine.js';

export const PrestigeSystem = {
  canPrestige(gameState) {
    return (gameState.player.shards || 0) >= 500;
  },
  doPrestige(gameState) {
    if (!this.canPrestige(gameState)) return false;
    gameState.player.shards = 0;
    gameState.player.energy = 100;
    gameState.player.ascensions = (gameState.player.ascensions || 0) + 1;
    ParallelFXEngine.applyTickMilestoneFX();
    if (gameState.world && gameState.world.events) {
      gameState.world.events.push('You have ascended! All shards reset, but your power grows.');
    }
    return true;
  }
};