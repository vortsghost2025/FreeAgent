#!/usr/bin/env node

/**
 * DEMO: Medical Pipeline Result Converter
 * Shows how raw JSON gets converted to readable English
 */

const sampleRawOutput = {
  "success": true,
  "output": {
    "humanSummary": "Processed patient vitals with concerning abnormalities detected.",
    "timestamp": "2026-02-26T23:48:34.690Z",
    "pipelineVersion": "1.0.0",
    "processingTime": 2,
    "schemaVersion": "1.0.0",
    "provenance": {
      "createdByAgentId": "output-001",
      "createdAt": "2026-02-26T23:48:34.690Z"
    },
    "auditLog": [
      {
        "agentId": "ingestion-001",
        "step": "ingestion",
        "timestamp": "2026-02-26T23:48:34.690Z",
        "action": "processed"
      }
    ],
    "pipeline": [
      "ingestion-001",
      "triage-001",
      "summarization-001",
      "risk-001"
    ],
    "input": "Patient blood pressure: 180/110, heart rate: 115 bpm, temperature: 102.3°F",
    "normalized": {
      "raw": "Patient blood pressure: 180/110, heart rate: 115 bpm, temperature: 102.3°F",
      "content": "Patient blood pressure: 180/110, heart rate: 115 bpm, temperature: 102.3°F",
      "contentType": "text",
      "timestamp": "2026-02-26T23:48:34.688Z",
      "format": "normalized"
    },
    "classification": {
      "type": "vitals",
      "confidence": 0.95,
      "route": "emergency",
      "indicators": [
        "hypertensive_crisis",
        "tachycardia",
        "fever"
      ],
      "flags": ["urgent_care_needed"]
    },
    "summary": {
      "fields": {
        "bloodPressure": "180/110 mmHg",
        "heartRate": "115 bpm",
        "temperature": "102.3°F"
      },
      "extractionMethod": "vital_signs_parser",
      "fieldsExtracted": 3,
      "completeness": 1.0
    },
    "riskScore": {
      "score": 0.85,
      "severity": "high",
      "factors": [
        {
          "factor": "hypertensive_crisis",
          "weight": 0.4,
          "description": "Blood pressure 180/110 indicates hypertensive emergency"
        },
        {
          "factor": "severe_tachycardia",
          "weight": 0.3,
          "description": "Heart rate 115 bpm above normal range"
        },
        {
          "factor": "significant_fever",
          "weight": 0.15,
          "description": "Temperature 102.3°F suggests possible infection"
        }
      ],
      "flags": [
        {
          "flag": "hypertensive_emergency",
          "severity": "critical",
          "reason": "Systolic BP ≥180 or diastolic BP ≥120"
        },
        {
          "flag": "tachycardia_severe",
          "severity": "high",
          "reason": "Heart rate >100 bpm at rest"
        }
      ],
      "scoringMethod": "clinical_guidelines",
      "confidence": 0.9
    },
    "status": "complete",
    "validation": {
      "allStepsComplete": true,
      "invariantsSatisfied": true
    },
    "redactionSummary": {
      "redacted": false
    },
    "humanReview": {
      "required": true,
      "reviewerId": null,
      "notes": "Critical vitals require immediate physician evaluation"
    }
  }
};

function convertToEnglish(rawData) {
  if (!rawData.success) {
    return "❌ Processing failed - unable to analyze medical data";
  }
  
  const output = rawData.output;
  let english = "";
  
  // Executive Summary
  english += "📋 EXECUTIVE SUMMARY\n";
  english += "==================\n";
  english += `Processing completed in ${output.processingTime} milliseconds\n`;
  english += `${output.humanSummary}\n\n`;
  
  // Patient Vitals
  english += "🫀 PATIENT VITAL SIGNS\n";
  english += "====================\n";
  if (output.summary && output.summary.fields) {
    const fields = output.summary.fields;
    english += `• Blood Pressure: ${fields.bloodPressure || 'Not recorded'}\n`;
    english += `• Heart Rate: ${fields.heartRate || 'Not recorded'}\n`;
    english += `• Temperature: ${fields.temperature || 'Not recorded'}\n`;
  }
  english += "\n";
  
  // Clinical Classification
  english += "🏷️ CLINICAL CLASSIFICATION\n";
  english += "========================\n";
  if (output.classification) {
    english += `Category: ${output.classification.type.toUpperCase()}\n`;
    english += `Confidence: ${(output.classification.confidence * 100).toFixed(1)}%\n`;
    if (output.classification.indicators) {
      english += `Key Findings: ${output.classification.indicators.join(", ")}\n`;
    }
    if (output.classification.flags) {
      english += `Alert Flags: ${output.classification.flags.join(", ")}\n`;
    }
  }
  english += "\n";
  
  // Risk Assessment
  english += "⚠️ RISK ASSESSMENT\n";
  english += "===============\n";
  if (output.riskScore) {
    const severity = output.riskScore.severity.toUpperCase();
    const score = output.riskScore.score;
    english += `Overall Risk Level: ${severity} (${score}/1.0)\n\n`;
    
    english += "Identified Risk Factors:\n";
    if (output.riskScore.factors) {
      output.riskScore.factors.forEach((factor, index) => {
        english += `${index + 1}. ${factor.factor.replace(/_/g, ' ').toUpperCase()}\n`;
        english += `   Severity Weight: ${factor.weight}\n`;
        english += `   Clinical Significance: ${factor.description}\n\n`;
      });
    }
    
    if (output.riskScore.flags) {
      english += "Immediate Concerns:\n";
      output.riskScore.flags.forEach(flag => {
        const flagLevel = flag.severity.toUpperCase();
        english += `🚨 ${flagLevel}: ${flag.reason}\n`;
      });
    }
  }
  english += "\n";
  
  // Recommendations
  english += "💡 CLINICAL RECOMMENDATIONS\n";
  english += "=========================\n";
  english += "• URGENT: Patient requires immediate physician evaluation\n";
  english += "• Monitor vital signs continuously\n";
  english += "• Consider emergency department referral\n";
  english += "• Document findings in patient chart\n";
  english += "• Follow up within 24 hours\n\n";
  
  // Technical Info
  english += "🔧 TECHNICAL DETAILS\n";
  english += "==================\n";
  english += `Processed: ${output.timestamp}\n`;
  english += `Pipeline Version: ${output.pipelineVersion}\n`;
  english += `Data Completeness: ${(output.summary?.completeness * 100 || 0).toFixed(1)}%\n`;
  english += `Review Required: ${output.humanReview?.required ? 'YES' : 'NO'}\n`;
  
  return english;
}

// Run the demo
console.log("🏥 MEDICAL PIPELINE RESULT CONVERTER");
console.log("====================================\n");

console.log("📋 RAW INPUT (JSON):");
console.log("==================");
console.log(JSON.stringify(sampleRawOutput, null, 2));
console.log("\n" + "=".repeat(50) + "\n");

console.log("📝 PROCESSED OUTPUT (Readable English):");
console.log("=====================================");
console.log(convertToEnglish(sampleRawOutput));

console.log("\n🚀 Access the full converter at: http://localhost:8889/medical-ui");
