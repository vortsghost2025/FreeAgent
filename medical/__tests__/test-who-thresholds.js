/**
 * WHO Thresholds Test Suite
 * Tests WHO clinical thresholds across all standards versions
 */

import { loadRules } from '../ruleEngine.js';

console.log('=== WHO THRESHOLDS TEST SUITE ===\n');

// TEST 1: Load 2023 standards
console.log('TEST 1: WHO 2023 Standards');
const rules2023 = loadRules('2023');
console.log('Loaded 2023 rules');
console.log('Symptom severity levels:', Object.keys(rules2023.rules.symptomSeverity));
console.log('Lab thresholds:', Object.keys(rules2023.rules.labThresholds));
console.log('');

// TEST 2: Load 2024 standards
console.log('TEST 2: WHO 2024 Standards');
const rules2024 = loadRules('2024');
console.log('Loaded 2024 rules');
console.log('New in 2024:', rules2024.changes);
console.log('');

// TEST 3: Load 2025 standards
console.log('TEST 3: WHO 2025 Standards');
const rules2025 = loadRules('2025');
console.log('Loaded 2025 rules');
console.log('New in 2025:', rules2025.changes);
console.log('');

console.log('TEST 4: Compare Troponin Thresholds');
console.log('2023 critical:', rules2023.rules.labThresholds.troponin.critical.value);
console.log('2024 critical:', rules2024.rules.labThresholds.troponin.critical.value);
console.log('2025 critical:', rules2025.rules.labThresholds.troponin.critical.value);

console.log('\n✅ WHO THRESHOLDS TEST SUITE COMPLETE');
