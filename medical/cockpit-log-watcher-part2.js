function logError(error) {
  errorCount++;

  // Console alert (red)
  console.error('\x1b[31m%s\x1b[0m', `⚠️  ERROR DETECTED (${errorCount})`);
  console.error(`\x1b[31m%s\x1b[0m`, `   Time: ${error.timestamp}`);
  console.error(`\x1b[31m%s\x1b[0m`, `   Pattern: ${error.pattern}`);
  console.error(`\x1b[31m%s\x1b[0m`, `   Message: ${error.message.substring(0, 100)}`);
  console.log('');

  // Save to file
  const logEntry = `[${error.timestamp}] ${error.pattern}: ${error.message}\n`;
  fs.appendFileSync(CONFIG.errorLogFile, logEntry);
}
