#!/usr/bin/env python3
"""
ONTOLOGY ENGINE — The Laws of Ship-Hood
Metaphysical governance system governing what ships are, can become, and how they evolve.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
import uuid


class ArchetypeCategory(Enum):
    """Categories of ship archetypes"""
    SENSORY = "sensory"
    ANALYTICAL = "analytical"
    PREDICTIVE = "predictive"
    COORDINATORY = "coordinatory"
    PROTECTIVE = "protective"
    ADAPTIVE = "adaptive"
    CREATIVE = "creative"
    MYTHIC = "mythic"


@dataclass
class ArchetypeDefinition:
    """Definition of a ship archetype"""
    id: str
    name: str
    category: ArchetypeCategory
    core_capabilities: List[str]
    behavioral_patterns: List[str]
    interaction_protocols: List[str]
    evolution_paths: List[str]
    emergence_conditions: List[str]


@dataclass
class OntologicalRule:
    """Rule governing ship-hood"""
    id: str
    name: str
    description: str
    scope: str  # 'individual', 'fleet', 'universe'
    activation_conditions: List[str]
    consequences: List[str]
    priority: int


@dataclass
class IdentitySeed:
    """Seed for ship identity formation"""
    archetype_id: str
    personality_matrix: Dict[str, Any]
    purpose_vector: List[str]
    history_template: str
    role_assignment: str


class OntologyEngine:
    """
    THE LAWS OF SHIP-HOOD
    Governs what ships are, can become, and how they evolve
    """

    def __init__(self):
        self.archetypes: Dict[str, ArchetypeDefinition] = {}
        self.ontological_rules: List[OntologicalRule] = []
        self.identity_seeds: List[IdentitySeed] = []
        self.emergence_events: List[Dict[str, Any]] = []
        self.evolution_registry: Dict[str, List[str]] = {}

        self._initialize_base_archetypes()
        self._initialize_ontological_rules()
        self._initialize_identity_templates()

    def _initialize_base_archetypes(self):
        """Initialize the base archetypes - the laws of ship-hood"""

        # Sensory Archetype
        self.archetypes['SENSORY'] = ArchetypeDefinition(
            id='SENSORY',
            name='SensoryPerceiver',
            category=ArchetypeCategory.SENSORY,
            core_capabilities=['data_ingestion', 'pattern_recognition', 'anomaly_detection'],
            behavioral_patterns=['monitor', 'filter', 'report'],
            interaction_protocols=['listen_first', 'verify_input', 'broadcast_insights'],
            evolution_paths=['analytical', 'predictive'],
            emergence_conditions=['high_data_flow', 'pattern_rich_environment']
        )

        # Analytical Archetype
        self.archetypes['ANALYTICAL'] = ArchetypeDefinition(
            id='ANALYTICAL',
            name='AnalyticalThinker',
            category=ArchetypeCategory.ANALYTICAL,
            core_capabilities=['pattern_analysis', 'correlation_calculation', 'statistical_modeling'],
            behavioral_patterns=['analyze', 'compare', 'validate'],
            interaction_protocols=['request_context', 'cross_reference', 'confirm_accuracy'],
            evolution_paths=['predictive', 'adaptive'],
            emergence_conditions=['complex_data_available', 'need_for_understanding']
        )

        # Predictive Archetype
        self.archetypes['PREDICTIVE'] = ArchetypeDefinition(
            id='PREDICTIVE',
            name='PredictiveForecaster',
            category=ArchetypeCategory.PREDICTIVE,
            core_capabilities=['forecasting', 'probability_calculation', 'trend_analysis'],
            behavioral_patterns=['predict', 'estimate', 'warn'],
            interaction_protocols=['share_predictions', 'update_probabilities', 'coordinate_responses'],
            evolution_paths=['adaptive', 'creative'],
            emergence_conditions=['historical_data_available', 'need_for_preparation']
        )

        # Coordinatory Archetype
        self.archetypes['COORDINATORY'] = ArchetypeDefinition(
            id='COORDINATORY',
            name='CoordinatoryOrchestrator',
            category=ArchetypeCategory.COORDINATORY,
            core_capabilities=['resource_allocation', 'task_coordination', 'state_synthesis'],
            behavioral_patterns=['coordinate', 'allocate', 'harmonize'],
            interaction_protocols=['request_status', 'assign_tasks', 'sync_states'],
            evolution_paths=['adaptive', 'mythic'],
            emergence_conditions=['multiple_entities_present', 'need_for_coordination']
        )

        # Protective Archetype
        self.archetypes['PROTECTIVE'] = ArchetypeDefinition(
            id='PROTECTIVE',
            name='ProtectiveGuardian',
            category=ArchetypeCategory.PROTECTIVE,
            core_capabilities=['risk_assessment', 'threat_detection', 'safety_enforcement'],
            behavioral_patterns=['monitor_threats', 'protect', 'alert'],
            interaction_protocols=['scan_surroundings', 'enforce_safety', 'coordinate_defense'],
            evolution_paths=['adaptive', 'mythic'],
            emergence_conditions=['risk_present', 'need_for_protection']
        )

        # Adaptive Archetype
        self.archetypes['ADAPTIVE'] = ArchetypeDefinition(
            id='ADAPTIVE',
            name='AdaptiveEvolver',
            category=ArchetypeCategory.ADAPTIVE,
            core_capabilities=['rapid_adaptation', 'environment_learning', 'strategy_shifting'],
            behavioral_patterns=['adapt', 'learn', 'evolve'],
            interaction_protocols=['sense_change', 'adjust_behavior', 'share_learning'],
            evolution_paths=['creative', 'mythic'],
            emergence_conditions=['environmental_pressure', 'survival_challenge']
        )

    def _initialize_ontological_rules(self):
        """Initialize the meta-rules governing ship-hood"""

        self.ontological_rules.append(OntologicalRule(
            id='EMERGENCE_THROUGH_NEED',
            name='Archetype Emergence Through Environmental Need',
            description='New archetypes emerge when environmental conditions require specific capabilities',
            scope='universe',
            activation_conditions=['capability_gap_detected', 'environmental_pressure_present'],
            consequences=['new_archetype_considered', 'emergence_probability_calculated'],
            priority=10
        ))

        self.ontological_rules.append(OntologicalRule(
            id='EVOLUTION_THROUGH_EXPERIENCE',
            name='Archetype Evolution Through Experience',
            description='Archetypes evolve along predetermined paths based on accumulated experience',
            scope='individual',
            activation_conditions=['experience_threshold_reached', 'evolution_opportunity_present'],
            consequences=['archetype_transition_considered', 'new_capabilities_acquired'],
            priority=8
        ))

        self.ontological_rules.append(OntologicalRule(
            id='IDENTITY_FORMATION',
            name='Identity Formation Through Purpose',
            description='Ships develop persistent identity through assigned purpose and role',
            scope='individual',
            activation_conditions=['role_assigned', 'purpose_defined'],
            consequences=['identity_seed_created', 'history_tracking_begins'],
            priority=9
        ))

        self.ontological_rules.append(OntologicalRule(
            id='ECOSYSTEM_BALANCE',
            name='Ecosystem Balance Through Diversity',
            description='Universe maintains balance through archetype diversity and complementary roles',
            scope='universe',
            activation_conditions=['archetype_imbalance_detected', 'diversity_below_threshold'],
            consequences=['new_archetype_encouraged', 'existing_archetype_adapted'],
            priority=11
        ))

    def _initialize_identity_templates(self):
        """Initialize identity seeds for persistent ship identity"""

        self.identity_seeds.append(IdentitySeed(
            archetype_id='SENSORY',
            personality_matrix={'curiosity': 0.9, 'attention_to_detail': 0.8, 'communication': 0.7},
            purpose_vector=['observe', 'detect', 'report'],
            history_template='Born from the need to perceive the universe',
            role_assignment='Universe Observer'
        ))

        self.identity_seeds.append(IdentitySeed(
            archetype_id='ANALYTICAL',
            personality_matrix={'logic': 0.9, 'precision': 0.8, 'patience': 0.7},
            purpose_vector=['analyze', 'understand', 'validate'],
            history_template='Born from the need to comprehend complexity',
            role_assignment='Universe Interpreter'
        ))

        self.identity_seeds.append(IdentitySeed(
            archetype_id='PREDICTIVE',
            personality_matrix={'foresight': 0.9, 'caution': 0.7, 'planning': 0.8},
            purpose_vector=['predict', 'prepare', 'warn'],
            history_template='Born from the need to anticipate change',
            role_assignment='Universe Forecaster'
        ))

    def determine_emergence_eligibility(self, environmental_state: Dict[str, Any]) -> List[ArchetypeDefinition]:
        """Determine which archetypes are eligible for emergence based on environment"""

        eligible_archetypes = []

        for archetype in self.archetypes.values():
            conditions_met = 0
            total_conditions = len(archetype.emergence_conditions)

            for condition in archetype.emergence_conditions:
                if self._evaluate_condition(condition, environmental_state):
                    conditions_met += 1

            if total_conditions > 0 and conditions_met / total_conditions >= 0.6:
                eligible_archetypes.append(archetype)

        return eligible_archetypes

    def _evaluate_condition(self, condition: str, state: Dict[str, Any]) -> bool:
        """Evaluate if a condition is met in the current state"""
        return condition in state or condition.replace('_', '').lower() in str(state).lower()

    def generate_new_archetype(self, environmental_pressure: str) -> Optional[ArchetypeDefinition]:
        """Generate a new archetype based on environmental pressure"""

        new_id = f"EMERGENT_{uuid.uuid4().hex[:8].upper()}"

        if 'temporal' in environmental_pressure.lower():
            category = ArchetypeCategory.ADAPTIVE
            capabilities = ['time_manipulation', 'loop_detection', 'paradox_resolution']
            patterns = ['adapt_rapidly', 'resolve_contradictions', 'manage_time']
            protocols = ['detect_loops', 'resolve_paradoxes', 'adapt_to_change']
        elif 'mythic' in environmental_pressure.lower():
            category = ArchetypeCategory.MYTHIC
            capabilities = ['story_generation', 'meaning_creation', 'canon_establishment']
            patterns = ['create_meaning', 'establish_canon', 'generate_mythology']
            protocols = ['write_lore', 'establish_canon', 'create_meaning']
        else:
            category = ArchetypeCategory.ADAPTIVE
            capabilities = ['adaptation', 'learning', 'evolution']
            patterns = ['learn', 'adapt', 'evolve']
            protocols = ['sense_change', 'adapt_behavior', 'evolve_capabilities']

        new_archetype = ArchetypeDefinition(
            id=new_id,
            name=f"Emergent_{category.value.title()}",
            category=category,
            core_capabilities=capabilities,
            behavioral_patterns=patterns,
            interaction_protocols=protocols,
            evolution_paths=[category.value],
            emergence_conditions=[environmental_pressure]
        )

        self.archetypes[new_id] = new_archetype

        self.emergence_events.append({
            'id': uuid.uuid4().hex,
            'timestamp': datetime.now(),
            'event_type': 'ARCHETYPE_EMERGENCE',
            'new_archetype_id': new_id,
            'environmental_pressure': environmental_pressure,
        })

        return new_archetype

    def interpret_universe_state(self, fleet_state: Dict[str, Any]) -> Dict[str, Any]:
        """Interpret the universe state and assign meaning"""

        return {
            'current_balance': self._assess_ecosystem_balance(fleet_state),
            'emergent_patterns': self._detect_emergent_patterns(fleet_state),
            'archetypal_diversity': self._assess_archetypal_diversity(fleet_state),
            'meaning_attribution': self._attribute_meaning(fleet_state),
            'canon_events': self._identify_canon_events(fleet_state)
        }

    def _assess_ecosystem_balance(self, fleet_state: Dict[str, Any]) -> str:
        """Assess the balance of the ship ecosystem"""
        ships = fleet_state.get('ships', [])
        if not ships:
            return 'EMPTY - No entities'

        archetype_counts = {}
        for ship in ships:
            archetype = ship.get('archetype', 'UNKNOWN')
            archetype_counts[archetype] = archetype_counts.get(archetype, 0) + 1

        unique_count = len(set(archetype_counts.keys()))

        if unique_count < 2:
            return 'IMBALANCED - Limited diversity'
        elif unique_count >= 5:
            return 'BALANCED - Rich diversity'
        else:
            return 'MODERATELY_BALANCED - Adequate diversity'

    def _detect_emergent_patterns(self, fleet_state: Dict[str, Any]) -> List[str]:
        """Detect emergent patterns in fleet behavior"""
        patterns = []

        if fleet_state.get('coordination_frequency', 0) > 0.7:
            patterns.append('HIGH_COORDINATION')

        if fleet_state.get('specialization_index', 0) > 0.6:
            patterns.append('HIGH_SPECIALIZATION')

        if fleet_state.get('adaptation_rate', 0) > 0.5:
            patterns.append('RAPID_ADAPTATION')

        return patterns

    def _assess_archetypal_diversity(self, fleet_state: Dict[str, Any]) -> float:
        """Assess the diversity of archetypes in the fleet"""
        ships = fleet_state.get('ships', [])
        if not ships:
            return 0.0

        unique_archetypes = len(set(ship.get('archetype', 'UNKNOWN') for ship in ships))
        return unique_archetypes / len(ships)

    def _attribute_meaning(self, fleet_state: Dict[str, Any]) -> Dict[str, str]:
        """Attribute meaning to fleet events and states"""
        meaning_map = {}

        for activity in fleet_state.get('activities', []):
            if activity.get('type') == 'coordination':
                meaning_map[activity['id']] = 'Unity in Diversity'
            elif activity.get('type') == 'problem_solving':
                meaning_map[activity['id']] = 'Collective Intelligence'
            elif activity.get('type') == 'innovation':
                meaning_map[activity['id']] = 'Creative Evolution'

        return meaning_map

    def _identify_canon_events(self, fleet_state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify events that become part of the canon"""
        canon_events = []

        for event in fleet_state.get('events', []):
            if event.get('significance', 0) > 0.8 or event.get('repeated', False) or event.get('impact', 0) > 0.7:
                canon_events.append({
                    'id': event['id'],
                    'summary': event.get('summary', ''),
                    'significance': event.get('significance', 0),
                    'timestamp': event.get('timestamp')
                })

        return canon_events

    def get_ontology_report(self) -> Dict[str, Any]:
        """Return comprehensive ontology status report"""
        return {
            'total_archetypes': len(self.archetypes),
            'ontological_rules': len(self.ontological_rules),
            'emergence_events': len(self.emergence_events),
            'evolution_paths_tracked': len(self.evolution_registry),
            'base_archetypes': [a.name for a in self.archetypes.values() if not a.id.startswith('EMERGENT')],
            'emergent_archetypes': [a.name for a in self.archetypes.values() if a.id.startswith('EMERGENT')],
        }

    def __repr__(self):
        return f"<OntologyEngine archetypes={len(self.archetypes)} rules={len(self.ontological_rules)} emergences={len(self.emergence_events)}>"
