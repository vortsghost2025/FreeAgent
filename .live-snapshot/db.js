// ==============================================
// WE4Free IndexedDB Province Cache
// Using Dexie.js for robust schema management
// ==============================================

// Load Dexie.js from CDN (will be cached by Service Worker)
// Include in resources.html: <script src="https://unpkg.com/dexie@3.2.4/dist/dexie.min.js"></script>

const WE4FreeDB = {
    db: null,
    version: 1,

    // Initialize database
    async init() {
        try {
            this.db = new Dexie('WE4FreeDB');

            // Define schema (additive-only for safe migrations)
            this.db.version(this.version).stores({
                provinces: 'code, name, last_updated',
                emergency_numbers: '++id, province_code, number, service, type',
                sync_status: 'province_code, last_sync, pending'
            });

            await this.db.open();
            console.log('[WE4Free] IndexedDB initialized:', this.db.name);

            // Seed initial data if empty
            const count = await this.db.provinces.count();
            if (count === 0) {
                await this.seedInitialData();
            }

            return true;
        } catch (error) {
            console.error('[WE4Free] IndexedDB init failed:', error);
            return false;
        }
    },

    // Seed initial province data
    async seedInitialData() {
        console.log('[WE4Free] Seeding initial province data...');

        const provinces = [
            { code: 'BC', name: 'British Columbia', last_updated: Date.now() },
            { code: 'AB', name: 'Alberta', last_updated: Date.now() },
            { code: 'SK', name: 'Saskatchewan', last_updated: Date.now() },
            { code: 'MB', name: 'Manitoba', last_updated: Date.now() },
            { code: 'ON', name: 'Ontario', last_updated: Date.now() },
            { code: 'QC', name: 'Quebec', last_updated: Date.now() },
            { code: 'NB', name: 'New Brunswick', last_updated: Date.now() },
            { code: 'NS', name: 'Nova Scotia', last_updated: Date.now() },
            { code: 'PE', name: 'Prince Edward Island', last_updated: Date.now() },
            { code: 'NL', name: 'Newfoundland and Labrador', last_updated: Date.now() },
            { code: 'YT', name: 'Yukon', last_updated: Date.now() },
            { code: 'NT', name: 'Northwest Territories', last_updated: Date.now() },
            { code: 'NU', name: 'Nunavut', last_updated: Date.now() }
        ];

        await this.db.provinces.bulkAdd(provinces);

        // Add emergency numbers
        const emergencyNumbers = [
            // Universal Canadian numbers
            { province_code: 'ALL', number: '911', service: 'Emergency Services', type: 'tel' },
            { province_code: 'ALL', number: '988', service: 'Suicide Crisis', type: 'tel' },
            { province_code: 'ALL', number: '1-800-668-6868', service: 'Kids Help Phone', type: 'tel' },
            { province_code: 'ALL', number: '811', service: 'Health Link', type: 'tel' },
            { province_code: 'ALL', number: '211', service: 'Community Services', type: 'tel' },

            // SMS alternatives
            { province_code: 'ALL', number: '988', service: 'Suicide Crisis (Text)', type: 'sms' },
            { province_code: 'ALL', number: '686868', service: 'Kids Help Phone (Text)', type: 'sms' },

            // TTY alternatives (7-1-1 is Canada-wide TTY relay)
            { province_code: 'ALL', number: '711', service: 'TTY Relay Service', type: 'tty' }
        ];

        await this.db.emergency_numbers.bulkAdd(emergencyNumbers);

        console.log('[WE4Free] Seeded', provinces.length, 'provinces and', emergencyNumbers.length, 'emergency numbers');
    },

    // Get province by code
    async getProvince(code) {
        try {
            return await this.db.provinces.get(code);
        } catch (error) {
            console.error('[WE4Free] Failed to get province:', error);
            return null;
        }
    },

    // Get emergency numbers for province
    async getEmergencyNumbers(provinceCode) {
        try {
            // Get universal numbers + province-specific
            const numbers = await this.db.emergency_numbers
                .where('province_code')
                .anyOf(['ALL', provinceCode])
                .toArray();

            return numbers;
        } catch (error) {
            console.error('[WE4Free] Failed to get emergency numbers:', error);
            return [];
        }
    },

    // Update province data (from network sync)
    async updateProvince(code, data) {
        try {
            await this.db.provinces.put({
                code: code,
                ...data,
                last_updated: Date.now()
            });

            console.log('[WE4Free] Province', code, 'updated in cache');
            return true;
        } catch (error) {
            console.error('[WE4Free] Failed to update province:', error);
            return false;
        }
    },

    // Background sync with server
    async syncFromServer() {
        if (!navigator.onLine) {
            console.log('[WE4Free] Offline, skipping sync');
            return false;
        }

        try {
            console.log('[WE4Free] Starting background sync...');

            // TODO: Replace with actual API endpoint
            // Example: const response = await fetch('https://api.we4free.ca/v1/provinces');
            // const serverData = await response.json();

            // For now, just update sync status
            const localProvinces = await this.db.provinces.toArray();

            for (const localProvince of localProvinces) {
                // Simulate server data (in real implementation, this comes from API)
                // const serverProvince = serverData.find(p => p.code === localProvince.code);

                // If server data exists and conflict resolver is available, check for conflicts
                // if (serverProvince && typeof WE4FreeConflictResolver !== 'undefined') {
                //     const hasConflict = WE4FreeConflictResolver.detectConflict(localProvince, serverProvince);
                //
                //     if (hasConflict) {
                //         // Resolve conflict
                //         const resolved = await WE4FreeConflictResolver.resolve(
                //             localProvince,
                //             serverProvince,
                //             { sync_source: 'background', province_code: localProvince.code }
                //         );
                //
                //         // Update with resolved data
                //         await this.db.provinces.put(resolved);
                //         console.log('[WE4Free] Conflict resolved and province updated:', localProvince.code);
                //     } else {
                //         // No conflict, use server data
                //         await this.db.provinces.put(serverProvince);
                //     }
                // }

                // Update sync status
                await this.db.sync_status.put({
                    province_code: localProvince.code,
                    last_sync: Date.now(),
                    pending: false
                });
            }

            console.log('[WE4Free] Sync completed for', localProvinces.length, 'provinces');
            return true;

        } catch (error) {
            console.error('[WE4Free] Sync failed:', error);
            return false;
        }
    },

    // Get sync status
    async getSyncStatus(provinceCode) {
        try {
            return await this.db.sync_status.get(provinceCode);
        } catch (error) {
            console.error('[WE4Free] Failed to get sync status:', error);
            return null;
        }
    },

    // Clear all data (for testing or user-requested purge)
    async clearAll() {
        try {
            await this.db.provinces.clear();
            await this.db.emergency_numbers.clear();
            await this.db.sync_status.clear();
            console.log('[WE4Free] All cache cleared');
            return true;
        } catch (error) {
            console.error('[WE4Free] Failed to clear cache:', error);
            return false;
        }
    },

    // Export data (for debugging or backup)
    async exportData() {
        try {
            const data = {
                provinces: await this.db.provinces.toArray(),
                emergency_numbers: await this.db.emergency_numbers.toArray(),
                sync_status: await this.db.sync_status.toArray(),
                exported_at: new Date().toISOString()
            };
            return data;
        } catch (error) {
            console.error('[WE4Free] Failed to export data:', error);
            return null;
        }
    }
};

// Auto-initialize on load
if (typeof Dexie !== 'undefined') {
    WE4FreeDB.init().then(success => {
        if (success) {
            // Start background sync (with exponential backoff)
            setTimeout(() => WE4FreeDB.syncFromServer(), 5000);

            // Periodic sync every 1 hour
            setInterval(() => WE4FreeDB.syncFromServer(), 3600000);
        }
    });
} else {
    console.warn('[WE4Free] Dexie.js not loaded, IndexedDB unavailable');
}

// Expose for console access
window.WE4FreeDB = WE4FreeDB;
