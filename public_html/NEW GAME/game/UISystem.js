import { LcarsSystem } from './LcarsSystem.js';

export const UISystem = {
  init() {
    this.root = document.body;
    this.fxLayer = document.getElementById("fx-layer");
    this.logContainer = document.getElementById("event-log");
  },

  // Update the game UI based on the current game state
  update(gameState) {
    // Update consciousness stats visualization
    LcarsSystem.updateConsciousnessStats(gameState);

    // Update game status elements
    document.getElementById('energy').textContent = gameState.player.energy || 0;
    document.getElementById('shards').textContent = gameState.player.shards || 0;
    LcarsSystem.updatePhase(gameState);
    LcarsSystem.updateTick(gameState);
    LcarsSystem.updateZone(gameState);
    LcarsSystem.updateEvents(gameState);

    // Update agent icons
    LcarsSystem.updateAgentIcons(gameState);

    // Update cooldown bars
    LcarsSystem.updateCooldownBars(gameState);

    // Render log entries
    const logArr = (gameState.log || []).slice(-8); // Show last 8 entries
    document.getElementById('event-log').innerHTML = this.renderLog(logArr);

    // Apply zone-specific visual effects
    this.applyZoneEffects(gameState);

    // Trigger appropriate sound effects based on game state
    this.handleAudioFeedback(gameState);
  },

  // Render log entries with appropriate styling
  renderLog(entries) {
    return entries.map(entry => {
      let cls = 'log-entry';
      let bg = '';
      let border = '';
      let icon = '';

      // Determine styling based on entry type
      if (typeof entry === 'object' && entry.type) {
        switch(entry.type) {
          case 'consciousness':
            cls += ' log-consciousness';
            bg = `style="background: linear-gradient(90deg, #66ccff 0%, #00ccff 100%); color: #fff;"`;
            break;
          case 'event':
            cls += ' log-event';
            bg = `style="background: linear-gradient(90deg, #ff9900 0%, #ffcc00 100%); color: #000;"`;
            break;
          case 'chaos':
            cls += ' log-chaos';
            bg = `style="background: linear-gradient(90deg, #cc0066 0%, #ff3399 100%); color: #fff;"`;
            border = `style="border: 2px solid #ff3399;"`;
            break;
          case 'diplomacy':
            cls += ' log-diplomacy';
            bg = `style="background: linear-gradient(90deg, #ff66cc 0%, #ff99cc 100%); color: #fff;"`;
            break;
          case 'expansion':
            cls += ' log-expansion';
            bg = `style="background: linear-gradient(90deg, #00cc66 0%, #00ff99 100%); color: #000;"`;
            break;
          default:
            cls += ' log-default';
            bg = `style="background: var(--bg-medium); color: var(--lcars-gray);"`;
        }
      }

      if (typeof entry === 'string') {
        return `<div class="log-entry" ${bg} ${border}>${entry}</div>`;
      } else if (typeof entry === 'object') {
        return `<div class="${cls}" ${bg} ${border}>${entry.text || entry.message || JSON.stringify(entry)}</div>`;
      }
      return `<div class="log-entry" ${bg} ${border}>${entry}</div>`;
    }).join('');
  },

  // Apply visual effects based on current zone
  applyZoneEffects(gameState) {
    const zone = gameState.currentZone || 'FEDERATION_CORE';
    const body = document.body;

    // Remove any existing zone classes
    body.className = body.className.replace(/zone-\w+/g, '');

    // Add class for current zone
    body.classList.add(`zone-${zone.toLowerCase().replace(/\s+/g, '-')}`);
  },

  // Handle audio feedback based on game state
  handleAudioFeedback(gameState) {
    // Play sound when energy or shards reach significant thresholds
    if (typeof gameState.player.energy === 'number') {
      if (gameState.player.energy >= 100) {
        LcarsSystem.playCommChime();
      } else if (gameState.player.energy < 10) {
        LcarsSystem.playAlertRed();
      }
    }

    if (typeof gameState.player.shards === 'number') {
      if (gameState.player.shards >= 50) {
        LcarsSystem.playWarpEngage();
      }
    }

    // Play sound on significant events
    if (gameState.lastEvent && gameState.lastEvent.type === 'chaos') {
      LcarsSystem.playAlertRed();
    }
  }
};
