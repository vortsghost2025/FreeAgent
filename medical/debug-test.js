import { createMedicalOrchestrator } from './medical-workflows.js';

const orchestrator = createMedicalOrchestrator();

const testInput = {
  raw: {
    reportedItems: ["headache", "fever", "fatigue"],
    severity: "moderate",
    duration: "3 days"
  },
  format: "structured",
  source: "patient-portal",
  timestamp: new Date().toISOString()
};

console.log("Input:", JSON.stringify(testInput, null, 2));

const result = await orchestrator.executePipeline(testInput);

console.log("\n=== RESULT ===");
console.log("Classification:", result.output.classification);
console.log("Content extracted:", result.output.normalized.content);
console.log("Summary:", result.output.summary);
