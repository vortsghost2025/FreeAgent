#!/usr/bin/env node

/**
 * Cockpit HTML Validator
 * 
 * Checks for common issues in cockpit HTML files:
 * - Missing <script> tags around JavaScript
 * - Missing closing tags
 * - Duplicate function definitions
 * 
 * Usage: node validate-cockpit.js public/mega-cockpit.html
 */

const fs = require('fs');
const path = require('path');

function validateCockpit(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];
  
  // Check for JavaScript outside script tags
  const scriptTagRegex = /<script[^>]*>/gi;
  const closeScriptTagRegex = /<\/script>/gi;
  const scriptTags = content.match(scriptTagRegex) || [];
  const closeScriptTags = content.match(closeScriptTagRegex) || [];
  
  if (scriptTags.length !== closeScriptTags.length) {
    issues.push({
      type: 'ERROR',
      message: `Mismatched script tags: ${scriptTags.length} open, ${closeScriptTags.length} close`
    });
  }
  
  // Check for common JavaScript keywords outside script tags
  const lines = content.split('\n');
  let inScript = false;
  let scriptStartLine = 0;
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Track if we're inside a script tag
    if (/<script/i.test(line)) {
      inScript = true;
      scriptStartLine = lineNum;
    }
    if (/<\/script/i.test(line)) {
      inScript = false;
    }
    
    // Check for JS keywords outside script tags
    if (!inScript) {
      const jsPatterns = [
        { regex: /^\s*const\s+\w+\s*=/, message: 'const assignment outside script tag' },
        { regex: /^\s*let\s+\w+\s*=/, message: 'let assignment outside script tag' },
        { regex: /^\s*function\s+\w+/, message: 'function definition outside script tag' },
        { regex: /^\s*document\./, message: 'document.* outside script tag' },
        { regex: /^\s*window\./, message: 'window.* outside script tag' },
      ];
      
      for (const pattern of jsPatterns) {
        if (pattern.regex.test(line)) {
          issues.push({
            type: 'WARNING',
            line: lineNum,
            message: `Possible JavaScript "${pattern.message}" at line ${lineNum}`
          });
        }
      }
    }
  });
  
  // Check for duplicate function definitions
  const functionRegex = /function\s+(\w+)/g;
  const functions = {};
  let match;
  
  while ((match = functionRegex.exec(content)) !== null) {
    const funcName = match[1];
    if (functions[funcName]) {
      issues.push({
        type: 'ERROR',
        line: match.index,
        message: `Duplicate function definition: "${funcName}" already defined`
      });
    }
    functions[funcName] = true;
  }
  
  // Check for common HTML issues
  const divOpen = (content.match(/<div/gi) || []).length;
  const divClose = (content.match(/<\/div>/gi) || []).length;
  
  if (divOpen !== divClose) {
    issues.push({
      type: 'ERROR',
      message: `Mismatched div tags: ${divOpen} open, ${divClose} close`
    });
  }
  
  // Check for onclick without element id
  const onclickWithoutId = content.match(/onclick="[^"]*"[^>]*>/gi);
  if (onclickWithoutId) {
    onclickWithoutId.forEach(match => {
      if (!/id="/.test(match)) {
        issues.push({
          type: 'WARNING',
          message: `onclick without id: ${match.substring(0, 50)}...`
        });
      }
    });
  }
  
  // Report
  console.log('\n🛡️  COCKPIT VALIDATION REPORT');
  console.log('='.repeat(50));
  console.log(`File: ${path.basename(filePath)}`);
  console.log(`Size: ${(content.length / 1024).toFixed(1)} KB`);
  console.log(`Lines: ${lines.length}`);
  console.log('='.repeat(50));
  
  if (issues.length === 0) {
    console.log('✅ No issues found!');
    return true;
  }
  
  const errors = issues.filter(i => i.type === 'ERROR');
  const warnings = issues.filter(i => i.type === 'WARNING');
  
  console.log(`\n❌ ${errors.length} ERROR(S)`);
  errors.forEach(i => console.log(`   Line ${i.line || '?'}: ${i.message}`));
  
  console.log(`\n⚠️  ${warnings.length} WARNING(S)`);
  warnings.forEach(i => console.log(`   ${i.message}`));
  
  return errors.length === 0;
}

// Run if called directly
if (require.main === module) {
  const filePath = process.argv[2] || 'public/mega-cockpit.html';
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  
  const success = validateCockpit(filePath);
  process.exit(success ? 0 : 1);
}

module.exports = { validateCockpit };
