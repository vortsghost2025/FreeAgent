#!/usr/bin/env node
/**
 * Simple Agent Task Assignment Demo
 * Shows how to assign tasks to the 9 agents in the system
 */

// Agent information
const AGENTS = {
  code: { name: 'Code Agent', specialty: 'Software development, coding, debugging' },
  data: { name: 'Data Agent', specialty: 'Data analysis, processing, visualization' },
  clinical: { name: 'Clinical Agent', specialty: 'Medical analysis, healthcare data' },
  test: { name: 'Test Agent', specialty: 'Testing, QA, validation' },
  security: { name: 'Security Agent', specialty: 'Security analysis, vulnerability assessment' },
  api: { name: 'API Agent', specialty: 'API development, integration, documentation' },
  db: { name: 'Database Agent', specialty: 'Database design, queries, optimization' },
  devops: { name: 'DevOps Agent', specialty: 'Deployment, infrastructure, CI/CD' },
  kilo: { name: 'Kilo Master', specialty: 'Orchestration, coordination, system management' }
};

// Sample tasks to demonstrate assignment
const SAMPLE_TASKS = [
  {
    description: "Implement user authentication system with JWT tokens",
    requiredSkills: ["coding", "security", "api"]
  },
  {
    description: "Analyze patient medical records for treatment patterns",
    requiredSkills: ["data", "clinical", "analysis"]
  },
  {
    description: "Set up automated CI/CD pipeline with Docker containers",
    requiredSkills: ["devops", "deployment", "automation"]
  },
  {
    description: "Write comprehensive unit tests for all API endpoints",
    requiredSkills: ["testing", "api", "validation"]
  },
  {
    description: "Optimize slow database queries in the patient records system",
    requiredSkills: ["database", "optimization", "performance"]
  },
  {
    description: "Conduct security penetration testing on the web application",
    requiredSkills: ["security", "testing", "vulnerability"]
  },
  {
    description: "Design RESTful API for the medical dashboard interface",
    requiredSkills: ["api", "design", "documentation"]
  },
  {
    description: "Debug memory leak in the cockpit server application",
    requiredSkills: ["debugging", "coding", "memory"]
  }
];

function findBestAgent(skills) {
  // Simple matching algorithm
  let bestMatches = [];
  
  for (const [agentKey, agent] of Object.entries(AGENTS)) {
    let matchScore = 0;
    
    // Check each required skill against agent specialty
    for (const skill of skills) {
      if (agent.specialty.toLowerCase().includes(skill.toLowerCase())) {
        matchScore += 2; // Strong match
      }
    }
    
    if (matchScore > 0) {
      bestMatches.push({ agent: agentKey, score: matchScore, info: agent });
    }
  }
  
  // Sort by score and return best match
  bestMatches.sort((a, b) => b.score - a.score);
  return bestMatches.length > 0 ? bestMatches[0] : null;
}

function demonstrateTaskAssignment() {
  console.log('🤖 DISTRIBUTED AGENT TASK ASSIGNMENT DEMO');
  console.log('==========================================');
  console.log(`Available Agents: ${Object.keys(AGENTS).length}\n`);
  
  // List all agents
  console.log('📋 AVAILABLE AGENTS:');
  console.log('===================');
  Object.entries(AGENTS).forEach(([key, agent]) => {
    console.log(`${key.padEnd(12)} - ${agent.name}`);
    console.log(`               Specialty: ${agent.specialty}\n`);
  });
  
  console.log('\n📝 TASK ASSIGNMENT EXAMPLES:');
  console.log('============================');
  
  // Assign sample tasks
  SAMPLE_TASKS.forEach((task, index) => {
    const bestAgent = findBestAgent(task.requiredSkills);
    
    console.log(`\n${index + 1}. Task: ${task.description}`);
    console.log(`   Required Skills: ${task.requiredSkills.join(', ')}`);
    
    if (bestAgent) {
      console.log(`   🎯 Assigned to: ${bestAgent.info.name} (${bestAgent.agent})`);
      console.log(`   Match Score: ${bestAgent.score}/6`);
    } else {
      console.log(`   ⚠️  No suitable agent found - task queued`);
    }
  });
  
  console.log('\n📊 ASSIGNMENT SUMMARY:');
  console.log('=====================');
  console.log(`Total Tasks: ${SAMPLE_TASKS.length}`);
  console.log(`Successfully Assigned: ${SAMPLE_TASKS.filter((_, i) => findBestAgent(SAMPLE_TASKS[i].requiredSkills)).length}`);
  console.log(`Queued Tasks: ${SAMPLE_TASKS.filter((_, i) => !findBestAgent(SAMPLE_TASKS[i].requiredSkills)).length}`);
  
  console.log('\n🚀 HOW TO USE IN YOUR SYSTEM:');
  console.log('============================');
  console.log('1. Access the web interface: http://localhost:8889/agent-task-manager.html');
  console.log('2. Or use the CLI: node agent-task-manager.js interactive');
  console.log('3. Define tasks with required skills');
  console.log('4. System automatically assigns to best matching agent');
  console.log('5. Track completion status in real-time');
}

// Run the demonstration
demonstrateTaskAssignment();