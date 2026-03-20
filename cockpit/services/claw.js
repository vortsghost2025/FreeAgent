/**
 * Claw Service - OpenClaw Robotic Arm Integration
 * Controls the OpenClaw robotic arm via serial/USB connection
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

class ClawService {
  constructor(options = {}) {
    this.name = 'claw';
    this.enabled = false;
    this.port = options.port || 'COM3';
    this.baudRate = options.baudRate || 9600;
    this.serialPort = null;
    this.parser = null;
    this.isConnected = false;
    this.commandQueue = [];
    this.responseCallbacks = new Map();
  }

  // Connect to the OpenClaw device
  async connect(port = null, baudRate = null) {
    const usePort = port || this.port;
    const useBaud = baudRate || this.baudRate;

    try {
      this.serialPort = new SerialPort({ 
        path: usePort, 
        baudRate: useBaud 
      });

      this.parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

      return new Promise((resolve, reject) => {
        this.serialPort.open((err) => {
          if (err) {
            this.isConnected = false;
            reject(err);
          } else {
            this.isConnected = true;
            this.setupListeners();
            resolve({ success: true, port: usePort, baudRate: useBaud });
          }
        });
      });
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Setup serial listeners
  setupListeners() {
    this.parser.on('data', (data) => {
      const trimmed = data.trim();
      // Handle responses
      if (trimmed.startsWith('ACK:')) {
        const cmdId = trimmed.substring(4).trim();
        const callback = this.responseCallbacks.get(cmdId);
        if (callback) {
          callback({ success: true, response: trimmed });
          this.responseCallbacks.delete(cmdId);
        }
      } else if (trimmed.startsWith('ERR:')) {
        const cmdId = trimmed.substring(4).trim();
        const callback = this.responseCallbacks.get(cmdId);
        if (callback) {
          callback({ success: false, error: trimmed });
          this.responseCallbacks.delete(cmdId);
        }
      }
    });

    this.serialPort.on('error', (err) => {
      console.error('[Claw] Serial error:', err.message);
      this.isConnected = false;
    });

    this.serialPort.on('close', () => {
      this.isConnected = false;
    });
  }

  // Send command to claw
  async sendCommand(command, params = {}) {
    if (!this.isConnected) {
      return { success: false, error: 'Not connected to claw' };
    }

    const cmdId = `cmd_${Date.now()}`;
    let cmdStr = `${command}`;
    
    if (Object.keys(params).length > 0) {
      cmdStr += ' ' + Object.entries(params).map(([k, v]) => `${k}:${v}`).join(' ');
    }
    cmdStr += ` [${cmdId}]`;

    return new Promise((resolve) => {
      this.responseCallbacks.set(cmdId, resolve);
      this.serialPort.write(cmdStr + '\n', (err) => {
        if (err) {
          this.responseCallbacks.delete(cmdId);
          resolve({ success: false, error: err.message });
        }
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.responseCallbacks.has(cmdId)) {
          this.responseCallbacks.delete(cmdId);
          resolve({ success: false, error: 'Command timeout' });
        }
      }, 5000);
    });
  }

  // Move to position (x, y, z)
  async move(x, y, z) {
    return this.sendCommand('MOVE', { x, y, z });
  }

  // Open/Close claw
  async setClaw(state) {
    return this.sendCommand('CLAW', { state: state === 'open' ? 'OPEN' : 'CLOSE' });
  }

  // Rotate wrist
  async rotate(angle) {
    return this.sendCommand('ROTATE', { angle });
  }

  // Get status
  async getStatus() {
    return this.sendCommand('STATUS');
  }

  // Home/Reset position
  async home() {
    return this.sendCommand('HOME');
  }

  // Emergency stop
  async emergencyStop() {
    return this.sendCommand('ESTOP');
  }

  // Disconnect
  async disconnect() {
    if (this.serialPort && this.isConnected) {
      return new Promise((resolve) => {
        this.serialPort.close((err) => {
          this.isConnected = false;
          resolve({ success: !err, error: err?.message });
        });
      });
    }
    return { success: true };
  }

  // List available ports
  async listPorts() {
    try {
      const ports = await SerialPort.list();
      return { success: true, ports };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

// Factory function
function createClawService(options) {
  return new ClawService(options);
}

module.exports = { ClawService, createClawService };
