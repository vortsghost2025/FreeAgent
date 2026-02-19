"""handlers/signal_handler.py"""
from typing import Dict, Any

def handle_signal_event(state: Dict[str, Any], event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Domain handler for SIGNAL_ENGINE events for SignalHarvester.
    Processes incoming signals, updates state, and returns domain actions as list of dicts.
    """
    domain_actions = []
    new_state = state.copy()
    event_type = event.get("type")
    signal = event.get("signal")

    if event_type == "RECEIVE_SIGNAL" and signal:
        new_state["signal_buffer"] = state.get("signal_buffer", []) + [signal]
        domain_actions.append({
            "action": "signal_received",
            "signal": signal
        })
    elif event_type == "AMPLIFY_SIGNAL" and signal:
        amp = new_state.get("amplification_level", 1.0)
        new_state["amplification_level"] = amp * 1.5
        domain_actions.append({
            "action": "signal_amplified",
            "signal": signal,
            "amplification_level": new_state["amplification_level"]
        })
    elif event_type == "FILTER_NOISE":
        new_state["signal_buffer"] = [s for s in state.get("signal_buffer", []) if s.get("type") != "noise"]
        domain_actions.append({
            "action": "noise_filtered"
        })
    else:
        domain_actions.append({
            "action": "noop"
        })

    return {
        "new_state": new_state,
        "domain_actions": domain_actions
    }
