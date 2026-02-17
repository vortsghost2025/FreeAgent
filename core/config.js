// Centralized Config System (hot-reloadable)
import fs from 'fs';

let config = {};
let configPath = null;

export function loadConfig(path) {
  configPath = path;
  config = JSON.parse(fs.readFileSync(path, 'utf-8'));
  return config;
}

export function getConfig() {
  return config;
}

export function reloadConfig() {
  if (!configPath) throw new Error('No config path set');
  return loadConfig(configPath);
}
