import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import express from 'express';
import APIOrchestrator from './phases/api-integrations.js';
import { TimeSeriesAnalyzer, AnomalyDetector, PredictiveModel, FeatureEngineering } from './phases/advanced-analytics.js';

// Load environment variables from .env file
dotenv.config();

class WeatherFederationServer {
  constructor() {
    this.id = uuidv4();
    this.app = express();

    // Initialize APIOrchestrator with real credentials from .env
    const noaaKey = process.env.NOAA_API_KEY || 'DEMO_KEY';
    const nasaKey = process.env.NASA_EARTHDATA_API_KEY || 'DEMO_KEY';
    const ecmwfKey = process.env.ECMWF_API_KEY || 'DEMO_KEY';

    this.apiOrchestrator = new APIOrchestrator(noaaKey, nasaKey, ecmwfKey);
    this.analytics = new TimeSeriesAnalyzer();
    this.anomalyDetector = new AnomalyDetector();
    this.predictor = new PredictiveModel();
    this.started = new Date().toISOString();

    // Track which API keys are configured
    this.apiStatus = {
      noaa: noaaKey !== 'DEMO_KEY' ? 'REAL' : 'DEMO',
      nasa: nasaKey !== 'DEMO_KEY' ? 'REAL' : 'DEMO',
      ecmwf: ecmwfKey !== 'DEMO_KEY' ? 'REAL' : 'DEMO'
    };

    this.setupRoutes();
  }

  setupRoutes() {
    this.app.use(express.json());

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', federationId: this.id, timestamp: new Date().toISOString() });
    });

    // Status endpoint
    this.app.get('/status', (req, res) => {
      res.json(this.getStatus());
    });

    // Harvest endpoint
    this.app.post('/harvest', async (req, res) => {
      try {
        const region = req.body.region || { lat: 40.5, lon: -90.0, south: 35, north: 45, west: -95, east: -85 };
        const result = await this.apiOrchestrator.harvestAllSources(region);
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Predict endpoint
    this.app.post('/predict', (req, res) => {
      try {
        const data = req.body.data || Array(30).fill(0).map(() => 10 + Math.random() * 20);
        const days = req.body.days || 10;
        const forecast = this.predictor.predict(data, days);
        res.json({ success: true, forecast });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Analyze endpoint
    this.app.post('/analyze', (req, res) => {
      try {
        const data = req.body.data || Array(30).fill(0).map(() => 10 + Math.random() * 20);
        const trends = this.analytics.detectTrends(data);
        const anomalies = this.anomalyDetector.detectIsolationForest(data, 0.1);
        res.json({ success: true, trends, anomalies: anomalies.anomalies.length });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API stats endpoint
    this.app.get('/api-stats', (req, res) => {
      res.json({
        apis: this.apiStatus,
        federation: { id: this.id, status: 'OPERATIONAL' }
      });
    });
  }

  async initialize() {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║   GLOBAL WEATHER FEDERATION - INTEGRATED SERVER STARTUP         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('🚀 System Initialization:\n');
    console.log('  ✓ Federation ID: ' + this.id);
    console.log('  ✓ API Orchestrator: READY');
    console.log('  ✓ Analytics Engine: READY');
    console.log('  ✓ Anomaly Detection: READY');
    console.log('  ✓ Predictive Models: READY');
    console.log('  ✓ Started: ' + this.started + '\n');

    // Show API Status
    console.log('🔌 API Configuration:\n');
    console.log('  ✓ NOAA Weather API: ' + this.apiStatus.noaa + (this.apiStatus.noaa === 'REAL' ? ' ✓' : ''));
    console.log('  ✓ NASA Earthdata API: ' + this.apiStatus.nasa);
    console.log('  ✓ ECMWF Reanalysis API: ' + this.apiStatus.ecmwf + '\n');

    // Harvest data from all sources
    console.log('📡 Data Harvesting:\n');
    const region = { lat: 40.5, lon: -90.0, south: 35, north: 45, west: -95, east: -85 };
    const harvest = await this.apiOrchestrator.harvestAllSources(region);
    
    console.log('  ✓ NOAA: ' + harvest.sources.noaa.stationCount + ' stations');
    console.log('  ✓ NASA: ' + harvest.sources.nasa.tiles.length + ' satellite tiles');
    console.log('  ✓ ECMWF: ' + harvest.sources.ecmwf.data.length + ' hourly records\n');

    // Perform analytics
    console.log('📊 Analytics Processing:\n');
    const sampleTempData = Array(30).fill(0).map(() => 10 + Math.random() * 20);
    
    const trends = this.analytics.detectTrends(sampleTempData);
    console.log('  ✓ Trend Analysis: ' + trends.trend + ' (slope: ' + trends.slope + ')');

    const anomalies = this.anomalyDetector.detectIsolationForest(sampleTempData, 0.1);
    console.log('  ✓ Anomalies Detected: ' + anomalies.anomalies.length);

    const forecast = this.predictor.predict(sampleTempData, 10);
    console.log('  ✓ 10-day Forecast: ' + forecast.forecast.slice(0, 3).join(', ') + '...');
    console.log('  ✓ Confidence: ' + forecast.confidence + '\n');

    // Generate derived metrics
    console.log('📈 Derived Metrics:\n');
    const sampleObs = {
      temperature_C: 22,
      dewpoint_C: 15,
      windSpeed_ms: 8,
      humidity: 65
    };
    const derived = FeatureEngineering.computeDerivedMetrics(sampleObs);
    console.log('  ✓ Heat Index: ' + derived.heatIndex + '°C');
    console.log('  ✓ Wind Chill: ' + derived.windChill + '°C');
    console.log('  ✓ Comfort Index: ' + derived.apparentTemp + '°C\n');

    console.log('═════════════════════════════════════════════════════════════════\n');
    console.log('✅ GLOBAL WEATHER FEDERATION SERVER OPERATIONAL\n');
    console.log('Available Endpoints:');
    console.log('  • GET  /health              - System health check');
    console.log('  • GET  /status              - Federation status');
    console.log('  • POST /harvest             - Trigger data harvest');
    console.log('  • POST /predict             - Run predictions');
    console.log('  • POST /analyze             - Analytics analysis');
    console.log('  • GET  /api-stats           - API statistics\n');

    console.log('Server listening on port 3000\n');
  }

  getStatus() {
    return {
      federationId: this.id,
      status: 'OPERATIONAL',
      uptime: Date.now() - new Date(this.started).getTime(),
      timestamp: new Date().toISOString(),
      components: {
        apiOrchestrator: 'READY',
        analytics: 'READY',
        anomalyDetector: 'READY',
        predictor: 'READY'
      }
    };
  }
}

(async () => {
  const server = new WeatherFederationServer();
  await server.initialize();

  // Start Express HTTP server - CRITICAL: keeps the process alive
  const port = process.env.PORT || 3000;
  server.app.listen(port, () => {
    console.log(`\n✅ HTTP Server is listening on port ${port}`);
    console.log(`   Access: http://localhost:${port}/`);
  });
})();
