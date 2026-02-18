#!/usr/bin/env python3
"""
USS CHAOSBRINGER — Flagship of the Fleet
Concrete implementation of Starship for the primary event-driven control plane.
Wraps all existing handlers, narrator, and state logic into the Starship abstraction.
"""

import sys
import os

# Handle imports
sys.path.insert(0, os.path.dirname(__file__))

from starship import Starship, ShipEvent, ShipEventResult
from typing import Dict, Any, List


class ChaosbringingerShip(Starship):
    """
    USS ChaosBringer — The Flagship

    Multi-domain event router with:
    - 5 domain handlers (TRADING_BOT, OBSERVER, INFRA, CAPTAIN, INTERNAL)
    - Advanced narrator engine with personality matrix
    - Safety rules enforcement
    - Full telemetry collection

    This is the primary trading control plane.
    """

    def get_initial_state(self) -> Dict[str, Any]:
        """Define ChaosBringer-specific state"""
        return {
            # === Base fields (all ships have these) ===
            'threat_level': 0,  # 0-10, escalates with alerts
            'mode': 'NORMAL',  # NORMAL, ELEVATED_ALERT, CRITICAL
            'shields': 100,  # 0-100, shield integrity
            'warp_factor': 1,  # 0-10, engine output
            'reactor_temp': 30,  # 0-100, thermal state

            # === ChaosBringer-specific fields ===
            'last_cycle_id': None,
            'cycle_count': 0,
            'market_regime': 'NEUTRAL',
            'regime_confidence': 0.0,
            'volatility_pct': 0.0,
            'trading_paused': False,
            'pause_reason': None,

            # === Observer/Alert system ===
            'high_severity_alerts': 0,
            'medium_severity_alerts': 0,
            'alerts_cleared': 0,
            'alert_storm_active': False,
            'alert_storm_count': 0,
            'anomaly_density': 0.0,

            # === Infrastructure monitoring ===
            'latency_ms': 0,
            'latency_baseline_ms': 0,
            'cpu_pct': 0,
            'cpu_process': None,
            'mem_pct': 0,
            'memory_process': None,
            'leak_suspected': False,
            'reactor_threshold': 0,
            'shield_energy': 100,
            'shield_drain_rate': 0,

            # === Internal systems ===
            'warp_vibration': 0,
            'warp_vibration_previous': 0,
            'shield_raise_reason': None,
            'raccoons_active': 0,
            'last_engineering_team': None,

            # === Error tracking ===
            'last_error': None,
            'error_count': 0,
        }

    def _register_handlers(self):
        """Register all 5 domain handlers"""
        try:
            from handlers.trading_handler import TradingHandler
            from handlers.observer_handler import ObserverHandler
            from handlers.infra_handler import InfraHandler
            from handlers.captain_handler import CaptainHandler
            from handlers.internal_handler import InternalHandler
        except ImportError:
            import sys
            import os
            sys.path.insert(0, os.path.dirname(__file__))
            from handlers.trading_handler import TradingHandler
            from handlers.observer_handler import ObserverHandler
            from handlers.infra_handler import InfraHandler
            from handlers.captain_handler import CaptainHandler
            from handlers.internal_handler import InternalHandler

        self.handlers = {
            'TRADING_BOT': TradingHandler.handle,
            'OBSERVER': ObserverHandler.handle,
            'INFRA': InfraHandler.handle,
            'CAPTAIN': CaptainHandler.handle,
            'INTERNAL': InternalHandler.handle,
        }

    def _initialize_narrator(self):
        """Initialize the ChaosbringingerShip narrator with personality"""
        try:
            from narrator_engine import NarratorEngine
        except ImportError:
            sys.path.insert(0, os.path.dirname(__file__))
            from narrator_engine import NarratorEngine

        self.narrator = NarratorEngine()

    def get_narrator_config(self) -> Dict[str, Any]:
        """
        Return the full personality matrix for ChaosBringer.
        This is the tone matrix from the existing narrator_engine.py.
        Maps (mode, severity, domain) → (tone, templates).
        """
        # For now, pass empty dict - the NarratorEngine has a default matrix
        # In a future refactor, we'd inject this from config
        return {}

    def get_safety_rules(self) -> List[Dict[str, Any]]:
        """Define ChaosBringer safety rules"""
        return [
            {
                'name': 'Reactor Temperature Critical',
                'condition': lambda state: state.get('reactor_temp', 0) > 85,
                'action': lambda state: {'mode': 'CRITICAL', 'threat_level': 10},
                'severity': 'CRITICAL'
            },
            {
                'name': 'High Threat Level',
                'condition': lambda state: state.get('threat_level', 0) >= 8,
                'action': lambda state: {'mode': 'CRITICAL'}
                if state.get('mode') != 'CRITICAL'
                else {},
                'severity': 'CRITICAL'
            },
            {
                'name': 'Shield Integrity Critical',
                'condition': lambda state: state.get('shields', 100) < 30,
                'action': lambda state: {'mode': 'ELEVATED_ALERT', 'threat_level': min(9, state.get('threat_level', 0) + 2)},
                'severity': 'ALERT'
            },
            {
                'name': 'CPU Overload Too Long',
                'condition': lambda state: state.get('cpu_pct', 0) > 90,
                'action': lambda state: {'threat_level': min(10, state.get('threat_level', 0) + 1)},
                'severity': 'ALERT'
            },
        ]

    def emit_anomaly_detection_event(self, anomaly_type: str, severity_level: str):
        """
        When ChaosBringer detects an anomaly, emit an event to EntropyDancer.
        This demonstrates cross-ship communication.
        """
        event = ShipEvent(
            domain='ANOMALY_DETECTION',
            type='AnomalyTrigger',
            payload={
                'anomaly_type': anomaly_type,
                'severity_level': severity_level,
                'detected_by': 'ChaosBringer',
                'reactor_temp': self.state.get('reactor_temp', 0),
                'threat_level': self.state.get('threat_level', 0),
            },
            source_ship='ChaosBringer',
            cross_ship=True
        )
        self.cross_ship_event_queue.append(event)

    def __repr__(self):
        return f"<USS Chaosbringer threat={self.state.get('threat_level', 0)} mode={self.state.get('mode')} shields={self.state.get('shields', 0)}%>"
