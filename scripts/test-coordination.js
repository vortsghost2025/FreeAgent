/**
 * Test script for Agent Coordination System
 * Demonstrates how Kilo and Claude Code can work together
 */

const { createKilo, createClaudeCode } = require('../services/agent-integration');

async function testCollaboration() {
  console.log('🤖 Starting Agent Coordination Test...\n');

  // Create both agents
  const kilo = createKilo();
  const claudeCode = createClaudeCode();

  try {
    // Initialize both agents
    console.log('1. Registering agents...');
    await kilo.initialize();
    await claudeCode.initialize();
    console.log('✓ Both agents registered\n');

    // Get dashboard status
    console.log('2. Checking coordination dashboard...');
    const dashboard = await kilo.getDashboard();
    console.log('✓ Dashboard status:', {
      active_agents: dashboard.active_agents,
      task_summary: dashboard.task_summary,
      collaboration_mode: dashboard.collaboration_mode
    });
    console.log('');

    // Claude Code creates a task
    console.log('3. Claude Code creates a task...');
    const task = await claudeCode.createTask({
      title: 'Fix memory leak in session management',
      description: 'Sessions are not being properly cleaned up, causing memory issues',
      priority: 'high',
      tags: ['bug', 'memory', 'sessions']
    });
    console.log('✓ Task created:', task.id, '-', task.title);
    console.log('');

    // Kilo claims the task
    console.log('4. Kilo claims the task...');
    const claimedTask = await kilo.claimTask(task.id);
    console.log('✓ Task claimed by Kilo');
    console.log('');

    // Kilo registers file interest
    console.log('5. Kilo registers interest in session files...');
    await kilo.registerFileInterest('orchestrator/sessions.js', 'investigating memory leak');
    await kilo.registerFileInterest('orchestrator/memory.js', 'checking cleanup logic');
    console.log('✓ File interests registered');
    console.log('');

    // Kilo sends message to Claude Code
    console.log('6. Kilo sends message to Claude Code...');
    await kilo.sendMessage('claude_code', 'I found the issue! Missing cleanup in sessions.js line 45. Can you review my fix?');
    console.log('✓ Message sent');
    console.log('');

    // Claude Code gets messages
    console.log('7. Claude Code checks messages...');
    const messages = await claudeCode.getMessages();
    console.log('✓ Messages received:', messages.length);
    if (messages.length > 0) {
      console.log('  Latest from Kilo:', messages[messages.length - 1].message);
    }
    console.log('');

    // Claude Code collaborates on task
    console.log('8. Claude Code collaborates on the task...');
    await claudeCode.collaborateOnTask(task.id, 'code_review', {
      file: 'orchestrator/sessions.js',
      suggestions: ['Add cleanup in finally block', 'Consider using weak references'],
      code_snippet: 'finally { await cleanup(); }'
    });
    console.log('✓ Collaboration added');
    console.log('');

    // Both agents update shared context
    console.log('9. Both agents update shared context...');
    await kilo.updateContext({
      current_focus: 'fixing memory leak',
      progress: 'implementing cleanup logic',
      next_steps: ['add finally block', 'test with load']
    });

    await claudeCode.updateContext({
      current_focus: 'code review',
      reviewing_task: task.id,
      recommendations: ['add cleanup', 'improve error handling']
    });
    console.log('✓ Shared context updated');
    console.log('');

    // Kilo completes the task
    console.log('10. Kilo completes the task...');
    await kilo.completeTask(task.id, {
      status: 'fixed',
      changes_made: 5,
      files_modified: ['orchestrator/sessions.js', 'orchestrator/memory.js'],
      memory_improvement: '30% reduction in memory usage',
      tests_passed: true
    });
    console.log('✓ Task completed');
    console.log('');

    // Kilo notifies file changes
    console.log('11. Kilo notifies file changes...');
    await kilo.notifyFileChange('orchestrator/sessions.js', {
      type: 'bug_fix',
      description: 'Added cleanup in finally block to prevent memory leak',
      lines_affected: '45-60'
    });
    console.log('✓ File changes notified');
    console.log('');

    // Get final task status
    console.log('12. Checking final task status...');
    const updatedTask = await claudeCode.getTasks({ agent: 'kilo' });
    const completedTask = updatedTask.find(t => t.id === task.id);
    console.log('✓ Task status:', completedTask.status);
    console.log('  Collaborators:', completedTask.collaborators.join(', '));
    console.log('  History entries:', completedTask.history.length);
    console.log('');

    // Get coordination log
    console.log('13. Checking coordination log...');
    const log = await kilo.getCoordinationLog();
    console.log('✓ Total coordination events:', log.length);
    console.log('  Recent events:', log.slice(-3).map(e => e.type));
    console.log('');

    // Final dashboard check
    console.log('14. Final dashboard status...');
    const finalDashboard = await claudeCode.getDashboard();
    console.log('✓ Final status:', {
      active_agents: finalDashboard.active_agents,
      tasks_completed: finalDashboard.task_summary.completed,
      total_tasks: finalDashboard.task_summary.total
    });
    console.log('');

    console.log('🎉 Collaboration test completed successfully!');
    console.log('\nSummary:');
    console.log('- Both agents can work together seamlessly');
    console.log('- Task creation, claiming, and completion working');
    console.log('- File change awareness operational');
    console.log('- Direct agent communication functional');
    console.log('- Shared context management active');
    console.log('- Full coordination log maintained');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await kilo.cleanup();
    await claudeCode.cleanup();
    console.log('✓ Cleanup complete');
  }
}

// Run the test
if (require.main === module) {
  testCollaboration().catch(console.error);
}

module.exports = { testCollaboration };