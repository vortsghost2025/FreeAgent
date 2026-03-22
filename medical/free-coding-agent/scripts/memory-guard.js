/**
 * Adaptive Memory Guardrail - Full Stress Detection & Mode Switching
 * 
 * Monitors: RAM, CPU, Disk, LM Studio latency
 * Modes: NORMAL → STRAIN → CRITICAL
 * Actions: Adaptive behavior based on system stress
 * 
 * Run: node scripts/memory-guard.js
 */

const os = require('os');
const { exec } = require('child_process');
const fs = require('fs');
const http = require('http');

// ==================== CONFIGURATION ====================

const CONFIG = {
  // Stress scoring thresholds
  thresholds: {
