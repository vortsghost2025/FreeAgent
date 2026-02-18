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

    def set_telemetry_engine(self, telemetry_engine: 'TelemetryEngine'):
        """Wire in a TelemetryEngine for observability"""
        self.telemetry_engine = telemetry_engine

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

        ship = self.ships[ship_name]

        # Process event on target ship
        result = ship.process_event(event)
        results[ship_name] = result

        # Log to fleet history
        self.event_history.append({
            'timestamp': datetime.now().timestamp(),
            'source_ship': ship_name,
            'event_type': event.type,
            'severity': result.severity,
            'narrative': result.narrative,
        })

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
        print(f"\nShips by Mode: {telemetry.ships_by_mode}")
        print(f"Severity Distribution: {telemetry.severity_distribution}")

        print("\nShip Details:")
        print("-" * 80)
        for ship_name, ship in self.ships.items():
            state = ship.get_state()
            print(f"{ship_name:20} | Threat: {state.get('threat_level', 0):2}/10 | "
                  f"Mode: {state.get('mode', 'UNKNOWN'):15} | "
                  f"Shields: {state.get('shields', 0):3}% | "
                  f"Events: {ship.telemetry['event_count']:3}")

        print("\n" + "="*80)

    def __repr__(self):
        return f"<FleetCoordinator ships={len(self.ships)} threat={self.fleet_threat_level}>"
