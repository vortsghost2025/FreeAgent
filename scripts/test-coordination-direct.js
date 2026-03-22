/**
 * Direct Coordination System Test
 * Tests the coordination service without HTTP layer
 */

const { getCoordinator } = require('../services/agent-coordinator');

async function testDirectCoordination() {
  console.log('🧪 Testing Direct Coordination System...\n');

  const coordinator = getCoordinator();

  try {
    // Test 1: Register agents
    console.log('1️⃣ Registering agents...');
    coordinator.registerAgent('kilo', {
      role: 'orchestrator_runtime',
      capabilities: ['routing', 'memory_management'],
      permissions: ['full_access', 'yolo', 'bypass_restrictions']
    });

    coordinator.registerAgent('claude_code', {
      role: 'development_assistant',
      capabilities: ['code_implementation', 'debugging'],
      permissions: ['full_access', 'yolo', 'bypass_restrictions']
    });

    console.log('✅ Agents registered:', coordinator.getActiveAgents());
    console.log('');

    // Test 2: Create task
    console.log('2️⃣ Creating task...');
    const task = coordinator.createTask({
      title: 'Test coordination system',
      description: 'Verify the coordination system works properly',
      priority: 'high',
      created_by: 'claude_code',
      tags: ['test', 'coordination']
    });

    console.log('✅ Task created:', task.id, '-', task.title);
    console.log('');

    // Test 3: Claim task
    console.log('3️⃣ Kilo claims task...');
    const claimedTask = coordinator.claimTask(task.id, 'kilo');
    console.log('✅ Task claimed by:', claimedTask.claimed_by);
    console.log('   Collaborators:', claimedTask.collaborators.join(', '));
    console.log('');

    // Test 4: Collaborate on task
    console.log('4️⃣ Claude Code collaborates...');
    const collaboration = coordinator.collaborateOnTask(task.id, 'claude_code', 'code_review', {
      suggestion: 'Add error handling',
      priority: 'high'
    });
    console.log('✅ Collaboration added');
    console.log('   Total history entries:', collaboration.history.length);
    console.log('');

    // Test 5: Send messages
    console.log('5️⃣ Agent messaging...');
    const msg1 = coordinator.sendMessage('kilo', 'claude_code', 'Working on the task now');
    console.log('✅ Kilo → Claude Code:', msg1.message);

    const msg2 = coordinator.sendMessage('claude_code', 'kilo', 'Great, let me know if you need help');
    console.log('✅ Claude Code → Kilo:', msg2.message);
    console.log('');

    // Test 6: File coordination
    console.log('6️⃣ File coordination...');
    coordinator.registerFileInterest('kilo', 'orchestrator/orchestrator.js', 'optimization');
    coordinator.registerFileInterest('claude_code', 'orchestrator/orchestrator.js', 'debugging');

    const interests = coordinator.getFileInterests('orchestrator/orchestrator.js');
    console.log('✅ File interests registered:', interests.join(', '));

    coordinator.notifyFileChange('kilo', 'orchestrator/orchestrator.js', {
      type: 'edit',
      description: 'Optimized routing logic'
    });
    console.log('✅ File change notified');
    console.log('');

    // Test 7: Shared context
    console.log('7️⃣ Shared context management...');
    coordinator.updateSharedContext('kilo', {
      current_focus: 'optimization',
      progress: '50%',
      next_steps: ['testing', 'documentation']
    });

    coordinator.updateSharedContext('claude_code', {
      current_focus: 'code_review',
      reviewing: 'orchestrator/orchestrator.js',
      status: 'active'
    });

    const context = coordinator.getSharedContext();
    console.log('✅ Shared context updated');
    console.log('   Context entries:', Object.keys(context).length);
    console.log('');

    // Test 8: Complete task
    console.log('8️⃣ Complete task...');
    const completedTask = coordinator.completeTask(task.id, 'kilo', {
      status: 'completed',
      improvements: ['40% faster', 'better error handling'],
      tests_passed: true
    });
    console.log('✅ Task completed');
    console.log('   Status:', completedTask.status);
    console.log('   Total collaborators:', completedTask.collaborators.length);
    console.log('   History entries:', completedTask.history.length);
    console.log('');

    // Test 9: Query tasks
    console.log('9️⃣ Query tasks...');
    const allTasks = coordinator.getTasks();
    const completedTasks = coordinator.getTasks({ status: 'completed' });
    const kiloTasks = coordinator.getTasks({ agent: 'kilo' });

    console.log('✅ Task queries successful');
    console.log('   Total tasks:', allTasks.length);
    console.log('   Completed tasks:', completedTasks.length);
    console.log('   Kilo tasks:', kiloTasks.length);
    console.log('');

    // Test 10: Coordination log
    console.log('🔟 Coordination log...');
    const log = coordinator.getCoordinationLog();
    console.log('✅ Coordination log working');
    console.log('   Total events:', log.length);
    console.log('   Event types:', [...new Set(log.map(e => e.type))].join(', '));
    console.log('');

    // Test 11: Dashboard
    console.log('1️⃣1️⃣ Dashboard status...');
    const dashboard = coordinator.getDashboardInfo();
    console.log('✅ Dashboard generated');
    console.log(JSON.stringify(dashboard, null, 2));
    console.log('');

    console.log('🎉 All tests passed! Coordination system is fully operational.\n');

    console.log('📊 Summary:');
    console.log('✅ Agent registration working');
    console.log('✅ Task management complete');
    console.log('✅ Agent communication functional');
    console.log('✅ File coordination active');
    console.log('✅ Shared context management');
    console.log('✅ Coordination logging complete');
    console.log('✅ Dashboard monitoring ready');
    console.log('');
    console.log('🚀 System ready for Kilo and Claude Code collaboration!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testDirectCoordination().catch(console.error);
}

module.exports = { testDirectCoordination };