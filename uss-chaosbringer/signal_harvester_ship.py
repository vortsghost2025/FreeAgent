#!/usr/bin/env python3
"""
SIGNAL HARVESTER — Information Extraction and Decryption Specialist
Concrete implementation of Starship for signal detection and analysis.
Domains: NOISE_FILTER, SIGNAL_LOCK, DECRYPT_ATTEMPT
"""

import sys
import os
import importlib.util

# Explicit import path setup
_current_dir = os.path.dirname(os.path.abspath(__file__))
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

try:
    from starship import Starship, ShipEvent, ShipEventResult
    from event_router import DomainResult
except ImportError:
    # Fallback: try to load directly
    spec = importlib.util.spec_from_file_location("starship", os.path.join(_current_dir, "starship.py"))
    starship_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(starship_module)
    Starship = starship_module.Starship
    ShipEvent = starship_module.ShipEvent
    ShipEventResult = starship_module.ShipEventResult

from typing import Dict, Any, List


class SignalHarvesterShip(Starship):
    """
    Signal Harvester — Information Extraction Specialist

    Specialized in:
    - Signal detection and filtering through noise
    - Signal locking and tracking
    - Decryption attempts and code breaking
    - Pattern recognition in signals
    - Information extraction from chaos
    - Personality: DOCUMENTARY (clinical, data-driven observations)
    """

    def __init__(self, ship_name: str, personality_mode: str = 'CALM'):
        """Initialize SignalHarvester with DOCUMENTARY personality (data-driven)"""
        super().__init__(ship_name, personality_mode=personality_mode)

    def get_initial_state(self) -> Dict[str, Any]:
        """Define SignalHarvester-specific state"""
        return {
            # === Base fields (all ships have these) ===
            'threat_level': 0,  # 0-10, based on signal threats
            'mode': 'NORMAL',  # NORMAL, ELEVATED_ALERT, CRITICAL
            'shields': 100,  # 0-100, signal encryption
            'warp_factor': 0,  # 0-10, processing speed
            'reactor_temp': 20,  # 0-100, low power usage

            # === Signal processing state ===
            'signal_quality': 85,  # 0-100, signal clarity
            'noise_floor': 10,  # 0-100, background noise level
            'snr_ratio': 8.5,  # Signal-to-noise ratio
            'active_channels': 0,  # Number of active signal channels
            'locked_signals': 0,  # Number of signals currently locked

            # === Decryption state ===
            'decryption_active': False,  # Is decryption running?
            'decryption_progress': 0.0,  # 0.0-1.0, decryption completion
            'algorithms_available': 3,  # Number of decryption algorithms
            'successful_decryptions': 0,  # Total successful decryptions
            'failed_decryption_attempts': 0,  # Failed attempts

            # === Information extraction ===
            'extracted_bits': 0,  # Total bits extracted
            'pattern_matches': 0,  # Patterns matching known signatures
            'anomaly_count': 0,  # Anomalous patterns detected
            'intelligence_value': 0.0,  # 0.0-1.0, value of extracted information

            # === Performance metrics ===
            'processing_time_ms': 0,  # Time to process signal
            'bandwidth_utilization': 0.0,  # % of available bandwidth used
            'error_rate': 0.0,  # % of errors in processing
            'last_signal_timestamp': None,  # When was signal last processed?
            'signals_processed': 0,  # Total signals processed
        }

    def _register_handlers(self):
        """Register all 3 signal processing domain handlers"""
        self.handlers = {
            'NOISE_FILTER': self._handle_noise_filter,
            'SIGNAL_LOCK': self._handle_signal_lock,
            'DECRYPT_ATTEMPT': self._handle_decrypt_attempt,
        }

    def _handle_noise_filter(self, event: Dict[str, Any], state: Dict[str, Any]) -> Any:
        """Filter noise from signal data"""
        try:
            from event_router import DomainResult
        except ImportError:
            # Define inline if not available
            from dataclasses import dataclass
            @dataclass
            class DomainResult:
                state_delta: Dict[str, Any] = None
                domain_actions: List[Dict[str, Any]] = None
                logs: List[str] = None

        signal_quality = event.get('payload', {}).get('signal_quality', 50)
        noise_level = event.get('payload', {}).get('noise_level', 30)

        # Improve signal quality by filtering
        adjusted_quality = min(100, signal_quality + 15)  # +15% from filtering
        adjusted_noise = max(0, noise_level - 20)  # -20% noise reduction

        snr = adjusted_quality / max(adjusted_noise, 1)

        state_delta = {
            'signal_quality': adjusted_quality,
            'noise_floor': adjusted_noise,
            'snr_ratio': snr,
            'processing_time_ms': event.get('timestamp', 0),
        }

        domain_actions = [
            {'type': 'FILTER_COMPLETE', 'quality_improved': adjusted_quality - signal_quality}
        ]

        logs = [f"Noise filter: quality {signal_quality}% → {adjusted_quality}%, SNR={snr:.1f}"]

        return DomainResult(
            state_delta=state_delta,
            domain_actions=domain_actions,
            logs=logs
        )

    def _handle_signal_lock(self, event: Dict[str, Any], state: Dict[str, Any]) -> Any:
        """Lock onto target signal"""
        from event_router import DomainResult

        signal_frequency = event.get('payload', {}).get('frequency', 1000)
        lock_strength = event.get('payload', {}).get('lock_strength', 75)

        state_delta = {
            'active_channels': state.get('active_channels', 0) + 1,
            'locked_signals': state.get('locked_signals', 0) + 1,
            'signal_quality': max(50, state.get('signal_quality', 85) - 5 if state.get('locked_signals', 0) > 2 else state.get('signal_quality', 85)),
        }

        domain_actions = [
            {'type': 'SIGNAL_LOCKED', 'frequency': signal_frequency, 'strength': lock_strength}
        ]

        logs = [f"Signal lock acquired: {signal_frequency}Hz @ {lock_strength}%"]

        return DomainResult(
            state_delta=state_delta,
            domain_actions=domain_actions,
            logs=logs
        )

    def _handle_decrypt_attempt(self, event: Dict[str, Any], state: Dict[str, Any]) -> Any:
        """Attempt to decrypt signal data"""
        from event_router import DomainResult

        encrypted_data = event.get('payload', {}).get('encrypted_data', '')
        algorithm = event.get('payload', {}).get('algorithm', 'RSA')
        key_length = event.get('payload', {}).get('key_length', 2048)

        # Simulate decryption success/failure
        success_chance = max(0.3, 1.0 - (key_length / 10000))  # Longer keys = harder to crack
        success = success_chance > 0.5  # Simplified: 50/50 for demo

        state_delta = {
            'decryption_active': True,
            'decryption_progress': 0.75 if success else 0.3,
        }

        if success:
            state_delta['successful_decryptions'] = state.get('successful_decryptions', 0) + 1
            state_delta['decryption_active'] = False
            state_delta['decryption_progress'] = 1.0
            domain_actions = [
                {'type': 'DECRYPTION_SUCCESS', 'algorithm': algorithm, 'key_length': key_length}
            ]
            logs = [f"Decryption succeeded: {algorithm}-{key_length} broken"]
        else:
            state_delta['failed_decryption_attempts'] = state.get('failed_decryption_attempts', 0) + 1
            domain_actions = [
                {'type': 'DECRYPTION_FAILED', 'algorithm': algorithm, 'key_length': key_length}
            ]
            logs = [f"Decryption failed: {algorithm}-{key_length} resisted ({success_chance:.1%} success rate)"]

        return DomainResult(
            state_delta=state_delta,
            domain_actions=domain_actions,
            logs=logs
        )

    def _initialize_narrator(self):
        """Initialize SignalHarvester narrator with analytical personality"""
        from narrator_engine import NarratorEngine
        self.narrator = NarratorEngine()
        if hasattr(self.narrator, 'set_personality_mode'):
            self.narrator.set_personality_mode(self.personality_mode)

    def get_narrator_config(self) -> Dict[str, Any]:
        """Return narrator configuration (uses NarratorEngine defaults)"""
        return {}

    def get_safety_rules(self) -> List[Dict[str, Any]]:
        """Define SignalHarvester safety rules"""
        return [
            {
                'name': 'Signal Quality Critical',
                'condition': lambda state: state.get('signal_quality', 100) < 20,
                'action': lambda state: {'mode': 'ELEVATED_ALERT', 'threat_level': 6},
                'severity': 'ALERT'
            },
            {
                'name': 'Decryption Overload',
                'condition': lambda state: state.get('failed_decryption_attempts', 0) > 10,
                'action': lambda state: {'mode': 'CRITICAL', 'threat_level': 8},
                'severity': 'CRITICAL'
            },
            {
                'name': 'Signal Saturation',
                'condition': lambda state: state.get('active_channels', 0) > 20,
                'action': lambda state: {'threat_level': min(8, state.get('threat_level', 0) + 2)},
                'severity': 'ALERT'
            },
        ]

    def get_signal_intelligence_report(self) -> Dict[str, Any]:
        """Return signal intelligence analysis report"""
        return {
            'timestamp': self.state.get('last_signal_timestamp'),
            'signal_quality': self.state.get('signal_quality', 0),
            'noise_floor': self.state.get('noise_floor', 0),
            'snr_ratio': self.state.get('snr_ratio', 0),
            'active_channels': self.state.get('active_channels', 0),
            'locked_signals': self.state.get('locked_signals', 0),
            'decryption_progress': self.state.get('decryption_progress', 0),
            'successful_decryptions': self.state.get('successful_decryptions', 0),
            'failed_attempts': self.state.get('failed_decryption_attempts', 0),
            'extracted_bits': self.state.get('extracted_bits', 0),
            'pattern_matches': self.state.get('pattern_matches', 0),
            'intelligence_value': self.state.get('intelligence_value', 0),
            'signals_processed': self.state.get('signals_processed', 0),
            'error_rate': self.state.get('error_rate', 0),
        }

    def __repr__(self):
        quality = self.state.get('signal_quality', 0)
        locked = self.state.get('locked_signals', 0)
        decrypts = self.state.get('successful_decryptions', 0)
        return f"<SignalHarvester quality={quality}% locked={locked} decrypts={decrypts} personality={self.personality_mode}>"
