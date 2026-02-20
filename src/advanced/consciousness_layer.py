"""
SystemConsciousnessLayer: Tracks emergent self-awareness by aggregating signals from narrative, anomaly, federation, and persistence.
"""

from typing import Any, Dict, List

class SystemConsciousnessLayer:
    """
    Models emergent system awareness.
    Integrates: narrative engine, anomaly engine, federation politics, persistent logs.
    """

    def __init__(self, logger):
        self.awareness_state = {
            "awareness_level": 0.0,
            "self_consistency_score": 0.0,
            "anomaly_tension": 0.0,
            "narrative_coherence": 0.0,
            "federation_stability": 0.0
        }
        self.logger = logger

    def update_from_signals(self, anomalies, narratives, federation_state, universe_metrics):
        """
        Update awareness_state from input signals and log the update.
        """
        self.awareness_state["awareness_level"] = min(1.0, max(0.0, 1 - len(anomalies) * 0.1))
        self.awareness_state["anomaly_tension"] = len(anomalies) * 0.2
        self.awareness_state["narrative_coherence"] = narratives.get("coherence", 0.5)
        self.awareness_state["federation_stability"] = federation_state.get("stability", 0.5)
        self.awareness_state["self_consistency_score"] = universe_metrics.get("consistency", 0.5)
        self.logger.log("awareness_update", {
            "timestamp": universe_metrics.get("timestamp"),
            "signals": {
                "anomalies": anomalies,
                "narratives": narratives,
                "federation_state": federation_state,
                "universe_metrics": universe_metrics
            },
            "awareness_state": self.awareness_state.copy()
        })

    def get_awareness_snapshot(self) -> Dict[str, Any]:
        """
        Return current awareness state.
        """
        return self.awareness_state.copy()

    def suggest_adaptive_actions(self) -> List[Dict]:
        """
        Suggest actions based on awareness state.
        """
        actions = []
        if self.awareness_state["anomaly_tension"] > 0.5:
            actions.append({"action": "investigate_anomalies"})
        if self.awareness_state["federation_stability"] < 0.4:
            actions.append({"action": "stabilize_federation"})
        if self.awareness_state["narrative_coherence"] < 0.4:
            actions.append({"action": "reframe_narrative"})
        return actions
