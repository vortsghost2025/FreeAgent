/**
 * Quick Demo: Agent Collaboration System
 * Shows Kilo and Claude Code working together
 */

const { createKilo, createClaudeCode } = require('../services/agent-integration');

async function quickDemo() {
  console.log('🚀 Starting Quick Collaboration Demo...\n');

  // Create agents
  const kilo = createKilo();
  const claudeCode = createClaudeCode();

  try {
    // Initialize
    console.log('📝 Initializing agents...');
    await Promise.all([kilo.initialize(), claudeCode.initialize()]);
    console.log('✅ Both agents ready!\n');

    // Show dashboard
    console.log('📊 Current Dashboard Status:');
    const dashboard = await kilo.getDashboard();
    console.log(JSON.stringify(dashboard, null, 2));
    console.log('');

    // Simple collaboration
    console.log('🤝 Demonstrating collaboration...\n');

    // Claude Code creates a simple task
    const task = await claudeCode.createTask({
      title: 'Test collaboration system',
      description: 'Verify Kilo and Claude Code can coordinate',
      priority: 'medium'
    });
    console.log(`📌 Task created: ${task.id}`);

    // Kilo claims it
    await kilo.claimTask(task.id);
    console.log('✅ Kilo claimed the task');

    // They exchange messages
    await kilo.sendMessage('claude_code', 'Got it! Working on the task now.');
    const messages = await claudeCode.getMessages();
    console.log(`💬 Message from Kilo: "${messages[messages.length - 1].message}"`);

    // Kilo completes it
    await kilo.completeTask(task.id, {
      status: 'completed',
      result: 'Collaboration system working perfectly!'
    });
    console.log('✅ Task completed by Kilo\n');

    // Show final status
    console.log('📊 Final Dashboard:');
    const finalDashboard = await claudeCode.getDashboard();
    console.log(JSON.stringify(finalDashboard, null, 2));

    console.log('\n🎉 Demo complete! Collaboration system is operational.');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  } finally {
    await kilo.cleanup();
    await claudeCode.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  quickDemo().catch(console.error);
}

module.exports = { quickDemo };