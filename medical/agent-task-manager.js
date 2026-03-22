#!/usr/bin/env node
/**
 * Distributed Agent Task Assignment System
 * Assigns tasks to the 9 available agents in the system
 */

import fs from 'fs';
import path from 'path';

class TaskAssignmentSystem {
  constructor() {
    this.agents = {
      code: { name: 'Code Agent', specialty: 'Software development, coding, debugging', status: 'available' },
      data: { name: 'Data Agent', specialty: 'Data analysis, processing, visualization', status: 'available' },
      clinical: { name: 'Clinical Agent', specialty: 'Medical analysis, healthcare data', status: 'available' },
      test: { name: 'Test Agent', specialty: 'Testing, QA, validation', status: 'available' },
      security: { name: 'Security Agent', specialty: 'Security analysis, vulnerability assessment', status: 'available' },
      api: { name: 'API Agent', specialty: 'API development, integration, documentation', status: 'available' },
      db: { name: 'Database Agent', specialty: 'Database design, queries, optimization', status: 'available' },
      devops: { name: 'DevOps Agent', specialty: 'Deployment, infrastructure, CI/CD', status: 'available' },
      kilo: { name: 'Kilo Master', specialty: 'Orchestration, coordination, system management', status: 'available' }
    };
    
    this.tasks = [];
    this.assignments = new Map();
  }

  async initialize() {
    console.log('🤖 DISTRIBUTED AGENT TASK ASSIGNMENT SYSTEM');
    console.log('===========================================');
    
    // Load existing assignments if any
    await this.loadExistingAssignments();
    
    console.log(`\n📋 Available Agents (${Object.keys(this.agents).length}):`);
    Object.entries(this.agents).forEach(([key, agent]) => {
      console.log(`  ${key.padEnd(10)} - ${agent.name} (${agent.specialty})`);
    });
  }

  async loadExistingAssignments() {
    try {
      const assignmentFile = 'agent-task-assignments.json';
      if (fs.existsSync(assignmentFile)) {
        const data = JSON.parse(await fs.promises.readFile(assignmentFile, 'utf8'));
        this.assignments = new Map(Object.entries(data.assignments || {}));
        this.tasks = data.tasks || [];
        console.log('✅ Loaded existing task assignments');
      }
    } catch (error) {
      console.log('ℹ️  No existing assignments found');
    }
  }

  async assignTask(taskDescription, requiredSkills = []) {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task = {
      id: taskId,
      description: taskDescription,
      requiredSkills: requiredSkills,
      createdAt: new Date().toISOString(),
      status: 'pending',
      assignedTo: null,
      completedAt: null
    };
    
    this.tasks.push(task);
    
    // Find best agent match
    const assignedAgent = this.findBestAgent(requiredSkills);
    
    if (assignedAgent) {
      task.assignedTo = assignedAgent;
      task.status = 'assigned';
      this.assignments.set(taskId, assignedAgent);
      this.agents[assignedAgent].status = 'busy';
      
      console.log(`\n✅ Task Assigned:`);
      console.log(`   Task: ${taskDescription}`);
      console.log(`   Assigned to: ${this.agents[assignedAgent].name}`);
      console.log(`   Agent specialty: ${this.agents[assignedAgent].specialty}`);
    } else {
      console.log(`\n⚠️  Task queued - no suitable agent available:`);
      console.log(`   Task: ${taskDescription}`);
    }
    
    await this.saveAssignments();
    return taskId;
  }

  findBestAgent(requiredSkills) {
    // Agent scoring based on skills match
    const agentScores = {};
    
    for (const [agentKey, agent] of Object.entries(this.agents)) {
      if (agent.status !== 'available') continue;
      
      let score = 0;
      
      // Score based on required skills
      for (const skill of requiredSkills) {
        if (agent.specialty.toLowerCase().includes(skill.toLowerCase())) {
          score += 2;
        }
      }
      
      // Base score for availability
      score += 1;
      
      agentScores[agentKey] = score;
    }
    
    // Find agent with highest score
    const bestAgent = Object.keys(agentScores).sort((a, b) => agentScores[b] - agentScores[a])[0];
    return agentScores[bestAgent] > 1 ? bestAgent : null;
  }

  async completeTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && task.status === 'assigned') {
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      
      if (task.assignedTo) {
        this.agents[task.assignedTo].status = 'available';
      }
      
      console.log(`\n✅ Task completed: ${task.description}`);
      await this.saveAssignments();
      return true;
    }
    return false;
  }

  async listTasks() {
    console.log('\n📋 CURRENT TASK ASSIGNMENTS:');
    console.log('===========================');
    
    if (this.tasks.length === 0) {
      console.log('No tasks assigned yet.');
      return;
    }
    
    this.tasks.forEach(task => {
      const statusEmoji = {
        'pending': '🟡',
        'assigned': '🔵',
        'completed': '✅'
      }[task.status] || '❓';
      
      const agentName = task.assignedTo ? this.agents[task.assignedTo].name : 'Unassigned';
      
      console.log(`${statusEmoji} [${task.status.toUpperCase()}] ${task.description}`);
      console.log(`   ID: ${task.id}`);
      console.log(`   Assigned to: ${agentName}`);
      console.log(`   Created: ${new Date(task.createdAt).toLocaleString()}`);
      if (task.completedAt) {
        console.log(`   Completed: ${new Date(task.completedAt).toLocaleString()}`);
      }
      console.log('');
    });
  }

  async showAgentStatus() {
    console.log('\n🤖 AGENT STATUS DASHBOARD:');
    console.log('=========================');
    
    const statusCounts = { available: 0, busy: 0, offline: 0 };
    
    Object.entries(this.agents).forEach(([key, agent]) => {
      const statusEmoji = agent.status === 'available' ? '✅' : '🔴';
      console.log(`${statusEmoji} ${agent.name} (${key})`);
      console.log(`   Specialty: ${agent.specialty}`);
      console.log(`   Status: ${agent.status.toUpperCase()}`);
      console.log('');
      statusCounts[agent.status]++;
    });
    
    console.log('📊 SUMMARY:');
    console.log(`   Available: ${statusCounts.available}`);
    console.log(`   Busy: ${statusCounts.busy}`);
    console.log(`   Offline: ${statusCounts.offline}`);
  }

  async saveAssignments() {
    const data = {
      tasks: this.tasks,
      assignments: Object.fromEntries(this.assignments),
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile(
      'agent-task-assignments.json',
      JSON.stringify(data, null, 2)
    );
  }

  // Predefined task templates for common scenarios
  async assignCommonTasks() {
    console.log('\n🚀 ASSIGNING COMMON DEVELOPMENT TASKS...');
    
    const commonTasks = [
      {
        description: "Implement user authentication system",
        skills: ["coding", "security", "api"]
      },
      {
        description: "Analyze patient medical data for trends",
        skills: ["data", "clinical", "analysis"]
      },
      {
        description: "Set up CI/CD pipeline for deployment",
        skills: ["devops", "deployment", "automation"]
      },
      {
        description: "Write comprehensive unit tests for API endpoints",
        skills: ["testing", "api", "validation"]
      },
      {
        description: "Optimize database queries for better performance",
        skills: ["database", "optimization", "performance"]
      },
      {
        description: "Conduct security audit of the codebase",
        skills: ["security", "audit", "vulnerability"]
      }
    ];
    
    for (const task of commonTasks) {
      await this.assignTask(task.description, task.skills);
    }
  }
}

// Interactive CLI interface
async function interactiveMode() {
  const taskSystem = new TaskAssignmentSystem();
  await taskSystem.initialize();
  
  console.log('\n🎮 INTERACTIVE TASK ASSIGNMENT MODE');
  console.log('===================================');
  console.log('Commands:');
  console.log('  assign "<task_description>" [skills...] - Assign a new task');
  console.log('  complete <task_id> - Mark task as completed');
  console.log('  list - Show all tasks');
  console.log('  status - Show agent status');
  console.log('  template - Assign common development tasks');
  console.log('  quit - Exit the system');
  console.log('');

  // Simple REPL simulation
  const readline = (await import('readline')).createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = (query) => new Promise(resolve => readline.question(query, resolve));

  while (true) {
    const input = await askQuestion('task-manager> ');
    const [command, ...args] = input.trim().split(' ');
    
    try {
      switch (command.toLowerCase()) {
        case 'assign':
          if (args.length === 0) {
            console.log('Usage: assign "<task_description>" [skill1] [skill2] ...');
            break;
          }
          const taskDesc = args[0].startsWith('"') ? 
            args.join(' ').replace(/^"|"$/g, '') : 
            args.join(' ');
          const skills = args.slice(1);
          await taskSystem.assignTask(taskDesc, skills);
          break;
          
        case 'complete':
          if (args.length === 0) {
            console.log('Usage: complete <task_id>');
            break;
          }
          const success = await taskSystem.completeTask(args[0]);
          if (!success) {
            console.log('❌ Task not found or not assigned');
          }
          break;
          
        case 'list':
          await taskSystem.listTasks();
          break;
          
        case 'status':
          await taskSystem.showAgentStatus();
          break;
          
        case 'template':
          await taskSystem.assignCommonTasks();
          break;
          
        case 'quit':
        case 'exit':
          console.log('👋 Goodbye!');
          readline.close();
          return;
          
        case '':
          break;
          
        default:
          console.log(`❌ Unknown command: ${command}`);
          console.log('Type "help" for available commands');
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}

// Quick demo mode
async function demoMode() {
  console.log('🚀 DEMONSTRATION MODE - Automatic Task Assignment');
  console.log('================================================');
  
  const taskSystem = new TaskAssignmentSystem();
  await taskSystem.initialize();
  
  // Assign sample tasks
  await taskSystem.assignTask("Fix memory leak in the cockpit server", ["debugging", "memory"]);
  await taskSystem.assignTask("Design database schema for patient records", ["database", "design"]);
  await taskSystem.assignTask("Implement real-time chat feature", ["coding", "api"]);
  await taskSystem.assignTask("Run security penetration testing", ["security", "testing"]);
  
  // Show results
  await taskSystem.listTasks();
  await taskSystem.showAgentStatus();
  
  console.log('\n✅ Demo completed! The system is ready for interactive use.');
}

// Main execution
async function main() {
  const mode = process.argv[2] || 'demo';
  
  switch (mode) {
    case 'interactive':
      await interactiveMode();
      break;
    case 'demo':
      await demoMode();
      break;
    default:
      console.log('Usage: node agent-task-manager.js [demo|interactive]');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TaskAssignmentSystem };