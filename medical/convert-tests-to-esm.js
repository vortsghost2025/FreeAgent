#!/usr/bin/env node
/**
 * Convert CommonJS test files to ES modules
 */

import fs from 'fs';
import path from 'path';

const testFiles = [
  '__tests__/ingestion_agent.test.js',
  '__tests__/triage_agent.test.js', 
  '__tests__/summarization_agent.test.js',
  '__tests__/risk_agent.test.js',
  '__tests__/output_agent.test.js',
  '__tests__/schema_conformance.test.js'
];

const conversions = [
  // Agent imports
  {
    pattern: /const\s*{\s*create(\w+)Agent\s*}\s*=\s*require\(['"]\.\.\/agents\/(\w+)_agent['"]\)/g,
    replacement: "import { create$1Agent } from '../agents/$2_agent.js'"
  },
  // AJV import
  {
    pattern: /const\s*(Ajv)\s*=\s*require\(['"]ajv['"]\)/g,
    replacement: "import Ajv from 'ajv'"
  },
  // Other common imports that might be in tests
  {
    pattern: /const\s*{\s*(\w+)\s*}\s*=\s*require\(['"]\.\.\/([\w\/\-\.]+)['"]\)/g,
    replacement: "import { $1 } from '../$2.js'"
  }
];

console.log('Converting test files to ES modules...\n');

for (const filePath of testFiles) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    continue;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Apply all conversions
    for (const { pattern, replacement } of conversions) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Converted: ${filePath}`);
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
    }

  } catch (error) {
    console.error(`❌ Error converting ${filePath}:`, error.message);
  }
}

console.log('\n✅ Conversion complete! Test files are now ES module compatible.');