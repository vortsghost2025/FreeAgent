// ParallelFXEngine.js
// The central orchestrator for all polish layers.
// Reads polish.json once, exposes FX/audio helpers to all systems.

import polish from "./data/polish.json";

export const ParallelFXEngine = {
  init(UISystem, AudioSystem) {
    this.UI = UISystem;
    this.Audio = AudioSystem;
    this.data = polish;
    // Preload ambient if needed
    this.currentAmbient = null;
  },

  // -----------------------------
  // ZONE FX + AMBIENT AUDIO
  // -----------------------------
  applyZoneFX(zoneId) {
    const zone = this.data.zones[zoneId];
    if (!zone) return;
    // UI tint + transition
    this.UI.applyTint(zone.tint);
    this.UI.runTransition(zone.transition);
    // Zone FX overlays
    zone.fx?.forEach(fx => this.UI.triggerFX(fx));
    // Ambient audio
    if (zone.ambientSound) {
      this.Audio.playAmbient(zone.ambientSound);
      this.currentAmbient = zone.ambientSound;
    }
  },

  // -----------------------------
  // AGENT FX (passive, active, rare)
  // -----------------------------
  applyAgentFX(agentId, type) {
    const agent = this.data.agents[agentId];
    if (!agent) return;
    const fxList = agent.fx?.[type];
    if (!fxList) return;
    fxList.forEach(fx => this.UI.triggerFX(fx));
    // Sounds
    const sound = agent.sounds?.[type];
    if (sound) this.Audio.playSound(sound);
  },

  // -----------------------------
  // AGENT ZONE AFFINITY FX
  // -----------------------------
  applyAgentZoneFX(agentId, zoneId) {
    const agent = this.data.agents[agentId];
    if (!agent) return;
    const fxList = agent.zoneFX?.[zoneId];
    if (!fxList) return;
    fxList.forEach(fx => this.UI.triggerFX(fx));
  },

  // -----------------------------
  // EVENT RARITY FX + AUDIO
  // -----------------------------
  applyEventFX(rarity) {
    const rarityFX = this.data.events.rarityFX[rarity];
    if (rarityFX) rarityFX.forEach(fx => this.UI.triggerFX(fx));
    const raritySound = this.data.events.raritySounds[rarity];
    if (raritySound) this.Audio.playSound(raritySound);
  },

  // -----------------------------
  // LOG STYLING
  // -----------------------------
  styleLogEntry(entry) {
    const agent = this.data.agents[entry.agent];
    if (!agent) return this.UI.renderDefaultLog(entry);
    return this.UI.renderStyledLog({
      text: entry.text,
      color: agent.logStyle.color,
      fontStyle: agent.logStyle.fontStyle,
      icon: agent.logStyle.icon,
      borderRare: agent.logStyle.borderRare
    });
  },

  // -----------------------------
  // RESOURCE FX + AUDIO
  // -----------------------------
  applyResourceFX(resource, type) {
    const res = this.data.ui.resources[resource];
    if (!res) return;
    const fxList = res[`${type}FX`];
    if (fxList) fxList.forEach(fx => this.UI.triggerFX(fx));
    const sound = res[`${type}Sound`];
    if (sound) this.Audio.playSound(sound);
  },

  // -----------------------------
  // COOLDOWN FX + AUDIO
  // -----------------------------
  applyCooldownReadyFX() {
    const cd = this.data.ui.cooldowns;
    cd.readyFX?.forEach(fx => this.UI.triggerFX(fx));
    if (cd.readySound) this.Audio.playSound(cd.readySound);
  },

  // -----------------------------
  // MILESTONE TICK FX + AUDIO
  // -----------------------------
  applyTickMilestoneFX() {
    const ms = this.data.ui.milestones;
    ms.fx?.forEach(fx => this.UI.triggerFX(fx));
    if (ms.sound) this.Audio.playSound(ms.sound);
  },

  // -----------------------------
  // UI INTERACTION SOUNDS
  // -----------------------------
  playUISound(type) {
    const sound = this.data.ui.interactions[type];
    if (sound) this.Audio.playSound(sound);
  },

  // -----------------------------
  // PACING CURVES (optional helper)
  // -----------------------------
  getEventRateMultiplier(tick) {
    const curve = this.data.pacing.eventRateCurve;
    return Math.min(curve.base + tick * curve.perTick, curve.max);
  },

  getShardRateMultiplier(progress) {
    const curve = this.data.pacing.shardRateCurve;
    return Math.min(curve.base + progress * curve.perProgress, curve.max);
  },

  getAgentCooldownMultiplier(progress) {
    const curve = this.data.pacing.agentCooldownCurve;
    return Math.max(curve.base + progress * curve.perProgress, curve.min);
  }
};
