/**
 * Resilient WebSocket Client for MEV Bots
 * Handles reconnection, heartbeat, and error recovery
 */

import WebSocket from 'ws';

export class ResilientWebSocket {
  constructor(url, { onMessage, onOpen, onClose, onError }) {
    this.url = url;
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onError = onError;

    this.ws = null;
    this.forcedClose = false;
    this.reconnectAttempts = 0;
    this.maxReconnectDelayMs = 30_000;
    this.baseReconnectDelayMs = 1_000;
    this.heartbeatIntervalMs = 15_000;
    this.heartbeatTimeoutMs = 45_000;

    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;

    this.connect();
  }

  connect() {
    if (this.forcedClose) return;

    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.on('open', () => {
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.onOpen && this.onOpen();
    });

    ws.on('message', (data) => {
      this.bumpHeartbeat();
      this.onMessage && this.onMessage(data);
    });

    ws.on('error', (err) => {
      // Don't throw - log and let close() handle reconnection
      console.error('[WS] error:', err.code || err.message);
      this.onError && this.onError(err);
    });

    ws.on('close', (code, reason) => {
      this.stopHeartbeat();
      this.onClose && this.onClose(code, reason);

      if (!this.forcedClose) {
        this.scheduleReconnect();
      }
    });
  }

  scheduleReconnect() {
    this.reconnectAttempts += 1;

    // Exponential backoff with jitter
    const exp = Math.min(this.reconnectAttempts, 8);
    const base = this.baseReconnectDelayMs * Math.pow(2, exp);
    const jitter = Math.random() * 1_000;
    const delay = Math.min(base + jitter, this.maxReconnectDelayMs);

    console.log(`[WS] reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => this.connect(), delay);
  }

  startHeartbeat() {
    this.stopHeartbeat();

    // Ping interval
    this.heartbeatInterval = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      try {
        this.ws.ping();
      } catch (e) {
        console.error('[WS] ping error:', e.message);
      }
    }, this.heartbeatIntervalMs);

    // Liveness timeout
    this.bumpHeartbeat();
  }

  bumpHeartbeat() {
    if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);

    this.heartbeatTimeout = setTimeout(() => {
      console.warn('[WS] heartbeat timeout, terminating socket');
      if (this.ws) this.ws.terminate();
      // close handler will schedule reconnect
    }, this.heartbeatTimeoutMs);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
  }

  send(msg) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(msg);
  }

  close() {
    this.forcedClose = true;
    this.stopHeartbeat();
    if (this.ws) this.ws.close();
  }
}
