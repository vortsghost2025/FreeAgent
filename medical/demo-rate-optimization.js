/**
 * DEMONSTRATION: Rate Limit Optimization System
 * Shows how to implement the three key optimizations: 
 * 1. Rate-limit-optimized agent routing strategy
 * 2. Token-minimizing prompt template
 * 3. Multi-provider load-balancing
 * OPTIMIZED FOR LOW-RESOURCE ENVIRONMENTS (≤4GB RAM, Single Core CPU)
 */

import RateLimitManager, { medicalConfig } from './utils/rate-limit-manager.js';
import IngestionAgent from './agents/ingestion_agent.js';
import TriageAgent from './agents/triage_agent.js';
import SummarizationAgent from './agents/summarization_agent.js';
import RiskAgent from './agents/risk_agent.js';
import OutputAgent from './agents/output_agent.js';

// Initialize the rate limit manager with medical configuration optimized for low-resource environments
const rateLimitManager = new RateLimitManager(medicalConfig);

console.log('🏥 Medical AI Ensemble - Resource-Efficient Rate Limit Optimization Demo');
console.log('=========================================================================');
console.log('🔧 Optimized for: ≤4GB RAM, Single Core CPU, No GPU acceleration');
console.log('⚡ Fixed delays: 300ms for retries and batching to reduce CPU overhead');
console.log('💾 Memory-mapped file caching to prevent OOM errors');

async function runOptimizedPipeline() {
  console.log('\n🚀 Starting optimized pipeline...\n');
  
  // Create agents
  const agents = {
    ingestion: new IngestionAgent('INGESTION_001'),
    triage: new TriageAgent('TRIAGE_001'),
    summarization: new SummarizationAgent('SUMMARIZATION_001'),
    risk: new RiskAgent('RISK_001'),
    output: new OutputAgent('OUTPUT_001')
  };

  // Sample medical data - simulating different types of medical records
  const sampleTasks = [
    {
      id: 'task_001',
      type: 'medical_processing',
      data: {
        content: 'Patient presents with chest pain, shortness of breath, elevated troponins. ECG shows ST elevation in leads II, III, aVF. Blood pressure 140/90, HR 95.',
        source: 'emergency_department',
        format: 'clinical_note'
      }
    },
    {
      id: 'task_002', 
      type: 'medical_processing',
      data: {
        content: 'CBC: WBC 8.5, RBC 4.2, Hemoglobin 12.5, Hematocrit 37.2, Platelets 280. BMP: Na 140, K 4.1, Cl 102, CO2 24, BUN 18, Creatinine 1.0, Glucose 95.',
        source: 'laboratory',
        format: 'lab_results'
      }
    },
    {
      id: 'task_003',
      type: 'medical_processing', 
      data: {
        content: 'Chest X-Ray: Clear lungs bilaterally, no acute cardiopulmonary process. Heart size normal. Mediastinal structures unremarkable. No pneumothorax or pleural effusion.',
        source: 'radiology',
        format: 'imaging_report'
      }
    }
  ];

  console.log(`📦 Processing ${sampleTasks.length} tasks with resource-efficient rate limit optimization...\n`);

  // Process each task through the optimized pipeline
  for (let i = 0; i < sampleTasks.length; i++) {
    const task = sampleTasks[i];
    console.log(`📋 Processing task ${i+1}/${sampleTasks.length}: ${task.id}`);
    
    try {
      // Start timing
      const startTime = Date.now();
      
      // Run through all agents in sequence
      let currentState = { startTime, processingHistory: [] };
      let currentTask = { ...task };
      
      // Each agent call goes through the rate limit manager
      console.log(`  🔄 Ingestion agent...`);
      const result1 = await rateLimitManager.executeTask(
        { ...currentTask, role: 'ingestion' }, 
        { role: 'ingestion', allowBatching: false }
      );
      currentTask = result1.task;
      currentState = result1.state;
      
      console.log(`  🔍 Triage agent...`);
      const result2 = await rateLimitManager.executeTask(
        { ...currentTask, role: 'triage' }, 
        { role: 'triage', allowBatching: false }
      );
      currentTask = result2.task;
      currentState = result2.state;
      
      console.log(`  📝 Summarization agent...`);
      const result3 = await rateLimitManager.executeTask(
        { ...currentTask, role: 'summarization' }, 
        { role: 'summarization', allowBatching: false }
      );
      currentTask = result3.task;
      currentState = result3.state;
      
      console.log(`  ⚠️ Risk assessment agent...`);
      const result4 = await rateLimitManager.executeTask(
        { ...currentTask, role: 'risk' }, 
        { role: 'risk', allowBatching: false }
      );
      currentTask = result4.task;
      currentState = result4.state;
      
      console.log(`  ✅ Output agent...`);
      const result5 = await rateLimitManager.executeTask(
        { ...currentTask, role: 'output' }, 
        { role: 'output', allowBatching: false }
      );
      currentTask = result5.task;
      currentState = result5.state;
      
      const totalTime = Date.now() - startTime;
      console.log(`  ✅ Completed in ${totalTime}ms\n`);
      
    } catch (error) {
      console.error(`  ❌ Error processing task ${task.id}:`, error.message);
    }
  }

  // Show final status
  console.log('\n📊 Final Optimization Statistics:');
  const status = rateLimitManager.getStatus();
  
  console.log(`  Total Requests: ${status.stats.totalRequests}`);
  console.log(`  Cached Responses: ${status.stats.cachedResponses} (${status.stats.cacheHitRate})`);
  console.log(`  Tokens Saved: ${status.stats.tokensSaved}`);
  console.log(`  Rate Limits Prevented: ${status.stats.rateLimitPrevented} (${status.stats.rateLimitPreventionRate})`);
  console.log(`  Errors: ${status.stats.errors}`);
  
  console.log('\n🔄 Provider Utilization:');
  for (const [providerId, providerStats] of Object.entries(status.balancerStatus)) {
    console.log(`  ${providerId}: ${providerStats.utilization.toFixed(1)}% utilization, ${providerStats.successRate.toFixed(1)}% success rate`);
  }
  
  console.log('\n✨ Resource-efficient rate limit optimization system demo completed!');
}

// Run the demonstration
runOptimizedPipeline().catch(console.error);

console.log('\n💡 Key Features Demonstrated (Resource Efficient):');
console.log('  1. 🔁 Rate-limit-optimized agent routing - with fixed delays to reduce CPU overhead');
console.log('  2. 📉 Token-minimizing prompt templates - reduced context sizes significantly'); 
console.log('  3. 🌐 Multi-provider load balancing - efficient distribution across services');
console.log('  4. 💾 File-based caching - prevents OOM errors in low-memory environments');
console.log('  5. 📦 Conservative request batching - fixed 300ms windows to reduce CPU overhead');
console.log('  6. ⏱️ Fixed backoff delays - predictable resource usage');
console.log('  7. 🎯 Reduced concurrency limits - prevents overwhelming low-resource systems');