// AnomalySystem.js — Boss/Anomaly event layer (integrated with ParallelFXEngine)
import { ParallelFXEngine } from './parallelFXEngine.js';

const anomalies = [
  {
    id: 'void_tyrant',
    name: 'Void Tyrant',
    zone: 'null_expanse',
    trigger: (gs) => gs.currentZone === 'Null Expanse' && gs.player.shards >= 150,
    effect: (gs) => {
      gs.player.energy = Math.max(0, gs.player.energy - 30);
      gs.player.shards += 10;
    },
    fx: ['void_ripple', 'screen_pulse_strong'],
    sound: 'tyrant_roar',
    log: 'The Void Tyrant emerges, draining your energy!'
  },
  {
    id: 'prism_singularity',
    name: 'Prism Singularity',
    zone: 'prism_verge',
    trigger: (gs) => gs.currentZone === 'Prism Verge' && gs.player.shards >= 250,
    effect: (gs) => {
      gs.player.energy = Math.min(100, gs.player.energy + 20);
      gs.player.shards = Math.max(0, gs.player.shards - 30);
    },
    fx: ['prism_shards', 'cosmic_swell'],
    sound: 'singularity_chime',
    log: 'A Prism Singularity warps reality!'
  }
];

export const AnomalySystem = {
  update(gameState) {
    if (!gameState.world) return;
    if (!gameState.world.anomalies) gameState.world.anomalies = [];
    for (const anomaly of anomalies) {
      if (!gameState.world.anomalies.includes(anomaly.id) && anomaly.trigger(gameState)) {
        anomaly.effect(gameState);
        ParallelFXEngine.applyEventFX('mythic');
        anomaly.fx.forEach(fx => ParallelFXEngine.UI.triggerFX(fx));
        if (anomaly.sound) ParallelFXEngine.Audio.playSound(anomaly.sound);
        const entry = { text: anomaly.log, eventType: 'anomaly', timestamp: gameState.world.tick, rarity: 'mythic' };
        ParallelFXEngine.styleLogEntry(entry);
        if (gameState.world.events) gameState.world.events.push(anomaly.log);
        gameState.world.anomalies.push(anomaly.id);
      }
    }
  }
};