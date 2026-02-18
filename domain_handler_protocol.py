# domain_handler_protocol.py
"""
DomainHandler Protocol for USS Chaosbringer
Defines the interface for all domain handlers.
"""
from typing import Protocol, Any

class DomainHandler(Protocol):
    def __call__(self, event: Any, state: Any) -> Any:
        ...
