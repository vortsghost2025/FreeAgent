"""
Refactored Consciousness Layer: Accepts UniverseState, Anomaly; emits adaptive actions and tension metrics.
"""
from typing import List, Dict, Any
from src.advanced.core_models import UniverseState

class RefactoredConsciousnessLayer:
    """
    Models emergent system awareness from UniverseState and anomalies.
    """
    def __init__(self, logger):
        self.awareness_state = {
            "awareness_level": 0.0,
            "tension": 0.0,
            "adaptive_actions": []
        }
        self.logger = logger

    def update_from_signals(self, universe_state: UniverseState, anomalies: List[Any]):
        self.awareness_state["awareness_level"] = universe_state.metrics.get("awareness", 0.5)
        self.awareness_state["tension"] = sum(a.get("severity", 0.1) for a in anomalies)
        actions = []
        if self.awareness_state["tension"] > 0.5:
            actions.append("investigate_anomalies")
        if universe_state.entropy > 0.2:
            actions.append("reduce_entropy")
        self.awareness_state["adaptive_actions"] = actions
        self.logger.log("awareness_update", self.awareness_state)

    def get_awareness_snapshot(self) -> Dict[str, Any]:
        return self.awareness_state.copy()
