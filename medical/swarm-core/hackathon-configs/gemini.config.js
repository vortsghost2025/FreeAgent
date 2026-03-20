// Gemini Live Agent Challenge Configuration  
// Target: $80K prize, 17-day timeline
// Focus: Real-time streaming, voice-first interaction

module.exports = {
  hackathon: 'Gemini Live Agent Challenge',
  prize: '$80K', 
  deadline: '17 days',
  
  agentConfig: {
    capabilities: ['live-streaming', 'voice-interface', 'real-time-consensus'],
    responseTimeTarget: 500, // ms
    maxAgents: 1000, // Full-scale deployment
    demoDuration: 120 // 2 minutes
  },
  
  demoScript: {
    intro: "Introducing our production-ready agent swarm",
    main: "Real-time consensus building at scale",
    climax: "1000-agent stress test results",
    close: "Enterprise-grade reliability demonstrated"
  },
  
  resourceAllocation: {
    credits: {
      alibaba: 70000000, // Full 70M allocation
      gcp: 300, // $300 for premium features
      aws: 100 // $100 for additional testing
    },
    focus: 'enterprise-scalability'
  },
  
  submissionRequirements: {
    demoLength: '2 minutes',
    format: 'desktop-screen-recording',
    platform: 'Devpost',
    judgingCriteria: ['technical-depth', 'innovation', 'scalability']
  }
};