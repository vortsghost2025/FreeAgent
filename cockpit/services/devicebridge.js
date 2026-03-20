/**
 * DeviceBridge Service
 * 
 * Provides communication with hardware devices (Claw, robots, IoT).
 * All commands are structured and validated before execution.
 * 
 * Schema:
 * {
 *   device: "claw | other-device",
 *   action: "move | grasp | release | rotate | scan",
 *   target: "object-id or coordinate",
 *   params: { "speed": 1.0, "force": 0.5 }
 * }
 */

class DeviceBridgeService {
  constructor(options = {}) {
    this.name = 'devicebridge';
    this.enabled = false;
    this.commandLog = [];
    this.devices = {
      claw: { name: 'OpenClaw', allowedActions: ['move', 'grasp', 'release', 'rotate', 'scan', 'home', 'calibrate'] }
    };
  }

  async process(payload) {
    const { device, action, target, params = {} } = payload;
    if (!device || !action) throw new Error('device and action are required');
    if (!this.devices[device]) throw new Error('Unknown device: ' + device);
    if (!this.devices[device].allowedActions.includes(action)) {
      throw new Error('Action ' + action + ' not allowed for ' + device);
    }
    this.logCommand({ device, action, target, params, timestamp: Date.now() });
    return { success: true, device, action, target, result: 'Executed ' + action + ' on ' + device, timestamp: Date.now() };
  }

  logCommand(entry) {
    this.commandLog.push(entry);
    if (this.commandLog.length > 100) this.commandLog.shift();
  }

  getHistory() { return this.commandLog; }
  getDevices() { return this.devices; }
  healthCheck() { return { service: this.name, enabled: this.enabled, devices: Object.keys(this.devices) }; }
  setEnabled(enabled) { this.enabled = enabled; }
}

module.exports = DeviceBridgeService;
