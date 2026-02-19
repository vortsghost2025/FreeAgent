#!/usr/bin/env python3
"""
PHASE XXVIII - CAPTAIN'S MIRROR
Records and analyzes captain (leadership) decisions and their cascading impact
on the federation. Tracks influence, measures decision resonance with federation
values, detects drift from core principles.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Set, Tuple
from datetime import datetime
from enum import Enum
from collections import defaultdict


class DecisionType(Enum):
    """Types of captain decisions"""
    STRATEGIC = "strategic"
    DIPLOMATIC = "diplomatic"
    EMERGENCY = "emergency"
    CONSTITUTIONAL = "constitutional"
    RESOURCE_ALLOCATION = "resource_allocation"
    PERSONNEL = "personnel"


class ImpactCategory(Enum):
    """Categories of decision impact"""
    SYSTEMIC = "systemic"  # Affects multiple systems
    POLITICAL = "political"  # Affects governance
    CULTURAL = "cultural"  # Affects federation values
    OPERATIONAL = "operational"  # Affects day-to-day operations
    EXISTENTIAL = "existential"  # Affects federation existence


@dataclass
class CaptainInfluence:
    """Record of a single captain action and its influence"""
    action_id: str
    captain_id: str
    decision_type: DecisionType
    description: str
    timestamp: float
    tick: int
    impact_strength: float  # 0.0-1.0, immediate impact magnitude
    systems_affected: List[str]  # Which federation systems affected
    impact_categories: List[ImpactCategory]
    resonance_score: float = 0.0  # -1.0 to 1.0, alignment with federation values
    propagation_depth: int = 0  # How many cascading effects
    detected_drift: Optional[str] = None  # If action creates drift from values


@dataclass
class EchoPath:
    """Records how a decision propagates through federation"""
    path_id: str
    originating_action_id: str
    stage: int  # Which generation of echo (1 = direct effect, 2 = secondary)
    affected_system: str
    echo_strength: float  # How strong is the echo at this stage
    timestamp: float
    cascade_endpoint: Optional[str] = None


@dataclass
class ResonanceAnalysis:
    """Analysis of how a decision aligns with federation values"""
    analysis_id: str
    action_id: str
    federation_value: str  # Which core value is affected
    alignment_score: float  # -1.0 (conflicts) to 1.0 (aligns)
    evidence: List[str]  # Why this score
    timestamp: float


@dataclass
class DriftEvent:
    """Detection of captain diverging from federation principles"""
    drift_id: str
    action_id: str
    detected_at_tick: int
    principle_violated: str
    severity: float  # 0.0-1.0
    context: str
    recommendation: str


class CaptainMirror:
    """Tracks and analyzes captain decisions and their influence on federation"""

    def __init__(self):
        self.actions: Dict[str, CaptainInfluence] = {}
        self.echo_paths: Dict[str, EchoPath] = {}
        self.resonance_analyses: Dict[str, ResonanceAnalysis] = {}
        self.drift_events: Dict[str, DriftEvent] = {}

        self._action_counter = 0
        self._echo_counter = 0
        self._analysis_counter = 0
        self._drift_counter = 0

        self.captain_decision_history: List[str] = []  # Chronological action IDs
        self.tick_counter = 0

        # Federation core values for resonance checking
        self.federation_values = {
            "democracy": 0.0,
            "transparency": 0.0,
            "collective_wisdom": 0.0,
            "individual_rights": 0.0,
            "long_term_thinking": 0.0,
            "federation_unity": 0.0,
        }

        self.impact_registry = defaultdict(list)  # system → list of action IDs affecting it

    def record_captain_action(
        self,
        captain_id: str,
        decision_type: DecisionType,
        description: str,
        systems_affected: List[str],
        impact_categories: List[ImpactCategory],
        impact_strength: float = 0.7,
    ) -> str:
        """Record a captain decision and assess initial impact"""
        self._action_counter += 1
        action_id = f"action_{self._action_counter:06d}"

        action = CaptainInfluence(
            action_id=action_id,
            captain_id=captain_id,
            decision_type=decision_type,
            description=description,
            timestamp=datetime.now().timestamp(),
            tick=self.tick_counter,
            impact_strength=min(1.0, max(0.0, impact_strength)),
            systems_affected=systems_affected,
            impact_categories=impact_categories,
        )

        self.actions[action_id] = action
        self.captain_decision_history.append(action_id)

        # Register in impact registry
        for system in systems_affected:
            self.impact_registry[system].append(action_id)

        return action_id

    def calculate_impact(self, action_id: str) -> Dict[str, Any]:
        """Calculate the comprehensive impact of a decision"""
        if action_id not in self.actions:
            return {"success": False, "error": "Action not found"}

        action = self.actions[action_id]

        # Calculate impact by category
        category_impacts = {}
        for category in action.impact_categories:
            if category == ImpactCategory.SYSTEMIC:
                category_impacts[category.value] = action.impact_strength * 0.9
            elif category == ImpactCategory.POLITICAL:
                category_impacts[category.value] = action.impact_strength * 0.8
            elif category == ImpactCategory.CULTURAL:
                category_impacts[category.value] = action.impact_strength * 0.7
            elif category == ImpactCategory.OPERATIONAL:
                category_impacts[category.value] = action.impact_strength * 0.6
            elif category == ImpactCategory.EXISTENTIAL:
                category_impacts[category.value] = action.impact_strength * 1.0

        # Calculate spread across systems
        system_impact = {}
        for system in action.systems_affected:
            system_impact[system] = action.impact_strength

        # Calculate total impact magnitude
        total_impact = sum(category_impacts.values()) / len(category_impacts) if category_impacts else 0.0

        return {
            "success": True,
            "action_id": action_id,
            "total_impact_magnitude": total_impact,
            "category_impacts": category_impacts,
            "system_impacts": system_impact,
            "affected_system_count": len(action.systems_affected),
        }

    def generate_influence_heatmap(self) -> Dict[str, Any]:
        """Generate map of captain's reach across federation systems"""
        heatmap = defaultdict(float)
        action_count = defaultdict(int)

        for system, action_ids in self.impact_registry.items():
            for action_id in action_ids:
                if action_id in self.actions:
                    action = self.actions[action_id]
                    heatmap[system] += action.impact_strength
                    action_count[system] += 1

        # Average impact per system
        heatmap_normalized = {}
        for system, total_impact in heatmap.items():
            avg_impact = total_impact / action_count[system] if action_count[system] > 0 else 0.0
            heatmap_normalized[system] = min(1.0, avg_impact)

        # Overall federation reach
        total_systems_affected = len(heatmap)
        all_systems_estimate = 20  # Estimated total federation systems
        reach_percentage = (total_systems_affected / all_systems_estimate) * 100

        return {
            "heatmap": heatmap_normalized,
            "total_actions": self._action_counter,
            "systems_influenced": total_systems_affected,
            "reach_percentage": min(100.0, reach_percentage),
            "highest_impact_system": max(heatmap_normalized, key=heatmap_normalized.get) if heatmap_normalized else None,
            "lowest_impact_system": min(heatmap_normalized, key=heatmap_normalized.get) if heatmap_normalized else None,
        }

    def analyze_echo(self, action_id: str, propagation_stages: int = 3) -> Dict[str, Any]:
        """Analyze how a decision propagates through federation systems"""
        if action_id not in self.actions:
            return {"success": False, "error": "Action not found"}

        action = self.actions[action_id]
        echo_paths_created = []
        total_echo_strength = 0.0

        # Generate propagation stages
        for stage in range(1, propagation_stages + 1):
            for system in action.systems_affected:
                self._echo_counter += 1
                echo_id = f"echo_{self._echo_counter:06d}"

                # Echo diminishes with each propagation stage
                decay_factor = 0.8 ** stage
                echo_strength = action.impact_strength * decay_factor

                echo_path = EchoPath(
                    path_id=echo_id,
                    originating_action_id=action_id,
                    stage=stage,
                    affected_system=system,
                    echo_strength=echo_strength,
                    timestamp=datetime.now().timestamp(),
                )

                self.echo_paths[echo_id] = echo_path
                echo_paths_created.append(echo_id)
                total_echo_strength += echo_strength

        # Update action's propagation depth
        action.propagation_depth = propagation_stages

        return {
            "success": True,
            "action_id": action_id,
            "echo_paths_created": len(echo_paths_created),
            "total_echo_strength": total_echo_strength,
            "average_echo_strength": total_echo_strength / len(echo_paths_created) if echo_paths_created else 0.0,
            "propagation_stages": propagation_stages,
        }

    def score_resonance(self, action_id: str) -> Dict[str, Any]:
        """Score how well a captain decision aligns with federation values"""
        if action_id not in self.actions:
            return {"success": False, "error": "Action not found"}

        action = self.actions[action_id]

        # Analyze resonance with each federation value
        resonance_scores = {}
        analyses_created = []

        # Decision type affects alignment
        decision_value_align = {
            DecisionType.STRATEGIC: {"long_term_thinking": 0.9, "collective_wisdom": 0.8},
            DecisionType.DIPLOMATIC: {"federation_unity": 0.9, "transparency": 0.7},
            DecisionType.EMERGENCY: {"federation_unity": 0.7, "democracy": -0.3},  # Might override democracy
            DecisionType.CONSTITUTIONAL: {"democracy": 0.9, "transparency": 0.8},
            DecisionType.RESOURCE_ALLOCATION: {"individual_rights": 0.6, "collective_wisdom": 0.7},
            DecisionType.PERSONNEL: {"transparency": 0.5, "individual_rights": 0.8},
        }

        aligns = decision_value_align.get(action.decision_type, {})

        for value in self.federation_values.keys():
            score = aligns.get(value, 0.0)
            resonance_scores[value] = score

            self._analysis_counter += 1
            analysis_id = f"resonance_{self._analysis_counter:06d}"

            evidence = []
            if score > 0.5:
                evidence.append(f"Decision type {action.decision_type.value} aligns with {value}")
            elif score < -0.5:
                evidence.append(f"Decision type {action.decision_type.value} conflicts with {value}")
            else:
                evidence.append(f"Neutral alignment with {value}")

            analysis = ResonanceAnalysis(
                analysis_id=analysis_id,
                action_id=action_id,
                federation_value=value,
                alignment_score=score,
                evidence=evidence,
                timestamp=datetime.now().timestamp(),
            )

            self.resonance_analyses[analysis_id] = analysis
            analyses_created.append(analysis_id)

        # Calculate overall resonance
        overall_resonance = sum(resonance_scores.values()) / len(resonance_scores) if resonance_scores else 0.0
        action.resonance_score = overall_resonance

        return {
            "success": True,
            "action_id": action_id,
            "overall_resonance": overall_resonance,
            "resonance_by_value": resonance_scores,
            "analyses_created": len(analyses_created),
        }

    def detect_drift(self, action_id: str) -> Dict[str, Any]:
        """Detect if captain is drifting from federation principles"""
        if action_id not in self.actions:
            return {"success": False, "error": "Action not found"}

        action = self.actions[action_id]
        drift_detected = []

        # Check for drift based on resonance
        resonance = action.resonance_score
        if resonance < -0.3:  # Significant misalignment
            self._drift_counter += 1
            drift_id = f"drift_{self._drift_counter:06d}"

            drift_event = DriftEvent(
                drift_id=drift_id,
                action_id=action_id,
                detected_at_tick=self.tick_counter,
                principle_violated="Federation Value Alignment",
                severity=min(1.0, abs(resonance) * 0.5),  # Magnitude of misalignment
                context=f"Decision has low resonance score of {resonance:.2f}",
                recommendation="Review decision alignment with federation values",
            )

            self.drift_events[drift_id] = drift_event
            drift_detected.append(drift_id)
            action.detected_drift = drift_id

        # Check for emergency decision overreach
        if action.decision_type == DecisionType.EMERGENCY and action.impact_strength > 0.8:
            self._drift_counter += 1
            drift_id = f"drift_{self._drift_counter:06d}"

            drift_event = DriftEvent(
                drift_id=drift_id,
                action_id=action_id,
                detected_at_tick=self.tick_counter,
                principle_violated="Democratic Process",
                severity=0.4,
                context="Emergency decision with high impact strength",
                recommendation="Ensure proper oversight and ratification planned",
            )

            self.drift_events[drift_id] = drift_event
            drift_detected.append(drift_id)

        return {
            "success": True,
            "action_id": action_id,
            "drift_detected": len(drift_detected) > 0,
            "drift_events": drift_detected,
            "drift_count": len(drift_detected),
        }

    def get_mirror_status(self) -> Dict[str, Any]:
        """Get comprehensive captain's mirror status report"""
        total_actions = len(self.actions)

        # Count actions by type
        actions_by_type = defaultdict(int)
        actions_by_impact_category = defaultdict(int)
        for action in self.actions.values():
            actions_by_type[action.decision_type.value] += 1
            for category in action.impact_categories:
                actions_by_impact_category[category.value] += 1

        # Calculate average resonance
        resonances = [a.resonance_score for a in self.actions.values()]
        avg_resonance = sum(resonances) / len(resonances) if resonances else 0.0

        # Calculate average impact
        impacts = [a.impact_strength for a in self.actions.values()]
        avg_impact = sum(impacts) / len(impacts) if impacts else 0.0

        # Count drift events
        total_drift_events = len(self.drift_events)
        severe_drifts = sum(1 for d in self.drift_events.values() if d.severity > 0.6)

        # Calculate captain influence reach
        total_systems_affected = len(self.impact_registry)

        return {
            "total_actions_recorded": total_actions,
            "actions_by_type": dict(actions_by_type),
            "actions_by_impact_category": dict(actions_by_impact_category),
            "total_echo_paths": len(self.echo_paths),
            "total_resonance_analyses": len(self.resonance_analyses),
            "average_resonance_score": avg_resonance,
            "average_impact_strength": avg_impact,
            "systems_influenced": total_systems_affected,
            "drift_events_detected": total_drift_events,
            "severe_drift_events": severe_drifts,
            "federation_health_indicator": avg_resonance + (1.0 - (total_drift_events * 0.1)),
        }
