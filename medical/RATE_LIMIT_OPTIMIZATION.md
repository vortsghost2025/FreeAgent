# Rate Limit Optimization for Medical AI Ensemble

This guide explains how to use the rate limit optimization system to prevent hitting API limits when running multiple AI agents simultaneously, specifically optimized for low-resource environments (≤4GB RAM, Single Core CPU).

## Key Components

### 1. Rate-Limit-Optimized Agent Routing Strategy

The `RateLimitOptimizer` class implements several strategies to minimize rate limit hits:

- **File-based Caching**: Stores results on disk instead of memory to prevent OOM errors
- **Fixed-delay Batching**: Uses consistent 300ms windows to reduce CPU overhead
- **Provider Selection**: Chooses the least-used provider based on recent activity
- **Fixed Backoff**: Applies consistent delays when rate limits occur (reduces CPU overhead)

### 2. Token-Minimizing Prompt Template

The `PromptOptimizer` reduces token usage through:

- **Context Compression**: Aggressively removes unnecessary fields and truncates long texts
- **Role-Based Templates**: Uses minimal system prompts tailored to each agent role
- **History Summarization**: Converts long conversation histories to brief summaries
- **Intelligent Truncation**: Preserves key information while removing verbosity

### 3. Multi-Provider Load Balancing

The `ProviderBalancer` distributes requests across multiple providers:

- **Conservative Concurrency**: Limits concurrent requests to prevent overwhelming low-resource systems
- **Performance Tracking**: Monitors response times and success rates
- **Simple Weighting**: Uses straightforward calculations to reduce CPU overhead
- **Fixed Retry Delays**: Uses consistent delays to reduce CPU overhead

## Implementation

### Basic Integration

```javascript
import RateLimitManager, { medicalConfig } from './utils/rate-limit-manager.js';

// Initialize with your provider configuration optimized for low-resources
const rateLimitManager = new RateLimitManager(medicalConfig);

// Process a task through the optimized system
const result = await rateLimitManager.executeTask(task, {
  role: 'ingestion',           // Agent role
  allowBatching: true,         // Enable request batching
  maxContextLength: 1500       // Reduced context for low-resource environments
});
```

### Advanced Configuration for Low-Resource Environments

```javascript
const customConfig = {
  providers: [
    { 
      id: 'openai-gpt4', 
      endpoint: process.env.OPENAI_ENDPOINT,
      apiKey: process.env.OPENAI_API_KEY,
      priority: 1,             // Higher priority = chosen first
      weight: 2,               // Relative capacity weighting
      maxConcurrency: 5,       // Reduced for low-resource environments
      rateLimit: { rpm: 1000, tpm: 1000000 },  // Rate limits
      costPerMillion: 10       // Cost per million tokens
    },
    // Add more providers...
  ],
  batchSize: 3,               // Reduced for low-resource environments
  maxRetries: 2,              // Reduced for low-resource environments
  retryDelay: 300,            // Fixed delay to reduce CPU overhead
  enableCaching: true,        // Enable result caching
  enableBatches: true,        // Enable request batching
  enablePromptOptimization: true  // Enable token reduction
};

const rateLimitManager = new RateLimitManager(customConfig);
```

## Resource Efficiency Features

### Memory Management
- File-based caching instead of in-memory storage to prevent OOM errors
- Limited history tracking to conserve memory
- Reduced batch sizes to manage memory usage

### CPU Optimization
- Fixed delays instead of dynamic calculations to reduce CPU overhead
- Simplified scoring algorithms that don't require complex computations
- Conservative concurrency limits to prevent overwhelming single-core systems

### Network Efficiency
- Reduced context lengths to minimize data transfer
- Intelligent request batching to combine similar operations
- Optimized retry logic to prevent excessive network calls

## Best Practices for Low-Resource Environments

### 1. For Systems with ≤4GB RAM
- Use file-based caching instead of memory-only caching
- Reduce batch sizes to prevent memory spikes
- Implement cache cleanup routines to free up space

### 2. For Single-Core CPUs
- Use fixed delays instead of dynamic backoff calculations
- Reduce concurrency to prevent overwhelming the CPU
- Simplify processing algorithms to reduce computational overhead

### 3. For No-GPU Environments
- Offload processing to external APIs when possible
- Reduce local computation requirements
- Optimize data preprocessing to minimize computational needs

## Monitoring

Check the system status regularly:

```javascript
const status = rateLimitManager.getStatus();

console.log('Overall Stats:', status.stats);
console.log('Provider Status:', status.balancerStatus);
console.log('Optimizer Status:', status.optimizerStatus);
```

## Testing the System

Run the demonstration to see optimizations in action:

```bash
node demo-rate-optimization.js
```

This will process sample medical data through the optimized pipeline and show statistics about:
- Requests processed
- Cache hit rate
- Tokens saved
- Rate limits prevented
- Provider utilization

## Troubleshooting

### Common Issues:

1. **Rate limits still occurring**:
   - Verify all providers are properly configured
   - Check if providers have lower limits than configured
   - Increase fixed retry delays if consistently hitting limits

2. **High memory usage**:
   - Verify file-based caching is working properly
   - Monitor temporary directory for cache buildup
   - Run cache cleanup periodically

3. **High CPU usage**:
   - Ensure fixed delays are being used instead of dynamic calculations
   - Reduce concurrency levels further
   - Consider staggering requests across longer time periods

The resource-efficient rate limit optimization system is designed to scale with your needs while maintaining performance on constrained hardware.