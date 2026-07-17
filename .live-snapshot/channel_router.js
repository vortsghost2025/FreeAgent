// ==============================================
// WE4Free Smart Channel Router
// Multi-path emergency access orchestration
// ==============================================

const WE4FreeChannelRouter = {
    // Channel priority (ordered by immediacy and reliability)
    channels: ['tel', 'sms', 'tty', 'webchat'],

    // User preferences and capabilities
    preferences: {
        preferred_channel: null,
        blocked_channels: new Set(),
        last_successful: null
    },

    // Device and environment detection
    capabilities: {
        can_call: false,
        can_sms: false,
        can_tty: false,
        is_mobile: false,
        is_online: false
    },

    // Initialize router
    async init() {
        console.log('[WE4Free Router] Initializing channel router...');

        // Detect device capabilities
        this.detectCapabilities();

        // Load user preferences
        await this.loadPreferences();

        // Monitor network status
        this.monitorNetwork();

        // Track channel usage
        this.setupTracking();

        console.log('[WE4Free Router] Router initialized');
        console.log('  Capabilities:', this.capabilities);
        console.log('  Preferred channel:', this.preferences.preferred_channel || 'auto');
    },

    // Detect device and environment capabilities
    detectCapabilities() {
        // Mobile device detection
        this.capabilities.is_mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Tel capability (mobile devices or desktop with tel: handler)
        this.capabilities.can_call = this.capabilities.is_mobile || 'ontouchstart' in window;

        // SMS capability (mobile only)
        this.capabilities.can_sms = this.capabilities.is_mobile;

        // TTY capability (Canada-specific, assume available)
        this.capabilities.can_tty = true;

        // Online status
        this.capabilities.is_online = navigator.onLine;

        console.log('[WE4Free Router] Capabilities detected:', this.capabilities);
    },

    // Load user preferences from storage
    async loadPreferences() {
        try {
            // Load from localStorage
            const prefChannel = localStorage.getItem('we4free_preferred_channel');
            if (prefChannel) {
                this.preferences.preferred_channel = prefChannel;
            }

            const lastSuccessful = localStorage.getItem('we4free_last_successful_channel');
            if (lastSuccessful) {
                this.preferences.last_successful = lastSuccessful;
            }

            const blockedChannels = localStorage.getItem('we4free_blocked_channels');
            if (blockedChannels) {
                this.preferences.blocked_channels = new Set(JSON.parse(blockedChannels));
            }

            console.log('[WE4Free Router] Preferences loaded:', this.preferences);
        } catch (error) {
            console.error('[WE4Free Router] Failed to load preferences:', error);
        }
    },

    // Save preferences to storage
    async savePreferences() {
        try {
            if (this.preferences.preferred_channel) {
                localStorage.setItem('we4free_preferred_channel', this.preferences.preferred_channel);
            }

            if (this.preferences.last_successful) {
                localStorage.setItem('we4free_last_successful_channel', this.preferences.last_successful);
            }

            if (this.preferences.blocked_channels.size > 0) {
                localStorage.setItem('we4free_blocked_channels', JSON.stringify(Array.from(this.preferences.blocked_channels)));
            }

            console.log('[WE4Free Router] Preferences saved');
        } catch (error) {
            console.error('[WE4Free Router] Failed to save preferences:', error);
        }
    },

    // Monitor network status changes
    monitorNetwork() {
        window.addEventListener('online', () => {
            this.capabilities.is_online = true;
            console.log('[WE4Free Router] Network restored');
        });

        window.addEventListener('offline', () => {
            this.capabilities.is_online = false;
            console.log('[WE4Free Router] Network lost');
        });
    },

    // Get best available channel based on context
    getBestChannel(context = {}) {
        const urgency = context.urgency || 'standard'; // immediate, urgent, standard
        const userPreference = context.force_channel || this.preferences.preferred_channel;

        // If user has explicit preference and it's available, use it
        if (userPreference && this.isChannelAvailable(userPreference)) {
            console.log('[WE4Free Router] Using user preference:', userPreference);
            return userPreference;
        }

        // For immediate emergencies, prioritize tel over everything
        if (urgency === 'immediate' && this.isChannelAvailable('tel')) {
            console.log('[WE4Free Router] Immediate urgency - routing to tel');
            return 'tel';
        }

        // Try last successful channel first
        if (this.preferences.last_successful && this.isChannelAvailable(this.preferences.last_successful)) {
            console.log('[WE4Free Router] Using last successful channel:', this.preferences.last_successful);
            return this.preferences.last_successful;
        }

        // Fallback through available channels
        for (const channel of this.channels) {
            if (this.isChannelAvailable(channel)) {
                console.log('[WE4Free Router] Fallback to channel:', channel);
                return channel;
            }
        }

        // Last resort: webchat (always available)
        console.log('[WE4Free Router] All channels unavailable, fallback to webchat');
        return 'webchat';
    },

    // Check if a channel is available
    isChannelAvailable(channel) {
        // Check if blocked by user
        if (this.preferences.blocked_channels.has(channel)) {
            return false;
        }

        // Check device capabilities
        switch (channel) {
            case 'tel':
                return this.capabilities.can_call;

            case 'sms':
                return this.capabilities.can_sms;

            case 'tty':
                return this.capabilities.can_tty;

            case 'webchat':
                // Webchat always available (offline form queues)
                return true;

            default:
                return false;
        }
    },

    // Get URL for a specific channel
    getChannelUrl(channel, number = '988') {
        switch (channel) {
            case 'tel':
                return `tel:${number}`;

            case 'sms':
                return `sms:${number}&body=I%20need%20help`;

            case 'tty':
                return `tel:711`;

            case 'webchat':
                return '/webchat.html';

            default:
                return '/emergency.html';
        }
    },

    // Route to best available channel
    route(context = {}) {
        const bestChannel = this.getBestChannel(context);
        const url = this.getChannelUrl(bestChannel, context.number);

        console.log('[WE4Free Router] Routing:', {
            channel: bestChannel,
            url: url,
            context: context
        });

        // Track usage
        this.trackChannelUsage(bestChannel, context);

        return {
            channel: bestChannel,
            url: url,
            fallback: this.getNextBestChannel(bestChannel)
        };
    },

    // Get next best channel for fallback
    getNextBestChannel(currentChannel) {
        const currentIndex = this.channels.indexOf(currentChannel);

        for (let i = currentIndex + 1; i < this.channels.length; i++) {
            if (this.isChannelAvailable(this.channels[i])) {
                return this.channels[i];
            }
        }

        return 'webchat'; // Always fallback to webchat
    },

    // Track channel usage and success
    trackChannelUsage(channel, context) {
        const usage = {
            channel: channel,
            timestamp: Date.now(),
            context: context,
            capabilities: {...this.capabilities}
        };

        // Store in IndexedDB if available
        if (typeof WE4FreeDB !== 'undefined' && WE4FreeDB.db) {
            WE4FreeDB.db.table('sync_status').put({
                province_code: `channel_usage_${Date.now()}`,
                last_sync: usage.timestamp,
                pending: false,
                state: JSON.stringify(usage)
            }).catch(err => {
                console.error('[WE4Free Router] Failed to track usage:', err);
            });
        }

        console.log('[WE4Free Router] Channel usage tracked:', usage);
    },

    // Mark channel as successful
    markSuccess(channel) {
        this.preferences.last_successful = channel;
        this.savePreferences();
        console.log('[WE4Free Router] Channel marked successful:', channel);
    },

    // Block a channel (user preference)
    blockChannel(channel) {
        this.preferences.blocked_channels.add(channel);
        this.savePreferences();
        console.log('[WE4Free Router] Channel blocked:', channel);
    },

    // Set preferred channel
    setPreferredChannel(channel) {
        if (this.channels.includes(channel)) {
            this.preferences.preferred_channel = channel;
            this.savePreferences();
            console.log('[WE4Free Router] Preferred channel set:', channel);
            return true;
        }
        return false;
    },

    // Setup channel tracking hooks
    setupTracking() {
        // Track tel: link clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="tel:"]');
            if (link) {
                const number = link.getAttribute('href').replace('tel:', '');
                console.log('[WE4Free Router] Tel link clicked:', number);
                this.trackChannelUsage('tel', { number: number, source: 'link_click' });
                this.markSuccess('tel');
            }
        });

        // Track sms: link clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="sms:"]');
            if (link) {
                console.log('[WE4Free Router] SMS link clicked');
                this.trackChannelUsage('sms', { source: 'link_click' });
                this.markSuccess('sms');
            }
        });

        // Track webchat navigation
        if (window.location.pathname === '/webchat.html') {
            this.trackChannelUsage('webchat', { source: 'page_view' });
        }
    },

    // Get router status
    getStatus() {
        return {
            capabilities: {...this.capabilities},
            preferences: {
                preferred: this.preferences.preferred_channel,
                last_successful: this.preferences.last_successful,
                blocked: Array.from(this.preferences.blocked_channels)
            },
            available_channels: this.channels.filter(ch => this.isChannelAvailable(ch)),
            recommended_channel: this.getBestChannel()
        };
    }
};

// Auto-initialize after page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => WE4FreeChannelRouter.init(), 500);
    });
} else {
    setTimeout(() => WE4FreeChannelRouter.init(), 500);
}

// Expose for console access and integration
window.WE4FreeChannelRouter = WE4FreeChannelRouter;
