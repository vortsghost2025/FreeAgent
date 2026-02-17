import { HistoricalMetricsStore, PatternLearner, StabilityScorer, ReliabilityModeler, LongHorizonMemoryEngine } from './medical/intelligence/long-horizon-memory.js';

let p=0, f=0;
const t=(n,fn)=>{try{fn();console.log(`✓ ${n}`);p++}catch(e){console.log(`✗ ${n}: ${e.message}`);f++}};
const a=(c,m)=>{if(!c)throw new Error(m)};

console.log('\n=== PHASE 5.4: LONG-HORIZON MEMORY ===\n');
t('Record metrics', () => {const s=new HistoricalMetricsStore();s.recordMetric('l',45);s.recordMetric('l',48);a(s.metrics.size>0,'Recorded')});
t('Get aggregation', () => {const s=new HistoricalMetricsStore();for(let i=0;i<20;i++)s.recordMetric('load',0.5);const d=s.getHistoricalData('load','daily');a(d!==null,'Aggregated')});
t('Build reliability model', () => {const m=new ReliabilityModeler();const h=Array(5).fill(0).map((_,i)=>Date.now()-(5-i)*1000);const mod=m.buildModel('c1',h);a(mod!==null,'Model built')});
t('Stability score', () => {const s=new StabilityScorer();const sc=s.scoreStability({volatility:0.3,recentFailures:0});a(sc.score>=0,'Scored')});
t('Engine record observation', () => {const e=new LongHorizonMemoryEngine();e.recordObservation('m',45);a(e.metricsStore.metrics.size>0,'Recorded')});
t('Engine memory report', () => {const e=new LongHorizonMemoryEngine();const r=e.getMemoryReport();a(r.metricsTracked>=0,'Report')});

console.log(`\nTests: ${p}/${p+f} passed\n`);
