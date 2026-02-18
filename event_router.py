# event_router.py
"""
EventRouter for USS Chaosbringer (Python)
Deterministic dispatch table mapping event types to handler functions.
"""
from typing import Any, Callable, Dict
from domain_handler_protocol import DomainHandler
from trading_handler import trading_handler
from observer_handler import observer_handler
from infra_handler import infra_handler
from captain_handler import captain_handler
from internal_handler import internal_handler

# Event type to handler mapping
event_router: Dict[str, DomainHandler] = {
    "TRADING": trading_handler,
    "OBSERVER": observer_handler,
    "INFRA": infra_handler,
    "CAPTAIN": captain_handler,
    "INTERNAL": internal_handler,
}

def route_event(event_type: str, event: Any, state: Any) -> Any:
    handler = event_router.get(event_type)
    if not handler:
        raise ValueError(f"No handler for event type: {event_type}")
    return handler(event, state)
