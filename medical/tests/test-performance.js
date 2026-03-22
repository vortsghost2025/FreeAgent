/**
 * Performance Test - Measure actual response times with smart routing
 */

async function testPerformance() {
  const queries = [
    { message: "write a python function to sort a list", expectedAgent: "code" },
    { message: "analyze this patient data for diabetes symptoms", expectedAgent: "clinical/data" },
    { message: "run a security audit", expectedAgent: "security" }
  ];

  console.log("=".repeat(60));
  console.log("PERFORMANCE TEST - Smart Routing Response Times");
  console.log("=".repeat(60));
  console.log();

  for (const query of queries) {
    console.log(`\n📋 Query: "${query.message}"`);
    console.log(`   Expected agent(s): ${query.expectedAgent}`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:8889/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query.message })
      });

      const data = await response.json();
      const elapsed = Date.now() - startTime;
      
      console.log(`   ✅ Response time: ${(elapsed / 1000).toFixed(1)}s`);
      console.log(`   Agent used: ${data.routing?.selected_agent || 'unknown'}`);
      
      if (elapsed < 30000) {
        console.log(`   🚀 FAST - Under 30s target!`);
      } else if (elapsed < 60000) {
        console.log(`   ⚠️  Acceptable but could be faster`);
      } else {
        console.log(`   ❌ SLOW - Still over 60s`);
      }
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.log(`   ❌ Error after ${(elapsed / 1000).toFixed(1)}s: ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Test complete!");
  console.log("=".repeat(60));
}

testPerformance();
