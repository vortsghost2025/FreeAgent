#!/usr/bin/env python3
"""
PROBABILITY WEAVER — Quantum Uncertainty Simulation Specialist
Concrete implementation of Starship for probability manipulation and superposition.
Domains: SUPERPOSITION, COLLAPSE_MEASUREMENT, ENTANGLEMENT
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from starship import Starship, ShipEvent, ShipEventResult
from typing import Dict, Any, List


class ProbabilityWeaverShip(Starship):
    """
    Probability Weaver — Quantum Simulation Specialist

    Specialized in:
    - Quantum superposition state management
    - Wave function collapse observation and measurement
    - Quantum entanglement simulation
    - Probability calculation and manipulation
    - Multiple outcome prediction
    - Personality: AI_TRYING_ITS_BEST (earnest, uncertain, endearing)
    """

    def __init__(self, ship_name: str, personality_mode: str = 'CALM'):
        """Initialize ProbabilityWeaver with thoughtful personality"""
        super().__init__(ship_name, personality_mode=personality_mode)

    def get_initial_state(self) -> Dict[str, Any]:
        """Define ProbabilityWeaver-specific state"""
        return {
            # === Base fields (all ships have these) ===
            'threat_level': 0,  # 0-10, threat probability
            'mode': 'NORMAL',  # NORMAL, ELEVATED_ALERT, CRITICAL
            'shields': 100,  # 0-100, quantum coherence
            'warp_factor': 0,  # 0-10, timeline branching speed
            'reactor_temp': 35,  # 0-100, quantum decoherence heat

            # === Quantum superposition state ===
            'superposition_active': False,  # Is superposition enabled?
            'superposition_count': 1,  # Number of simultaneous states
            'wave_function_collapse': 0.0,  # 0.0-1.0, collapse probability
            'quantum_coherence': 1.0,  # 0.0-1.0, state coherence quality
            'decoherence_rate': 0.01,  # Rate of quantum decoherence

            # === Measurement and collapse ===
            'measurement_count': 0,  # Total measurements performed
            'collapse_events': 0,  # Total wave function collapses
            'observation_outcomes': [],  # List of observed outcomes
            'collapsed_probability': 0.0,  # Final probability of collapsed state

            # === Entanglement state ===
            'entangled_pairs': 0,  # Number of entangled particle pairs
            'entanglement_strength': 0.0,  # 0.0-1.0, strength of entanglement
            'entangled_with': [],  # List of entangled entities
            'correlation_coefficient': 0.0,  # -1.0 to 1.0, correlation strength

            # === Probability calculation ===
            'outcome_branches': 1,  # Number of outcome branches
            'probability_distribution': {},  # Outcome → probability map
            'dominant_outcome': 'UNKNOWN',  # Most likely outcome
            'dominant_probability': 0.0,  # Probability of dominant outcome

            # === Performance metrics ===
            'calculations_performed': 0,  # Total probability calculations
            'accuracy_index': 0.85,  # 0.0-1.0, prediction accuracy
            'simulation_time_ms': 0,  # Time to run simulation
            'last_measurement_timestamp': None,
            'uncertainty_principle_violations': 0,  # Times we exceeded Heisenberg limit
        }

    def _register_handlers(self):
        """Register all 3 quantum domain handlers"""
        self.handlers = {
            'SUPERPOSITION': self._handle_superposition,
            'COLLAPSE_MEASUREMENT': self._handle_collapse_measurement,
            'ENTANGLEMENT': self._handle_entanglement,
        }

    def _handle_superposition(self, event: Dict[str, Any], state: Dict[str, Any]) -> Any:
        """Initialize quantum superposition state"""
        from event_router import DomainResult

        outcome_count = event.get('payload', {}).get('outcome_count', 2)
        coherence_quality = event.get('payload', {}).get('coherence', 0.95)

        # Create superposition
        state_delta = {
            'superposition_active': True,
            'superposition_count': outcome_count,
            'quantum_coherence': coherence_quality,
            'outcome_branches': outcome_count,
            'probability_distribution': {f'outcome_{i}': 1.0/outcome_count for i in range(outcome_count)},
        }

        domain_actions = [
            {'type': 'SUPERPOSITION_CREATED', 'states': outcome_count, 'coherence': coherence_quality}
        ]

        logs = [f"Superposition initialized: {outcome_count} states, coherence={coherence_quality:.2%}"]

        return DomainResult(
            state_delta=state_delta,
            domain_actions=domain_actions,
            logs=logs
        )

    def _handle_collapse_measurement(self, event: Dict[str, Any], state: Dict[str, Any]) -> Any:
        """Observe and collapse wave function"""
        from event_router import DomainResult
        import random

        if not state.get('superposition_active', False):
            return DomainResult(
                state_delta={},
                domain_actions=[{'type': 'NO_SUPERPOSITION_ACTIVE'}],
                logs=['Cannot collapse: no active superposition']
            )

        # Select outcome based on probability distribution
        outcomes = list(state.get('probability_distribution', {}).keys())
        probabilities = list(state.get('probability_distribution', {}).values())

        if outcomes:
            selected_outcome = random.choices(outcomes, weights=probabilities, k=1)[0]
            collapsed_prob = state.get('probability_distribution', {}).get(selected_outcome, 0.5)
        else:
            selected_outcome = 'RANDOM'
            collapsed_prob = 0.5

        state_delta = {
            'superposition_active': False,
            'collapsed_probability': collapsed_prob,
            'collapse_events': state.get('collapse_events', 0) + 1,
            'measurement_count': state.get('measurement_count', 0) + 1,
            'dominant_outcome': selected_outcome,
            'dominant_probability': collapsed_prob,
            'last_measurement_timestamp': event.get('timestamp'),
        }

        # Add observation outcome
        observation_outcomes = state.get('observation_outcomes', [])
        observation_outcomes.append({
            'outcome': selected_outcome,
            'probability': collapsed_prob,
            'timestamp': event.get('timestamp'),
        })
        state_delta['observation_outcomes'] = observation_outcomes[-50:]  # Keep last 50

        domain_actions = [
            {'type': 'WAVE_FUNCTION_COLLAPSED', 'outcome': selected_outcome, 'probability': collapsed_prob}
        ]

        logs = [f"Wave function collapsed: {selected_outcome} (probability={collapsed_prob:.2%})"]

        return DomainResult(
            state_delta=state_delta,
            domain_actions=domain_actions,
            logs=logs
        )

    def _handle_entanglement(self, event: Dict[str, Any], state: Dict[str, Any]) -> Any:
        """Create quantum entanglement with another entity"""
        from event_router import DomainResult

        entangled_entity = event.get('payload', {}).get('entity_id', 'UNKNOWN')
        entanglement_strength = event.get('payload', {}).get('strength', 0.8)

        entangled_with = state.get('entangled_with', [])
        if entangled_entity not in entangled_with:
            entangled_with.append(entangled_entity)

        state_delta = {
            'entangled_pairs': state.get('entangled_pairs', 0) + 1,
            'entanglement_strength': entanglement_strength,
            'entangled_with': entangled_with,
            'correlation_coefficient': entanglement_strength * 2 - 1,  # -1.0 to 1.0
        }

        domain_actions = [
            {'type': 'ENTANGLEMENT_ESTABLISHED', 'with': entangled_entity, 'strength': entanglement_strength}
        ]

        logs = [f"Entanglement created with {entangled_entity} (strength={entanglement_strength:.2%})"]

        return DomainResult(
            state_delta=state_delta,
            domain_actions=domain_actions,
            logs=logs
        )

    def _initialize_narrator(self):
        """Initialize ProbabilityWeaver narrator with earnest personality"""
        from narrator_engine import NarratorEngine
        self.narrator = NarratorEngine()
        if hasattr(self.narrator, 'set_personality_mode'):
            self.narrator.set_personality_mode(self.personality_mode)

    def get_narrator_config(self) -> Dict[str, Any]:
        """Return narrator configuration"""
        return {}

    def get_safety_rules(self) -> List[Dict[str, Any]]:
        """Define ProbabilityWeaver safety rules"""
        return [
            {
                'name': 'Quantum Decoherence Critical',
                'condition': lambda state: state.get('quantum_coherence', 1.0) < 0.3,
                'action': lambda state: {'mode': 'ELEVATED_ALERT', 'threat_level': 7},
                'severity': 'ALERT'
            },
            {
                'name': 'Superposition Instability',
                'condition': lambda state: state.get('superposition_active', False) and state.get('decoherence_rate', 0) > 0.05,
                'action': lambda state: {'threat_level': min(8, state.get('threat_level', 0) + 1)},
                'severity': 'WARNING'
            },
            {
                'name': 'Heisenberg Uncertainty Breach',
                'condition': lambda state: state.get('uncertainty_principle_violations', 0) > 5,
                'action': lambda state: {'mode': 'CRITICAL', 'threat_level': 9},
                'severity': 'CRITICAL'
            },
        ]

    def get_probability_report(self) -> Dict[str, Any]:
        """Return quantum probability analysis report"""
        return {
            'timestamp': self.state.get('last_measurement_timestamp'),
            'superposition_active': self.state.get('superposition_active', False),
            'superposition_count': self.state.get('superposition_count', 1),
            'quantum_coherence': self.state.get('quantum_coherence', 1.0),
            'measurement_count': self.state.get('measurement_count', 0),
            'collapse_events': self.state.get('collapse_events', 0),
            'dominant_outcome': self.state.get('dominant_outcome', 'UNKNOWN'),
            'dominant_probability': self.state.get('dominant_probability', 0.0),
            'entangled_pairs': self.state.get('entangled_pairs', 0),
            'entanglement_strength': self.state.get('entanglement_strength', 0.0),
            'accuracy_index': self.state.get('accuracy_index', 0.85),
            'calculations_performed': self.state.get('calculations_performed', 0),
        }

    def __repr__(self):
        coherence = self.state.get('quantum_coherence', 1.0)
        collapses = self.state.get('collapse_events', 0)
        entangled = self.state.get('entangled_pairs', 0)
        return f"<ProbabilityWeaver coherence={coherence:.2%} collapses={collapses} entangled={entangled} personality={self.personality_mode}>"
