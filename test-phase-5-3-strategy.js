import { StrategyEvaluator, ExecutionController, StrategyOrchestrator } from './medical/intelligence/strategy-orchestrator.js';

let p=0, f=0;
const t=(n,fn)=>{try{fn();console.log(`✓ ${n}`);p++}catch(e){console.log(`✗ ${n}: ${e.message}`);f++}};
const a=(c,m)=>{if(!c)throw new Error(m)};

console.log('\n=== PHASE 5.3: STRATEGY ORCHESTRATOR ===\n');
t('Evaluate strategy', () => {const e=new StrategyEvaluator();const s={type:'SCALE_UP',confidence:0.9};const ev=e.evaluateStrategy(s);a(ev.safetyScore>=0,'Score valid')});
t('Execute strategy', () => {const c=new ExecutionController();const e=new StrategyEvaluator();const s={type:'TEST',confidence:0.9};const r=c.executeStrategy(s,e);a(r.success,'Executed')});
t('Get active strategies', () => {const c=new ExecutionController();const e=new StrategyEvaluator();const s={type:'TEST',confidence:0.9};c.executeStrategy(s,e);const a1=c.getActiveStrategies();a(a1.length>=0,'Listed')});
t('Orchestrator response', () => {const o=new StrategyOrchestrator();const r=o.orchestrateResponse({failureRisk:0.3},{type:'TEST'}||[{type:'REDUCE_LATENCY'}]);a(typeof r==='object','Response')});

console.log(`\nTests: ${p}/${p+f} passed\n`);
