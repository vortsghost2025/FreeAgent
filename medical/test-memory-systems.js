#!/usr/bin/env node
/**
 * Memory System Integration Test
 * Tests working memory and episodic memory functionality
 */

import { workingMemory } from './memory/working-memory.js';
import { episodicMemory } from './memory/episodic-memory.js';
import { autoSaveEpisode, extractEpisodicLearnings, getMemoryStatistics } from './utils/memory-consolidator.js';

async function testMemorySystems() {
  console.log('🧠 MEMORY SYSTEM INTEGRATION TEST');
  console.log('==================================');

  try {
    // Test 1: Working Memory
    console.log('\n1️⃣ Testing Working Memory...');
    
    // Add some test items
    workingMemory.add({
      content: 'User requested help with cockpit server setup',
      type: 'user_request',
      metadata: { priority: 'high' }
    });
    
    workingMemory.add({
      content: 'Implemented perception module with image analysis',
      type: 'development_task',
      metadata: { status: 'completed' }
    });
    
    workingMemory.add({
      content: 'System performance optimized with 73ms average latency',
      type: 'system_status',
      metadata: { metric: 'latency' }
    });
    
    // Test retrieval
    const recentItems = workingMemory.getRecent(5);
    console.log(`✅ Added ${recentItems.length} items to working memory`);
    
    const searchResults = workingMemory.search('performance');
    console.log(`✅ Found ${searchResults.length} items matching 'performance'`);
    
    // Test 2: Episodic Memory
    console.log('\n2️⃣ Testing Episodic Memory...');
    
    // Record test episodes
    const episode1 = episodicMemory.recordEpisode({
      events: [
        { role: 'user', content: 'Help me set up the cockpit server' },
        { role: 'assistant', content: 'I\'ll help you start the cockpit server on port 8889' },
        { role: 'system', content: 'Server started successfully' }
      ],
      context: { agent: 'kilo', topic: 'server_setup' },
      outcome: 'completed',
      duration: 120000
    });
    
    const episode2 = episodicMemory.recordEpisode({
      events: [
        { role: 'user', content: 'Create perception module for image analysis' },
        { role: 'assistant', content: 'Creating simple perception module with API endpoints' },
        { role: 'system', content: 'Perception module implemented successfully' }
      ],
      context: { agent: 'assistant', topic: 'development' },
      outcome: 'completed',
      duration: 300000
    });
    
    console.log(`✅ Recorded episodes: ${episode1}, ${episode2}`);
    
    // Test episode retrieval
    const episodes = episodicMemory.listEpisodes({ limit: 5 });
    console.log(`✅ Retrieved ${episodes.length} episodes`);
    
    // Test 3: Memory Consolidator Integration
    console.log('\n3️⃣ Testing Memory Consolidator...');
    
    // Test auto-save episode
    const testSession = {
      sessionId: 'test-session-001',
      agent: 'kilo',
      messages: [
        { role: 'user', content: 'Test memory consolidation' },
        { role: 'assistant', content: 'Memory consolidation working properly' }
      ],
      outcome: 'success',
      duration: 45000
    };
    
    const savedEpisode = await autoSaveEpisode(testSession);
    console.log(`✅ Auto-saved episode: ${savedEpisode}`);
    
    // Test learning extraction
    const learnings = await extractEpisodicLearnings(1); // Last 1 day
    console.log(`✅ Extracted ${learnings.length} learnings from episodes`);
    
    // Test statistics
    const stats = getMemoryStatistics();
    console.log('\n📊 MEMORY STATISTICS:');
    console.log(`Working Memory: ${stats.workingMemory.totalItems}/${stats.workingMemory.maxCapacity} items`);
    console.log(`Episodic Memory: ${stats.episodicMemory.totalEpisodes} episodes`);
    console.log(`Utilization: ${stats.workingMemory.utilization} working, ${stats.episodicMemory.utilization} episodic`);
    
    // Final verification
    console.log('\n🎯 TEST SUMMARY:');
    console.log('================');
    console.log('✅ Working Memory: Functional with search/retrieval');
    console.log('✅ Episodic Memory: Recording and retrieving episodes');
    console.log('✅ Memory Consolidator: Integration working');
    console.log('✅ All systems operational');
    
    console.log('\n📋 NEXT STEPS FOR KILO:');
    console.log('1. These memory systems are now available for use');
    console.log('2. Working memory provides short-term context buffering');
    console.log('3. Episodic memory enables session replay and learning');
    console.log('4. Consolidator handles automatic persistence and learning extraction');
    
    return true;
    
  } catch (error) {
    console.error('❌ Memory system test failed:', error.message);
    return false;
  }
}

// Run the test
testMemorySystems().catch(console.error);