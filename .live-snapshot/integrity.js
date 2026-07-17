// ==============================================
// WE4Free Integrity Verification
// SHA-256 hashing via Web Crypto API
// ==============================================

const WE4FreeIntegrity = {
    manifest: null,
    verified: new Set(),
    failed: new Set(),

    // Initialize and load integrity manifest
    async init() {
        try {
            const response = await fetch('/integrity.manifest.json');
            if (!response.ok) {
                console.warn('[WE4Free] Integrity manifest not found, verification disabled');
                return false;
            }

            this.manifest = await response.json();
            console.log('[WE4Free] Integrity manifest loaded:', Object.keys(this.manifest.files).length, 'files');
            return true;

        } catch (error) {
            console.error('[WE4Free] Failed to load integrity manifest:', error);
            return false;
        }
    },

    // Compute SHA-256 hash of content
    async computeHash(content) {
        try {
            // Convert string/response to ArrayBuffer
            let buffer;
            if (typeof content === 'string') {
                buffer = new TextEncoder().encode(content);
            } else if (content instanceof Response) {
                buffer = await content.arrayBuffer();
            } else if (content instanceof ArrayBuffer) {
                buffer = content;
            } else {
                throw new Error('Unsupported content type');
            }

            // Compute SHA-256
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);

            // Convert to hex string
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            return hashHex;

        } catch (error) {
            console.error('[WE4Free] Hash computation failed:', error);
            return null;
        }
    },

    // Verify file against manifest
    async verifyFile(url, content) {
        if (!this.manifest) {
            // No manifest loaded, allow all files (graceful degradation)
            return true;
        }

        try {
            // Normalize URL
            const cleanUrl = url.replace(window.location.origin, '');

            const expected = this.manifest.files[cleanUrl];
            if (!expected) {
                console.warn('[WE4Free] No hash found for:', cleanUrl);
                // File not in manifest - allow (new files, dynamic resources)
                return true;
            }

            const computed = await this.computeHash(content);
            if (!computed) {
                console.error('[WE4Free] Failed to compute hash for:', cleanUrl);
                this.failed.add(cleanUrl);
                return false;
            }

            if (computed === expected.sha256) {
                console.log('[WE4Free] Integrity verified ✓:', cleanUrl);
                this.verified.add(cleanUrl);
                return true;
            } else {
                console.error('[WE4Free] Integrity verification FAILED ✗:', cleanUrl);
                console.error('  Expected:', expected.sha256);
                console.error('  Computed:', computed);
                this.failed.add(cleanUrl);
                return false;
            }

        } catch (error) {
            console.error('[WE4Free] Verification error:', error);
            this.failed.add(url);
            return false;
        }
    },

    // Verify response from fetch
    async verifyResponse(response) {
        if (!response.ok) {
            return false;
        }

        try {
            // Clone response so we can read body without consuming original
            const clone = response.clone();
            const content = await clone.text();

            return await this.verifyFile(response.url, content);

        } catch (error) {
            console.error('[WE4Free] Response verification failed:', error);
            return false;
        }
    },

    // Get verification status
    getStatus() {
        return {
            manifest_loaded: !!this.manifest,
            verified_count: this.verified.size,
            failed_count: this.failed.size,
            verified_files: Array.from(this.verified),
            failed_files: Array.from(this.failed)
        };
    },

    // Manual verification of URL (for debugging)
    async verify(url) {
        try {
            const response = await fetch(url);
            const content = await response.text();
            return await this.verifyFile(url, content);
        } catch (error) {
            console.error('[WE4Free] Manual verification failed:', error);
            return false;
        }
    },

    // Alert user of integrity failures
    alertFailure(url) {
        // Create visible warning for critical failures
        const warning = document.createElement('div');
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #d32f2f;
            color: white;
            padding: 20px 30px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            max-width: 90%;
            text-align: center;
        `;

        warning.innerHTML = `
            <strong>⚠️ Security Warning</strong><br>
            <span style="font-size: 0.9rem;">A file failed integrity verification. Please refresh the page.</span><br>
            <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: white; color: #d32f2f; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                Refresh Now
            </button>
        `;

        document.body.appendChild(warning);

        // Auto-remove after 30 seconds
        setTimeout(() => warning.remove(), 30000);
    }
};

// Auto-initialize on load (but don't block)
if (typeof crypto !== 'undefined' && crypto.subtle) {
    WE4FreeIntegrity.init();
} else {
    console.warn('[WE4Free] Web Crypto API not available, integrity verification disabled');
}

// Expose for console access
window.WE4FreeIntegrity = WE4FreeIntegrity;
