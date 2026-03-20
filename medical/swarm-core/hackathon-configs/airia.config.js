// Airia AI Agents Challenge Configuration
// Target: $7K prize, 20-day timeline
// Focus: Fast, mobile-friendly agent responses

module.exports = {
  hackathon: 'Airia AI Agents',
  prize: '$7K',
  deadline: '20 days',
  
  agentConfig: {
    capabilities: ['fast-response', 'mobile-interface', 'voice-input'],
    responseTimeTarget: 100, // ms
    maxAgents: 50, // Lightweight deployment
    demoDuration: 30 // seconds
  },
  
  demoScript: {
    intro: "Meet our lightning-fast AI agents",
    main: "Watch real-time coordination in action",
    climax: "Sub-100ms response times demonstrated",
    close: "Perfect for mobile applications"
  },
  
  resourceAllocation: {
    credits: {
      alibaba: 10000000, // 10M for stress testing
      aws: 50, // $50 for cloud demo
      digitalocean: 100 // $100 for staging
    },
    focus: 'mobile-performance'
  },
  
  submissionRequirements: {
    demoLength: '30 seconds',
    format: 'mobile-recording',
    platform: 'Airia portal',
    judgingCriteria: ['speed', 'simplicity', 'mobile-ux']
  }
};