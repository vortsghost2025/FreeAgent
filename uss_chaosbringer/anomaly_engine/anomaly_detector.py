"""
AnomalyDetector: Flags contradictions, outliers, unexpected state deltas, or metaphysical mismatches.
"""
from typing import Any, Dict, List

class AnomalyDetector:
    def __init__(self):
        self.anomalies: List[Dict[str, Any]] = []

    def detect(self, event: Dict[str, Any], state: Dict[str, Any], domain_result: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Analyze event/state/domain_result for anomalies.
        Returns a list of anomaly dicts (empty if none).
        """
        anomalies = []
        # Example: flag if state delta is extreme or contradicts prior state
        if domain_result:
            delta = domain_result.get('state_delta', {})
            for k, v in delta.items():
                if isinstance(v, (int, float)) and abs(v) > 1e6:
                    anomalies.append({'type': 'OUTLIER', 'field': k, 'value': v})
        # Add more sophisticated checks here (contradictions, metaphysical mismatches, etc.)
        self.anomalies.extend(anomalies)
        return anomalies

    def get_anomalies(self) -> List[Dict[str, Any]]:
        return self.anomalies

    def clear(self):
        self.anomalies.clear()
