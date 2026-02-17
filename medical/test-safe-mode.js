/**
 * Test Safe Defaults Mode
 * Demonstrates conservative behavior vs standard behavior
 */

import { createMedicalOrchestrator } from './medical-workflows.js';
import { createConfigManager, SafeDefaults, StandardConfig } from './utils/config.js';

console.log('=== SAFE DEFAULTS MODE TEST ===\n');

// Create two orchestrators
const standardOrch = createMedicalOrchestrator();

console.log('📊 CONFIGURATION COMPARISON\n');
console.log('STANDARD MODE:');
console.log(`  • Classification Threshold: ${StandardConfig.classificationThreshold}`);
console.log(`  • Minimum Confidence: ${StandardConfig.minimumConfidence}`);
console.log(`  • Risk Threshold (High): ${StandardConfig.riskThresholds.high}`);
console.log(`  • Minimum Completeness: ${StandardConfig.minimumCompleteness}`);
console.log(`  • Fallback to Unknown: ${StandardConfig.fallbackToUnknown}`);
console.log(`  • Require Human Review: ${StandardConfig.requireHumanReview}`);

console.log('\nSAFE MODE:');
console.log(`  • Classification Threshold: ${SafeDefaults.classificationThreshold} ⬆️`);
console.log(`  • Minimum Confidence: ${SafeDefaults.minimumConfidence} ⬆️`);
console.log(`  • Risk Threshold (High): ${SafeDefaults.riskThresholds.high} ⬇️`);
console.log(`  • Minimum Completeness: ${SafeDefaults.minimumCompleteness} ⬆️`);
console.log(`  • Fallback to Unknown: ${SafeDefaults.fallbackToUnknown} ✅`);
console.log(`  • Require Human Review: ${SafeDefaults.requireHumanReview} ✅`);

// Test Case: Borderline confidence input
console.log('\n\n' + '='.repeat(60));
console.log('TEST CASE: Borderline Confidence Input\n');

const borderlineInput = {
  raw: {
    someData: 'chest pain',
    moreData: 'mild'
  },
  source: 'test',
  timestamp: new Date().toISOString()
};

console.log('Running with STANDARD mode...');
const standardResult = await standardOrch.executePipeline(borderlineInput);

console.log('\n📋 STANDARD MODE RESULT:');
console.log('  Classification:', standardResult.output.classification.type);
console.log('  Confidence:', (standardResult.output.classification.confidence * 100).toFixed(0) + '%');
console.log('  Rationale:', standardResult.output.simpleRationale);

// Apply safe mode filtering
const safeConfig = createConfigManager('safe');
const safeClassification = safeConfig.applySafeClassification(standardResult.output.classification);
const safeRiskScore = safeConfig.applySafeRiskScore(standardResult.output.riskScore);
const requiresReview = safeConfig.requiresHumanReview(
  standardResult.output.classification,
  standardResult.output.riskScore,
  standardResult.output.summary
);

console.log('\n🛡️ SAFE MODE RESULT:');
console.log('  Classification:', safeClassification.type);
console.log('  Confidence:', (safeClassification.confidence * 100).toFixed(0) + '%');
console.log('  Confidence Qualifier:', safeClassification.confidenceQualifier || 'N/A');
if (safeClassification.originalType) {
  console.log('  ⚠️ Original Type:', safeClassification.originalType, '(forced fallback)');
}
console.log('  Requires Human Review:', requiresReview ? 'YES ✅' : 'NO');
console.log('  Risk Severity:', safeRiskScore.severity, safeRiskScore.conservativeAssessment ? '(conservative)' : '');

// Test Case 2: High confidence symptoms
console.log('\n\n' + '='.repeat(60));
console.log('TEST CASE: High Confidence Symptoms\n');

const highConfidenceInput = {
  raw: {
    reportedItems: ['severe chest pain', 'shortness of breath', 'diaphoresis'],
    severity: 'severe',
    onset: 'sudden',
    duration: '2 hours'
  },
  source: 'emergency-department',
  timestamp: new Date().toISOString()
};

console.log('Running with STANDARD mode...');
const highConfResult = await standardOrch.executePipeline(highConfidenceInput);

console.log('\n📋 STANDARD MODE RESULT:');
console.log('  Classification:', highConfResult.output.classification.type);
console.log('  Confidence:', (highConfResult.output.classification.confidence * 100).toFixed(0) + '%');

const safeClassification2 = safeConfig.applySafeClassification(highConfResult.output.classification);
const safeRiskScore2 = safeConfig.applySafeRiskScore(highConfResult.output.riskScore);
const requiresReview2 = safeConfig.requiresHumanReview(
  highConfResult.output.classification,
  highConfResult.output.riskScore,
  highConfResult.output.summary
);

console.log('\n🛡️ SAFE MODE RESULT:');
console.log('  Classification:', safeClassification2.type);
console.log('  Confidence:', (safeClassification2.confidence * 100).toFixed(0) + '%');
console.log('  Confidence Qualifier:', safeClassification2.confidenceQualifier);
if (safeClassification2.originalType) {
  console.log('  ⚠️ Original Type:', safeClassification2.originalType, '(forced fallback)');
} else {
  console.log('  ✅ Classification accepted (meets threshold)');
}
console.log('  Requires Human Review:', requiresReview2 ? 'YES ✅' : 'NO');

// Summary
console.log('\n\n' + '='.repeat(60));
console.log('SUMMARY: When to Use Each Mode\n');

console.log('🛡️ SAFE MODE - Use when:');
console.log('  • Working with critical medical decisions');
console.log('  • Errors could cause patient harm');
console.log('  • Regulatory compliance required');
console.log('  • "Not sure" is safer than "confident and wrong"');
console.log('  • All results need human review');

console.log('\n📊 STANDARD MODE - Use when:');
console.log('  • Non-critical data processing');
console.log('  • Research or analysis workflows');
console.log('  • Higher throughput needed');
console.log('  • Human review on exceptions only');

console.log('\n🏭 PRODUCTION MODE - Use when:');
console.log('  • Balanced safety and performance');
console.log('  • Validated in production environment');
console.log('  • Monitoring and alerting in place');
console.log('  • Established review workflows');

console.log('\n✅ SAFE DEFAULTS MODE TEST COMPLETE');
