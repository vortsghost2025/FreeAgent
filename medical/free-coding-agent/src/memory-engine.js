/*
  File: memory-engine.js
  Description: JSON-based persistent memory engine.
*/

import fs from "fs";
import path from "path";

export class MemoryEngine {
  constructor(basePath) {
    this.basePath = basePath;
  }

  load(filePath) {
    const full = path.join(process.cwd(), filePath);
    if (!fs.existsSync(full)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(full, "utf8"));
  }

  save(filePath, data) {
    const full = path.join(process.cwd(), filePath);
    fs.writeFileSync(full, JSON.stringify(data, null, 2));
  }

  append(filePath, entry) {
    const full = path.join(process.cwd(), filePath);
    let data = [];
    if (fs.existsSync(full)) {
      data = JSON.parse(fs.readFileSync(full, "utf8"));
    }
    data.push(entry);
    fs.writeFileSync(full, JSON.stringify(data, null, 2));
  }

  // Alias for StandardAgent compatibility
  loadAgentMemory(memoryPath) {
    return this.load(memoryPath);
  }

  saveAgentState(memoryPath, state) {
    const data = this.load(memoryPath);
    data.state = state;
    data.last_updated = new Date().toISOString();
    this.save(memoryPath, data);
  }
}
