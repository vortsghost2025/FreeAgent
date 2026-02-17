import { createMedicalOrchestrator } from './medical-workflows.js';

const orchestrator = createMedicalOrchestrator();

const vitalsInput = {
  raw: {
    measurements: [
      { name: "BP", value: "145/92", unit: "mmHg" },
      { name: "HR", value: 88, unit: "bpm" },
      { name: "Temp", value: 98.6, unit: "F" },
      { name: "SpO2", value: 97, unit: "%" },
      { name: "RR", value: 16, unit: "breaths/min" }
    ],
    measurementSource: "automated-cuff",
    trendSummary: "BP elevated compared to baseline"
  },
  format: "structured",
  source: "vital-signs-monitor",
  timestamp: new Date().toISOString()
};

console.log("Input:", JSON.stringify(vitalsInput, null, 2));

const result = await orchestrator.executePipeline(vitalsInput);

console.log("\n=== RESULT ===");
console.log("Classification:", JSON.stringify(result.output.classification, null, 2));
console.log("\nContent:", result.output.normalized.content);
console.log("\nCompleteness:", result.output.summary.completeness);
