// PersistenceSystem.js — Handles save/load, versioning, migration, validation

const STORAGE_KEY = 'federationGameSave';
const CURRENT_VERSION = 1;

export const PersistenceSystem = {
    save(gameState) {
        const toSave = JSON.parse(JSON.stringify(gameState));
        // Strip transient/runtime-only fields if needed
        // (none for now)
        toSave.version = CURRENT_VERSION;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
            if (toSave.world && toSave.world.events) {
                toSave.world.events.push('Game saved!');
            }
        } catch (e) {
            // Optionally log error
        }
    },
    load() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return this.defaultState();
        let loaded;
        try {
            loaded = JSON.parse(raw);
        } catch (e) {
            return this.defaultState();
        }
        // Migration
        if (!loaded.version || loaded.version < CURRENT_VERSION) {
            loaded = this.migrate(loaded);
        }
        // Validation
        this.validate(loaded);
        return loaded;
    },
    defaultState() {
        return {
            player: {
                name: "Explorer",
                energy: 100,
                loreUnlocked: [],
                upgrades: [],
                milestones: [],
                agents: [],
                agentState: {}
            },
            world: {
                tick: 0,
                events: []
            },
            zones: ["Federation Core"],
            currentZone: "Federation Core",
            version: CURRENT_VERSION
        };
    },
    migrate(state) {
        // Example: add missing fields for v2, v3, etc.
        if (!state.version) state.version = 1;
        // Add more migration logic as needed
        return state;
    },
    validate(state) {
        if (!state.player) state.player = {};
        if (!state.player.energy || state.player.energy < 0) state.player.energy = 0;
        if (state.player.energy > 100) state.player.energy = 100;
        if (!state.player.loreUnlocked) state.player.loreUnlocked = [];
        if (!state.player.upgrades) state.player.upgrades = [];
        if (!state.player.milestones) state.player.milestones = [];
        if (!state.player.agents) state.player.agents = [];
        if (!state.player.agentState) state.player.agentState = {};
        if (!state.world) state.world = { tick: 0, events: [] };
        if (!state.zones) state.zones = ["Federation Core"];
        if (!state.currentZone) state.currentZone = "Federation Core";
        if (!state.version) state.version = CURRENT_VERSION;
    }
};
