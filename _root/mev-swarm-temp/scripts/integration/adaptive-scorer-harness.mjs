#!/usr/bin/env node
import StrategyPerformance from '../../core/scoring/strategy-performance.js';
import CompetitionScorer from '../../core/scoring/competition-scorer.js';

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

async function run(){
  console.log('Adaptive Scorer Harness: starting');

  const perf = new StrategyPerformance();
  const scorer = new CompetitionScorer({strategyPerformance: perf});

  const initialWeights = {...perf.getWeights()};
  console.log('Initial weights:', initialWeights);

  // Define scenarios with (attempts, winProb, avgProfitEth)
  const scenarios = [
    {name:'SOLO', attempts:70, winProb:0.8, avgProfitEth:0.02},
    {name:'CONTESTED', attempts:20, winProb:0.4, avgProfitEth:0.01},
    {name:'CROWDED', attempts:10, winProb:0.1, avgProfitEth:0.005},
  ];

  for(const s of scenarios){
    for(let i=0;i<s.attempts;i++){
      // make a fake opportunity object
      const opp = { id: `${s.name}-${i}`, contention: s.name };

      // scorer may consult strategyPerformance internally
      const score = scorer.score(opp);

      // Simulate outcome
      const landed = Math.random() < s.winProb;
      const profitEth = landed ? s.avgProfitEth * (0.8 + Math.random()*0.4) : -Math.random()*0.002;

      const result = {
        status: landed ? 'LANDED' : 'FAILED',
        netProfitEth: profitEth,
        gasUsedEth: 0.0002
      };

      // Map contention to strategy key used by StrategyPerformance
      const strategyKey = s.name.toLowerCase();
      perf.recordAttempt(strategyKey, result);

      // small delay to allow internal smoothing windows to operate
      if(i % 50 === 0) await sleep(2);
    }
  }

  const finalWeights = perf.getWeights();
  console.log('Final weights:', finalWeights);

  // Simple check: expect solo to have highest weight
  const order = Object.entries(finalWeights).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
  console.log('Weight order (high->low):', order.join(' > '));

  const success = order[0] === 'solo';
  console.log(`Adaptive harness result: ${success ? 'PASS' : 'WARN'}`);

  // Write short summary to stdout
  console.log('Summary:', {
    initialWeights,
    finalWeights,
    order
  });
}

run().catch(err=>{ console.error('Harness failed:', err); process.exit(2); });
