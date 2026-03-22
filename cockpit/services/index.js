/**
 * FreeAgent Cockpit Services Index
 * 
 * Central registry of all available services in the cockpit.
 * Each service is a subsystem that agents can access through the orchestrator.
 */

const services = {
  // WebFetch - Indirect web browsing
  webfetch: {
    name: 'WebFetch',
    description: 'Fetch URLs safely through the backend',
    type: 'utility',
    status: true,
    endpoint: '/services/webfetch',
    enabled: true,
    module: require('./webfetch')
  },

  // Proxy API - External API calls
  proxyApi: {
    name: 'Proxy API',
    description: 'Make external API calls through the backend',
    type: 'utility',
    status: true,
    endpoint: '/services/proxy-api',
    enabled: true,
    allowedServices: ['github', 'weather', 'news', 'custom'],
    module: require('./proxyApi')
  },

  // FileBridge - Local filesystem sandbox
  filebridge: {
    name: 'FileBridge',
    description: 'Read/write files in sandboxed directory',
    type: 'filesystem',
    status: true,
    endpoint: '/services/file',
    enabled: true,
    sandboxRoot: './sandbox',
    module: require('./filebridge')
  },

  // DeviceBridge - Hardware communication
  devicebridge: {
    name: 'DeviceBridge',
    description: 'Communicate with hardware (Claw, robots, IoT)',
    type: 'hardware',
    status: true,
    endpoint: '/services/devicebridge',
    enabled: true,
    module: require('./devicebridge')
  },

  // DataStore - Structured persistence
  datastore: {
    name: 'DataStore',
    description: 'Store and query structured records',
    type: 'database',
    status: true,
    endpoint: '/services/datastore',
    enabled: true,
    module: require('./datastore')
  },

  // Scheduler - Background tasks
  scheduler: {
    name: 'Scheduler',
    description: 'Schedule tasks for later execution',
    type: 'system',
    status: true,
    endpoint: '/services/scheduler',
    enabled: true,
    module: require('./scheduler')
  },

  // Chunked Processing - Large data handling
  chunked: {
    name: 'Chunked Processing',
    description: 'Process large datasets in chunks',
    type: 'processing',
    status: true,
    endpoint: '/services/chunked',
    enabled: true,
    module: require('./chunked')
  },

  // Claw - Kilo-powered tool agent (code analysis/refactor)
  claw: {
    name: 'Claw',
    description: 'Kilo-powered tool agent for code analysis and refactoring',
    type: 'agent',
    status: true,
    endpoint: '/services/claw',
    enabled: true,
    module: require('./claw')
  },

  // EventBus - Agent communication
  eventbus: {
    name: 'EventBus',
    description: 'Agent-to-agent communication and event routing',
    type: 'messaging',
    status: true,
    endpoint: '/services/eventbus',
    enabled: true,
    module: require('./eventBus')
  },

  // Service Metrics - Cockpit graphs
  metrics: {
    name: 'ServiceMetrics',
    description: 'Real-time service metrics for cockpit visualization',
    type: 'monitoring',
    status: true,
    endpoint: '/services/metrics',
    enabled: true,
    module: require('./metrics')
  }
};

/**
 * Get all services
 */
function getAllServices() {
  return services;
}

/**
 * Get service by name
 */
function getService(name) {
  return services[name];
}

/**
 * Enable a service
 */
function enableService(name) {
  if (services[name]) {
    services[name].enabled = true;
    services[name].status = true;
    return true;
  }
  return false;
}

/**
 * Disable a service
 */
function disableService(name) {
  if (services[name]) {
    services[name].enabled = false;
    services[name].status = false;
    return true;
  }
  return false;
}

/**
 * Get enabled services
 */
function getEnabledServices() {
  return Object.entries(services)
    .filter(([_, svc]) => svc.enabled)
    .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
}

module.exports = {
  services,
  getAllServices,
  getService,
  enableService,
  disableService,
  getEnabledServices
};
