#!/usr/bin/env python3
"""
FLEET COORDINATOR — Multi-Ship Orchestration Layer
Manages registration, event routing, cross-ship communication, and fleet-level telemetry.
"""

import sys
import os
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from starship import Starship, ShipEvent, ShipEventResult
from signalharvester_ship import SignalHarvester


@dataclass
class FleetTelemetry:
    """Aggregated fleet-wide telemetry"""
    total_ships: int
    total_events_processed: int
    ships_by_mode: Dict[str, int]  # mode → count
    threat_level_avg: float
    threat_level_max: int
    severity_distribution: Dict[str, int]  # INFO, WARNING, ALERT, CRITICAL → count
    timestamp: float


class FleetCoordinator:
    """
    Central orchestration hub for the USS Chaosbringer fleet.

    Responsibilities:
    - Register and manage multiple starships
    - Route events to appropriate ships
    - Handle cross-ship event communication
    - Enforce fleet-level safety protocols
    - Collect and aggregate telemetry
    - Execute captain-level commands
    """

    def __init__(self, flagship_name: str = "ChaosBringer"):
        """Initialize the fleet with an optional flagship"""
        self.ships: Dict[str, Starship] = {}
        self.flagship_name = flagship_name
        self.event_history: List[Dict[str, Any]] = []
        self.cross_ship_routing_rules: Dict[str, List[str]] = {}
        self.fleet_threat_level = 0
        self.telemetry_engine = None  # Optional TelemetryEngine integration
        self.lore_engine = None  # Optional LoreEngine integration
        self.sensing_ship = None  # Optional SensingShip for fleet observation
        self.fleet_brain = None  # Optional FleetBrain for autonomous decision-making
        self.ship_generator = None  # Optional ShipGenerator for autonomous spawning
        self.autonomy_enabled = False  # Enable autonomous fleet operations

        # Phase VII: Anomaly Engine integration
        from uss_chaosbringer.anomaly_engine import AnomalyDetector, MemoryGraph, ContinuityEngine
        self.anomaly_detector = AnomalyDetector()
        self.memory_graph = MemoryGraph()
        self.continuity_engine = ContinuityEngine()
        self.active_universe_id = self.memory_graph.active_universe_id  # Track current universe branch
        self.branching_mode = 'rare'  # Options: 'rare', 'common', 'chaos'
        self.anomaly_branch_threshold = 2  # Number of anomalies to trigger fork (tune for mode)
        self._pending_fork = False

    def set_telemetry_engine(self, telemetry_engine: 'TelemetryEngine'):
        """Wire in a TelemetryEngine for observability"""
        self.telemetry_engine = telemetry_engine

    def set_lore_engine(self, lore_engine: 'LoreEngine'):
        """Wire in a LoreEngine for story generation"""
        self.lore_engine = lore_engine

    def set_sensing_ship(self, sensing_ship: 'SensingShip'):
        """Register the fleet's sensing ship for autonomous observation"""
        self.sensing_ship = sensing_ship
        self.register_ship(sensing_ship)

    def set_fleet_brain(self, fleet_brain: 'FleetBrain'):
        """Wire in a FleetBrain for autonomous decision-making"""
        self.fleet_brain = fleet_brain

    def set_ship_generator(self, ship_generator: 'ShipGenerator'):
        """Wire in a ShipGenerator for autonomous ship spawning"""
        self.ship_generator = ship_generator

    def enable_autonomy(self, autonomy_level: int = 5):
        """Enable autonomous fleet operations"""
        self.autonomy_enabled = True
        if self.fleet_brain:
            self.fleet_brain.autonomy_level = autonomy_level

    def set_telemetry_hook(self, hook_name: str, hook_fn):
        """Register a telemetry hook (if TelemetryEngine is wired)"""
        if self.telemetry_engine:
            self.telemetry_engine.register_hook(hook_name, hook_fn)

    def _update_telemetry(self):
        """Collect and process telemetry (called after events)"""
        if not self.telemetry_engine:
            return None

        previous_metrics = self.telemetry_engine.get_latest_metrics()
        current_metrics, hook_results = self.telemetry_engine.update_metrics(
            self.ships,
            previous_metrics
        )

        # Feed hook results to LoreEngine for story generation
        if self.lore_engine and hook_results:
            for hook_result in hook_results:
                if hook_result.triggered:
                    self.lore_engine.generate_from_telemetry_hook(hook_result, current_metrics)

        return current_metrics, hook_results

    def register_ship(self, ship: Starship):
        """Register a starship to the fleet"""
        self.ships[ship.ship_name] = ship
        print(f"[FLEET] Registered ship: {ship.ship_name}")

    def set_cross_ship_routing(self, source_domain: str, target_ships: List[str]):
        """
        Configure cross-ship routing rules.
        Example: route ANOMALY_DETECTION to ['EntropyDancer', 'ProbabilityWeaver']
        """
        self.cross_ship_routing_rules[source_domain] = target_ships

    def process_event_across_fleet(self, ship_name: str, event: ShipEvent) -> Dict[str, ShipEventResult]:
        """
        Process event on a specific ship and handle cross-ship routing.

        Returns dict of {ship_name: result} for all ships that processed the event.
        """
        results = {}
        # Validate ship exists
        if ship_name not in self.ships:
            print(f"[FLEET] ERROR: Ship not found: {ship_name}")
            return results

        # === Multiverse: handle explicit fork event ===
        if getattr(event, 'type', None) == 'FORK_UNIVERSE':
            forked_id = self.memory_graph.fork_universe(self.active_universe_id, getattr(event, 'event_id', None))
            self.active_universe_id = forked_id
            self.memory_graph.set_active_universe(forked_id)
            print(f"[MULTIVERSE] Universe forked: {forked_id}")
            return {'FORK': f'Universe forked: {forked_id}'}

        ship = self.ships[ship_name]

        # Process event on target ship
        result = ship.process_event(event)
        results[ship_name] = result

        # Log to fleet history
        event_record = {
            'timestamp': datetime.now().timestamp(),
            'source_ship': ship_name,
            'event_type': event.type,
            'severity': getattr(result, 'severity', None),
            'narrative': getattr(result, 'narrative', None),
            'domain_result': getattr(result, 'domain_result', None),
            'state_delta': getattr(result, 'state_delta', None),
            'universe_id': self.active_universe_id,
        }
        self.event_history.append(event_record)

        # === Phase VII: Anomaly Engine hooks ===
        # Record event and result in memory (per universe)
        self.memory_graph.record_event({
            'ship': ship_name,
            'event': event,
            'result': result
        }, universe_id=self.active_universe_id)
        if hasattr(result, 'domain_result') and result.domain_result:
            # Optionally: store domain_result per universe if needed
            pass

        # Detect anomalies
        anomalies = self.anomaly_detector.detect(
            event=event.__dict__ if hasattr(event, '__dict__') else dict(event),
            state=ship.get_state(),
            domain_result=getattr(result, 'domain_result', None)
        )
        if anomalies:
            print(f"[ANOMALY] Detected: {anomalies}")
            # Multiverse: fork on anomaly threshold
            if self.branching_mode in ('rare', 'common', 'chaos'):
                if len(anomalies) >= self.anomaly_branch_threshold:
                    forked_id = self.memory_graph.fork_universe(self.active_universe_id, getattr(event, 'event_id', None))
                    self.active_universe_id = forked_id
                    self.memory_graph.set_active_universe(forked_id)
                    print(f"[MULTIVERSE] Universe forked on anomaly: {forked_id}")

        # Check continuity
        drifts = self.continuity_engine.check_continuity(ship.get_state(), self.memory_graph)
        if drifts:
            print(f"[CONTINUITY] Drift detected: {drifts}")

        # Handle cross-ship routing
        if event.domain in self.cross_ship_routing_rules:
            target_ships = self.cross_ship_routing_rules[event.domain]
            for target_ship_name in target_ships:
                if target_ship_name in self.ships:
                    target_ship = self.ships[target_ship_name]
                    # Create cross-ship version of event
                    cross_ship_event = ShipEvent(
                        domain=event.domain,
                        type=event.type,
                        payload=event.payload,
                        source_ship=ship_name,
                        cross_ship=True
                    )
                    cross_result = target_ship.process_event(cross_ship_event)
                    results[target_ship_name] = cross_result
                    # Phase VII: Record cross-ship event/result in memory (per universe)
                    self.memory_graph.record_event({
                        'ship': target_ship_name,
                        'event': cross_ship_event,
                        'result': cross_result
                    }, universe_id=self.active_universe_id)
                    if hasattr(cross_result, 'domain_result') and cross_result.domain_result:
                        pass

        # Update fleet threat level
        self._update_fleet_threat_level()

        # Update telemetry
        self._update_telemetry()

        return results

    def emit_cross_ship_events(self, ship_name: str):
        """
        Process any cross-ship events queued by a ship.
        Called after ship.process_event() to propagate cross-ship messages.
        """
        if ship_name not in self.ships:
            return

        ship = self.ships[ship_name]
        while ship.cross_ship_event_queue:
            cross_event = ship.cross_ship_event_queue.pop(0)

            # Apply routing rules
            target_ships = self.cross_ship_routing_rules.get(cross_event.domain, [])

            for target_ship_name in target_ships:
                if target_ship_name in self.ships:
                    target_ship = self.ships[target_ship_name]
                    result = target_ship.process_event(cross_event)

                    # Log cross-ship communication
                    self.event_history.append({
                        'timestamp': datetime.now().timestamp(),
                        'source_ship': ship_name,
                        'target_ship': target_ship_name,
                        'event_type': cross_event.type,
                        'cross_ship': True,
                        'severity': result.severity,
                    })

    def _update_fleet_threat_level(self):
        """Aggregate threat levels from all ships"""
        if not self.ships:
            self.fleet_threat_level = 0
            return

        threat_levels = [
            ship.state.get('threat_level', 0) for ship in self.ships.values()
        ]
        self.fleet_threat_level = max(threat_levels) if threat_levels else 0

    def get_fleet_state(self) -> Dict[str, Any]:
        """Get aggregated state of entire fleet"""
        return {
            'fleet_threat_level': self.fleet_threat_level,
            'ships': {
                ship_name: ship.get_state() for ship_name, ship in self.ships.items()
            },
            'ship_count': len(self.ships),
        }

    def get_fleet_telemetry(self) -> FleetTelemetry:
        """Aggregate telemetry from all ships"""
        ships_by_mode = {}
        total_events = 0
        threat_levels = []
        severity_dist = {'INFO': 0, 'WARNING': 0, 'ALERT': 0, 'CRITICAL': 0}

        for ship in self.ships.values():
            mode = ship.state.get('mode', 'UNKNOWN')
            ships_by_mode[mode] = ships_by_mode.get(mode, 0) + 1

            telemetry = ship.telemetry
            total_events += telemetry.get('event_count', 0)
            threat_levels.append(ship.state.get('threat_level', 0))

            for severity, count in telemetry.get('severity_counts', {}).items():
                severity_dist[severity] = severity_dist.get(severity, 0) + count

        threat_avg = sum(threat_levels) / len(threat_levels) if threat_levels else 0
        threat_max = max(threat_levels) if threat_levels else 0

        return FleetTelemetry(
            total_ships=len(self.ships),
            total_events_processed=total_events,
            ships_by_mode=ships_by_mode,
            threat_level_avg=threat_avg,
            threat_level_max=threat_max,
            severity_distribution=severity_dist,
            timestamp=datetime.now().timestamp()
        )

    def execute_captain_command(self, command: str, target_ships: Optional[List[str]] = None) -> Dict[str, str]:
        """
        Execute a fleet-level captain command.
        Commands: RED_ALERT, WARP_JUMP, SHIELD_REBALANCE, REACTOR_PURGE, TEMPORAL_SCAN
        """
        if target_ships is None:
            target_ships = list(self.ships.keys())

        results = {}

        if command == 'RED_ALERT':
            for ship_name in target_ships:
                if ship_name in self.ships:
                    ship = self.ships[ship_name]
                    ship.state['mode'] = 'CRITICAL'
                    ship.state['threat_level'] = 10
                    results[ship_name] = "RED ALERT activated"

        elif command == 'WARP_JUMP':
            for ship_name in target_ships:
                if ship_name in self.ships:
                    ship = self.ships[ship_name]
                    ship.state['warp_factor'] = 8
                    results[ship_name] = "Warp jump initiated (factor 8)"

        elif command == 'SHIELD_REBALANCE':
            for ship_name in target_ships:
                if ship_name in self.ships:
                    ship = self.ships[ship_name]
                    ship.state['shields'] = 100
                    results[ship_name] = "Shields rebalanced to 100%"

        elif command == 'REACTOR_PURGE':
            for ship_name in target_ships:
                if ship_name in self.ships:
                    ship = self.ships[ship_name]
                    ship.state['reactor_temp'] = 30
                    ship.state['threat_level'] = max(0, ship.state.get('threat_level', 0) - 3)
                    results[ship_name] = "Reactor thermal purge complete"

        elif command == 'TEMPORAL_SCAN':
            for ship_name in target_ships:
                if ship_name in self.ships:
                    ship = self.ships[ship_name]
                    # Simulate predictive analysis
                    results[ship_name] = f"Temporal scan complete: {len(ship.event_log)} events analyzed"

        elif command == 'ALL_STOP':
            for ship_name in target_ships:
                if ship_name in self.ships:
                    ship = self.ships[ship_name]
                    ship.state['mode'] = 'NORMAL'
                    ship.state['warp_factor'] = 0
                    ship.state['threat_level'] = 0
                    results[ship_name] = "All systems to standby"

        self._update_fleet_threat_level()
        return results

    def get_fleet_snapshot(self) -> Dict[str, Any]:
        """
        Get a comprehensive snapshot of fleet state.
        Used by SensingShip and FleetBrain for autonomous operations.
        """
        if self.sensing_ship:
            return self.sensing_ship.get_fleet_snapshot()

        # Fallback: manual snapshot construction
        return {
            'ships': list(self.ships.keys()),
            'threat_map': {
                name: ship.state.get('threat_level', 0)
                for name, ship in self.ships.items()
            },
            'contact_count': len(self.ships),
            'threat_level_avg': self.fleet_threat_level,
        }

    def execute_autonomous_cycle(self) -> Dict[str, Any]:
        """
        Execute one autonomous fleet operations cycle:
        1. SensingShip observes fleet state
        2. FleetBrain analyzes and makes decision
        3. Coordinator executes decision
        4. If needed, ShipGenerator spawns new ship
        """
        if not self.autonomy_enabled:
            return {'status': 'autonomy_disabled'}

        if not self.fleet_brain:
            return {'status': 'fleet_brain_not_configured'}

        # Get fleet snapshot
        fleet_snapshot = self.get_fleet_snapshot()

        # Make strategic decision
        decision = self.fleet_brain.make_strategic_decision(fleet_snapshot)

        # Execute decision actions
        results = {'status': 'executed', 'decision': decision.decision_id, 'executed_actions': 0}

        for action in decision.actions:
            action_type = action.get('type')
            target_ships = action.get('target_ships', list(self.ships.keys()))

            # Execute action on ships
            for ship_name in target_ships if target_ships != 'ALL' else self.ships.keys():
                if ship_name in self.ships:
                    ship = self.ships[ship_name]
                    # Apply action to ship state (simplified)
                    if action_type == 'RAISE_SHIELDS':
                        ship.state['shields'] = action.get('level', 90)
                    elif action_type == 'REDUCE_SPEED':
                        ship.state['warp_factor'] = action.get('warp_factor', 2)
                    elif action_type == 'ALERT_LEVEL':
                        ship.state['mode'] = 'ELEVATED_ALERT'
                    results['executed_actions'] += 1

        # Spawn new ship if recommended
        if decision.ship_spawn_request and self.ship_generator:
            spawn_result = self.spawn_ship_from_requirement(decision.ship_spawn_request)
            results['spawn'] = spawn_result

        return results

    def spawn_ship_from_requirement(self, requirement: Dict[str, Any]) -> Dict[str, Any]:
        """
        Spawn a new ship based on FleetBrain recommendation.

        Args:
            requirement: {ship_type, personality_mode, reasoning, priority}

        Returns:
            Result dict with ship_name, status, etc.
        """
        if not self.ship_generator:
            return {'status': 'generator_not_available'}

        try:
            # Create blueprint from requirement
            from ship_generator import ShipBlueprint
            blueprint = ShipBlueprint(
                ship_type=requirement.get('ship_type', 'SensingShip'),
                ship_name=f"AUTO-{len(self.ships):03d}",
                personality_mode=requirement.get('personality_mode', 'CALM'),
                config={'autonomous_spawn': True},
                priority=requirement.get('priority', 'NORMAL')
            )

            # Generate ship
            new_ship = self.ship_generator.generate_from_blueprint(blueprint)

            # Register to fleet
            self.register_ship(new_ship)

            return {
                'status': 'spawned',
                'ship_name': new_ship.ship_name,
                'ship_type': requirement.get('ship_type'),
                'personality': new_ship.personality_mode,
            }
        except Exception as e:
            return {'status': 'spawn_failed', 'error': str(e)}

    def print_fleet_status(self):
        """Pretty-print fleet status"""
        print("\n" + "="*80)
        print("FLEET STATUS REPORT")
        print("="*80)

        telemetry = self.get_fleet_telemetry()
        print(f"\nFleet Size: {telemetry.total_ships} ships")
        print(f"Total Events Processed: {telemetry.total_events_processed}")
        print(f"Fleet Threat Level: {self.fleet_threat_level}/10")
        print(f"Average Ship Threat: {telemetry.threat_level_avg:.1f}")
        print(f"Autonomy Enabled: {self.autonomy_enabled}")
        print(f"\nShips by Mode: {telemetry.ships_by_mode}")
        print(f"Severity Distribution: {telemetry.severity_distribution}")

        print("\nShip Details:")
        print("-" * 80)
        for ship_name, ship in self.ships.items():
            state = ship.get_state()
            personality = getattr(ship, 'personality_mode', 'UNKNOWN')
            print(f"{ship_name:20} | Threat: {state.get('threat_level', 0):2}/10 | "
                  f"Mode: {state.get('mode', 'UNKNOWN'):15} | "
                  f"Shields: {state.get('shields', 0):3}% | "
                  f"Personality: {personality:15} | "
                  f"Events: {ship.telemetry['event_count']:3}")

        print("\n" + "="*80)

    def __repr__(self):
        return f"<FleetCoordinator ships={len(self.ships)} threat={self.fleet_threat_level}>"

    def register_default_ships(self):
        """Register all default ships, including SignalHarvester."""
        # Register all default ships
        for ship_name in ['SignalHarvester', 'EntropyDancer', 'ProbabilityWeaver']:
            if ship_name not in self.ships:
                ship = self.create_default_ship(ship_name)
                self.register_ship(ship)

        print(f"[FLEET] Registered default ships: {list(self.ships.keys())}")
