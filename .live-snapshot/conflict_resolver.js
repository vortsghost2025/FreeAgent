// ==============================================
// WE4Free Conflict Resolution
// Data sync conflict handling for IndexedDB
// ==============================================

const WE4FreeConflictResolver = {
    // Conflict resolution strategies
    strategies: {
        LAST_WRITE_WINS: 'lww',         // Server timestamp wins
        MANUAL: 'manual',                // Prompt user to choose
        LOCAL_PRIORITY: 'local',         // Keep local changes
        SERVER_PRIORITY: 'server',       // Always use server data
        MERGE: 'merge'                   // Attempt to merge both
    },

    // Current strategy (configurable)
    currentStrategy: 'lww',

    // Conflict log for diagnostics
    conflictLog: [],
    maxLogSize: 100,

    // Initialize conflict resolver
    init() {
        console.log('[WE4Free Conflicts] Conflict resolver initialized');
        console.log('  Strategy:', this.currentStrategy);

        // Load strategy preference
        this.loadStrategy();
    },

    // Load strategy from storage
    loadStrategy() {
        try {
            const savedStrategy = localStorage.getItem('we4free_conflict_strategy');
            if (savedStrategy && Object.values(this.strategies).includes(savedStrategy)) {
                this.currentStrategy = savedStrategy;
            }
        } catch (error) {
            console.error('[WE4Free Conflicts] Failed to load strategy:', error);
        }
    },

    // Save strategy to storage
    saveStrategy() {
        try {
            localStorage.setItem('we4free_conflict_strategy', this.currentStrategy);
        } catch (error) {
            console.error('[WE4Free Conflicts] Failed to save strategy:', error);
        }
    },

    // Detect conflict between local and server data
    detectConflict(localData, serverData) {
        if (!localData || !serverData) {
            return false; // No conflict if one side is missing
        }

        // Check if data differs
        const localTimestamp = localData.last_updated || localData.timestamp || 0;
        const serverTimestamp = serverData.last_updated || serverData.timestamp || 0;

        // If timestamps are identical, no conflict
        if (localTimestamp === serverTimestamp) {
            return false;
        }

        // Check if actual data content differs
        const localContent = JSON.stringify(this.stripMetadata(localData));
        const serverContent = JSON.stringify(this.stripMetadata(serverData));

        if (localContent === serverContent) {
            return false; // Same content, just different timestamps
        }

        // Conflict detected
        console.warn('[WE4Free Conflicts] Conflict detected:', {
            local_timestamp: new Date(localTimestamp).toISOString(),
            server_timestamp: new Date(serverTimestamp).toISOString(),
            local_newer: localTimestamp > serverTimestamp
        });

        return true;
    },

    // Strip metadata fields for content comparison
    stripMetadata(data) {
        const cleaned = {...data};
        delete cleaned.last_updated;
        delete cleaned.timestamp;
        delete cleaned.last_sync;
        delete cleaned.pending;
        return cleaned;
    },

    // Resolve conflict using current strategy
    async resolve(localData, serverData, context = {}) {
        const conflict = {
            local: localData,
            server: serverData,
            context: context,
            detected_at: Date.now(),
            strategy_used: this.currentStrategy
        };

        console.log('[WE4Free Conflicts] Resolving conflict with strategy:', this.currentStrategy);

        let resolution;

        switch (this.currentStrategy) {
            case this.strategies.LAST_WRITE_WINS:
                resolution = await this.resolveLWW(localData, serverData);
                break;

            case this.strategies.LOCAL_PRIORITY:
                resolution = localData;
                break;

            case this.strategies.SERVER_PRIORITY:
                resolution = serverData;
                break;

            case this.strategies.MERGE:
                resolution = await this.resolveMerge(localData, serverData);
                break;

            case this.strategies.MANUAL:
                resolution = await this.resolveManual(localData, serverData, context);
                break;

            default:
                // Fallback to LWW
                resolution = await this.resolveLWW(localData, serverData);
        }

        // Log conflict and resolution
        conflict.resolution = resolution;
        conflict.resolved_at = Date.now();
        this.logConflict(conflict);

        console.log('[WE4Free Conflicts] Conflict resolved:', {
            strategy: this.currentStrategy,
            chosen: resolution === localData ? 'local' : (resolution === serverData ? 'server' : 'merged')
        });

        return resolution;
    },

    // Last-Write-Wins resolution
    async resolveLWW(localData, serverData) {
        const localTimestamp = localData.last_updated || localData.timestamp || 0;
        const serverTimestamp = serverData.last_updated || serverData.timestamp || 0;

        // Most recent timestamp wins
        if (serverTimestamp > localTimestamp) {
            console.log('[WE4Free Conflicts] LWW: Server data is newer, using server version');
            return serverData;
        } else {
            console.log('[WE4Free Conflicts] LWW: Local data is newer, keeping local version');
            return localData;
        }
    },

    // Merge resolution - attempt to merge both versions
    async resolveMerge(localData, serverData) {
        try {
            // Start with server data as base
            const merged = {...serverData};

            // Merge local changes that don't conflict
            for (const [key, value] of Object.entries(localData)) {
                // Skip metadata fields
                if (key === 'last_updated' || key === 'timestamp' || key === 'last_sync') {
                    continue;
                }

                // If server doesn't have this field, add it
                if (!(key in serverData)) {
                    merged[key] = value;
                }

                // For arrays, merge unique items
                if (Array.isArray(value) && Array.isArray(serverData[key])) {
                    merged[key] = [...new Set([...serverData[key], ...value])];
                }
            }

            // Use most recent timestamp
            merged.last_updated = Math.max(
                localData.last_updated || 0,
                serverData.last_updated || 0
            );

            console.log('[WE4Free Conflicts] Merge: Successfully merged local and server data');
            return merged;

        } catch (error) {
            console.error('[WE4Free Conflicts] Merge failed, falling back to LWW:', error);
            return this.resolveLWW(localData, serverData);
        }
    },

    // Manual resolution - prompt user to choose
    async resolveManual(localData, serverData, context) {
        // In a UI context, this would show a modal
        // For now, we'll fall back to LWW with a warning
        console.warn('[WE4Free Conflicts] Manual resolution requested but no UI available, using LWW');

        // TODO: Implement user prompt UI
        // This would show:
        // - Side-by-side diff of local vs server
        // - Timestamps
        // - "Keep local" / "Use server" / "Merge" buttons

        return this.resolveLWW(localData, serverData);
    },

    // Log conflict for diagnostics
    logConflict(conflict) {
        this.conflictLog.push(conflict);

        // Trim log if too large
        if (this.conflictLog.length > this.maxLogSize) {
            this.conflictLog = this.conflictLog.slice(-this.maxLogSize);
        }

        // Store in IndexedDB for persistence
        if (typeof WE4FreeDB !== 'undefined' && WE4FreeDB.db) {
            WE4FreeDB.db.table('sync_status').put({
                province_code: `conflict_${conflict.detected_at}`,
                last_sync: conflict.detected_at,
                pending: false,
                state: JSON.stringify({
                    detected_at: conflict.detected_at,
                    resolved_at: conflict.resolved_at,
                    strategy: conflict.strategy_used,
                    context: conflict.context
                })
            }).catch(err => {
                console.error('[WE4Free Conflicts] Failed to log conflict:', err);
            });
        }
    },

    // Get conflict history
    async getConflictHistory() {
        if (typeof WE4FreeDB !== 'undefined' && WE4FreeDB.db) {
            try {
                const conflicts = await WE4FreeDB.db.table('sync_status')
                    .where('province_code')
                    .startsWith('conflict_')
                    .toArray();

                return conflicts.map(c => JSON.parse(c.state));
            } catch (error) {
                console.error('[WE4Free Conflicts] Failed to retrieve conflict history:', error);
                return [];
            }
        }

        return this.conflictLog;
    },

    // Get conflict statistics
    async getStats() {
        const history = await this.getConflictHistory();

        const stats = {
            total_conflicts: history.length,
            by_strategy: {},
            avg_resolution_time: 0,
            recent_conflicts: history.slice(-10)
        };

        // Count by strategy
        for (const conflict of history) {
            const strategy = conflict.strategy || 'unknown';
            stats.by_strategy[strategy] = (stats.by_strategy[strategy] || 0) + 1;
        }

        // Calculate average resolution time
        const resolutionTimes = history
            .filter(c => c.resolved_at && c.detected_at)
            .map(c => c.resolved_at - c.detected_at);

        if (resolutionTimes.length > 0) {
            stats.avg_resolution_time = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
        }

        return stats;
    },

    // Set resolution strategy
    setStrategy(strategy) {
        if (!Object.values(this.strategies).includes(strategy)) {
            console.error('[WE4Free Conflicts] Invalid strategy:', strategy);
            return false;
        }

        this.currentStrategy = strategy;
        this.saveStrategy();
        console.log('[WE4Free Conflicts] Strategy changed to:', strategy);
        return true;
    },

    // Helper to check if sync should proceed despite conflict
    shouldProceedWithSync(conflict) {
        // If using automatic strategies, always proceed
        if (this.currentStrategy !== this.strategies.MANUAL) {
            return true;
        }

        // For manual strategy, this would check if user has responded
        // For now, proceed automatically
        return true;
    },

    // Clear conflict history (for testing/debugging)
    async clearHistory() {
        this.conflictLog = [];

        if (typeof WE4FreeDB !== 'undefined' && WE4FreeDB.db) {
            try {
                await WE4FreeDB.db.table('sync_status')
                    .where('province_code')
                    .startsWith('conflict_')
                    .delete();

                console.log('[WE4Free Conflicts] Conflict history cleared');
            } catch (error) {
                console.error('[WE4Free Conflicts] Failed to clear history:', error);
            }
        }
    }
};

// Auto-initialize
WE4FreeConflictResolver.init();

// Expose for console access
window.WE4FreeConflictResolver = WE4FreeConflictResolver;
