// ==============================================
// WE4Free Self-Healing UI
// Error boundaries + state checkpointing
// ==============================================

const WE4FreeSelfHealing = {
    checkpointInterval: 30000, // 30 seconds
    lastCheckpoint: null,
    recoveryAttempts: 0,
    maxRecoveryAttempts: 3,

    // Initialize self-healing system
    async init() {
        console.log('[WE4Free] Self-healing UI initialized');

        // Set up error boundary
        this.setupErrorBoundary();

        // Start periodic checkpointing
        this.startCheckpointing();

        // Monitor for broken UI elements
        this.startHealthMonitoring();

        // Attempt recovery if we crashed last session
        await this.checkForPreviousCrash();
    },

    // Global error boundary
    setupErrorBoundary() {
        window.addEventListener('error', (event) => {
            console.error('[WE4Free] Global error caught:', event.error);
            this.handleError(event.error, event.filename, event.lineno);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('[WE4Free] Unhandled rejection:', event.reason);
            this.handleError(event.reason, 'Promise', 0);
        });
    },

    // Handle errors with recovery attempts
    async handleError(error, source, line) {
        this.recoveryAttempts++;

        // Log to IndexedDB for diagnostics
        await this.logError({
            error: error.toString(),
            source: source,
            line: line,
            timestamp: Date.now(),
            url: window.location.href
        });

        if (this.recoveryAttempts > this.maxRecoveryAttempts) {
            console.error('[WE4Free] Max recovery attempts reached, showing fallback');
            this.showFallbackUI();
            return;
        }

        // Attempt recovery
        console.log('[WE4Free] Attempting recovery, attempt:', this.recoveryAttempts);
        await this.attemptRecovery();
    },

    // Attempt UI recovery
    async attemptRecovery() {
        try {
            // Strategy 1: Reload last checkpoint
            const checkpoint = await this.loadCheckpoint();
            if (checkpoint) {
                console.log('[WE4Free] Restoring from checkpoint:', new Date(checkpoint.timestamp));
                await this.restoreFromCheckpoint(checkpoint);
                return true;
            }

            // Strategy 2: Rebuild critical elements
            console.log('[WE4Free] No checkpoint found, rebuilding critical elements');
            this.rebuildCriticalElements();
            return true;

        } catch (error) {
            console.error('[WE4Free] Recovery failed:', error);
            return false;
        }
    },

    // Periodic state checkpointing
    startCheckpointing() {
        setInterval(async () => {
            await this.saveCheckpoint();
        }, this.checkpointInterval);

        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.saveCheckpoint();
        });
    },

    // Save current state to IndexedDB
    async saveCheckpoint() {
        if (!WE4FreeDB || !WE4FreeDB.db) return;

        try {
            const state = {
                timestamp: Date.now(),
                scroll_position: window.scrollY,
                hash: window.location.hash,
                crisis_box_visible: document.getElementById('crisis-box') !== null,
                last_used_number: localStorage.getItem('we4free_last_number'),
                detected_province: localStorage.getItem('we4free_province')
            };

            // Store in IndexedDB
            await WE4FreeDB.db.table('sync_status').put({
                province_code: 'checkpoint',
                last_sync: state.timestamp,
                pending: false,
                state: JSON.stringify(state)
            });

            this.lastCheckpoint = state;
            console.log('[WE4Free] Checkpoint saved');

        } catch (error) {
            console.error('[WE4Free] Checkpoint save failed:', error);
        }
    },

    // Load last checkpoint from IndexedDB
    async loadCheckpoint() {
        if (!WE4FreeDB || !WE4FreeDB.db) return null;

        try {
            const record = await WE4FreeDB.db.table('sync_status').get('checkpoint');
            if (!record || !record.state) return null;

            return JSON.parse(record.state);

        } catch (error) {
            console.error('[WE4Free] Checkpoint load failed:', error);
            return null;
        }
    },

    // Restore UI from checkpoint
    async restoreFromCheckpoint(checkpoint) {
        try {
            // Restore scroll position
            window.scrollTo(0, checkpoint.scroll_position);

            // Restore hash
            if (checkpoint.hash) {
                window.location.hash = checkpoint.hash;
            }

            // Restore last used number
            if (checkpoint.last_used_number) {
                localStorage.setItem('we4free_last_number', checkpoint.last_used_number);
            }

            // Verify crisis box
            if (checkpoint.crisis_box_visible) {
                const crisisBox = document.getElementById('crisis-box');
                if (!crisisBox) {
                    this.rebuildCrisisBox();
                }
            }

            console.log('[WE4Free] State restored from checkpoint');

        } catch (error) {
            console.error('[WE4Free] Restore failed:', error);
        }
    },

    // Rebuild critical UI elements
    rebuildCriticalElements() {
        // Check if crisis box is present and visible
        const crisisBox = document.getElementById('crisis-box');
        if (!crisisBox || !crisisBox.offsetHeight) {
            console.log('[WE4Free] Crisis box missing, rebuilding');
            this.rebuildCrisisBox();
        }
    },

    // Rebuild crisis box from scratch
    rebuildCrisisBox() {
        // Find container
        const container = document.querySelector('.container');
        if (!container) {
            console.error('[WE4Free] Container not found, cannot rebuild crisis box');
            return;
        }

        // Create new crisis box
        const crisisBox = document.createElement('div');
        crisisBox.id = 'crisis-box-rebuilt';
        crisisBox.style.cssText = `
            background: #ff6b6b;
            color: white;
            padding: 25px 20px;
            border-radius: 15px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            position: sticky;
            top: 0;
            z-index: 999;
        `;

        crisisBox.innerHTML = `
            <h2 style="margin-top: 0; font-size: 1.6rem; margin-bottom: 18px;">🚨 Emergency Resources (Rebuilt)</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center;">
                <a href="tel:911" style="background: rgba(0,0,0,0.2); padding: 20px 15px; border-radius: 10px; min-width: 140px; text-decoration: none; color: white;">
                    <p style="font-size: 2rem; font-weight: bold; margin: 0 0 8px 0;">911</p>
                    <p style="font-size: 0.9rem; margin: 0;">Emergency</p>
                </a>
                <a href="tel:988" style="background: rgba(0,0,0,0.2); padding: 20px 15px; border-radius: 10px; min-width: 140px; text-decoration: none; color: white;">
                    <p style="font-size: 2rem; font-weight: bold; margin: 0 0 8px 0;">988</p>
                    <p style="font-size: 0.9rem; margin: 0;">Suicide Crisis</p>
                </a>
            </div>
        `;

        // Insert at top of container
        container.insertBefore(crisisBox, container.firstChild);
        console.log('[WE4Free] Crisis box rebuilt');
    },

    // Show fallback UI when recovery fails
    showFallbackUI() {
        // Redirect to emergency.html
        console.log('[WE4Free] Showing emergency fallback');
        window.location.href = '/emergency.html';
    },

    // Health monitoring
    startHealthMonitoring() {
        setInterval(() => {
            this.checkUIHealth();
        }, 60000); // Every minute
    },

    // Check UI health
    checkUIHealth() {
        const crisisBox = document.getElementById('crisis-box');
        if (!crisisBox || !crisisBox.offsetHeight) {
            console.warn('[WE4Free] Crisis box health check failed, attempting rebuild');
            this.rebuildCrisisBox();
        }
    },

    // Check for previous crash
    async checkForPreviousCrash() {
        const crashed = sessionStorage.getItem('we4free_crashed');
        if (crashed) {
            console.warn('[WE4Free] Previous session crashed, attempting recovery');
            sessionStorage.removeItem('we4free_crashed');

            // Try to restore from last checkpoint
            const checkpoint = await this.loadCheckpoint();
            if (checkpoint) {
                await this.restoreFromCheckpoint(checkpoint);
            }
        }

        // Mark session as active
        sessionStorage.setItem('we4free_crashed', 'true');

        // Clear on successful exit
        window.addEventListener('beforeunload', () => {
            sessionStorage.removeItem('we4free_crashed');
        });
    },

    // Log error to IndexedDB
    async logError(errorData) {
        if (!WE4FreeDB || !WE4FreeDB.db) return;

        try {
            await WE4FreeDB.db.table('sync_status').put({
                province_code: `error_${Date.now()}`,
                last_sync: errorData.timestamp,
                pending: false,
                state: JSON.stringify(errorData)
            });
        } catch (error) {
            console.error('[WE4Free] Error logging failed:', error);
        }
    },

    // Get error history
    async getErrorHistory() {
        if (!WE4FreeDB || !WE4FreeDB.db) return [];

        try {
            const errors = await WE4FreeDB.db.table('sync_status')
                .where('province_code')
                .startsWith('error_')
                .toArray();

            return errors.map(e => JSON.parse(e.state));
        } catch (error) {
            console.error('[WE4Free] Error history retrieval failed:', error);
            return [];
        }
    }
};

// Auto-initialize after DB is ready
if (typeof WE4FreeDB !== 'undefined') {
    setTimeout(() => {
        WE4FreeSelfHealing.init();
    }, 1000);
}

// Expose for console access
window.WE4FreeSelfHealing = WE4FreeSelfHealing;
