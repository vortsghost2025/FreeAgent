# Mobile Integration Plan - Federation Game

## Overview
Plan for adapting the Federation Game platform to mobile devices (Android/iOS)
while maintaining the mesh federation network capabilities.

## Target Platforms
- Android 10+ (API level 29+)
- iOS 15+
- Progressive Web App (PWA) for broad compatibility

## Architecture Approach

### Option 1: PWA (Recommended for MVP)
- Convert `federation_dashboard.html` to a full PWA
- Add `manifest.json` and service worker for offline capability
- Mesh networking via WebRTC for peer discovery
- IndexedDB for local universe persistence (Phase XI integration)

### Option 2: Native Kivy App (Python-first)
- Use Kivy framework to wrap the Python game engine
- Direct access to `federation_game_console.py` and all phases
- Bluetooth mesh via `bleak` library for P2P without internet
- SQLite via `persistent_universe.py` for save states

### Option 3: React Native Bridge
- TypeScript wrapper around Python backend via REST API
- `run_game.py` serves as the mobile API server
- Native UI components for consciousness gauges and mesh visualization

## Mesh Networking on Mobile

### WiFi Direct (Android)
```python
# WiFi Direct peer discovery replaces socket-based mesh
# MeshNodeType.GAME_NODE can broadcast via mDNS on local network
```

### Bluetooth LE
```python
# Low-energy alternative for short-range mesh
# Suitable for tabletop gaming scenarios
# Packet size limitations require chunked MeshPacket transmission
```

### Offline-First Design
- All game state persists locally via `UniverseState` (Phase XI)
- Sync conflicts resolved by `ConflictResolutionEngine` (Phase VIII)
- Vector clocks handle ordering when devices reconnect

## UI Adaptations

### Touch Controls
- Swipe gestures replace CLI commands
- Long-press for context menus (diplomacy actions, quest choices)
- Pinch-to-zoom on mesh network visualization SVG

### Screen Size
- Responsive breakpoints: 320px, 768px, 1024px
- Federation consciousness gauges collapse to icon badges on small screens
- Narrative dialogue engine optimized for portrait reading mode

### Performance
- Lazy-load Phase modules (IX-XXXIII) on demand
- Background mesh sync via Web Workers / background tasks
- Battery-aware routing from `MeshRoutingEngine` used directly

## Implementation Phases

### Phase M1: PWA Shell (2 weeks)
- [ ] Add service worker to `federation_dashboard.html`
- [ ] Create `manifest.json` with game icons
- [ ] Implement offline fallback page
- [ ] Test on Android Chrome and iOS Safari

### Phase M2: Mesh Networking (4 weeks)
- [ ] WebRTC data channels for peer mesh
- [ ] Integrate with `mesh_federation_network.py` protocol
- [ ] Signaling server for initial peer discovery (optional)
- [ ] Test with 3+ devices on same WiFi network

### Phase M3: Native Features (4 weeks)
- [ ] Push notifications for turn events
- [ ] Haptic feedback for combat events
- [ ] Camera integration for QR code faction sharing
- [ ] Background sync when app minimized

## Testing Strategy
- Unit tests: Existing Python test suite covers all game logic
- Integration: Run `test_mesh_federation_network.py` on mobile Python env
- E2E: Appium for native automation, Playwright for PWA
- Network: Simulate packet loss and device disconnection

## Key Files for Mobile Integration
- [federation_dashboard.html](federation_dashboard.html) - Primary UI target
- [mesh_federation_network.py](uss-chaosbringer/mesh_federation_network.py) - P2P protocol
- [persistent_universe.py](persistent_universe.py) - Save/load for offline
- [run_game.py](run_game.py) - API server for native app backend

---
*Created: 2026-02-22 | Federation Game Platform*
