/**
 * WE4FREE Mesh Coordinator
 *
 * WebRTC peer-to-peer mesh for local health signal sharing.
 * No raw data ever leaves a device — only differentially-private aggregates.
 *
 * Architecture:
 *   Signaling:  BroadcastChannel (same device/tab) + VPS signaling relay
 *   Transport:  WebRTC DataChannels (encrypted, peer-to-peer)
 *   Privacy:    Laplace noise on all values before sharing
 *   Discovery:  Gossip protocol — each peer shares known peers
 */

'use strict';

const MESH_VERSION     = 'we4free-mesh-v1';
const MAX_PEERS        = 8;          // Max simultaneous peer connections
const HEARTBEAT_MS     = 15000;      // Ping peers every 15s
const SIGNAL_RELAY_URL = '/api/mesh-signal'; // VPS signaling relay (when online)
const EPSILON          = 0.5;        // Privacy budget for mesh signals (tighter than dashboard)

// ── MESH NODE ID ──────────────────────────────────────────────────────────────
function getNodeId() {
  let id = localStorage.getItem('we4free-mesh-node-id');
  if (!id) {
    id = `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('we4free-mesh-node-id', id);
  }
  return id;
}

// ── LAPLACE NOISE (local, tighter epsilon) ────────────────────────────────────
function addNoise(value, sensitivity = 1.0) {
  const scale = sensitivity / EPSILON;
  const u = Math.random() - 0.5;
  return value + (-scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u)));
}

// ── PEER CONNECTION ───────────────────────────────────────────────────────────
class MeshPeer {
  constructor(peerId, isInitiator, onMessage, onClose) {
    this.peerId      = peerId;
    this.isInitiator = isInitiator;
    this.onMessage   = onMessage;
    this.onClose     = onClose;
    this.state       = 'connecting';
    this.lastSeen    = Date.now();

    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    });

    this.dc = null;
    this._setupPeerConnection();
  }

  _setupPeerConnection() {
    this.pc.onicecandidate = e => {
      if (e.candidate) {
        MeshCoordinator._sendSignal(this.peerId, { type: 'ice', candidate: e.candidate });
      }
    };

    this.pc.onconnectionstatechange = () => {
      const s = this.pc.connectionState;
      console.log(`[Mesh] Peer ${this.peerId.slice(-6)}: ${s}`);
      if (s === 'connected') this.state = 'connected';
      if (s === 'disconnected' || s === 'failed' || s === 'closed') {
        this.state = 'closed';
        this.onClose(this.peerId);
      }
    };

    if (this.isInitiator) {
      this.dc = this.pc.createDataChannel('health-mesh', { ordered: false, maxRetransmits: 2 });
      this._wireDataChannel(this.dc);
      this._createOffer();
    } else {
      this.pc.ondatachannel = e => {
        this.dc = e.channel;
        this._wireDataChannel(this.dc);
      };
    }
  }

  _wireDataChannel(dc) {
    dc.onopen    = () => { this.state = 'connected'; this.lastSeen = Date.now(); };
    dc.onclose   = () => { this.state = 'closed'; this.onClose(this.peerId); };
    dc.onmessage = e => {
      try {
        const msg = JSON.parse(e.data);
        this.lastSeen = Date.now();
        this.onMessage(this.peerId, msg);
      } catch { /* ignore malformed */ }
    };
  }

  async _createOffer() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    MeshCoordinator._sendSignal(this.peerId, { type: 'offer', sdp: offer });
  }

  async handleSignal(signal) {
    if (signal.type === 'offer') {
      await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      MeshCoordinator._sendSignal(this.peerId, { type: 'answer', sdp: answer });
    } else if (signal.type === 'answer') {
      await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    } else if (signal.type === 'ice') {
      await this.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  }

  send(data) {
    if (this.dc?.readyState === 'open') {
      try { this.dc.send(JSON.stringify(data)); return true; }
      catch { return false; }
    }
    return false;
  }

  close() {
    this.dc?.close();
    this.pc?.close();
    this.state = 'closed';
  }
}

// ── MESH COORDINATOR (singleton) ──────────────────────────────────────────────
const MeshCoordinator = {
  nodeId:    getNodeId(),
  peers:     {},          // peerId → MeshPeer
  listeners: [],          // (type, data, sourcePeerId) callbacks
  _bc:       null,        // BroadcastChannel for same-device tabs
  _online:   navigator.onLine,
  _intervals: [],
  running:   false,

  // ── INIT ──────────────────────────────────────────────────────────────────
  async start() {
    if (this.running) return;
    this.running = true;
    console.log(`[Mesh] Node ${this.nodeId.slice(-8)} starting...`);

    // Same-device tab discovery via BroadcastChannel
    this._bc = new BroadcastChannel('we4free-mesh');
    this._bc.onmessage = e => this._handleBroadcast(e.data);

    // Announce presence to other tabs
    this._bc.postMessage({ type: 'announce', from: this.nodeId, version: MESH_VERSION });

    // Online/offline events
    window.addEventListener('online',  () => { this._online = true;  this._onOnline(); });
    window.addEventListener('offline', () => { this._online = false; this._onOffline(); });

    // Heartbeat
    this._intervals.push(setInterval(() => this._heartbeat(), HEARTBEAT_MS));

    // Try to connect to VPS signaling relay if online
    if (this._online) await this._discoverPeers();

    console.log(`[Mesh] Node online. Peers: ${Object.keys(this.peers).length}`);
    this._emit('mesh:ready', { nodeId: this.nodeId, online: this._online });
  },

  stop() {
    this._intervals.forEach(clearInterval);
    this._intervals = [];
    Object.values(this.peers).forEach(p => p.close());
    this.peers = {};
    this._bc?.close();
    this.running = false;
  },

  // ── EVENT SYSTEM ──────────────────────────────────────────────────────────
  on(cb) { this.listeners.push(cb); return this; },

  _emit(type, data, sourcePeerId = null) {
    this.listeners.forEach(cb => cb({ type, data, sourcePeerId }));
  },

  // ── BROADCAST (same-device tabs) ──────────────────────────────────────────
  _handleBroadcast(msg) {
    if (msg.from === this.nodeId) return; // Ignore own messages
    if (msg.type === 'announce') {
      console.log(`[Mesh] Tab discovered: ${msg.from.slice(-6)}`);
      // Initiate WebRTC to the other tab via BroadcastChannel signaling
      if (!this.peers[msg.from] && Object.keys(this.peers).length < MAX_PEERS) {
        this._createPeer(msg.from, true);
        // Reply so they know about us too
        this._bc.postMessage({ type: 'announce-reply', from: this.nodeId, to: msg.from });
      }
    } else if (msg.type === 'announce-reply' && msg.to === this.nodeId) {
      if (!this.peers[msg.from]) this._createPeer(msg.from, false);
    } else if (msg.type === 'signal' && msg.to === this.nodeId) {
      this._routeSignal(msg.from, msg.signal);
    }
  },

  // ── PEER MANAGEMENT ───────────────────────────────────────────────────────
  _createPeer(peerId, isInitiator) {
    if (this.peers[peerId]) return;
    const peer = new MeshPeer(
      peerId, isInitiator,
      (id, msg) => this._onPeerMessage(id, msg),
      (id)     => this._onPeerClose(id)
    );
    this.peers[peerId] = peer;
    return peer;
  },

  _onPeerMessage(peerId, msg) {
    // Handle mesh protocol messages
    if (msg.type === 'health-signal') {
      this._emit('mesh:health-signal', msg.payload, peerId);
    } else if (msg.type === 'peer-list') {
      // Gossip: connect to new peers we don't know
      for (const pid of msg.peers) {
        if (pid !== this.nodeId && !this.peers[pid] && Object.keys(this.peers).length < MAX_PEERS) {
          this._createPeer(pid, true);
        }
      }
    } else if (msg.type === 'outbreak-alert') {
      this._emit('mesh:outbreak-alert', msg.payload, peerId);
      // Rebroadcast to other peers (gossip propagation)
      this._broadcast(msg, [peerId]);
    }
  },

  _onPeerClose(peerId) {
    delete this.peers[peerId];
    console.log(`[Mesh] Peer ${peerId.slice(-6)} disconnected. Active: ${Object.keys(this.peers).length}`);
    this._emit('mesh:peer-left', { peerId });
  },

  // ── SIGNALING ─────────────────────────────────────────────────────────────
  _sendSignal(targetPeerId, signal) {
    // Try BroadcastChannel first (same device)
    this._bc?.postMessage({ type: 'signal', from: this.nodeId, to: targetPeerId, signal });

    // Also try VPS relay if online (for cross-device)
    if (this._online) {
      fetch(SIGNAL_RELAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: this.nodeId, to: targetPeerId, signal }),
      }).catch(() => {}); // Silent fail — BroadcastChannel is fallback
    }
  },

  _routeSignal(fromPeerId, signal) {
    if (!this.peers[fromPeerId]) {
      this._createPeer(fromPeerId, false);
    }
    this.peers[fromPeerId]?.handleSignal(signal);
  },

  // ── PEER DISCOVERY ────────────────────────────────────────────────────────
  async _discoverPeers() {
    try {
      const r = await fetch(`${SIGNAL_RELAY_URL}/peers?node=${this.nodeId}`);
      if (!r.ok) return;
      const { peers } = await r.json();
      for (const pid of (peers || [])) {
        if (pid !== this.nodeId && !this.peers[pid] && Object.keys(this.peers).length < MAX_PEERS) {
          this._createPeer(pid, true);
        }
      }
    } catch { /* offline or relay not yet deployed */ }
  },

  // ── BROADCAST TO ALL PEERS ────────────────────────────────────────────────
  _broadcast(msg, excludeIds = []) {
    let sent = 0;
    for (const [pid, peer] of Object.entries(this.peers)) {
      if (!excludeIds.includes(pid) && peer.state === 'connected') {
        if (peer.send(msg)) sent++;
      }
    }
    return sent;
  },

  // ── PUBLIC: SEND HEALTH SIGNAL ────────────────────────────────────────────
  /**
   * Share an anonymized, noised health signal with the mesh.
   * Raw values are NEVER shared — Laplace noise applied before sending.
   */
  broadcastHealthSignal(type, value, region = 'UNKNOWN') {
    const noisedValue = addNoise(value, 1.0);
    const signal = {
      type:    'health-signal',
      payload: {
        signalType: type,
        value:      parseFloat(noisedValue.toFixed(3)),
        region,
        timestamp:  Date.now(),
        epsilon:    EPSILON,
        nodeId:     this.nodeId.slice(-6), // Only last 6 chars for partial anonymity
      }
    };
    const sent = this._broadcast(signal);

    // Also queue for background sync via service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'QUEUE_MESH_SIGNAL',
        payload: { type, value: noisedValue, region, queuedAt: Date.now() }
      });
    }

    return sent;
  },

  /**
   * Broadcast a detected outbreak alert to all peers.
   * Peers rebroadcast (gossip) — alert spreads without central server.
   */
  broadcastOutbreakAlert(alert) {
    const msg = {
      type:    'outbreak-alert',
      payload: { ...alert, sourceNode: this.nodeId.slice(-6), ts: Date.now() }
    };
    const sent = this._broadcast(msg);
    console.log(`[Mesh] Outbreak alert broadcast to ${sent} peers`);
    return sent;
  },

  // ── HEARTBEAT ─────────────────────────────────────────────────────────────
  _heartbeat() {
    const now = Date.now();
    // Remove stale peers
    for (const [pid, peer] of Object.entries(this.peers)) {
      if (peer.state === 'closed' || now - peer.lastSeen > 60000) {
        peer.close();
        delete this.peers[pid];
      }
    }
    // Share peer list (gossip)
    if (Object.keys(this.peers).length > 0) {
      this._broadcast({
        type:  'peer-list',
        peers: Object.keys(this.peers),
      });
    }
    this._emit('mesh:heartbeat', {
      peers:   Object.keys(this.peers).length,
      online:  this._online,
      nodeId:  this.nodeId.slice(-6),
    });
  },

  _onOnline() {
    console.log('[Mesh] Back online — syncing with relay...');
    this._emit('mesh:online', {});
    this._discoverPeers();
    // Trigger service worker background sync
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(sw => {
        if (sw.sync) sw.sync.register('mesh-signal-sync');
      });
    }
  },

  _onOffline() {
    console.log('[Mesh] Gone offline — mesh-only mode');
    this._emit('mesh:offline', {});
  },

  // ── STATUS ────────────────────────────────────────────────────────────────
  getStatus() {
    return {
      nodeId:      this.nodeId.slice(-8),
      peers:       Object.keys(this.peers).length,
      connected:   Object.values(this.peers).filter(p => p.state === 'connected').length,
      online:      this._online,
      version:     MESH_VERSION,
    };
  },
};

// Export
if (typeof window !== 'undefined') {
  window.MeshCoordinator = MeshCoordinator;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MeshCoordinator };
}
