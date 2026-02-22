// --- AMBIENT AUDIO ENGINE ---
let currentAmbient = null;
// UISystem.js
// Central FX renderer: pulses, glows, overlays, transitions, log styling.

export const UISystem = {
  init() {
    this.root = document.body;
    this.fxLayer = document.getElementById("fx-layer");
    this.logContainer = document.getElementById("log");
  },

  // -----------------------------
  // TINT + TRANSITION
  // -----------------------------
  applyTint(color) {
    this.root.style.setProperty("--zone-tint", color);
  },

  runTransition(name) {
    this.root.classList.add(name);
    setTimeout(() => this.root.classList.remove(name), 600);
  },

  // -----------------------------
  // GENERIC FX TRIGGER
  // -----------------------------
  triggerFX(fxName) {
    const el = document.createElement("div");
    el.className = `fx ${fxName}`;
    this.fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 800);
  },

  // -----------------------------
  // LOG RENDERING
  // -----------------------------
  renderStyledLog({ text, color, fontStyle, icon, borderRare }) {
    const entry = document.createElement("div");
    entry.className = "log-entry";

    entry.style.color = color;
    entry.style.fontStyle = fontStyle;

    if (borderRare) entry.classList.add(borderRare);

    entry.innerHTML = `
      <img class="log-icon" src="./icons/${icon}" />
      <span>${text}</span>
    `;

    this.logContainer.appendChild(entry);
    entry.scrollIntoView();
  },

  renderDefaultLog(entry) {
    const div = document.createElement("div");
    div.className = "log-entry";
    div.textContent = entry.text;
    this.logContainer.appendChild(div);
    div.scrollIntoView();
  },

  // -----------------------------
  // COOLDOWN FX
  // -----------------------------
  cooldownPulse() {
    this.triggerFX("cooldown_pulse");
  },

  // -----------------------------
  // RESOURCE FX
  // -----------------------------
  resourceFX(fxName) {
    this.triggerFX(fxName);
  },

  // -----------------------------
  // UI INTERACTION SOUNDS (delegated to AudioSystem)
  // -----------------------------
  playUISound(soundId, AudioSystem) {
    AudioSystem.playSound(soundId);
  }
};
            return `<div class="${cls}"${border}>${icon}${entry.text}</div>`;
        }
        return `<div>${entry}</div>`;
    }).join('');
}
function renderCooldownBars(gameState) {
    // Render animated cooldown bars for each agent
    const agents = gameState.player.agents || [];
    const agentState = gameState.player.agentState || {};
    return agents.map(name => {
        const state = agentState[name] || { cooldown: 0 };
        const max = 20; // Assume max cooldown for visual
        const width = Math.max(0, Math.min(100, 100 * (1 - (state.cooldown / max))));
        let rare = false;
        let pulse = false;
        let low = false;
        if (state.cooldown && state.cooldown > 15) rare = true;
        if (state.cooldown && state.cooldown < 3) low = true;
        if (state.cooldown && state.cooldown === 0) pulse = true;
        let barClass = 'cooldown-bar' + (rare ? ' cooldown-bar-rare' : '') + (pulse ? ' cooldown-bar-pulse' : '');
        let innerClass = 'cooldown-bar-inner' + (low ? ' cooldown-bar-low' : '');
        return `<div class="${barClass}"><span class="${innerClass}" style="width:${width}%"></span></div>`;
    }).join('');
}
function applyUIPacingFX(type) {
    const root = document.getElementById('game-ui');
    if (!root) return;
    if (type === 'slowdown') {
        root.classList.add('ui-slowdown');
        setTimeout(() => root.classList.remove('ui-slowdown'), 600);
    } else if (type === 'speedup') {
        root.classList.add('ui-speedup');
        setTimeout(() => root.classList.remove('ui-speedup'), 400);
    }
}

function applyZoneAffinityFX(gameState) {
    const zone = gameState.currentZone || 'Federation Core';
    const agents = gameState.player.agents || [];
    // Spreadseer
    if (agents.includes('Spreadseer')) {
        if (zone === 'Shadow Domain') {
            triggerFX(document.getElementById('event-log'), 'affinity-shadow-ripple', 800);
            document.getElementById('event-log').classList.add('affinity-whisper');
        } else {
            document.getElementById('event-log').classList.remove('affinity-whisper');
        }
        if (zone === 'The Breach') {
            triggerFX(document.getElementById('event-log'), 'affinity-void-distort', 1200);
        }
        if (zone === 'The Prophecy') {
            triggerFX(document.getElementById('event-log'), 'affinity-glyph-flash', 700);
        }
    }
    // Ledger Titan
    if (agents.includes('Ledger Titan') && zone === 'Federation Core') {
        document.getElementById('energy-bar').classList.add('affinity-stabilize-aura');
    } else {
        document.getElementById('energy-bar').classList.remove('affinity-stabilize-aura');
    }
    // Slippage Warden
    if (agents.includes('Slippage Warden') && zone === 'The Breach') {
        triggerFX(document.getElementById('shard-panel'), 'affinity-glitch-flicker', 1000);
    }
    // Latency Dragonfly
    if (agents.includes('Latency Dragonfly') && zone === 'The Prophecy') {
        document.getElementById('cooldown-bars').classList.add('affinity-glyph-trail');
    } else {
        document.getElementById('cooldown-bars').classList.remove('affinity-glyph-trail');
    }
}

export const UISystem = {
    update(gameState) {
        // --- Advanced pacing audio hooks ---
        // 1. Play a sound on major tick milestones (every 100 ticks)
        if (gameState.world && typeof gameState.world.tick === 'number') {
            if (gameState.world.tick > 0 && gameState.world.tick % 100 === 0) {
                playSound('tick_milestone');
            }
            // High activity: subtle tempo/acceleration FX if tick rate is high
            if (gameState.world.tick > 0 && gameState.player.eventRate && gameState.player.eventRate > 0.2) {
                // UI tick acceleration (visual + audio)
                playSound('tick_accel');
                const tickInd = document.getElementById('tick-indicator');
                if (tickInd) {
                    tickInd.classList.add('tick-accel-fx');
                    setTimeout(() => tickInd.classList.remove('tick-accel-fx'), 300);
                }
            }
        }
        // 2. Play a sound when energy or shards hit max or low thresholds
        if (typeof gameState.player.energy === 'number') {
            if (gameState.player.energy >= 100 && (!gameState._lastEnergyMax || gameState._lastEnergyMax < 100)) {
                playSound('energy_max');
                gameState._lastEnergyMax = 100;
            } else if (gameState.player.energy < 20 && (!gameState._lastEnergyLow || gameState._lastEnergyLow >= 20)) {
                playSound('energy_low');
                gameState._lastEnergyLow = gameState.player.energy;
            } else if (gameState.player.energy >= 20) {
                gameState._lastEnergyLow = undefined;
            }
        }
        if (typeof gameState.player.shards === 'number') {
            if (gameState.player.shards >= 100 && (!gameState._lastShardsMax || gameState._lastShardsMax < 100)) {
                playSound('shards_max');
                gameState._lastShardsMax = 100;
            }
        }
        // 3. Play a sound when any agent's cooldown completes (active ready)
        if (gameState.player.agentState) {
            for (const [agentId, state] of Object.entries(gameState.player.agentState)) {
                if (state.cooldown === 0 && (!state._lastCooldownReady || state._lastCooldownReady !== 0)) {
                    playSound('cooldown_ready');
                    state._lastCooldownReady = 0;
                } else if (state.cooldown > 0) {
                    state._lastCooldownReady = state.cooldown;
                }
            }
        }
        // --- UI/FX rendering (existing) ---
        document.getElementById('energy').textContent = gameState.player.energy;
        document.getElementById('shards').textContent = gameState.player.shards;
        // Agent passive FX
        const agents = gameState.player.agents || [];
        // Spreadseer: ripple on event panel, glow on event-log
        if (agents.includes('Spreadseer')) {
            triggerFX(document.getElementById('event-log'), 'spreadseer-ripple', 700);
            document.getElementById('event-log').classList.add('spreadseer-glow');
        } else {
            document.getElementById('event-log').classList.remove('spreadseer-glow');
        }
        // Ledger Titan: pulse on energy bar, blue glow
        if (agents.includes('Ledger Titan')) {
            triggerFX(document.getElementById('energy-bar'), 'ledger-pulse', 600);
            document.getElementById('energy-bar').classList.add('ledger-glow');
        } else {
            document.getElementById('energy-bar').classList.remove('ledger-glow');
        }
        // Slippage Warden: shimmer on shard panel, flicker
        if (agents.includes('Slippage Warden')) {
            triggerFX(document.getElementById('shard-panel'), 'warden-shimmer', 1200);
            document.getElementById('shard-panel').classList.add('warden-flicker');
        } else {
            document.getElementById('shard-panel').classList.remove('warden-flicker');
        }
        // Latency Dragonfly: speedline on cooldown bars, tick pulse
        if (agents.includes('Latency Dragonfly')) {
            triggerFX(document.getElementById('cooldown-bars'), 'dragonfly-speedline', 700);
            triggerFX(document.getElementById('tick-indicator'), 'dragonfly-tickpulse', 500);
        }
        // Zone affinity FX
        applyZoneAffinityFX(gameState);
        // Render agent icons with overlays
        document.getElementById('agent-icons').innerHTML = renderAgentIcons(gameState);
        // Render log with agent styles
        const logArr = (gameState.log || []).slice(-5);
        document.getElementById('event-log').innerHTML = renderLog(logArr);
        // Render cooldown bars
        document.getElementById('cooldown-bars').innerHTML = renderCooldownBars(gameState);
    }
};
