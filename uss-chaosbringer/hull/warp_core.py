"""
USS CHAOSBRINGER - WARP CORE
Decision engine and processing reactor
Converts sensor input into strategic commands
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum

logger = logging.getLogger("WarpCore")


class ProcessingMode(Enum):
    """How aggressively the warp core should process"""
    STANDBY = 0.1       # Minimal processing
    CRUISE = 0.5        # Normal operations
    FULL_IMPULSE = 0.8  # Elevated processing
    WARP_DRIVE = 1.0    # Maximum processing


class WarpCore:
    """
    The processing heart of USS Chaosbringer
    Takes multi-sensor input and produces strategic decisions
    Similar to your orchestrator/decision engine
    """

    def __init__(self, max_processing_capacity: float = 1.0):
        self.capacity = max_processing_capacity
        self.current_load = 0.0
        self.mode = ProcessingMode.STANDBY
        self.decision_queue = []
        self.processed_decisions = []

        logger.info("[WARP CORE] Initialization complete. Ready for processing.")

    def set_processing_mode(self, mode: ProcessingMode):
        """Adjust processing intensity"""
        self.mode = mode
        self.current_load = mode.value
        logger.info(f"[WARP CORE] Processing mode set to {mode.name} ({mode.value*100:.0f}%)")

    def process_sensor_input(self, sensor_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Core decision engine
        Takes raw sensor data and produces actionable decisions
        """
        timestamp = datetime.utcnow().isoformat()

        # Build decision context
        decision = {
            'timestamp': timestamp,
            'input_sources': list(sensor_data.keys()),
            'processing_mode': self.mode.name,
            'processing_load': self.current_load,
            'analysis': self._analyze_input(sensor_data),
            'recommendation': self._generate_recommendation(sensor_data),
            'confidence': self._calculate_confidence(sensor_data)
        }

        self.processed_decisions.append(decision)
        return decision

    def _analyze_input(self, sensor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze multi-source sensor input"""
        analysis = {
            'primary_signals': [],
            'risk_factors': [],
            'opportunity_level': 'UNKNOWN'
        }

        # Check each sensor type
        if 'trading_data' in sensor_data:
            analysis['primary_signals'].append('MARKET_DATA')
            if sensor_data['trading_data'].get('bearish'):
                analysis['risk_factors'].append('BEARISH_REGIME')

        if 'weather_data' in sensor_data:
            analysis['primary_signals'].append('WEATHER_DATA')

        if 'anomaly_data' in sensor_data:
            analysis['primary_signals'].append('ANOMALY_DETECTION')
            if sensor_data['anomaly_data'].get('detected'):
                analysis['risk_factors'].append('ANOMALY_DETECTED')

        # Determine opportunity level
        if len(analysis['risk_factors']) == 0:
            analysis['opportunity_level'] = 'HIGH'
        elif len(analysis['risk_factors']) == 1:
            analysis['opportunity_level'] = 'MODERATE'
        else:
            analysis['opportunity_level'] = 'LOW'

        return analysis

    def _generate_recommendation(self, sensor_data: Dict[str, Any]) -> str:
        """Generate strategic recommendation"""
        analysis = self._analyze_input(sensor_data)

        if analysis['opportunity_level'] == 'HIGH':
            return 'ENGAGE_WARP_DRIVE'
        elif analysis['opportunity_level'] == 'MODERATE':
            return 'CRUISE_SPEED'
        else:
            return 'RAISE_SHIELDS'

    def _calculate_confidence(self, sensor_data: Dict[str, Any]) -> float:
        """Calculate confidence in decision (0-1)"""
        num_sensors = len(sensor_data)
        base_confidence = 0.5 + (num_sensors * 0.1)
        return min(base_confidence, 1.0)

    def get_status(self) -> Dict[str, Any]:
        """Return warp core status"""
        return {
            'mode': self.mode.name,
            'load': f"{self.current_load*100:.1f}%",
            'capacity': f"{self.capacity*100:.1f}%",
            'decisions_processed': len(self.processed_decisions),
            'last_decision': self.processed_decisions[-1] if self.processed_decisions else None
        }


# Singleton instance
_warp_core = None


def get_warp_core() -> WarpCore:
    """Get or create singleton warp core"""
    global _warp_core
    if _warp_core is None:
        _warp_core = WarpCore()
    return _warp_core
