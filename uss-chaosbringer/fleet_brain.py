#!/usr/bin/env python3
"""
FLEET BRAIN — Autonomous Fleet Intelligence
Central autonomous decision-making system that:
  - Analyzes fleet state from SensingShip
  - Makes strategic decisions (threat response, resource allocation)
  - Issues commands to coordinate fleet actions
  - Requests ship spawning when needed
  - Learns from fleet history
"""

from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import json


@dataclass
class StrategicDecision:
    """Output from FleetBrain strategic analysis"""
    decision_id: str
    timestamp: float
    threat_level: int
    strategy: str  # AGGRESSIVE, DEFENSIVE, EVASIVE, SCOUT, BALANCED
    actions: List[Dict[str, Any]]  # Commands to execute
    confidence: float  # 0.0-1.0
    reasoning: str
    ship_spawn_request: Optional[Dict[str, Any]] = None


@dataclass
class FleetMetaState:
    """Overall fleet intelligence state"""
    total_ships: int
    critical_ships: int
    average_threat: float
    highest_threat_ship: str
    lowest_threat_ship: str
    fleet_composition: Dict[str, int]  # ship_type: count
    health_score: float  # 0.0-1.0
    autonomy_level: int  # 0-10, how autonomous the fleet is


class FleetBrain:
    """
    Autonomous intelligence system for multi-ship coordination.

    The FleetBrain:
    1. Receives fleet snapshots from SensingShip
    2. Analyzes threat patterns, resource usage, fleet composition
    3. Makes strategic decisions (spawn ships, redirect threats, balance load)
    4. Issues commands to FleetCoordinator
    5. Tracks decision history for learning/improvement
    """

    def __init__(self, name: str = 'FleetBrain-Alpha', autonomy_level: int = 5):
        """Initialize FleetBrain with configuration"""
        self.name = name
        self.autonomy_level = autonomy_level  # 0-10, higher = more autonomous
        self.decision_history: List[StrategicDecision] = []
        self.fleet_state_history: List[Dict[str, Any]] = []
        self.known_ship_types = {
            'Starship': {'weight': 1.0},
            'ChaosbringingerShip': {'weight': 2.0, 'roles': ['COMMAND']},
            'SensingShip': {'weight': 0.5, 'roles': ['SENSOR']},
            'SignalHarvester': {'weight': 1.5, 'roles': ['SIGNAL']},
            'ProbabilityWeaver': {'weight': 1.2, 'roles': ['ANALYSIS']},
            'ParadoxRunner': {'weight': 1.3, 'roles': ['TEMPORAL']},
        }
        self.strategy_config = {
            'DEFENSIVE': {
                'threshold': 6,  # Activate when threat >= 6
                'priority': 'SHIELD_PROTECTION',
                'spawn_type': 'SensingShip',
                'confidence': 0.95
            },
            'AGGRESSIVE': {
                'threshold': 4,
                'priority': 'THREAT_ELIMINATION',
                'spawn_type': 'SignalHarvester',
                'confidence': 0.80
            },
            'SCOUT': {
                'threshold': 2,
                'priority': 'INFORMATION_GATHERING',
                'spawn_type': 'SensingShip',
                'confidence': 0.90
            },
            'EVASIVE': {
                'threshold': 8,
                'priority': 'FLEET_PRESERVATION',
                'spawn_type': 'ProbabilityWeaver',
                'confidence': 0.75
            },
            'BALANCED': {
                'threshold': 0,
                'priority': 'NORMAL_OPERATIONS',
                'spawn_type': None,
                'confidence': 1.0
            },
        }

    def analyze_fleet_snapshot(self, fleet_snapshot: Dict[str, Any]) -> FleetMetaState:
        """Convert raw fleet snapshot into analyzed metadata"""
        threat_map = fleet_snapshot.get('threat_map', {})
        contacts = fleet_snapshot.get('contacts', [])

        if not threat_map:
            avg_threat = 0.0
            highest_threat_ship = 'NONE'
            lowest_threat_ship = 'NONE'
        else:
            avg_threat = sum(threat_map.values()) / len(threat_map)
            highest_threat_ship = max(threat_map.items(), key=lambda x: x[1])[0]
            lowest_threat_ship = min(threat_map.items(), key=lambda x: x[1])[0]

        critical_count = sum(1 for t in threat_map.values() if t >= 8)
        total_ships = len(contacts)

        # Simple health score: (1 - avg_threat/10) * (1 - critical_count/total) avg
        health = 0.5  # Default
        if total_ships > 0:
            threat_health = 1.0 - (avg_threat / 10.0)
            critical_health = 1.0 - (critical_count / total_ships)
            health = (threat_health + critical_health) / 2.0

        return FleetMetaState(
            total_ships=total_ships,
            critical_ships=critical_count,
            average_threat=avg_threat,
            highest_threat_ship=highest_threat_ship,
            lowest_threat_ship=lowest_threat_ship,
            fleet_composition={},  # TODO: populate from contacts metadata
            health_score=max(0.0, min(1.0, health)),
            autonomy_level=self.autonomy_level
        )

    def make_strategic_decision(
        self,
        fleet_snapshot: Dict[str, Any],
        previous_decision: Optional[StrategicDecision] = None
    ) -> StrategicDecision:
        """
        Core decision-making algorithm.
        Analyzes fleet state and returns a strategic decision with actions.
        """
        timestamp = datetime.now().timestamp()
        decision_id = f"decision-{len(self.decision_history):04d}"

        # Analyze fleet metastate
        meta = self.analyze_fleet_snapshot(fleet_snapshot)
        threat_level = int(meta.average_threat)

        # Determine strategy
        strategy = self._select_strategy(threat_level, meta)
        strategy_config = self.strategy_config.get(strategy, self.strategy_config['BALANCED'])
        confidence = strategy_config['confidence']

        # Generate actions based on strategy
        actions = self._generate_actions(strategy, meta, fleet_snapshot)

        # Determine if we need to spawn a ship
        spawn_request = None
        if self.autonomy_level >= 5:  # Only spawn if autonomy is high enough
            spawn_request = self._should_spawn_ship(strategy, meta)

        reasoning = self._generate_reasoning(strategy, meta, threat_level)

        decision = StrategicDecision(
            decision_id=decision_id,
            timestamp=timestamp,
            threat_level=threat_level,
            strategy=strategy,
            actions=actions,
            confidence=confidence,
            reasoning=reasoning,
            ship_spawn_request=spawn_request
        )

        # Store in history
        self.decision_history.append(decision)
        self.fleet_state_history.append(fleet_snapshot)

        return decision

    def _select_strategy(self, threat_level: int, meta: FleetMetaState) -> str:
        """Select appropriate strategy based on threat and fleet state"""
        if threat_level >= 8:
            return 'EVASIVE'
        elif threat_level >= 6:
            return 'DEFENSIVE'
        elif threat_level >= 4:
            return 'AGGRESSIVE'
        elif threat_level >= 1:
            return 'SCOUT'
        else:
            return 'BALANCED'

    def _generate_actions(
        self,
        strategy: str,
        meta: FleetMetaState,
        fleet_snapshot: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate specific actions for the chosen strategy"""
        actions = []

        if strategy == 'DEFENSIVE':
            actions.extend([
                {'type': 'RAISE_SHIELDS', 'target_ships': 'ALL', 'level': 90},
                {'type': 'REDUCE_SPEED', 'target_ships': 'ALL', 'warp_factor': 2},
                {'type': 'ALERT_LEVEL', 'level': 'ELEVATED_ALERT'},
            ])
        elif strategy == 'AGGRESSIVE':
            threat_ship = meta.highest_threat_ship
            actions.extend([
                {'type': 'FOCUS_FIRE', 'target': threat_ship},
                {'type': 'INCREASE_POWER', 'subsystem': 'WEAPONS'},
                {'type': 'RAISE_SHIELDS', 'level': 70},
            ])
        elif strategy == 'EVASIVE':
            actions.extend([
                {'type': 'INITIATE_WARP', 'distance': 10},
                {'type': 'REDUCE_SIGNATURE', 'emissions': 'MINIMAL'},
                {'type': 'SCATTER_FORMATION', 'target_ships': 'ALL'},
            ])
        elif strategy == 'SCOUT':
            actions.extend([
                {'type': 'INCREASE_SENSOR_RANGE', 'radius': 15},
                {'type': 'DEPLOY_PROBES', 'count': 3},
                {'type': 'MAINTAIN_DISTANCE', 'min_range': 5},
            ])
        else:  # BALANCED
            actions.extend([
                {'type': 'NORMAL_OPERATIONS'},
                {'type': 'MAINTAIN_READINESS'},
            ])

        return actions

    def _should_spawn_ship(self, strategy: str, meta: FleetMetaState) -> Optional[Dict[str, Any]]:
        """Determine if we should spawn a new ship"""
        strategy_config = self.strategy_config.get(strategy)
        if not strategy_config or not strategy_config.get('spawn_type'):
            return None

        # Spawn if fleet is undermanned or strategy indicates need
        if meta.total_ships < 3 or (self.autonomy_level >= 7 and meta.health_score < 0.6):
            return {
                'ship_type': strategy_config['spawn_type'],
                'personality_mode': self._select_personality_for_spawn(strategy),
                'reasoning': f"Fleet need: {strategy} strategy requires {strategy_config['spawn_type']}",
                'priority': 'HIGH' if meta.health_score < 0.4 else 'NORMAL'
            }

        return None

    def _select_personality_for_spawn(self, strategy: str) -> str:
        """Select personality for newly spawned ships"""
        personality_map = {
            'DEFENSIVE': 'CALM',
            'AGGRESSIVE': 'NOIR',
            'EVASIVE': 'DOCUMENTARY',
            'SCOUT': 'CALM',
            'BALANCED': 'CALM',
        }
        return personality_map.get(strategy, 'CALM')

    def _generate_reasoning(self, strategy: str, meta: FleetMetaState, threat_level: int) -> str:
        """Generate human-readable reasoning for the decision"""
        return (
            f"Strategy: {strategy} | "
            f"Threat: {threat_level}/10 | "
            f"Ships: {meta.total_ships} | "
            f"Critical: {meta.critical_ships} | "
            f"Health: {meta.health_score:.2f} | "
            f"Autonomy: {self.autonomy_level}/10"
        )

    def get_next_command(self, decision: StrategicDecision) -> Dict[str, Any]:
        """Convert a decision into a fleet command"""
        return {
            'type': 'FLEET_COMMAND',
            'decision_id': decision.decision_id,
            'strategy': decision.strategy,
            'actions': decision.actions,
            'timestamp': decision.timestamp,
            'execute_immediately': True if self.autonomy_level >= 8 else False
        }

    def get_brain_state(self) -> Dict[str, Any]:
        """Return current brain state for debugging"""
        recent_decisions = self.decision_history[-5:] if self.decision_history else []
        return {
            'brain_name': self.name,
            'autonomy_level': self.autonomy_level,
            'total_decisions': len(self.decision_history),
            'fleet_snapshots_analyzed': len(self.fleet_state_history),
            'recent_decisions': [
                {
                    'id': d.decision_id,
                    'strategy': d.strategy,
                    'threat': d.threat_level,
                    'confidence': d.confidence,
                }
                for d in recent_decisions
            ]
        }

    def __repr__(self):
        decisions = len(self.decision_history)
        autonomy = self.autonomy_level
        return f"<{self.name} decisions={decisions} autonomy={autonomy}/10>"
