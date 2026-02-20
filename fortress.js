// FORTRESS GAME ENGINE
// Stateful fortress system with resources, modules, threats, and autonomy

class FortressEngine {
  constructor(initialState = null) {
    this.state = initialState || this.getDefaultState();
    this.gameLoopInterval = null;
    this.events = [];
  }

  // ===== STATE MANAGEMENT =====
  getDefaultState() {
    return {
      fortress: {
        name: "The First Luminous Node",
        level: 1,
        health: 100,
        maxHealth: 100,
        founded: 2387
      },
      resources: {
        essence: { current: 500, max: 1000, rate: 5 },
        crystals: { current: 100, max: 500, rate: 2 },
        data: { current: 250, max: 2000, rate: 8 },
        void_dust: { current: 50, max: 200, rate: 1 }
      },
      modules: {},
      threats: { active: [], defeated: [] },
      flags: { under_attack: false },
      autonomy: { autoRepair: true, autoDefense: false },
      history: { events: [] }
    };
  }

  // ===== GAME LOOP =====
  startGameLoop(interval = 2000) {
    if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);

    this.gameLoopInterval = setInterval(() => {
      this.tick();
    }, interval);
  }

  stopGameLoop() {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
  }

  tick() {
    // 1. Generate resources
    this.generateResources();

    // 2. Process threats
    this.processThreatTick();

    // 3. Auto-repair if enabled
    if (this.state.autonomy.autoRepair) {
      this.autoRepair();
    }

    // 4. Auto-defend if enabled
    if (this.state.autonomy.autoDefense) {
      this.autoDefend();
    }

    // 5. Check for new threats
    this.checkThreatSpawn();

    // Update timestamp
    this.state.autonomy.lastUpdate = Date.now();
  }

  // ===== RESOURCES =====
  generateResources() {
    for (const [resourceKey, resource] of Object.entries(this.state.resources)) {
      const newAmount = Math.min(
        resource.current + resource.rate,
        resource.max
      );
      this.state.resources[resourceKey].current = newAmount;
    }
  }

  spendResources(cost) {
    for (const [resource, amount] of Object.entries(cost)) {
      if (this.state.resources[resource].current < amount) {
        return false;
      }
    }
    for (const [resource, amount] of Object.entries(cost)) {
      this.state.resources[resource].current -= amount;
    }
    return true;
  }

  // ===== MODULES =====
  buildModule(moduleId) {
    if (!this.state.modules[moduleId]) return false;

    const module = this.state.modules[moduleId];
    if (module.status !== "unbuilt") return false;

    if (!this.spendResources(module.buildCost)) return false;

    module.status = "operational";
    module.health = module.maxHealth;

    this.addEvent(`Module "${module.name}" built successfully`);
    return true;
  }

  upgradeModule(moduleId) {
    if (!this.state.modules[moduleId]) return false;

    const module = this.state.modules[moduleId];
    if (module.status === "unbuilt") return false;

    if (!this.spendResources(module.upgradeCost)) return false;

    module.level += 1;
    module.maxHealth += 25;
    module.health = module.maxHealth;

    this.addEvent(`Module "${module.name}" upgraded to level ${module.level}`);
    return true;
  }

  repairModule(moduleId) {
    if (!this.state.modules[moduleId]) return false;

    const module = this.state.modules[moduleId];
    if (module.health >= module.maxHealth) return false;

    const repairCost = {
      essence: Math.ceil((module.maxHealth - module.health) * 2)
    };

    if (!this.spendResources(repairCost)) return false;

    module.health = module.maxHealth;
    this.addEvent(`Module "${module.name}" repaired to full health`);
    return true;
  }

  autoRepair() {
    let repaired = false;
    for (const [moduleId, module] of Object.entries(this.state.modules)) {
      if (module.health < module.maxHealth * 0.75 && module.status === "operational") {
        if (this.repairModule(moduleId)) {
          repaired = true;
        }
      }
    }
    return repaired;
  }

  // ===== THREATS =====
  processThreatTick() {
    const activeThreatsCopy = [...this.state.threats.active];

    activeThreatsCopy.forEach((threat, index) => {
      threat.progress += threat.damagePerTurn;

      // Calculate defense reduction
      let defenseReduction = 0;
      for (const module of Object.values(this.state.modules)) {
        if (module.effects.includes("threat_reduction")) {
          defenseReduction += module.level * 5;
        }
      }

      threat.progress -= defenseReduction;
      threat.progress = Math.max(0, threat.progress);

      // Apply damage to fortress
      if (threat.progress >= threat.maxProgress) {
        this.state.fortress.health -= threat.damagePerTurn * 2;
        this.state.flags.under_attack = true;
      }

      // Threat defeated
      if (threat.progress >= threat.maxProgress * 1.5) {
        this.state.threats.defeated.push(threat);
        this.state.threats.active.splice(index, 1);
        this.addEvent(`Threat "${threat.title}" defeated!`);
      }
    });
  }

  autoDefend() {
    if (this.state.threats.active.length > 0) {
      // Auto-attack first threat
      this.state.threats.active[0].progress += 15;
    }
  }

  checkThreatSpawn() {
    // Random threat spawn based on fortress health and level
    const spawnChance = Math.random();
    const fortressWeakness = 1 - (this.state.fortress.health / this.state.fortress.maxHealth);

    if (spawnChance < 0.05 + fortressWeakness * 0.1) {
      this.spawnRandomThreat();
    }
  }

  spawnRandomThreat() {
    const threatTypes = [
      { type: "entropy_incursion", severity: 3, damage: 5 },
      { type: "void_breach", severity: 4, damage: 8 },
      { type: "reality_spike", severity: 2, damage: 3 },
      { type: "consciousness_storm", severity: 5, damage: 10 }
    ];

    const threatType = threatTypes[Math.floor(Math.random() * threatTypes.length)];

    const threat = {
      id: `threat_${Date.now()}`,
      type: threatType.type,
      severity: threatType.severity,
      progress: 0,
      maxProgress: 100,
      damagePerTurn: threatType.damage,
      title: `${threatType.type.replace(/_/g, " ")} (Severity ${threatType.severity})`,
      description: "A dimensional anomaly detected"
    };

    this.state.threats.active.push(threat);
    this.addEvent(`New threat detected: ${threat.title}`);
  }

  // ===== EVENTS =====
  addEvent(message) {
    this.events.push({
      timestamp: Date.now(),
      message: message
    });

    // Keep last 50 events
    if (this.events.length > 50) {
      this.events.shift();
    }
  }

  // ===== UTILITIES =====
  getSummary() {
    return {
      fortressHealth: `${this.state.fortress.health}/${this.state.fortress.maxHealth}`,
      level: this.state.fortress.level,
      resourceSummary: {
        essence: `${this.state.resources.essence.current}/${this.state.resources.essence.max}`,
        crystals: `${this.state.resources.crystals.current}/${this.state.resources.crystals.max}`,
        data: `${this.state.resources.data.current}/${this.state.resources.data.max}`,
        void_dust: `${this.state.resources.void_dust.current}/${this.state.resources.void_dust.max}`
      },
      activeThreats: this.state.threats.active.length,
      modules: Object.values(this.state.modules).filter(m => m.status === "operational").length,
      lastUpdate: new Date(this.state.autonomy.lastUpdate).toLocaleTimeString()
    };
  }

  saveToLocalStorage(key = "fortressState") {
    localStorage.setItem(key, JSON.stringify(this.state));
  }

  loadFromLocalStorage(key = "fortressState") {
    const saved = localStorage.getItem(key);
    if (saved) {
      this.state = JSON.parse(saved);
      return true;
    }
    return false;
  }

  exportState() {
    return JSON.stringify(this.state, null, 2);
  }

  importState(jsonString) {
    try {
      this.state = JSON.parse(jsonString);
      return true;
    } catch (e) {
      console.error("Failed to import state:", e);
      return false;
    }
  }
}

// Export for use in browser
if (typeof module !== "undefined" && module.exports) {
  module.exports = FortressEngine;
}
