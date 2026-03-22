import { createServer } from 'http';
import { config } from 'dotenv';
config();

async function startWebInterface() {
  try {
    console.log('🚀 Launching Enhanced AI Environment with 48-Layer Memory...');
    
    // Import and run the enhanced AI environment directly
    const { EnhancedAIEnvironment } = await import('./enhanced-persistent-ai-environment.js');
    const env = new EnhancedAIEnvironment({
      environmentPath: './enhanced-ai-environment'
    });
    
    await env.initialize();
    console.log('✅ Enhanced AI Environment initialized');
    
    // Import the Express app instead of starting the server directly
    const aiEnvironmentApiModule = await import('./ai-environment-api.js');
    const app = aiEnvironmentApiModule.default;

    // Create server and listen on port 7771 (ignore PORT env — reserved for VS Code)
    const server = createServer(app);
    const PORT = 7771;
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Web Interface] Port ${PORT} is already in use. Kill the existing process first.`);
        console.error(`  PowerShell: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force`);
      } else {
        console.error('[Web Interface] Server error:', err);
      }
      process.exit(1);
    });
    server.listen(PORT, () => {
      console.log(`🌟 Web interface server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Web Interface] Error starting:', error);
    process.exit(1);
  }
}

startWebInterface();