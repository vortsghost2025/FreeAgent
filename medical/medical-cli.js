#!/usr/bin/env node
/**
 * Medical CLI Tool
 * Portable, scriptable interface to the medical data processing pipeline
 *
 * Usage:
 *   medical-cli classify input.json
 *   medical-cli classify input.json --mode safe --format human
 *   cat input.json | medical-cli classify --stdin
 *   medical-cli classify --inline '{"raw": {"symptom": "fever"}}'
 */

import fs from 'fs';
import path from 'path';
import { createMedicalOrchestrator } from './medical-workflows.js';
import { createConfigManager } from './utils/config.js';

// Parse command line arguments
function parseArgs(args) {
  const config = {
    command: null,
    inputFile: null,
    inputInline: null,
    useStdin: false,
    mode: 'standard', // safe, standard, production
    format: 'json', // json, human, summary
    outputFile: null,
    verbose: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      config.help = true;
    } else if (arg === '--stdin') {
      config.useStdin = true;
    } else if (arg === '--inline') {
      config.inputInline = args[++i];
    } else if (arg === '--mode' || arg === '-m') {
      config.mode = args[++i];
    } else if (arg === '--format' || arg === '-f') {
      config.format = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      config.outputFile = args[++i];
    } else if (arg === '--verbose' || arg === '-v') {
      config.verbose = true;
    } else if (!config.command) {
      config.command = arg;
    } else if (!config.inputFile) {
      config.inputFile = arg;
    }
  }

  return config;
}

// Show help
function showHelp() {
  console.log(`
Medical CLI Tool - Portable medical data processing pipeline

USAGE:
  medical-cli classify <input.json>
  medical-cli classify --stdin < input.json
  medical-cli classify --inline '{"raw": {"symptom": "fever"}}'

COMMANDS:
  classify              Process medical data through the pipeline
  version               Show version information
  help                  Show this help message

OPTIONS:
  --mode, -m <mode>     Configuration mode: safe | standard | production
                        (default: standard)

  --format, -f <fmt>    Output format: json | human | summary
                        (default: json)

  --output, -o <file>   Write output to file instead of stdout

  --stdin               Read input from stdin

  --inline <json>       Provide input as inline JSON string

  --verbose, -v         Show detailed processing information

  --help, -h            Show this help message

MODES:
  safe                  Conservative thresholds, requires human review
                        - Higher classification thresholds (0.5 vs 0.3)
                        - Forces fallback to 'other' when uncertain
                        - Always flags for human review

  standard              Balanced configuration (default)
                        - Standard thresholds for classification
                        - Good for research and analysis

  production            Production-ready configuration
                        - Balanced safety and performance
                        - Validated for production use

FORMATS:
  json                  Full JSON output with all fields
  human                 Human-readable text summary
  summary               Compact summary (type, confidence, risk)

EXAMPLES:
  # Process from file
  medical-cli classify patient-symptoms.json

  # Use safe mode for critical decisions
  medical-cli classify labs.json --mode safe

  # Human-readable output
  medical-cli classify input.json --format human

  # Pipeline processing
  cat input.json | medical-cli classify --stdin --format summary

  # Save output to file
  medical-cli classify input.json -o result.json

  # Inline input
  medical-cli classify --inline '{"raw": {"reportedItems": ["fever", "cough"]}, "source": "cli"}'

INPUT FORMAT:
  {
    "raw": { /* your data - object or string */ },
    "source": "system-identifier",  // optional
    "timestamp": "2026-02-17T12:00:00Z"  // optional
  }

EXIT CODES:
  0                     Success
  1                     Invalid input or processing error
  2                     Validation error
  3                     Configuration error
`);
}

// Show version
function showVersion() {
  console.log(`Medical CLI Tool v1.0.0`);
  console.log(`Medical Module v1.0.0`);
  console.log(`Node ${process.version}`);
}

// Read input from various sources
async function readInput(config) {
  if (config.inputInline) {
    try {
      return JSON.parse(config.inputInline);
    } catch (error) {
      throw new Error(`Invalid inline JSON: ${error.message}`);
    }
  }

  if (config.useStdin) {
    return new Promise((resolve, reject) => {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', chunk => data += chunk);
      process.stdin.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Invalid JSON from stdin: ${error.message}`));
        }
      });
      process.stdin.on('error', reject);
    });
  }

  if (config.inputFile) {
    try {
      const data = fs.readFileSync(config.inputFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Input file not found: ${config.inputFile}`);
      }
      throw new Error(`Error reading input file: ${error.message}`);
    }
  }

  throw new Error('No input provided. Use <file>, --stdin, or --inline');
}

// Format output based on format option
function formatOutput(result, format, mode, executionTime) {
  const output = result.output;

  if (format === 'json') {
    return JSON.stringify({
      ...output,
      metadata: {
        mode,
        executionTime: `${executionTime}ms`,
        processedAt: new Date().toISOString()
      }
    }, null, 2);
  }

  if (format === 'summary') {
    const { classification, riskScore, summary } = output;
    return [
      `Type: ${classification.type}`,
      `Confidence: ${(classification.confidence * 100).toFixed(0)}%`,
      `Risk: ${riskScore.severity}`,
      `Completeness: ${(summary.completeness * 100).toFixed(0)}%`,
      `Time: ${executionTime}ms`
    ].join('\n');
  }

  if (format === 'human') {
    const { classification, riskScore, summary, simpleRationale } = output;
    const lines = [
      '=== MEDICAL DATA PROCESSING RESULT ===\n',
      `Classification: ${classification.type.toUpperCase()}`,
      `Confidence: ${(classification.confidence * 100).toFixed(0)}%`,
      `Confidence Qualifier: ${classification.confidenceQualifier || 'N/A'}\n`,
      `Rationale: ${simpleRationale}\n`,
      `Risk Assessment:`,
      `  Severity: ${riskScore.severity}`,
      `  Score: ${(riskScore.score * 100).toFixed(0)}%`,
      `  Factors: ${riskScore.factors.length > 0 ? riskScore.factors.join(', ') : 'None'}\n`,
      `Summary:`,
      `  Extraction Method: ${summary.extractionMethod}`,
      `  Fields Extracted: ${summary.fieldsExtracted}`,
      `  Completeness: ${(summary.completeness * 100).toFixed(0)}%\n`,
      `Processing Time: ${executionTime}ms`,
      `Mode: ${mode}`
    ];

    // Add warnings if any
    if (classification.flags && classification.flags.length > 0) {
      lines.push('\nWarnings:');
      classification.flags.forEach(flag => lines.push(`  ⚠️  ${flag}`));
    }

    // Add key fields if available
    if (summary.fields && Object.keys(summary.fields).length > 0) {
      lines.push('\nKey Fields:');
      Object.entries(summary.fields).slice(0, 5).forEach(([key, value]) => {
        const displayValue = typeof value === 'object'
          ? JSON.stringify(value).slice(0, 50)
          : String(value).slice(0, 50);
        lines.push(`  ${key}: ${displayValue}`);
      });
    }

    return lines.join('\n');
  }

  throw new Error(`Unknown format: ${format}`);
}

// Apply safe mode filtering if needed
function applySafeMode(result, config) {
  if (config.mode !== 'safe') {
    return result;
  }

  const configManager = createConfigManager('safe');
  const safeResult = {
    ...result,
    output: {
      ...result.output,
      classification: configManager.applySafeClassification(result.output.classification),
      riskScore: configManager.applySafeRiskScore(result.output.riskScore)
    }
  };

  // Add human review flag
  const requiresReview = configManager.requiresHumanReview(
    result.output.classification,
    result.output.riskScore,
    result.output.summary
  );

  if (requiresReview) {
    safeResult.output.humanReviewRequired = true;
    safeResult.output.classification.flags = [
      ...(safeResult.output.classification.flags || []),
      'requires_human_review_safe_mode'
    ];
  }

  return safeResult;
}

// Main command: classify
async function runClassify(config) {
  if (config.verbose) {
    console.error(`Reading input...`);
  }

  const input = await readInput(config);

  if (config.verbose) {
    console.error(`Processing with mode: ${config.mode}`);
  }

  const orchestrator = createMedicalOrchestrator();
  const startTime = Date.now();

  try {
    let result = await orchestrator.executePipeline(input);
    const executionTime = Date.now() - startTime;

    // Apply safe mode filtering if needed
    result = applySafeMode(result, config);

    if (config.verbose) {
      console.error(`Processing complete in ${executionTime}ms`);
    }

    const formattedOutput = formatOutput(result, config.format, config.mode, executionTime);

    if (config.outputFile) {
      fs.writeFileSync(config.outputFile, formattedOutput);
      if (config.verbose) {
        console.error(`Output written to: ${config.outputFile}`);
      }
    } else {
      console.log(formattedOutput);
    }

    return 0; // Success
  } catch (error) {
    if (error.name === 'ValidationError') {
      console.error(`Validation Error: ${error.message}`);
      if (error.field) console.error(`  Field: ${error.field}`);
      return 2;
    } else if (error.name === 'AgentError') {
      console.error(`Agent Error: ${error.message}`);
      if (error.agentId) console.error(`  Agent: ${error.agentId}`);
      return 1;
    } else {
      console.error(`Processing Error: ${error.message}`);
      if (config.verbose) {
        console.error(error.stack);
      }
      return 1;
    }
  }
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  const config = parseArgs(args);

  if (config.help || args.length === 0) {
    showHelp();
    return 0;
  }

  if (config.command === 'version') {
    showVersion();
    return 0;
  }

  if (config.command === 'help') {
    showHelp();
    return 0;
  }

  if (config.command === 'classify') {
    return await runClassify(config);
  }

  console.error(`Unknown command: ${config.command}`);
  console.error(`Run 'medical-cli help' for usage information`);
  return 3;
}

// Run CLI
main()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
