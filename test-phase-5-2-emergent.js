import { SelfBalancer, SelfHealer, SelfOrganizer, EmergentBehaviorEngine } from './medical/intelligence/emergent-behavior.js';

let p=0, f=0;
const t=(n,fn)=>{try{fn();console.log(`✓ ${n}`);p++}catch(e){console.log(`✗ ${n}: ${e.message}`);f++}};
const a=(c,m)=>{if(!c)throw new Error(m)};

console.log('\n=== PHASE 5.2: EMERGENT BEHAVIOR ===\n');
t('Register nodes', () => {const b=new SelfBalancer();b.registerNode('n1',100);a(b.nodeStates.size===1,'Node registered')});
t('Balance load', () => {const b=new SelfBalancer();b.registerNode('n1',100);b.registerNode('n2',100);b.updateNodeLoad('n1',90);b.updateNodeLoad('n2',10);const r=b.autonomousBalance();a(typeof r==='object','Balanced')});
t('Promote node', () => {const b=new SelfBalancer();b.registerNode('n1',100);const r=b.promoteNode('n1');a(r.success,'Promoted')});
t('SelfHealer register', () => {const h=new SelfHealer();h.registerNode('n1');const n=h.nodeHealth.get('n1');a(n.status==='healthy','Healthy')});
t('Report failure', () => {const h=new SelfHealer();h.registerNode('n1');const r=h.reportFailure('n1');a(r.success,'Failed reported')});
t('SelfOrganizer define role', () => {const o=new SelfOrganizer();o.defineRole('leader',['routing']);a(o.roles.size===1,'Role defined')});

console.log(`\nTests: ${p}/${p+f} passed\n`);
