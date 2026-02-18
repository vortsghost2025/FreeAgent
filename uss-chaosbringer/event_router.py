#!/usr/bin/env python3
"""
EVENT ROUTER — Input Multiplexer
Routes events to the correct domain handler based on event domain
"""

from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass


@dataclass
class DomainResult:
    """Result from a domain handler"""
    state_delta: Optional[Dict[str, Any]]
    domain_actions: list
    logs: list


class EventRouter:
    """
    Routes incoming BridgeEvents to appropriate domain handlers.
    Deterministic dispatch table, no magic, no guessing.
    """

    def __init__(self):
        self.handlers: Dict[str, Callable] = {}
        self._register_default_handlers()

    def _register_default_handlers(self):
        """Register all domain handlers"""
        try:
            from handlers.trading_handler import TradingHandler
            from handlers.observer_handler import ObserverHandler
            from handlers.infra_handler import InfraHandler
            from handlers.captain_handler import CaptainHandler
            from handlers.internal_handler import InternalHandler
        except ImportError:
            # Fallback for when called from different directory
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

    def route(self, event: Dict[str, Any], state: Dict[str, Any]) -> DomainResult:
        """
        Route event to appropriate handler.

        Args:
            event: BridgeEvent with domain, type, payload, etc.
            state: Current ShipState

        Returns:
            DomainResult with state_delta, domain_actions, logs
        """
        domain = event.get('domain', 'UNKNOWN')

        if domain not in self.handlers:
            return DomainResult(
                state_delta={},
                domain_actions=[],
                logs=[f"[router] Unknown domain: {domain}, event: {event.get('type')}"]
            )

        handler = self.handlers[domain]

        try:
            result = handler(event, state)
            return result
        except Exception as e:
            return DomainResult(
                state_delta={},
                domain_actions=[],
                logs=[f"[router] Handler error for {domain}.{event.get('type')}: {str(e)}"]
            )

    def register_handler(self, domain: str, handler: Callable):
        """Register a custom handler for a domain"""
        self.handlers[domain] = handler


# Singleton instance
_router = None


def get_event_router() -> EventRouter:
    """Get or create singleton router"""
    global _router
    if _router is None:
        _router = EventRouter()
    return _router
