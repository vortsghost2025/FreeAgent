# Medical Module Plugins

This directory contains plugins that extend the medical data processing pipeline.

## What are Plugins?

Plugins allow you to add custom functionality to the medical module without modifying core code. They can:

- Intercept data at any point in the pipeline (hooks)
- Add custom processing logic
- Integrate with external systems
- Extend classification capabilities
- Add custom validation rules
- Implement custom output formatters

## Plugin Structure

Every plugin must export an object with this structure:

```javascript
export default {
  // Required: Plugin metadata
  metadata: {
    name: 'my-plugin',              // Unique plugin name
    version: '1.0.0',               // Plugin version
    description: 'My plugin',       // Short description
    author: 'Your Name',            // Plugin author
    requiresModuleVersion: '1.0.0'  // Minimum module version (optional)
  },

  // Optional: Initialization
  async initialize() {
    // Setup code (database connections, config loading, etc.)
  },

  // Optional: Hook handlers
  hooks: {
    'post-triage': async (data) => {
      // Modify data after classification
      return data;
    }
  },

  // Optional: Direct execution
  async execute(context) {
    // Called when plugin is invoked directly
    return result;
  },

  // Optional: Cleanup
  async cleanup() {
    // Teardown code (close connections, etc.)
  }
};
```

## Available Hooks

Plugins can register handlers for these hooks:

| Hook Name              | When Executed                   | Use Cases                           |
|------------------------|--------------------------------|-------------------------------------|
| `pre-ingestion`        | Before pipeline starts         | Input validation, preprocessing     |
| `post-ingestion`       | After ingestion completes      | Data normalization, enrichment      |
| `pre-triage`           | Before classification          | Custom classification logic         |
| `post-triage`          | After classification           | Override/augment classification     |
| `pre-summarization`    | Before summarization           | Custom field extraction             |
| `post-summarization`   | After summarization            | Add computed fields                 |
| `pre-risk-scoring`     | Before risk scoring            | Custom risk factors                 |
| `post-risk-scoring`    | After risk scoring             | Override risk assessment            |
| `pre-output`           | Before output formatting       | Add provenance, audit logs          |
| `post-output`          | After pipeline completes       | Notifications, external integrations|
| `on-error`             | When any agent errors          | Custom error handling, alerts       |
| `on-validation-fail`   | When validation fails          | Custom validation logic             |

## Example Plugins

### 1. Audit Logger Plugin

Logs all classification decisions to an external system:

```javascript
export default {
  metadata: {
    name: 'audit-logger',
    version: '1.0.0',
    description: 'Logs decisions to audit system'
  },

  hooks: {
    'post-output': async (data) => {
      // Send to audit system
      await fetch('https://audit.example.com/log', {
        method: 'POST',
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          classification: data.output.classification,
          riskScore: data.output.riskScore
        })
      });

      return data; // Always return data
    }
  }
};
```

### 2. Custom Classifier Plugin

Adds an additional classification check:

```javascript
export default {
  metadata: {
    name: 'custom-classifier',
    version: '1.0.0',
    description: 'Adds custom classification rules'
  },

  hooks: {
    'post-triage': async (data) => {
      const { classification } = data;

      // Override low-confidence classifications
      if (classification.confidence < 0.5) {
        classification.flags.push('reviewed-by-custom-classifier');

        // Apply custom logic
        if (await this.isHighPriority(data.raw)) {
          classification.route = 'urgent';
          classification.flags.push('flagged-as-urgent');
        }
      }

      return data;
    }
  },

  async isHighPriority(rawData) {
    // Custom logic
    return rawData.urgency === 'high';
  }
};
```

### 3. Anonymization Plugin

Removes PII before processing:

```javascript
export default {
  metadata: {
    name: 'anonymizer',
    version: '1.0.0',
    description: 'Removes PII from data'
  },

  hooks: {
    'pre-ingestion': async (data) => {
      // Remove sensitive fields
      const sensitiveFields = ['patientName', 'ssn', 'mrn', 'phoneNumber'];

      if (typeof data.raw === 'object') {
        sensitiveFields.forEach(field => {
          if (data.raw[field]) {
            data.raw[field] = '[REDACTED]';
          }
        });
      }

      return data;
    }
  }
};
```

### 4. Slack Notification Plugin

Sends alerts for high-risk cases:

```javascript
export default {
  metadata: {
    name: 'slack-notifier',
    version: '1.0.0',
    description: 'Sends Slack alerts for high-risk cases'
  },

  async initialize() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || '';
  },

  hooks: {
    'post-output': async (data) => {
      const { riskScore } = data.output;

      if (riskScore.severity === 'high' && this.webhookUrl) {
        await fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `⚠️ High-risk case detected: ${riskScore.score}`
          })
        });
      }

      return data;
    }
  }
};
```

## Using Plugins

### Automatic Discovery

Place your plugin file in the `plugins/` directory and it will be automatically discovered:

```javascript
import { createPluginManager } from './utils/plugin-manager.js';

const pluginManager = createPluginManager({ verbose: true });
const plugins = await pluginManager.discoverPlugins();

for (const plugin of plugins) {
  await pluginManager.registerPlugin(plugin.module);
}
```

### Manual Registration

Register a plugin directly:

```javascript
import myPlugin from './my-custom-plugin.js';
import { createPluginManager } from './utils/plugin-manager.js';

const pluginManager = createPluginManager();
await pluginManager.registerPlugin(myPlugin);
```

### Executing Hooks

In your orchestrator or agents:

```javascript
// Before triage
data = await pluginManager.executeHook('pre-triage', data);

// After classification
data = await pluginManager.executeHook('post-triage', data);

// After everything completes
result = await pluginManager.executeHook('post-output', result);
```

## Plugin Development Tips

### 1. Always Return Data

Hook handlers must return the (potentially modified) data:

```javascript
hooks: {
  'post-triage': async (data) => {
    data.classification.myCustomField = 'value';
    return data; // ← REQUIRED!
  }
}
```

### 2. Handle Errors Gracefully

Don't let errors in your plugin crash the pipeline:

```javascript
hooks: {
  'post-output': async (data) => {
    try {
      await externalAPI.call(data);
    } catch (error) {
      console.error('Plugin failed but continuing:', error);
    }
    return data; // Always return
  }
}
```

### 3. Use Metadata for Discoverability

Provide rich metadata so users know what your plugin does:

```javascript
metadata: {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'Clear description of what this plugin does',
  author: 'Your Name <email@example.com>',
  repository: 'https://github.com/user/plugin',
  requiresModuleVersion: '1.0.0',
  tags: ['validation', 'external-integration']
}
```

### 4. Cleanup Resources

If your plugin opens connections or allocates resources, clean them up:

```javascript
async initialize() {
  this.db = await connectToDatabase();
},

async cleanup() {
  await this.db.close();
}
```

### 5. Test Your Plugin

Create tests for your plugin:

```javascript
// test-my-plugin.js
import myPlugin from './plugins/my-plugin.js';

await myPlugin.initialize();

const testData = { /* ... */ };
const result = await myPlugin.hooks['post-triage'](testData);

console.assert(result.classification.myCustomField === 'expected');

await myPlugin.cleanup();
console.log('✅ Plugin test passed');
```

## Plugin Security

⚠️ **Important Security Considerations:**

1. **Trust**: Only load plugins from trusted sources
2. **Validation**: Plugins have full access to pipeline data
3. **Errors**: Plugin errors can affect pipeline behavior
4. **Side Effects**: Plugins can call external APIs, write files, etc.
5. **Isolation**: Consider running untrusted plugins in sandboxes

## Best Practices

1. ✅ Keep plugins focused on one task
2. ✅ Document what data your plugin modifies
3. ✅ Use semver for versioning
4. ✅ Test with various input types
5. ✅ Handle errors gracefully
6. ✅ Clean up resources
7. ✅ Don't block the pipeline (avoid long-running operations)
8. ✅ Provide clear error messages

## Troubleshooting

### Plugin Not Loading

- Check file name (must end with `.js`)
- Ensure proper ES6 module syntax (`export default`)
- Verify metadata includes required fields
- Check console for error messages

### Hook Not Executing

- Verify hook name is correct (see Available Hooks table)
- Ensure plugin is registered before pipeline runs
- Check verbose logs: `createPluginManager({ verbose: true })`

### Version Compatibility

- Check `requiresModuleVersion` in plugin metadata
- Module version must match semver requirements
- Update plugin or module version as needed

---

**Questions or issues?** Check the main README or open an issue on GitHub.
