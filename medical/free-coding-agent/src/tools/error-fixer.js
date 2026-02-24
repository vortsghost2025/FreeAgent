/**
 * Error Fixer - Automatic Node.js/JS error fixing
 *
 * Auto-fixes:
 * - Indentation issues
 * - Syntax errors
 * - Missing imports
 * - Missing dependencies
 * - ESLint auto-fixable issues
 * - Common Node.js errors
 */

import { BaseTool } from "./base.js";
import { promises as fs } from "fs";
import { spawn } from "child_process";
import path from "path";

// Error patterns with fix strategies
const ERROR_PATTERNS = {
  // Syntax errors
  "Unexpected token": {
    fixType: "add_missing_brackets",
    description: "Add missing brackets/parentheses",
  },
  "Unexpected identifier": {
    fixType: "fix_variable_declaration",
    description: "Fix variable declaration syntax",
  },
  "Missing semicolon": {
    fixType: "add_semicolon",
    description: "Add missing semicolon",
  },
  "Unexpected end of input": {
    fixType: "close_brackets",
    description: "Close unclosed brackets/braces",
  },

  // Indentation/formatting
  IndentationError: {
    fixType: "fix_indentation",
    description: "Fix indentation using Prettier",
  },
  "Mixed spaces and tabs": {
    fixType: "normalize_indentation",
    description: "Normalize to 2 spaces",
  },
  "Trailing spaces": {
    fixType: "trim_trailing",
    description: "Remove trailing whitespace",
  },

  // Module/import errors
  "Cannot find module": {
    fixType: "install_missing_dependency",
    description: "Install missing npm package",
  },
  "is not defined": {
    fixType: "add_missing_import",
    description: "Add missing import statement",
  },
  "require is not defined": {
    fixType: "convert_to_esm",
    description: "Convert to ES6 import or use require",
  },
  "import is not defined": {
    fixType: "convert_to_cjs",
    description: "Convert to require or use type: module",
  },

  // Common Node.js errors
  EACCES: {
    fixType: "fix_permissions",
    description: "Check file permissions",
  },
  ENOENT: {
    fixType: "check_file_exists",
    description: "File or directory does not exist",
  },
  EADDRINUSE: {
    fixType: "kill_port_process",
    description: "Kill process using the port",
  },
};

// Common imports for Node.js built-ins
const NODE_BUILTIN_IMPORTS = {
  fs: "const fs = require('fs');",
  path: "const path = require('path');",
  http: "const http = require('http');",
  https: "const https = require('https');",
  "fs/promises": "const fs = require('fs/promises');",
  child_process: "const { spawn } = require('child_process');",
  events: "const { EventEmitter } = require('events');",
  express: "const express = require('express');",
  mongoose: "const mongoose = require('mongoose');",
  sequelize: "const { Sequelize } = require('sequelize');",
  cors: "const cors = require('cors');",
  dotenv: "require('dotenv').config();",
  axios: "const axios = require('axios');",
  uuid: "const { v4: uuidv4 } = require('uuid');",
};

export class ErrorFixer extends BaseTool {
  constructor(config = {}) {
    super(config);
    this.name = "error_fixer";
    this.description = "Auto-fix Node.js/JS errors and indentation issues";
    this.workingDir = config.workingDir || process.cwd();
    this.fixCache = new Map(); // Cache successful fixes
    this.autoApply = config.autoApply ?? false;
    this.usePrettier = config.usePrettier ?? true;
  }

  /**
   * Execute error fixing
   */
  async execute(params) {
    const { error, file, code, dryRun, fixType } = params;

    try {
      // Identify error type from error message
      const errorType = this.identifyErrorType(error);

      if (!errorType) {
        return {
          success: false,
          error: "No auto-fix available for this error type",
          originalError: error,
        };
      }

      console.log(`🔧 Identified error type: ${errorType}`);

      // Get the code to fix
      let codeToFix = code;
      if (!codeToFix && file) {
        try {
          codeToFix = await fs.readFile(file, "utf8");
        } catch (readError) {
          return {
            success: false,
            error: `Could not read file: ${readError.message}`,
          };
        }
      }

      if (!codeToFix) {
        return {
          success: false,
          error: "No code provided and file could not be read",
        };
      }

      // Apply the fix
      const fixResult = await this.applyFix(
        codeToFix,
        errorType,
        fixType || ERROR_PATTERNS[errorType]?.fixType,
      );

      if (!fixResult.success) {
        return fixResult;
      }

      // Write back to file if specified
      if (file && !dryRun && !this.autoApply) {
        await fs.writeFile(file, fixResult.fixedCode, "utf8");
        console.log(`✅ Fixed file: ${file}`);
      }

      // Cache the fix
      this.fixCache.set(errorType, {
        pattern: ERROR_PATTERNS[errorType],
        success: true,
      });

      return {
        success: true,
        errorType,
        fixType: fixResult.fixType,
        description: fixResult.description,
        originalCode: codeToFix,
        fixedCode: fixResult.fixedCode,
        file,
        dryRun,
      };
    } catch (fixError) {
      return {
        success: false,
        error: `Fixing failed: ${fixError.message}`,
      };
    }
  }

  /**
   * Identify error type from error message
   */
  identifyErrorType(errorMessage) {
    if (!errorMessage) return null;

    const lowerError = errorMessage.toLowerCase();

    for (const [pattern, strategy] of Object.entries(ERROR_PATTERNS)) {
      const patternLower = pattern.toLowerCase();
      if (lowerError.includes(patternLower)) {
        console.log(`  → Matched pattern: ${pattern} -> ${strategy.fixType}`);
        return pattern;
      }
    }

    return null;
  }

  /**
   * Apply fix based on type
   */
  async applyFix(code, errorType, fixType) {
    switch (fixType) {
      case "fix_indentation":
        return await this.fixIndentation(code);
      case "normalize_indentation":
        return await this.normalizeIndentation(code);
      case "trim_trailing":
        return await this.trimTrailingSpaces(code);
      case "add_missing_brackets":
        return this.addMissingBrackets(code);
      case "fix_variable_declaration":
        return this.fixVariableDeclaration(code);
      case "add_semicolon":
        return this.addMissingSemicolons(code);
      case "close_brackets":
        return this.closeBrackets(code);
      case "install_missing_dependency":
        return await this.installMissingDependency(code);
      case "add_missing_import":
        return this.addMissingImport(code);
      case "convert_to_esm":
        return this.convertToESM(code);
      case "convert_to_cjs":
        return this.convertToCJS(code);
      case "fix_permissions":
        return await this.fixPermissions(code);
      case "check_file_exists":
        return this.checkFileExists(code);
      case "kill_port_process":
        return await this.killPortProcess(code);
      default:
        return { success: false, error: `Unknown fix type: ${fixType}` };
    }
  }

  /**
   * Fix indentation using Prettier
   */
  async fixIndentation(code) {
    try {
      if (!this.usePrettier) {
        // Simple indentation fix without Prettier
        const lines = code.split("\n");
        let currentIndent = 0;

        // Detect first indentation
        const firstLine = lines.find((l) => l.trim().length > 0);
        if (firstLine) {
          const match = firstLine.match(/^(\s*)/);
          currentIndent = match ? match[1].length : 0;
        }

        // Normalize to 2 spaces
        const fixedLines = lines.map((line) => {
          const trimmed = line.trim();
          const oldIndent = line.match(/^(\s*)/);
          const indentLevel = oldIndent
            ? Math.floor(oldIndent[1].length / (currentIndent || 1))
            : 0;
          return "  ".repeat(indentLevel) + trimmed;
        });

        return {
          success: true,
          fixType: "fix_indentation",
          description: "Normalized indentation to 2 spaces",
          fixedCode: fixedLines.join("\n"),
        };
      }

      // Try to use Prettier
      const prettier = await this.tryImportPrettier();
      if (prettier) {
        const fixedCode = prettier.format(code, {
          semi: true,
          singleQuote: true,
          tabWidth: 2,
          useTabs: false,
          trailingComma: "es5",
          parser: "babel",
        });
        return {
          success: true,
          fixType: "fix_indentation",
          description: "Fixed indentation using Prettier",
          fixedCode,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Indentation fix failed: ${error.message}`,
      };
    }

    // Fallback simple fix
    return await this.normalizeIndentation(code);
  }

  /**
   * Try to import Prettier
   */
  async tryImportPrettier() {
    try {
      const prettier = await import("prettier");
      return prettier;
    } catch {
      // Prettier not available
      return null;
    }
  }

  /**
   * Normalize indentation to 2 spaces
   */
  async normalizeIndentation(code) {
    const lines = code.split("\n");
    const fixedLines = [];

    for (const line of lines) {
      const trimmed = line.trimEnd();
      // Count leading whitespace
      const indentMatch = line.match(/^(\s*)/);
      const indentSpaces = indentMatch ? indentMatch[1].length : 0;

      // Convert tabs to spaces, normalize to 2-space multiples
      const normalizedIndent = Math.floor(indentSpaces / 2) * 2;
      fixedLines.push(" ".repeat(normalizedIndent) + trimmed);
    }

    return {
      success: true,
      fixType: "normalize_indentation",
      description: "Normalized indentation to 2 spaces",
      fixedCode: fixedLines.join("\n"),
    };
  }

  /**
   * Trim trailing spaces
   */
  async trimTrailingSpaces(code) {
    const lines = code.split("\n");
    const fixedLines = lines.map((line) => line.trimEnd());

    return {
      success: true,
      fixType: "trim_trailing",
      description: "Removed trailing spaces",
      fixedCode: fixedLines.join("\n"),
    };
  }

  /**
   * Add missing brackets (heuristic)
   */
  addMissingBrackets(code) {
    // Count brackets and braces
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;

    let fixedCode = code;

    // Add missing closing braces
    if (openBraces > closeBraces) {
      const missing = openBraces - closeBraces;
      fixedCode += "\n" + "}".repeat(missing);
    }

    // Add missing closing parens
    if (openParens > closeParens) {
      const missing = openParens - closeParens;
      fixedCode += ")".repeat(missing);
    }

    return {
      success: true,
      fixType: "add_missing_brackets",
      description: `Added ${openBraces - closeBraces} missing braces, ${openParens - closeParens} missing parentheses`,
      fixedCode,
    };
  }

  /**
   * Fix variable declaration
   */
  fixVariableDeclaration(code) {
    // Common patterns
    const patterns = [
      {
        regex: /(?:let|const|var)\s+(\w+)\s*=/,
        replace: (match) => `let ${match[1]} =`,
      },
      {
        regex: /(\w+)\s*=\s*function/,
        replace: (match) => `const ${match[1]} = function`,
      },
      { regex: /function\s*\(\s*\)\s*\{/, replace: "function() {" },
    ];

    let fixedCode = code;
    for (const { regex, replace } of patterns) {
      fixedCode = fixedCode.replace(regex, replace);
    }

    return {
      success: true,
      fixType: "fix_variable_declaration",
      description: "Fixed variable declarations",
      fixedCode,
    };
  }

  /**
   * Add missing semicolons
   */
  addMissingSemicolons(code) {
    // Add semicolons after statements that commonly miss them
    const lines = code.split("\n");
    const fixedLines = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed === ""
      ) {
        fixedLines.push(line);
        continue;
      }

      // Add semicolon if line ends without it but needs one
      if (
        trimmed.length > 0 &&
        !trimmed.endsWith(";") &&
        !trimmed.endsWith("{") &&
        !trimmed.endsWith("}")
      ) {
        // Check if this line is likely a statement
        const isStatement =
          /^(let|const|var|return|break|continue)\s/.test(trimmed) ||
          /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*.+/.test(trimmed) ||
          /^(import|export|from)/.test(trimmed);
        if (isStatement) {
          fixedLines.push(line + ";");
          continue;
        }
      }

      fixedLines.push(line);
    }

    return {
      success: true,
      fixType: "add_semicolon",
      description: "Added missing semicolons",
      fixedCode: fixedLines.join("\n"),
    };
  }

  /**
   * Close unclosed brackets
   */
  closeBrackets(code) {
    let fixedCode = code;
    const stack = [];

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      if (char === "{" || char === "[" || char === "(") {
        stack.push({ char, index: i });
      } else if (char === "}" || char === "]" || char === ")") {
        if (stack.length > 0) {
          stack.pop();
        }
      }
    }

    // Add missing closing brackets
    const missing = stack.reverse();
    for (const item of missing) {
      let closing;
      switch (item.char) {
        case "{":
          closing = "}";
          break;
        case "[":
          closing = "]";
          break;
        case "(":
          closing = ")";
          break;
      }
      fixedCode += closing;
    }

    return {
      success: true,
      fixType: "close_brackets",
      description: `Closed ${missing.length} unclosed brackets`,
      fixedCode,
    };
  }

  /**
   * Install missing dependency
   */
  async installMissingDependency(code) {
    // Extract module name from error pattern
    const match =
      code.match(/Cannot find module ['"]([^'"]+)['"]/i) ||
      code.match(/Module not found: (.+)/i);

    if (!match) {
      return { success: false, error: "Could not extract module name" };
    }

    const moduleName = match[1];
    console.log(`📦 Installing missing module: ${moduleName}`);

    try {
      const result = await this.runCommand(`npm install ${moduleName}`);
      return {
        success: true,
        fixType: "install_missing_dependency",
        description: `Installed ${moduleName}`,
        fixedCode: code, // Code unchanged, just installed dep
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to install ${moduleName}: ${error.message}`,
      };
    }
  }

  /**
   * Add missing import
   */
  addMissingImport(code) {
    // Extract undefined variable name
    const match =
      code.match(
        /(?:ReferenceError|SyntaxError):\s+(\w+)\s+is\s+not\s+defined/i,
      ) || code.match(/\b(\w+)\s+is\s+not\s+defined\b/i);

    if (!match) {
      return { success: false, error: "Could not extract undefined variable" };
    }

    const varName = match[1];
    console.log(`📥 Adding import for: ${varName}`);

    // Check if this is a known Node.js built-in
    let importStatement;
    if (NODE_BUILTIN_IMPORTS[varName]) {
      importStatement = NODE_BUILTIN_IMPORTS[varName];
    } else {
      // Generic require/import pattern
      importStatement = `const ${varName} = require('${varName}');`;
    }

    // Add import at the top
    const lines = code.split("\n");
    const insertIndex = lines.findIndex(
      (l) => l.trim().length > 0 && !l.trim().startsWith("//"),
    );
    if (insertIndex >= 0) {
      lines.splice(insertIndex, 0, importStatement);
    } else {
      lines.unshift(importStatement);
    }

    return {
      success: true,
      fixType: "add_missing_import",
      description: `Added import for ${varName}`,
      fixedCode: lines.join("\n"),
    };
  }

  /**
   * Convert to ESM (import statements)
   */
  convertToESM(code) {
    // Replace require() with import
    let fixedCode = code;

    // Simple require patterns
    fixedCode = fixedCode.replace(
      /const\s+(\w+)\s*=\s*require\('([^']+)'\);/g,
      "import $1 from '$2';",
    );
    fixedCode = fixedCode.replace(
      /const\s+(\w+)\s*=\s*require\("([^"]+)"\);/g,
      'import $1 from "$2";',
    );
    fixedCode = fixedCode.replace(
      /const\s*\{([^}]+)\}\s*=\s*require\('([^']+)'\);/g,
      "import { $1 } from '$2';",
    );

    // Add type: module at top if not present
    if (!fixedCode.includes('"type": "module"')) {
      fixedCode = '"use strict";\n' + fixedCode;
    }

    return {
      success: true,
      fixType: "convert_to_esm",
      description: "Converted require() to import statements",
      fixedCode,
    };
  }

  /**
   * Convert to CommonJS (require statements)
   */
  convertToCJS(code) {
    // Replace import with require()
    let fixedCode = code;

    // Simple import patterns
    fixedCode = fixedCode.replace(
      /import\s+(\w+)\s+from\s+['"]([^'"]+)['"];/g,
      "const $1 = require('$2');",
    );
    fixedCode = fixedCode.replace(
      /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"];/g,
      "const { $1 } = require('$2');",
    );

    return {
      success: true,
      fixType: "convert_to_cjs",
      description: "Converted import to require() statements",
      fixedCode,
    };
  }

  /**
   * Fix file permissions
   */
  async fixPermissions(code) {
    const fileMatch = code.match(/EACCES[^:]*:\s*['"]?([^'"]+)['"]?/);
    if (!fileMatch) {
      return { success: false, error: "Could not extract file path" };
    }

    const filePath = fileMatch[1];
    console.log(`🔒 Fixing permissions for: ${filePath}`);

    try {
      await this.runCommand(`chmod 755 "${filePath}"`);
      return {
        success: true,
        fixType: "fix_permissions",
        description: `Set permissions to 755 for ${filePath}`,
        fixedCode: code,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to set permissions: ${error.message}`,
      };
    }
  }

  /**
   * Check if file exists
   */
  checkFileExists(code) {
    const fileMatch = code.match(/ENOENT[^:]*:\s*['"]?([^'"]+)['"]?/);
    if (!fileMatch) {
      return { success: false, error: "Could not extract file path" };
    }

    const filePath = fileMatch[1];
    const fullPath = path.resolve(this.workingDir, filePath);

    return {
      success: true,
      fixType: "check_file_exists",
      description: `File does not exist: ${fullPath}`,
      suggestion: `Create the file or check the path`,
      fixedCode: code,
    };
  }

  /**
   * Kill process using a port
   */
  async killPortProcess(code) {
    const portMatch = code.match(/EADDRINUSE[^:]*:\s*(\d+)/);
    if (!portMatch) {
      return { success: false, error: "Could not extract port number" };
    }

    const port = portMatch[1];
    console.log(`🔪 Killing process on port: ${port}`);

    try {
      const cmd =
        this.platform === "win32"
          ? `netstat -ano | findstr :${port} | for / "tokens=*" do @taskkill /F /PID @tokens`
          : `lsof -ti:${port} | xargs kill -9`;

      await this.runCommand(cmd);
      return {
        success: true,
        fixType: "kill_port_process",
        description: `Killed process using port ${port}`,
        fixedCode: code,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to kill process: ${error.message}`,
      };
    }
  }

  /**
   * Run a shell command
   */
  runCommand(command) {
    return new Promise((resolve, reject) => {
      const isWindows = this.platform === "win32";
      const shell = isWindows ? "cmd.exe" : "/bin/bash";
      const shellArgs = isWindows ? ["/c", command] : ["-c", command];

      const proc = spawn(shell, shellArgs, {
        cwd: this.workingDir,
        stdio: "inherit",
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      proc.on("error", reject);
    });
  }

  /**
   * Batch fix multiple errors in a file
   */
  async batchFixErrors(filePath, errors) {
    let code = await fs.readFile(filePath, "utf8");
    const fixes = [];

    for (const error of errors) {
      const errorType = this.identifyErrorType(error);
      if (errorType) {
        const fixResult = await this.applyFix(code, errorType);
        if (fixResult.success) {
          code = fixResult.fixedCode;
          fixes.push({
            error,
            fixType: fixResult.fixType,
            description: fixResult.description,
          });
        }
      }
    }

    // Write fixed code
    await fs.writeFile(filePath, code, "utf8");

    return {
      success: true,
      fixesApplied: fixes.length,
      fixes,
      fixedCode: code,
    };
  }

  /**
   * Get tool schema
   */
  getSchema() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        error: {
          type: "string",
          required: true,
          description: "Error message to fix",
        },
        file: {
          type: "string",
          required: false,
          description: "Path to file to fix",
        },
        code: {
          type: "string",
          required: false,
          description: "Code to fix",
        },
        dryRun: {
          type: "boolean",
          required: false,
          description: "Show fixes without applying them",
        },
        fixType: {
          type: "string",
          required: false,
          description: "Specific fix type to apply",
        },
      },
    };
  }
}
