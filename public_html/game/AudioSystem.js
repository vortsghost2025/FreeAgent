// AudioSystem.js
// Lightweight, data-driven audio engine with ambient + SFX + rate limiting.

export const AudioSystem = {
  sfxVolume: 0.4,
  ambientVolume: 0.25,
  currentAmbient: null,
  passiveCooldown: {},

  init(polish) {
    this.sfxVolume = polish.audio.volumes.sfx;
    this.ambientVolume = polish.audio.volumes.ambient;
    this.rateLimitTicks = polish.audio.rateLimits.agentPassiveTicks;
  },

  playSound(id) {
    if (!id) return;
    const audio = new Audio(`./audio/${id}.mp3`);
    audio.volume = this.sfxVolume;
    audio.play();
  },

  playAmbient(id) {
    if (!id) return;

    // fade out old ambient
    if (this.currentAmbient) {
      this.currentAmbient.volume = 0;
      this.currentAmbient.pause();
    }

    // fade in new ambient
    const amb = new Audio(`./audio/${id}.mp3`);
    amb.loop = true;
    amb.volume = 0;
    amb.play();

    let v = 0;
    const fade = setInterval(() => {
      v += 0.02;
      amb.volume = Math.min(v, this.ambientVolume);
      if (v >= this.ambientVolume) clearInterval(fade);
    }, 30);

    this.currentAmbient = amb;
  },

  rateLimitedPassive(agentId, tick, soundId) {
    const last = this.passiveCooldown[agentId] || 0;
    if (tick - last < this.rateLimitTicks) return;
    this.passiveCooldown[agentId] = tick;
    this.playSound(soundId);
  }
};
