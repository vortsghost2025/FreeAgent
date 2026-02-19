#!/usr/bin/env python3
"""
STARSHIP — Abstract Base Class for Multi-Ship Fleet Architecture
Every starship in the USS Chaosbringer fleet inherits from this class.
Provides the protocol for:
  - Event routing via domain handlers
  - State management with safety rules
  - Personality-driven narration
  - Cross-ship event emission
  - Telemetry collection
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
from datetime import datetime
import json


@dataclass
class ShipEvent:
    """A standardized event that flows through a ship"""
    domain: str
    type: str
    payload: Dict[str, Any]
    source_ship: str = "UNKNOWN"
    timestamp: float = field(default_factory=lambda: datetime.now().timestamp())
    cross_ship: bool = False  # True if routed from another ship


@dataclass
class ShipEventResult:
    """Result of processing an event through a ship"""
    success: bool
    severity: str
    narrative: str
    state_delta: Optional[Dict[str, Any]]
    domain_actions: List[Dict[str, Any]]
    logs: List[str]
    cross_ship_events: List[ShipEvent] = field(default_factory=list)


class Starship(ABC):
    """
    Abstract base class defining the contract for all starships.

    Each ship is responsible for:
    1. Managing its own state (shields, warp_factor, reactor_temp, etc.)
    2. Registering domain-specific event handlers (TRADING_BOT, OBSERVER, INFRA, etc.)
    3. Processing events through handlers → narrator → safety rules
    4. Emitting cross-ship events for fleet coordination
    5. Tracking telemetry (warp factor, threat level, tone activations, etc.)
    """

    def __init__(self, ship_name: str, personality_mode: str = 'CALM'):
        """Initialize a starship with name, personality, and empty state"""
        self.ship_name = ship_name
        self.state: Dict[str, Any] = self.get_initial_state()
        self.handlers: Dict[str, Callable] = {}
        self.personality_mode = personality_mode  # Default personality mode, can be overridden
        self.narrator = None
        self.event_log: List[Dict[str, Any]] = []
        self.cross_ship_event_queue: List[ShipEvent] = []
        self.telemetry = {
            "event_count": 0,
            "severity_counts": {"INFO": 0, "WARNING": 0, "ALERT": 0, "CRITICAL": 0},
            "last_event": None,
            "uptime_seconds": 0.0,
        }

        # Initialize ship-specific configuration
        self._register_handlers()
        self._initialize_narrator()

    @abstractmethod
    def get_initial_state(self) -> Dict[str, Any]:
        """
        Override this to define ship-specific initial state.

        Base fields every ship should have:
        - threat_level: 0-10 (escalates with alerts)
        - mode: "NORMAL", "ELEVATED_ALERT", "CRITICAL"
        - shields: 0-100 (shield integrity)
        - warp_factor: 0-10 (engine output)
        - reactor_temp: 0-100 (thermal state)

        Ship-specific fields come after base fields.
        """
        raise NotImplementedError

    @abstractmethod
    def _register_handlers(self):
        """
        Override this to register domain handlers.
        Example:
            from handlers.trading_handler import TradingHandler
            self.handlers['TRADING_BOT'] = TradingHandler.handle
        """
        raise NotImplementedError

    def _initialize_narrator(self):
        """
        Initialize the narrator engine with the current personality mode.
        Ships may override for custom narrator/personality.
        """
        from narrator_engine import NarratorEngine
        self.narrator = NarratorEngine()

    @abstractmethod
    def get_narrator_config(self) -> Dict[str, Any]:
        """
        Override to return ship-specific narrator personality matrix.
        Returns dict mapping (mode, severity, domain) → (tone, templates).
        """
        raise NotImplementedError

    @abstractmethod
    def get_safety_rules(self) -> List[Dict[str, Any]]:
        """
        Override to return ship-specific safety rules.
        Each rule: {
            'name': str,
            'condition': callable(state) -> bool,
            'action': callable(state) -> state_delta,
            'severity': 'INFO' | 'WARNING' | 'ALERT' | 'CRITICAL'
        }
        """
        raise NotImplementedError

    def process_event(self, event: ShipEvent) -> ShipEventResult:
        """
        Core event processing pipeline:
        1. Route to domain handler
        2. Apply state delta
        3. Check safety rules
        4. Generate narrative
        5. Collect telemetry
        6. Queue cross-ship events

        Returns ShipEventResult with everything needed by FleetCoordinator.
        """
        logs = []
        severity = "INFO"
        narrative = f"Event {event.type} processed by {self.ship_name}"
        state_delta = {}
        domain_actions = []
        cross_ship_events = []

        # Step 1: Route to domain handler
        handler = self.handlers.get(event.domain)
        if not handler:
            logs.append(f"[{self.ship_name}] Unknown domain: {event.domain}")
            severity = "WARNING"
        else:
            try:
                from event_router import DomainResult
                result: DomainResult = handler(event.__dict__, self.state)
                state_delta = result.state_delta or {}
                domain_actions = result.domain_actions or []
                logs.extend(result.logs or [])
            except Exception as e:
                logs.append(f"[{self.ship_name}] Handler error: {str(e)}")
                severity = "CRITICAL"

        # Step 2: Apply state delta
        if state_delta:
            self.state.update(state_delta)

        # Step 3: Check safety rules
        safety_violations = self._check_safety_rules()
        if safety_violations:
            logs.extend(safety_violations['logs'])
            severity = safety_violations['max_severity']
            if safety_violations['state_delta']:
                self.state.update(safety_violations['state_delta'])

        # Step 4: Generate narrative
        if self.narrator:
            try:
                narrative = self.narrator.generate_narrative(
                    event=event.__dict__,
                    state=self.state,
                    domain_actions=domain_actions
                )
            except Exception as e:
                narrative = f"Narrator error: {str(e)}"
                logs.append(f"[{self.ship_name}] Narrator error: {str(e)}")

        # Step 5: Collect telemetry
        self.telemetry['event_count'] += 1
        self.telemetry['severity_counts'][severity] = self.telemetry['severity_counts'].get(severity, 0) + 1
        self.telemetry['last_event'] = {
            'type': event.type,
            'severity': severity,
            'timestamp': event.timestamp
        }

        # Step 6: Log event
        self.event_log.append({
            'event': event.__dict__,
            'severity': severity,
            'narrative': narrative,
            'state_delta': state_delta,
            'logs': logs,
            'timestamp': datetime.now().timestamp()
        })

        return ShipEventResult(
            success=severity not in ['CRITICAL'],
            severity=severity,
            narrative=narrative,
            state_delta=state_delta,
            domain_actions=domain_actions,
            logs=logs,
            cross_ship_events=cross_ship_events
        )

    def _check_safety_rules(self) -> Dict[str, Any]:
        """Apply all safety rules and return violations"""
        logs = []
        state_delta = {}
        max_severity = "INFO"

        for rule in self.get_safety_rules():
            try:
                if rule['condition'](self.state):
                    logs.append(f"[safety] Rule triggered: {rule['name']}")
                    rule_delta = rule['action'](self.state)
                    if rule_delta:
                        state_delta.update(rule_delta)
                    rule_severity = rule.get('severity', 'INFO')
                    if rule_severity == 'CRITICAL':
                        max_severity = 'CRITICAL'
                    elif rule_severity == 'ALERT' and max_severity != 'CRITICAL':
                        max_severity = 'ALERT'
                    elif rule_severity == 'WARNING' and max_severity == 'INFO':
                        max_severity = 'WARNING'
            except Exception as e:
                logs.append(f"[safety] Rule error in {rule['name']}: {str(e)}")
                max_severity = 'CRITICAL'

        return {
            'logs': logs,
            'state_delta': state_delta,
            'max_severity': max_severity
        }

    def get_state(self) -> Dict[str, Any]:
        """Return current ship state (read-only copy)"""
        return dict(self.state)

    def set_personality_mode(self, mode: str):
        """
        Set the personality mode for this ship's narrator.
        Available modes: CALM, SARCASM, NOIR, DOCUMENTARY, TIRED_ENGINEER, CAPTAINS_LOG, AI_TRYING_ITS_BEST
        Does NOT reinitialize the narrator, just updates the mode flag.
        The narrator will use this mode for all subsequent narratives.
        """
        valid_modes = ['CALM', 'SARCASM', 'NOIR', 'DOCUMENTARY', 'TIRED_ENGINEER', 'CAPTAINS_LOG', 'AI_TRYING_ITS_BEST']
        if mode not in valid_modes:
            raise ValueError(f"Invalid personality mode: {mode}. Must be one of {valid_modes}")
        self.personality_mode = mode
        # If the narrator supports runtime mode switching, update it here
        if self.narrator and hasattr(self.narrator, 'set_personality_mode'):
            self.narrator.set_personality_mode(mode)

    def get_personality_mode(self) -> str:
        """Get current personality mode"""
        return self.personality_mode

    def get_telemetry(self) -> Dict[str, Any]:
        """Return ship telemetry (for dashboard and monitoring)"""
        return {
            'ship_name': self.ship_name,
            'state': self.state,
            'telemetry': self.telemetry,
            'event_log_count': len(self.event_log),
            'cross_ship_queue_size': len(self.cross_ship_event_queue)
        }

    def get_telemetry_snapshot(self) -> Dict[str, Any]:
        """
        Return structured telemetry snapshot for TelemetryEngine.
        Override in subclasses to add ship-specific metrics.
        """
        return {
            'ship_name': self.ship_name,
            'threat_level': self.state.get('threat_level', 0),
            'mode': self.state.get('mode', 'UNKNOWN'),
            'shields': self.state.get('shields', 100),
            'warp_factor': self.state.get('warp_factor', 0),
            'reactor_temp': self.state.get('reactor_temp', 0),
            'event_count': self.telemetry.get('event_count', 0),
            'severity_distribution': self.telemetry.get('severity_counts', {}),
            'uptime_seconds': self.telemetry.get('uptime_seconds', 0),
            'last_event': self.telemetry.get('last_event'),
        }

    def reset_state(self):
        """Reset ship to initial state"""
        self.state = self.get_initial_state()
        self.event_log.clear()
        self.cross_ship_event_queue.clear()
        self.telemetry = {
            "event_count": 0,
            "severity_counts": {"INFO": 0, "WARNING": 0, "ALERT": 0, "CRITICAL": 0},
            "last_event": None,
        }

    def emit_cross_ship_event(self, event: ShipEvent):
        """
        Emit an event meant for other ships.
        FleetCoordinator will route these to their destination ships.
        """
        event.source_ship = self.ship_name
        event.cross_ship = True
        self.cross_ship_event_queue.append(event)

    def __repr__(self):
        return f"<{self.__class__.__name__} name={self.ship_name} threat_level={self.state.get('threat_level', 0)}>"
