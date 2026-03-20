// Rolling cleanup for adaptive runtime
// Cleans up old sessions, memory, and temporary data when system is under stress

const fs = require('fs');
const path = require('path');

function rollingCleanup() {
  console.log('[Cleanup] Running rolling cleanup...');
  
  // Clean up old temp files if any
  const tempDir = path.join(__dirname, '..', '..', 'temp');
  if (fs.existsSync(tempDir)) {
    try {
      const files = fs.readdirSync(tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      files.forEach(file => {
        const filePath = path.join(tempDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > maxAge) {
            fs.unlinkSync(filePath);
            console.log(`[Cleanup] Removed old file: ${file}`);
          }
        } catch (e) {
          // Ignore individual file errors
        }
      });
    } catch (e) {
      console.log('[Cleanup] Temp directory access error:', e.message);
    }
  }
  
  // Log cleanup completion
  console.log('[Cleanup] Rolling cleanup complete');
}

module.exports = { rollingCleanup };
