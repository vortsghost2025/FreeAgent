#!/usr/bin/env python3
"""
PHASE VII.6 — MICRO-FORKING EVOLUTION ECOSYSTEM
Advanced universe expansion with forking, personality, analytics, and narrative continuity.

This module enables:
1. MicroForkingEngine - Create and analyze parallel universes
2. DashboardMockDataGenerator - Realistic data simulation
3. PersonalitySeeds - Advanced behavioral vectors
4. CaptainsLogGenerator - Auto-generated narrative logs
5. CrossForkAnalytics - Compare fork outcomes
6. PersonalityDrivenAnomalyResponse - Behavior-based responses
7. NarrativeContinuityAcrossForks - Coherent multi-fork storytelling
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timedelta
from enum import Enum
import json
import random
import math


# ===== ENUMS & DATA STRUCTURES =====

class PersonalityType(Enum):
    """Base personality types for ships"""
    ANALYTICAL = "analytical"
    INTUITIVE = "intuitive"
    GUARDIAN = "guardian"
    EXPLORER = "explorer"
    HARMONIZER = "harmonizer"


class PerturbationStrategy(Enum):
    """Forking perturbation strategies"""
    RANDOM_WALK = "random_walk"
    GAUSSIAN_NOISE = "gaussian_noise"
    THRESHOLD_SHIFT = "threshold_shift"
    BEHAVIORAL_DRIFT = "behavioral_drift"
    ANOMALY_AMPLIFICATION = "anomaly_amplification"


@dataclass
class PersonalityVector:
    """Complete personality definition for a ship"""
    ship_name: str
    base_type: PersonalityType
    traits: Dict[str, float]  # key: float value 0.0-1.0
    anomaly_weights: Dict[str, float]  # anomaly_type: weight multiplier
    behavioral_patterns: List[str]
    memory_recency_bias: float = 0.6
    risk_tolerance: float = 0.5
    adaptation_rate: float = 0.1

    def get_weighted_anomaly_response(self, anomaly_type: str) -> float:
        """Get weighted severity for anomaly based on personality"""
        base_weight = self.anomaly_weights.get(anomaly_type, 1.0)
        personality_factor = 1.0 + (self.risk_tolerance * 0.5)
        return base_weight * personality_factor


@dataclass
class ForkSnapshot:
    """State snapshot at fork point"""
    fork_id: str
    parent_fork_id: Optional[str]
    timestamp: float
    perturbation_strategy: PerturbationStrategy
    perturbation_magnitude: float
    base_state: Dict[str, Any]
    perturbed_state: Dict[str, Any]


@dataclass
class ForkResult:
    """Complete fork evolution result"""
    fork_id: str
    fork_snapshot: ForkSnapshot
    duration_steps: int
    anomaly_count: int
    drift_trajectory: List[float]
    continuity_violations: int
    narrative_coherence_score: float
    terminal_state: Dict[str, Any]
    key_events: List[str]
    convergence_status: str  # "converged", "diverging", "stable"


@dataclass
class DivergenceAnalysis:
    """Analysis of how forks diverged"""
    branch_count: int
    fork_pairs: List[tuple]  # (fork_id1, fork_id2)
    divergence_scores: Dict[str, float]  # fork_id: divergence_score
    earliest_divergence_point: Optional[int]
    convergence_points: List[int]
    most_divergent_fork: str
    most_stable_fork: str


@dataclass
class CaptainLogEntry:
    """Single captain's log entry"""
    timestamp: float
    date_str: str
    mood: str
    events_summary: List[str]
    anomalies_encountered: int
    crew_status: str
    ship_status: str
    personal_notes: str
    narrative_style: str  # "routine", "dramatic", "scientific", "poetic"


@dataclass
class IncidentReport:
    """Formal incident report from anomaly"""
    incident_id: str
    timestamp: float
    anomaly_type: str
    severity: float
    affected_systems: List[str]
    narrative_description: str
    contributing_factors: List[str]
    resolution: str
    lessons_learned: List[str]
    impact_assessment: Dict[str, Any]


@dataclass
class DashboardSnapshot:
    """Single dashboard data snapshot"""
    timestamp: float
    anomaly_density: float
    drift_level: float
    continuity_score: float
    ship_health: float
    memory_entropy: float
    personality_stability: float
    universe_mood: str


# ===== MICRO-FORKING ENGINE =====

class MicroForkingEngine:
    """Advanced forking with perturbation analysis and divergence tracking"""

    def __init__(self):
        self.forks: Dict[str, ForkResult] = {}
        self.fork_snapshots: Dict[str, ForkSnapshot] = {}
        self.fork_counter = 0

    def create_micro_fork(
        self,
        base_state: Dict[str, Any],
        strategy: PerturbationStrategy = PerturbationStrategy.RANDOM_WALK,
        magnitude: float = 0.1,
        duration_steps: int = 10,
        parent_fork_id: Optional[str] = None,
    ) -> ForkResult:
        """Create a micro-fork with specified perturbation strategy"""
        self.fork_counter += 1
        fork_id = f"fork_{self.fork_counter:04d}"

        # Apply perturbation
        perturbed_state = self._apply_perturbation(base_state, strategy, magnitude)

        # Create snapshot
        snapshot = ForkSnapshot(
            fork_id=fork_id,
            parent_fork_id=parent_fork_id,
            timestamp=datetime.now().timestamp(),
            perturbation_strategy=strategy,
            perturbation_magnitude=magnitude,
            base_state=base_state,
            perturbed_state=perturbed_state,
        )

        self.fork_snapshots[fork_id] = snapshot

        # Simulate fork evolution
        result = self._simulate_fork_evolution(
            fork_id, perturbed_state, duration_steps
        )

        self.forks[fork_id] = result
        return result

    def _apply_perturbation(
        self,
        state: Dict[str, Any],
        strategy: PerturbationStrategy,
        magnitude: float,
    ) -> Dict[str, Any]:
        """Apply perturbation based on strategy"""
        perturbed = state.copy()

        if strategy == PerturbationStrategy.RANDOM_WALK:
            for key in perturbed:
                if isinstance(perturbed[key], (int, float)):
                    perturbed[key] += random.gauss(0, magnitude)

        elif strategy == PerturbationStrategy.GAUSSIAN_NOISE:
            for key in perturbed:
                if isinstance(perturbed[key], (int, float)):
                    perturbed[key] *= (1 + random.gauss(0, magnitude))

        elif strategy == PerturbationStrategy.THRESHOLD_SHIFT:
            for key in perturbed:
                if isinstance(perturbed[key], (int, float)):
                    if abs(perturbed[key]) < 0.5:
                        perturbed[key] = random.choice([-1, 1]) * magnitude
                    else:
                        perturbed[key] *= (1 + magnitude)

        elif strategy == PerturbationStrategy.BEHAVIORAL_DRIFT:
            perturbed["personality_drift"] = magnitude
            perturbed["decision_pattern"] = random.choice(["aggressive", "passive", "adaptive"])

        elif strategy == PerturbationStrategy.ANOMALY_AMPLIFICATION:
            perturbed["anomaly_multiplier"] = 1.0 + magnitude

        return perturbed

    def _simulate_fork_evolution(
        self, fork_id: str, initial_state: Dict[str, Any], steps: int
    ) -> ForkResult:
        """Simulate fork evolution over N steps"""
        current_state = initial_state.copy()
        drift_trajectory = []
        anomaly_count = 0
        violations = 0
        key_events = []

        for step in range(steps):
            # Simulate drift
            drift = random.gauss(0, 0.05)
            current_state["drift"] = current_state.get("drift", 0) + drift
            drift_trajectory.append(current_state["drift"])

            # Simulate anomalies
            if random.random() < 0.3:
                anomaly_count += 1
                key_events.append(f"Anomaly detected at step {step}")

            # Simulate continuity violations
            if random.random() < 0.15:
                violations += 1
                key_events.append(f"Continuity violation at step {step}")

            # Natural convergence/divergence
            if step % 5 == 0:
                if random.random() < 0.4:
                    key_events.append(f"Convergence point at step {step}")

        # Calculate metrics
        avg_drift = abs(sum(drift_trajectory) / len(drift_trajectory))
        coherence = max(0, 1.0 - (violations / max(1, steps / 2)))

        # Determine convergence status
        if avg_drift < 0.1:
            convergence_status = "stable"
        elif avg_drift > 0.3:
            convergence_status = "diverging"
        else:
            convergence_status = "converged"

        return ForkResult(
            fork_id=fork_id,
            fork_snapshot=self.fork_snapshots[fork_id],
            duration_steps=steps,
            anomaly_count=anomaly_count,
            drift_trajectory=drift_trajectory,
            continuity_violations=violations,
            narrative_coherence_score=coherence,
            terminal_state=current_state,
            key_events=key_events,
            convergence_status=convergence_status,
        )

    def analyze_divergence(
        self, fork_ids: Optional[List[str]] = None
    ) -> DivergenceAnalysis:
        """Analyze how different forks diverged"""
        if fork_ids is None:
            fork_ids = list(self.forks.keys())

        if len(fork_ids) < 2:
            return DivergenceAnalysis(
                branch_count=len(fork_ids),
                fork_pairs=[],
                divergence_scores={},
                earliest_divergence_point=None,
                convergence_points=[],
                most_divergent_fork=fork_ids[0] if fork_ids else "none",
                most_stable_fork=fork_ids[0] if fork_ids else "none",
            )

        # Calculate pairwise divergence scores
        divergence_scores = {}
        fork_pairs = []

        for i, fork_id1 in enumerate(fork_ids):
            for fork_id2 in fork_ids[i + 1 :]:
                fork_pairs.append((fork_id1, fork_id2))

                # Calculate divergence based on terminal states
                f1 = self.forks[fork_id1]
                f2 = self.forks[fork_id2]

                # Euclidean distance in drift space
                drift_diff = abs(f1.drift_trajectory[-1] - f2.drift_trajectory[-1])
                anomaly_diff = abs(f1.anomaly_count - f2.anomaly_count) / 10.0
                violation_diff = abs(f1.continuity_violations - f2.continuity_violations)

                divergence = math.sqrt(drift_diff**2 + anomaly_diff**2 + violation_diff**2)
                divergence_scores[f"{fork_id1}-{fork_id2}"] = divergence

        # Find most/least divergent
        most_divergent = max(divergence_scores, key=divergence_scores.get) if divergence_scores else "none"
        most_stable_fork = min(
            fork_ids, key=lambda fid: sum(abs(d) for d in self.forks[fid].drift_trajectory)
        ) if fork_ids else "none"

        return DivergenceAnalysis(
            branch_count=len(fork_ids),
            fork_pairs=fork_pairs,
            divergence_scores=divergence_scores,
            earliest_divergence_point=None,
            convergence_points=[],
            most_divergent_fork=most_divergent,
            most_stable_fork=most_stable_fork,
        )


# ===== DASHBOARD MOCK DATA GENERATOR =====

class DashboardMockDataGenerator:
    """Generates realistic dashboard data"""

    def __init__(self):
        self.data_history: List[DashboardSnapshot] = []

    def generate_realistic_data(
        self, time_range_hours: int = 24, pattern: str = "normal_operation"
    ) -> List[DashboardSnapshot]:
        """Generate realistic dashboard data"""
        snapshots = []
        current_time = datetime.now().timestamp()

        patterns = {
            "normal_operation": self._pattern_normal,
            "anomaly_spikes": self._pattern_anomaly_spikes,
            "gradual_degradation": self._pattern_degradation,
            "recovery_cycles": self._pattern_recovery,
            "seasonal_variations": self._pattern_seasonal,
        }

        pattern_func = patterns.get(pattern, self._pattern_normal)

        for i in range(time_range_hours * 4):  # 15-minute intervals
            timestamp = current_time - (time_range_hours * 3600) + (i * 900)
            data = pattern_func(i / (time_range_hours * 4))

            snapshot = DashboardSnapshot(
                timestamp=timestamp,
                anomaly_density=data["anomaly_density"],
                drift_level=data["drift"],
                continuity_score=data["continuity"],
                ship_health=data["health"],
                memory_entropy=data["entropy"],
                personality_stability=data["personality"],
                universe_mood=data["mood"],
            )

            snapshots.append(snapshot)
            self.data_history.append(snapshot)

        return snapshots

    def _pattern_normal(self, progress: float) -> Dict[str, Any]:
        """Normal operation pattern"""
        return {
            "anomaly_density": 0.1 + random.gauss(0, 0.02),
            "drift": 0.2 + random.gauss(0, 0.05),
            "continuity": 0.95 - random.gauss(0, 0.02),
            "health": 0.9,
            "entropy": 0.3,
            "personality": 0.8,
            "mood": "CALM",
        }

    def _pattern_anomaly_spikes(self, progress: float) -> Dict[str, Any]:
        """Anomaly spike pattern"""
        if 0.3 < progress < 0.7:
            spike = math.sin(progress * 10) * 0.5
        else:
            spike = 0

        return {
            "anomaly_density": 0.3 + spike + random.gauss(0, 0.05),
            "drift": 0.4 + random.gauss(0, 0.1),
            "continuity": 0.8 - spike,
            "health": 0.85,
            "entropy": 0.5,
            "personality": 0.7 - spike,
            "mood": "CHAOTIC" if spike > 0.2 else "VOLATILE",
        }

    def _pattern_degradation(self, progress: float) -> Dict[str, Any]:
        """Gradual degradation pattern"""
        degradation = progress * 0.5
        return {
            "anomaly_density": 0.1 + degradation + random.gauss(0, 0.02),
            "drift": 0.2 + (degradation * 0.8),
            "continuity": 0.95 - degradation,
            "health": 0.9 - degradation,
            "entropy": 0.3 + (degradation * 0.4),
            "personality": 0.8 - (degradation * 0.3),
            "mood": "TENSE" if degradation > 0.2 else "CALM",
        }

    def _pattern_recovery(self, progress: float) -> Dict[str, Any]:
        """Recovery cycle pattern"""
        if progress < 0.3:
            crisis = (0.3 - progress) / 0.3
        elif progress > 0.7:
            crisis = (progress - 0.7) / 0.3
        else:
            crisis = 0

        return {
            "anomaly_density": 0.3 * crisis + random.gauss(0, 0.03),
            "drift": 0.5 * crisis + random.gauss(0, 0.05),
            "continuity": 1.0 - (0.3 * crisis),
            "health": 0.6 + (0.3 * (1 - crisis)),
            "entropy": 0.6 * crisis + random.gauss(0, 0.02),
            "personality": 0.7 + (0.2 * (1 - crisis)),
            "mood": "VOLATILE" if crisis > 0.5 else "TENSE",
        }

    def _pattern_seasonal(self, progress: float) -> Dict[str, Any]:
        """Seasonal variation pattern"""
        seasonal = math.sin(progress * 8 * math.pi) * 0.3

        return {
            "anomaly_density": 0.2 + (seasonal * 0.5) + random.gauss(0, 0.02),
            "drift": 0.3 + (seasonal * 0.3),
            "continuity": 0.9 + (seasonal * 0.05),
            "health": 0.85 + (seasonal * 0.1),
            "entropy": 0.4 + (seasonal * 0.2),
            "personality": 0.75 + (seasonal * 0.15),
            "mood": "VOLATILE" if abs(seasonal) > 0.2 else "CALM",
        }


# ===== PERSONALITY SEEDS =====

class PersonalitySeeds:
    """Advanced personality vectors for ships"""

    PERSONALITY_DEFINITIONS = {
        PersonalityType.ANALYTICAL: {
            "traits": {"curiosity": 0.9, "precision": 0.8, "patience": 0.7, "logic": 0.95},
            "anomaly_weights": {
                "contradiction": 1.2,
                "outlier": 0.8,
                "state_delta": 1.0,
                "metaphysical_mismatch": 1.3,
            },
            "behavioral_patterns": ["analyze_first", "verify_twice", "act_deliberately", "document_all"],
            "memory_recency_bias": 0.4,
            "risk_tolerance": 0.4,
        },
        PersonalityType.INTUITIVE: {
            "traits": {"creativity": 0.9, "adaptability": 0.8, "risk_tolerance": 0.7, "empathy": 0.6},
            "anomaly_weights": {
                "contradiction": 0.8,
                "outlier": 1.5,
                "state_delta": 1.2,
                "recurring_motif": 1.4,
            },
            "behavioral_patterns": ["trust_instinct", "pivot_quickly", "embrace_uncertainty", "innovate"],
            "memory_recency_bias": 0.8,
            "risk_tolerance": 0.8,
        },
        PersonalityType.GUARDIAN: {
            "traits": {"caution": 0.9, "stability": 0.8, "protection": 0.7, "vigilance": 0.9},
            "anomaly_weights": {
                "contradiction": 1.5,
                "outlier": 1.3,
                "state_delta": 1.4,
                "continuity_violation": 1.6,
            },
            "behavioral_patterns": ["scan_threats", "protect_assets", "alert_others", "enforce_rules"],
            "memory_recency_bias": 0.6,
            "risk_tolerance": 0.3,
        },
        PersonalityType.EXPLORER: {
            "traits": {"curiosity": 0.95, "courage": 0.8, "adaptability": 0.7, "wonder": 0.9},
            "anomaly_weights": {
                "anomaly": 0.6,
                "state_delta": 0.8,
                "metaphysical_mismatch": 0.7,
                "ontological_inconsistency": 0.8,
            },
            "behavioral_patterns": ["seek_unknowns", "take_risks", "document_discoveries", "experiment"],
            "memory_recency_bias": 0.5,
            "risk_tolerance": 0.9,
        },
        PersonalityType.HARMONIZER: {
            "traits": {"empathy": 0.9, "cooperation": 0.8, "peace": 0.8, "understanding": 0.85},
            "anomaly_weights": {
                "contradiction": 0.7,
                "continuity_violation": 0.8,
                "behavioral_drift": 1.2,
                "social_anomaly": 1.5,
            },
            "behavioral_patterns": ["mediate_conflicts", "build_consensus", "heal_relationships", "bridge_gaps"],
            "memory_recency_bias": 0.7,
            "risk_tolerance": 0.5,
        },
    }

    def __init__(self):
        self.personalities: Dict[str, PersonalityVector] = {}

    def generate_personality(
        self,
        ship_name: str,
        base_type: PersonalityType,
        customization: Optional[Dict[str, float]] = None,
    ) -> PersonalityVector:
        """Generate personality vector with optional customization"""
        definition = self.PERSONALITY_DEFINITIONS[base_type]

        traits = definition["traits"].copy()
        if customization and "traits" in customization:
            traits.update(customization["traits"])

        anomaly_weights = definition["anomaly_weights"].copy()
        if customization and "anomaly_weights" in customization:
            anomaly_weights.update(customization["anomaly_weights"])

        personality = PersonalityVector(
            ship_name=ship_name,
            base_type=base_type,
            traits=traits,
            anomaly_weights=anomaly_weights,
            behavioral_patterns=definition["behavioral_patterns"],
            memory_recency_bias=definition.get("memory_recency_bias", 0.6),
            risk_tolerance=definition.get("risk_tolerance", 0.5),
            adaptation_rate=customization.get("adaptation_rate", 0.1) if customization else 0.1,
        )

        self.personalities[ship_name] = personality
        return personality

    def adapt_personality(
        self, ship_name: str, experience_data: Dict[str, Any]
    ) -> PersonalityVector:
        """Adapt personality based on experience"""
        if ship_name not in self.personalities:
            return None

        personality = self.personalities[ship_name]

        # Adapt based on anomaly encounters
        for anomaly_type, count in experience_data.get("anomalies_by_type", {}).items():
            if anomaly_type in personality.anomaly_weights:
                # Repeated exposure makes you more resistant
                reduction = min(personality.adaptation_rate * count * 0.01, 0.2)
                personality.anomaly_weights[anomaly_type] *= (1 - reduction)

        # Adapt risk tolerance based on outcomes (more impactful)
        success_rate = experience_data.get("success_rate", 0.5)
        personality.risk_tolerance += (success_rate - 0.5) * personality.adaptation_rate

        # Clamp to valid range
        personality.risk_tolerance = max(0.0, min(1.0, personality.risk_tolerance))

        return personality


# ===== CAPTAIN'S LOG GENERATOR =====

class CaptainsLogGenerator:
    """Auto-generated captain's logs from system data"""

    LOG_TEMPLATES = {
        "routine_day": [
            "Another day in the cosmos. Systems nominal. All is quiet on the {{mood}} front.",
            "Log entry for stardate {{date}}. The universe continues its march. Nothing remarkable to report.",
            "Day {{day_number}}: Steady as she goes. The crew is in good spirits.",
        ],
        "anomaly_encounter": [
            "We encountered {{anomaly_count}} anomalies today. The universe was in a {{mood}} mood.",
            "Alert status reached. {{anomaly_count}} anomalies detected. Crew performing admirably.",
            "Systems under stress. {{anomaly_count}} anomalies tested our resolve. We endured.",
        ],
        "system_recovery": [
            "Recovery underway. {{anomaly_count}} issues resolved. Ship systems stabilizing.",
            "The crisis has passed. Damage assessment shows {{repair_count}} critical systems restored.",
            "Post-incident analysis complete. We learned much from today's challenges.",
        ],
        "discovery_moment": [
            "A remarkable discovery! We've encountered something truly unique in this corner of space.",
            "First contact with unknown phenomenon. Scientific teams are analyzing the data.",
            "History may remember today as a turning point.",
        ],
        "critical_incident": [
            "This has been one of the most challenging days in our voyage.",
            "We stood at the edge of the abyss today. But we did not fall.",
            "Crisis log: {{anomaly_count}} critical events. {{casualty_count}} systems lost. {{survival_count}} systems saved.",
        ],
    }

    def __init__(self):
        self.log_history: List[CaptainLogEntry] = []

    def generate_daily_log(
        self,
        date: datetime,
        mood: str,
        events_summary: List[str],
        anomaly_count: int,
        continuity_violations: int = 0,
    ) -> CaptainLogEntry:
        """Generate daily captain's log entry"""
        # Determine log type
        if anomaly_count > 5:
            log_type = "critical_incident"
        elif anomaly_count > 2:
            log_type = "anomaly_encounter"
        elif "discovery" in " ".join(events_summary).lower():
            log_type = "discovery_moment"
        elif continuity_violations > 0:
            log_type = "system_recovery"
        else:
            log_type = "routine_day"

        # Get template and fill
        templates = self.LOG_TEMPLATES[log_type]
        template = random.choice(templates)

        personal_notes = template.replace("{{mood}}", mood).replace(
            "{{anomaly_count}}", str(anomaly_count)
        ).replace("{{date}}", date.strftime("%Y-%m-%d")).replace(
            "{{day_number}}", str((date - datetime(2000, 1, 1)).days)
        )

        entry = CaptainLogEntry(
            timestamp=date.timestamp(),
            date_str=date.strftime("%Y-%m-%d"),
            mood=mood,
            events_summary=events_summary,
            anomalies_encountered=anomaly_count,
            crew_status="nominal" if anomaly_count < 3 else "stressed",
            ship_status="stable" if continuity_violations == 0 else "recovering",
            personal_notes=personal_notes,
            narrative_style=log_type,
        )

        self.log_history.append(entry)
        return entry

    def generate_incident_report(
        self, anomaly_type: str, severity: float, affected_systems: List[str]
    ) -> IncidentReport:
        """Generate formal incident report"""
        report_id = f"incident_{len(self.log_history):04d}"

        return IncidentReport(
            incident_id=report_id,
            timestamp=datetime.now().timestamp(),
            anomaly_type=anomaly_type,
            severity=severity,
            affected_systems=affected_systems,
            narrative_description=f"System anomaly of type {anomaly_type} affecting {', '.join(affected_systems)}",
            contributing_factors=[
                "System stress",
                "Environmental factors",
                "Unexpected interaction patterns",
            ],
            resolution="Systems rebooted and recalibrated",
            lessons_learned=[
                "Improve predictive monitoring",
                "Enhance system redundancy",
            ],
            impact_assessment={"severity": severity, "recovery_time_hours": int(severity * 10)},
        )


# ===== CROSS-FORK ANALYTICS =====

class CrossForkAnalytics:
    """Analyze patterns across multiple forks"""

    def __init__(self, forking_engine: MicroForkingEngine):
        self.forking_engine = forking_engine

    def compare_fork_outcomes(self, fork_ids: List[str]) -> Dict[str, Any]:
        """Compare outcomes across different forks"""
        if not fork_ids:
            return {}

        forks = [self.forking_engine.forks[fid] for fid in fork_ids if fid in self.forking_engine.forks]

        return {
            "fork_count": len(forks),
            "avg_anomalies": sum(f.anomaly_count for f in forks) / len(forks),
            "avg_drift": sum(f.drift_trajectory[-1] for f in forks) / len(forks),
            "avg_coherence": sum(f.narrative_coherence_score for f in forks) / len(forks),
            "most_stable": min(fork_ids, key=lambda fid: sum(abs(d) for d in self.forking_engine.forks[fid].drift_trajectory)),
            "least_stable": max(fork_ids, key=lambda fid: sum(abs(d) for d in self.forking_engine.forks[fid].drift_trajectory)),
        }

    def identify_optimal_paths(self, fork_ids: List[str]) -> List[Dict[str, Any]]:
        """Identify paths with best outcomes"""
        forks = [self.forking_engine.forks[fid] for fid in fork_ids if fid in self.forking_engine.forks]

        ranked = sorted(
            [(fid, self.forking_engine.forks[fid]) for fid in fork_ids if fid in self.forking_engine.forks],
            key=lambda x: (
                -x[1].narrative_coherence_score,
                x[1].anomaly_count,
                -x[1].drift_trajectory[-1]
            ),
        )

        return [
            {
                "rank": i + 1,
                "fork_id": fid,
                "coherence": fork.narrative_coherence_score,
                "anomalies": fork.anomaly_count,
                "drift": fork.drift_trajectory[-1],
                "recommendation": "OPTIMAL" if i == 0 else "GOOD" if i < 3 else "EXPLORE",
            }
            for i, (fid, fork) in enumerate(ranked[:5])
        ]

    def fork_convergence_mapping(self, fork_ids: List[str]) -> Dict[str, Any]:
        """Map convergence/divergence patterns"""
        forks = {fid: self.forking_engine.forks[fid] for fid in fork_ids if fid in self.forking_engine.forks}

        convergence_map = {
            "total_forks": len(forks),
            "converged": sum(1 for f in forks.values() if f.convergence_status == "converged"),
            "diverging": sum(1 for f in forks.values() if f.convergence_status == "diverging"),
            "stable": sum(1 for f in forks.values() if f.convergence_status == "stable"),
        }

        return convergence_map


# ===== PERSONALITY-DRIVEN ANOMALY RESPONSE =====

class PersonalityDrivenAnomalyResponse:
    """Different personalities respond differently to anomalies"""

    def __init__(self, personality_seeds: PersonalitySeeds):
        self.personality_seeds = personality_seeds

    def get_response(self, ship_name: str, anomaly_type: str, severity: float) -> Dict[str, Any]:
        """Get response strategy based on personality and anomaly"""
        if ship_name not in self.personality_seeds.personalities:
            return {"response": "UNKNOWN_PERSONALITY", "action": "no_action"}

        personality = self.personality_seeds.personalities[ship_name]

        # Get weighted severity
        weighted_severity = severity * personality.get_weighted_anomaly_response(anomaly_type)

        # Determine response
        if weighted_severity > 0.8:
            urgency = "CRITICAL"
        elif weighted_severity > 0.5:
            urgency = "HIGH"
        elif weighted_severity > 0.2:
            urgency="MODERATE"
        else:
            urgency = "LOW"

        # Select action based on personality patterns
        available_actions = personality.behavioral_patterns
        selected_action = random.choice(available_actions)

        return {
            "ship_name": ship_name,
            "personality_type": personality.base_type.value,
            "anomaly_type": anomaly_type,
            "weighted_severity": weighted_severity,
            "urgency": urgency,
            "recommended_action": selected_action,
            "risk_tolerance_factor": personality.risk_tolerance,
        }


# ===== NARRATIVE CONTINUITY ACROSS FORKS =====

class NarrativeContinuityAcrossForks:
    """Maintain narrative coherence across micro-forks"""

    def __init__(self, forking_engine: MicroForkingEngine, captain_log: CaptainsLogGenerator):
        self.forking_engine = forking_engine
        self.captain_log = captain_log

    def generate_consistent_narrative(self, fork_ids: List[str]) -> Dict[str, Any]:
        """Generate narrative that makes sense across all forks"""
        forks = [self.forking_engine.forks[fid] for fid in fork_ids if fid in self.forking_engine.forks]

        if not forks:
            return {"narrative": "No forks to narrate", "coherence": 0.0}

        # Find common themes
        common_events = set()
        for fork in forks:
            common_events.update([e.split(" ")[0] for e in fork.key_events])

        # Calculate overall narrative coherence
        avg_coherence = sum(f.narrative_coherence_score for f in forks) / len(forks)

        # Generate overarching narrative
        narrative = f"""
The universe branched at this moment. {len(forks)} alternate paths unfolded.

Across all paths, certain themes emerged:
- {len(common_events)} key event types were witnessed
- Average narrative coherence: {avg_coherence:.1%}
- The fundamental nature of what occurred remained consistent

While the forks diverged in their specific manifestations, the underlying
narrative thread that binds them remains unbroken. The universe's story
continues, in all its variations.
        """

        return {
            "narrative": narrative.strip(),
            "coherence": avg_coherence,
            "fork_count": len(forks),
            "common_themes": list(common_events),
        }


# ===== GLOBAL INSTANCES =====

micro_forking = MicroForkingEngine()
dashboard_generator = DashboardMockDataGenerator()
personality_seeds = PersonalitySeeds()
captain_log = CaptainsLogGenerator()
cross_fork_analytics = CrossForkAnalytics(micro_forking)
personality_responses = PersonalityDrivenAnomalyResponse(personality_seeds)
narrative_continuity = NarrativeContinuityAcrossForks(micro_forking, captain_log)
