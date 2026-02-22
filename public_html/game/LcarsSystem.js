// LCARS System for USS Chaosbringer Federation Game
// Handles visual effects, animations, and UI updates in LCARS style

export const LcarsSystem = {
  // Initialize LCARS system
  init() {
    this.setupAnimations();
    this.setupCanvas();
    console.log("LCARS system initialized");
  },

  // Setup canvas for hex grid territory map
  setupCanvas() {
    const canvas = document.getElementById('hexGridCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    this.drawHexGrid(ctx, canvas.width, canvas.height);
  },

  // Draw hexagonal grid for territory map
  drawHexGrid(ctx, width, height) {
    const size = 15; // Hexagon size
    const hexHeight = size * Math.sqrt(3);
    const hexWidth = size * 2;
    
    // Calculate grid dimensions
    const cols = Math.ceil(width / (hexWidth * 0.75));
    const rows = Math.ceil(height / hexHeight);
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw hexagons
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const xOffset = (col % 2 === 0) ? 0 : hexWidth * 0.5;
        const x = col * hexWidth * 0.75 + size;
        const y = row * hexHeight + size + xOffset;
        
        this.drawHexagon(ctx, x, y, size);
      }
    }
    
    // Add some random colored territories
    this.addTerritoryColors(ctx, width, height, size);
  },

  // Draw a single hexagon
  drawHexagon(ctx, centerX, centerY, size) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 3 * i;
      const x = centerX + size * Math.cos(angle);
      const y = centerY + size * Math.sin(angle);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    
    // Semi-transparent hexagon
    ctx.fillStyle = 'rgba(100, 150, 200, 0.1)';
    ctx.fill();
    
    // Hexagon border
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  },

  // Add colored territories to the hex grid
  addTerritoryColors(ctx, width, height, size) {
    // Randomly place some colored territories
    const territoryCount = 15;
    const hexHeight = size * Math.sqrt(3);
    const hexWidth = size * 2;
    
    for (let i = 0; i < territoryCount; i++) {
      // Generate random coordinates
      const col = Math.floor(Math.random() * (Math.ceil(width / (hexWidth * 0.75))));
      const row = Math.floor(Math.random() * (Math.ceil(height / hexHeight)));
      
      const xOffset = (col % 2 === 0) ? 0 : hexWidth * 0.5;
      const x = col * hexWidth * 0.75 + size;
      const y = row * hexHeight + size + xOffset;
      
      // Choose a random color for the territory
      const colors = [
        'rgba(255, 153, 0, 0.3)',  // Orange
        'rgba(102, 204, 255, 0.3)', // Blue
        'rgba(255, 215, 0, 0.3)',   // Gold
        'rgba(255, 102, 204, 0.3)', // Pink
        'rgba(0, 204, 102, 0.3)'    // Green
      ];
      
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      ctx.beginPath();
      for (let j = 0; j < 6; j++) {
        const angle = Math.PI / 3 * j;
        const hexX = x + size * Math.cos(angle);
        const hexY = y + size * Math.sin(angle);
        
        if (j === 0) {
          ctx.moveTo(hexX, hexY);
        } else {
          ctx.lineTo(hexX, hexY);
        }
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
  },

  // Set up animations
  setupAnimations() {
    // Add holographic shimmer effect to panels
    this.applyHolographicEffect('.lcars-panel');
    
    // Add pulsing effect to important elements
    this.addPulsingEffect('.lcars-tab');
  },

  // Apply holographic shimmer effect
  applyHolographicEffect(selector) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.classList.add('holographic-effect');
    });
  },

  // Add pulsing effect to elements
  addPulsingEffect(selector) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.addEventListener('mouseenter', () => {
        el.style.animation = 'none';
        setTimeout(() => {
          el.style.animation = '';
        }, 10);
      });
    });
  },
  
  // Update consciousness stats visualization
  updateConsciousnessStats(gameState) {
    // Update morale
    const morale = gameState.player.consciousness?.morale || 0;
    document.getElementById('morale').textContent = morale.toFixed(1);
    document.getElementById('morale-bar').style.width = `${Math.min(100, morale)}%`;
    
    // Update identity
    const identity = gameState.player.consciousness?.identity || 0;
    document.getElementById('identity').textContent = identity.toFixed(1);
    document.getElementById('identity-bar').style.width = `${Math.min(100, identity)}%`;
    
    // Update confidence
    const confidence = gameState.player.consciousness?.confidence || 0;
    document.getElementById('confidence').textContent = confidence.toFixed(1);
    document.getElementById('confidence-bar').style.width = `${Math.min(100, confidence)}%`;
    
    // Update anxiety
    const anxiety = gameState.player.consciousness?.anxiety || 0;
    document.getElementById('anxiety').textContent = anxiety.toFixed(1);
    document.getElementById('anxiety-bar').style.width = `${Math.min(100, anxiety)}%`;
    
    // Update expansion
    const expansion = gameState.player.consciousness?.expansion || 0;
    document.getElementById('expansion').textContent = expansion.toFixed(1);
    document.getElementById('expansion-bar').style.width = `${Math.min(100, expansion)}%`;
    
    // Update diplomacy
    const diplomacy = gameState.player.consciousness?.diplomacy || 0;
    document.getElementById('diplomacy').textContent = diplomacy.toFixed(1);
    document.getElementById('diplomacy-bar').style.width = `${Math.min(100, diplomacy)}%`;
  },

  // Update phase display
  updatePhase(gameState) {
    const phase = gameState.world?.phase || 'GENESIS';
    document.getElementById('phase').textContent = phase;
  },

  // Update tick counter
  updateTick(gameState) {
    const tick = gameState.world?.tick || 0;
    document.getElementById('tick').textContent = tick;
  },

  // Update zone display
  updateZone(gameState) {
    const zone = gameState.currentZone || 'FEDERATION CORE';
    document.getElementById('zone').textContent = zone;
  },

  // Update events counter
  updateEvents(gameState) {
    const events = gameState.eventsLog?.length || 0;
    document.getElementById('events').textContent = events;
  },

  // Play communication chime
  playCommChime() {
    const audio = document.getElementById('commChime');
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.log("Audio play error:", e));
    }
  },

  // Play red alert sound
  playAlertRed() {
    const audio = document.getElementById('alertRed');
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.log("Audio play error:", e));
    }
  },

  // Play warp engage sound
  playWarpEngage() {
    const audio = document.getElementById('warpEngage');
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.log("Audio play error:", e));
    }
  },

  // Update agent icons with LCARS styling
  updateAgentIcons(gameState) {
    const agents = gameState.player.agents || [];
    const container = document.getElementById('agent-icons');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    agents.forEach(agent => {
      const icon = document.createElement('div');
      icon.className = 'agent-icon';
      icon.title = agent;
      
      // Different styling based on agent type
      switch(agent) {
        case 'Spreadseer':
          icon.style.backgroundColor = '#b57cff';
          icon.classList.add('agent-pulse');
          break;
        case 'Ledger Titan':
          icon.style.backgroundColor = '#4da6ff';
          break;
        case 'Slippage Warden':
          icon.style.backgroundColor = '#ff4d4d';
          break;
        case 'Latency Dragonfly':
          icon.style.backgroundColor = '#00e0e0';
          break;
        default:
          icon.style.backgroundColor = '#cccccc';
      }
      
      container.appendChild(icon);
    });
  },

  // Update cooldown bars with LCARS styling
  updateCooldownBars(gameState) {
    const agents = gameState.player.agents || [];
    const agentState = gameState.player.agentState || {};
    const container = document.getElementById('cooldown-bars');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    agents.forEach(name => {
      const state = agentState[name] || { cooldown: 0 };
      const max = 20; // Assume max cooldown for visual
      const progress = Math.max(0, Math.min(1, 1 - (state.cooldown / max)));
      const percentage = progress * 100;
      
      let barClass = 'cooldown-bar';
      let innerClass = 'cooldown-bar-inner';
      
      if (state.cooldown && state.cooldown > 15) {
        barClass += ' cooldown-bar-rare';
      } else if (state.cooldown && state.cooldown < 3) {
        innerClass += ' cooldown-bar-low';
      }
      
      const barContainer = document.createElement('div');
      barContainer.className = barClass;
      
      const barInner = document.createElement('div');
      barInner.className = innerClass;
      barInner.style.width = `${percentage}%`;
      
      barContainer.appendChild(barInner);
      container.appendChild(barContainer);
    });
  }
};

// Initialize the LCARS system when the module loads
document.addEventListener('DOMContentLoaded', () => {
  LcarsSystem.init();
});