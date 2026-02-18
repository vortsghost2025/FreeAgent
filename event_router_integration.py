# event_router_integration.py
"""
Integrate EventRouter into USS Chaosbringer BridgeControl pipeline.
"""
from event_router import route_event
from hull.bridge_control import get_bridge

# Example integration function (to be called from main event loop or orchestrator)
def process_starship_event(event_type, event, state):
    """
    Route event to correct domain handler and return handler result.
    """
    result = route_event(event_type, event, state)
    # Optionally: log, narrate, or update state here
    return result
