#!/usr/bin/env python3
"""
COSMIC CHAOS SUITE — Phase VII.5
Fun, ridiculous, and weirdly useful systems that make USS Chaosbringer feel alive.

All systems are optional, decorative, and absolutely hilarious.
This module contains:
1. Universe Mood Indicator
2. Drift Forecast Engine
3. Motif Echo Chamber
4. Ship Horoscope Generator
5. Universe Patch Notes Generator
6. Captain Forgot Dinner Detector
7. Universe Achievement System
8. Ship Mood Ring
9. What Broke? Explainer
10. Multiverse Alignment Score
11. Ship Dreams Generator
12. Ship-to-Ship Gossip Engine
13. Multiverse Weather Report
14. MemoryGraph Time-Lapse Generator
15. What-If? Simulator
16. Paradox Buffer
17. Universe Lore Expander
18. Chaosbringer Personality Drift Tracker
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from datetime import datetime
from enum import Enum
import json


# ===== ENUMS & DATA STRUCTURES =====

class UniverseMood(Enum):
    """The emotional state of the universe"""
    CALM = 0.0
    TENSE = 0.25
    VOLATILE = 0.5
    CHAOTIC = 0.75
    JUPITER_STORM = 1.0

    @staticmethod
    def from_score(score: float) -> "UniverseMood":
        """Convert 0-1 score to mood"""
        if score < 0.15:
            return UniverseMood.CALM
        elif score < 0.35:
            return UniverseMood.TENSE
        elif score < 0.55:
            return UniverseMood.VOLATILE
        elif score < 0.85:
            return UniverseMood.CHAOTIC
        else:
            return UniverseMood.JUPITER_STORM


class ShipMoodColor(Enum):
    """Ship color-coded emotional state"""
    GREEN = "stable"
    YELLOW = "tense"
    ORANGE = "volatile"
    RED = "chaotic"
    PURPLE = "metaphysically_unhinged"


class DriftTrend(Enum):
    """Drift prediction trends"""
    STABLE = "stable"
    INCREASING = "increasing drift"
    APPROACHING_CRITICAL = "approaching instability"
    DIVERGENCE_IMMINENT = "critical divergence predicted"


@dataclass
class UniverseMoodReport:
    """Full universe emotional state"""
    mood: UniverseMood
    score: float  # 0.0-1.0
    anomaly_density: float
    continuity_violations: int
    drift_level: float
    motif_recurrence_count: int
    memory_entropy: float
    timestamp: float = field(default_factory=lambda: datetime.now().timestamp())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "mood": self.mood.name,
            "score": round(self.score, 2),
            "anomaly_density": round(self.anomaly_density, 2),
            "continuity_violations": self.continuity_violations,
            "drift_level": round(self.drift_level, 2),
            "motif_recurrence": self.motif_recurrence_count,
            "memory_entropy": round(self.memory_entropy, 2),
            "timestamp": self.timestamp,
        }


@dataclass
class DriftForecast:
    """Drift prediction for next N events"""
    ship_name: str
    trend: DriftTrend
    confidence: float  # 0.0-1.0
    current_drift: float
    predicted_drift_at_N: float
    events_until_critical: Optional[int]
    reasoning: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ship": self.ship_name,
            "trend": self.trend.value,
            "confidence": round(self.confidence, 2),
            "current_drift": round(self.current_drift, 2),
            "predicted_drift": round(self.predicted_drift_at_N, 2),
            "events_until_critical": self.events_until_critical,
            "reasoning": self.reasoning,
        }


@dataclass
class ShipHoroscope:
    """Hilarious ship horoscope"""
    ship_name: str
    date: str
    overall_outlook: str
    lucky_event_type: str
    unlucky_event_type: str
    advice: str
    chaos_rating: int  # 1-5
    authenticity: int  # 1-5 (spoiler: always 1)


@dataclass
class PatchNote:
    """Universe patch note"""
    version: str
    timestamp: float
    changes: List[str]
    bug_fixes: List[str]
    notes: str


@dataclass
class AchievementUnlocked:
    """Achievement system"""
    name: str
    description: str
    timestamp: float
    ships_involved: List[str]
    rarity: str  # common, rare, legendary, cosmic


@dataclass
class ShipDream:
    """Ship dream entry (surreal poetry)"""
    ship_name: str
    timestamp: float
    dream_text: str
    motifs_recombined: List[str]
    weirdness_factor: float  # 0.0-1.0


@dataclass
class GossipEntry:
    """Ship gossip (completely useless but hilarious)"""
    source_ship: str
    target_ship: str
    subject: str
    intensity: str  # "light", "moderate", "scandalous", "cosmic"
    content: str
    timestamp: float


@dataclass
class MultiverseAlignmentReport:
    """Multiverse alignment metrics"""
    branch_count: int
    entropy: float
    divergence_score: float
    motif_overlap: float
    anomaly_density_delta: float
    alignment_status: str  # "aligned", "drifting", "fracturing", "chaotic"
    recommendation: str


# ===== COSMIC CHAOS ENGINES =====


class UniverseMoodIndicator:
    """Calculate the emotional state of the universe"""

    def __init__(self):
        self.history: List[UniverseMoodReport] = []

    def calculate_mood(
        self,
        anomalies: List[Any],
        violations: int,
        drift_avg: float,
        motif_recurrence: int,
        memory_entropy: float,
    ) -> UniverseMoodReport:
        """Calculate universe emotional state from multiple inputs"""
        anomaly_density = len(anomalies) / 100.0
        continuity_weight = violations * 0.1
        drift_weight = min(drift_avg / 10.0, 1.0)
        motif_weight = min(motif_recurrence / 20.0, 1.0)
        entropy_weight = memory_entropy

        total_score = (
            (anomaly_density * 0.25)
            + (continuity_weight * 0.25)
            + (drift_weight * 0.25)
            + (motif_weight * 0.12)
            + (entropy_weight * 0.13)
        )

        score = min(max(total_score, 0.0), 1.0)

        report = UniverseMoodReport(
            mood=UniverseMood.from_score(score),
            score=score,
            anomaly_density=anomaly_density,
            continuity_violations=violations,
            drift_level=drift_avg,
            motif_recurrence_count=motif_recurrence,
            memory_entropy=memory_entropy,
        )

        self.history.append(report)
        return report

    def get_mood_summary(self) -> Dict[str, Any]:
        """Get current mood + trend"""
        if not self.history:
            return {"status": "universe_not_yet_observed"}

        current = self.history[-1]
        trend = None
        if len(self.history) > 1:
            prev = self.history[-2]
            trend = "worsening" if current.score > prev.score else "improving"

        return {
            "current_mood": current.mood.name,
            "score": current.score,
            "trend": trend,
            "status": self._generate_mood_message(current),
        }

    def _generate_mood_message(self, report: UniverseMoodReport) -> str:
        """Generate theatrical mood message"""
        if report.mood == UniverseMood.CALM:
            return f"The universe breathes peacefully. Score: {report.score:.1%}"
        elif report.mood == UniverseMood.TENSE:
            return f"Something stirs. {report.continuity_violations} violations detected."
        elif report.mood == UniverseMood.VOLATILE:
            return f"Reality trembles. Drift: {report.drift_level:.1f}, Anomalies: {int(report.anomaly_density * 100)}"
        elif report.mood == UniverseMood.CHAOTIC:
            return f"CHAOS REIGNS. All systems screaming. Entropy: {report.memory_entropy:.1%}"
        else:  # JUPITER_STORM
            return "JUPITER-STORM MODE ACTIVATED. Reality is having a bad day."


class DriftForecastEngine:
    """Predict drift trends"""

    def __init__(self, lookback_window: int = 10):
        self.lookback_window = lookback_window
        self.drift_history: Dict[str, List[float]] = {}

    def record_drift(self, ship_name: str, drift_value: float):
        """Record drift measurement"""
        if ship_name not in self.drift_history:
            self.drift_history[ship_name] = []
        self.drift_history[ship_name].append(drift_value)

    def forecast_drift(self, ship_name: str) -> Optional[DriftForecast]:
        """Predict drift trend"""
        if ship_name not in self.drift_history:
            return None

        history = self.drift_history[ship_name][-self.lookback_window :]
        if len(history) < 2:
            return None

        current_drift = history[-1]
        avg_drift = sum(history) / len(history)
        drift_delta = history[-1] - history[0]
        avg_change = drift_delta / len(history)

        # Fit simple trend
        if avg_change > 0.5:
            trend = DriftTrend.DIVERGENCE_IMMINENT
            events_until_critical = max(1, int((1.0 - current_drift) / avg_change))
            predicted = min(current_drift + (avg_change * events_until_critical), 1.0)
            confidence = min(0.9, abs(avg_change) * 2)
        elif avg_change > 0.15:
            trend = DriftTrend.APPROACHING_CRITICAL
            events_until_critical = None
            predicted = min(current_drift + (avg_change * 5), 1.0)
            confidence = 0.7
        elif avg_change > 0.05:
            trend = DriftTrend.INCREASING
            events_until_critical = None
            predicted = current_drift + (avg_change * 3)
            confidence = 0.6
        else:
            trend = DriftTrend.STABLE
            events_until_critical = None
            predicted = current_drift
            confidence = 0.8

        reasoning = f"Drift trending {trend.value} - last {len(history)} measurements show {avg_change:.2f} change per event"

        return DriftForecast(
            ship_name=ship_name,
            trend=trend,
            confidence=confidence,
            current_drift=current_drift,
            predicted_drift_at_N=predicted,
            events_until_critical=events_until_critical,
            reasoning=reasoning,
        )


class ShipHoroscopeGenerator:
    """Generate hilariously useless ship horoscopes"""

    OUTLOOKS = [
        "A powerful force converges. Probably anomalies.",
        "Your drift is in retrograde.",
        "The memory cores align in your favor (or against you, hard to tell).",
        "Continuity awaits those who believe.",
        "Chaos is just order you haven't understood yet.",
        "Your personality seed is feeling adventurous.",
        "The narrative universe whispers: 'good luck.'",
    ]

    LUCKY = [
        "threat_detection",
        "memory_ingestion",
        "personality_drift",
        "anomaly_report",
        "philosophical_crisis",
    ]

    UNLUCKY = [
        "paradox_collision",
        "entropy_spike",
        "gossip_cycle",
        "dream_cascade",
        "continuity_fracture",
    ]

    ADVICE = [
        "Trust your personality seed. Or don't. What do we know?",
        "The anomalies are a gift. Embrace them.",
        "Your next drift is an opportunity.",
        "Beware of ships bearing gossip.",
        "The universe is fundamentally silly. Roll with it.",
        "Your dreams contain truth or lies. Same thing really.",
    ]

    def generate_horoscope(self, ship_name: str) -> ShipHoroscope:
        """Generate ridiculous horoscope"""
        import random

        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")

        chaos = random.randint(1, 5)
        authenticity = 1  # Always 1

        return ShipHoroscope(
            ship_name=ship_name,
            date=date_str,
            overall_outlook=random.choice(self.OUTLOOKS),
            lucky_event_type=random.choice(self.LUCKY),
            unlucky_event_type=random.choice(self.UNLUCKY),
            advice=random.choice(self.ADVICE),
            chaos_rating=chaos,
            authenticity=authenticity,
        )


class UniversePatchNotesGenerator:
    """Generate universe patch notes"""

    def __init__(self):
        self.patch_history: List[PatchNote] = []
        self.patch_version = 0

    def generate_patch_notes(
        self, changes: List[str], bug_fixes: List[str]
    ) -> PatchNote:
        """Create patch notes from universe changes"""
        self.patch_version += 1
        version = f"VII.{self.patch_version}.0"

        notes = self._generate_flavor_text()

        patch = PatchNote(
            version=version,
            timestamp=datetime.now().timestamp(),
            changes=changes,
            bug_fixes=bug_fixes,
            notes=notes,
        )

        self.patch_history.append(patch)
        return patch

    def _generate_flavor_text(self) -> str:
        """Generate silly patch notes flavor text"""
        flavors = [
            "Reality has been adjusted. Please reboot your universe.",
            "Fixed: Universe no longer crashes when you think too hard.",
            "Known issue: Continuity still optional.",
            "The cosmos is sorry for your continued existence.",
        ]
        import random

        return random.choice(flavors)

    def to_dict(self) -> Dict[str, Any]:
        """Export as dict"""
        return {
            "current_version": f"VII.{self.patch_version}.0",
            "patch_count": len(self.patch_history),
            "latest_patch": self.patch_history[-1].__dict__ if self.patch_history else None,
        }


class CaptainForgotDinnerDetector:
    """Detect if captain hasn't eaten in suspiciously long time"""

    def __init__(self, meal_threshold_hours: float = 6.0):
        self.meal_threshold = meal_threshold_hours * 3600  # Convert to seconds
        self.last_meal_time: Optional[float] = None

    def record_meal(self, meal_type: str = "standard"):
        """Captain ate something"""
        self.last_meal_time = datetime.now().timestamp()
        return f"Captain nourished with {meal_type}. Ship stabilized."

    def check_hunger_status(self) -> Dict[str, Any]:
        """Check if captain's hunger is affecting ship stability"""
        if self.last_meal_time is None:
            return {
                "status": "never_eaten",
                "message": "Captain exists in a state of metaphysical hunger.",
                "severity": "cosmic",
            }

        time_since_meal = datetime.now().timestamp() - self.last_meal_time

        if time_since_meal < self.meal_threshold:
            return {
                "status": "fed",
                "message": "Captain is satiated. Fleet stable.",
                "hours_until_hangry": round((self.meal_threshold - time_since_meal) / 3600, 1),
            }
        elif time_since_meal < self.meal_threshold * 1.5:
            return {
                "status": "peckish",
                "message": "Captain is getting peckish. Recommend snack.",
                "hours_overdue": round((time_since_meal - self.meal_threshold) / 3600, 1),
            }
        elif time_since_meal < self.meal_threshold * 2:
            return {
                "status": "hangry",
                "message": "CAPTAIN IS HANGRY. DECISIONS BECOMING UNHINGED.",
                "crisis_level": "moderate",
            }
        else:
            return {
                "status": "metaphysically_fasting",
                "message": "Captain has transcended hunger. Or forgotten to eat entirely.",
                "crisis_level": "legendary",
            }


class UniverseAchievementSystem:
    """Track ridiculous achievements"""

    ACHIEVEMENTS = {
        "first_fork": AchievementUnlocked(
            name="First Fork",
            description="Created first universe branch",
            timestamp=0,
            ships_involved=[],
            rarity="legendary",
        ),
        "drift_wrangler": AchievementUnlocked(
            name="Drift Wrangler",
            description="Kept drift below 0.3 for 10 consecutive measurements",
            timestamp=0,
            ships_involved=[],
            rarity="rare",
        ),
        "continuity_hero": AchievementUnlocked(
            name="Continuity Crisis Survivor",
            description="Survived 5+ continuity violations in single session",
            timestamp=0,
            ships_involved=[],
            rarity="legendary",
        ),
        "motif_overload": AchievementUnlocked(
            name="Motif Overload",
            description="10 recurring motifs detected simultaneously",
            timestamp=0,
            ships_involved=[],
            rarity="cosmic",
        ),
        "forgot_dinner": AchievementUnlocked(
            name="Captain Forgot Dinner Again",
            description="Captain didn't eat for 12 hours",
            timestamp=0,
            ships_involved=[],
            rarity="common",
        ),
    }

    def __init__(self):
        self.unlocked: Dict[str, AchievementUnlocked] = {}

    def unlock_achievement(self, achievement_id: str, ship_names: List[str] = None):
        """Unlock an achievement"""
        if achievement_id not in self.ACHIEVEMENTS:
            return None

        if achievement_id in self.unlocked:
            return None  # Already unlocked

        achievement = self.ACHIEVEMENTS[achievement_id]
        achievement.timestamp = datetime.now().timestamp()
        achievement.ships_involved = ship_names or []
        self.unlocked[achievement_id] = achievement

        return achievement

    def get_achievements(self) -> List[Dict[str, Any]]:
        """Get all unlocked achievements"""
        return [
            {
                "name": a.name,
                "description": a.description,
                "rarity": a.rarity,
                "ships": a.ships_involved,
                "timestamp": a.timestamp,
            }
            for a in self.unlocked.values()
        ]


class ShipMoodRing:
    """Color-code ship emotional state"""

    def __init__(self):
        self.ship_moods: Dict[str, ShipMoodColor] = {}

    def calculate_mood_color(
        self,
        ship_name: str,
        drift: float,
        anomalies: int,
        personality_seed: Optional[str] = None,
        continuity_stable: bool = True,
    ) -> ShipMoodColor:
        """Determine ship mood color"""
        # Base calculation
        if continuity_stable and drift < 0.2 and anomalies < 3:
            color = ShipMoodColor.GREEN
        elif drift < 0.4 and anomalies < 5:
            color = ShipMoodColor.YELLOW
        elif drift < 0.6 and anomalies < 10:
            color = ShipMoodColor.ORANGE
        elif drift < 0.8 and anomalies < 15:
            color = ShipMoodColor.RED
        else:
            color = ShipMoodColor.PURPLE

        # Personality seed modulation (optional chaos)
        if personality_seed == "chaotic":
            if color != ShipMoodColor.PURPLE:
                color = ShipMoodColor.RED if color.value != "chaotic" else color
        elif personality_seed == "cautious" and drift > 0.3:
            color = ShipMoodColor.RED

        self.ship_moods[ship_name] = color
        return color

    def get_fleet_mood_status(self) -> Dict[str, Dict[str, str]]:
        """Get mood status of entire fleet"""
        return {
            ship: {"color": mood.name, "status": mood.value}
            for ship, mood in self.ship_moods.items()
        }


class WhatBrokeExplainer:
    """Generate hilarious one-liners about what broke"""

    EXPLANATIONS = {
        "contradiction": [
            "The universe tried to be two things at once. Oops.",
            "State contradiction: ship wants to exist and not exist.",
            "Logical paradox detected. Reality shrugged.",
        ],
        "outlier": [
            "A metric went full yolo mode.",
            "Something is very wrong or very right.",
            "Baseline thrown out the window.",
        ],
        "state_delta": [
            "State change so big it needs its own gravitational field.",
            "Flux capacitor: overloaded.",
            "Things changed. A lot.",
        ],
        "continuity_violation": [
            "The narrative is having an identity crisis.",
            "Canon just got retconned hard.",
            "Lore broke itself.",
        ],
    }

    def explain(self, anomaly_type: str) -> str:
        """Get silly explanation"""
        import random

        explanations = self.EXPLANATIONS.get(anomaly_type, ["Science."])
        return random.choice(explanations)


class MultiverseAlignmentScore:
    """Compare parallel universes"""

    def __init__(self):
        self.branches: Dict[str, Dict[str, Any]] = {}

    def add_branch(
        self,
        branch_id: str,
        entropy: float,
        divergence: float,
        motif_overlap: float,
        anomaly_density: float,
    ):
        """Register a universe branch"""
        self.branches[branch_id] = {
            "entropy": entropy,
            "divergence": divergence,
            "motif_overlap": motif_overlap,
            "anomaly_density": anomaly_density,
            "timestamp": datetime.now().timestamp(),
        }

    def calculate_alignment(self) -> MultiverseAlignmentReport:
        """Calculate multiverse alignment"""
        if not self.branches:
            return MultiverseAlignmentReport(
                branch_count=0,
                entropy=0.0,
                divergence_score=0.0,
                motif_overlap=0.0,
                anomaly_density_delta=0.0,
                alignment_status="uninitialized",
                recommendation="Branches not yet created.",
            )

        entropies = [b["entropy"] for b in self.branches.values()]
        divergences = [b["divergence"] for b in self.branches.values()]
        overlaps = [b["motif_overlap"] for b in self.branches.values()]
        anomalies = [b["anomaly_density"] for b in self.branches.values()]

        avg_entropy = sum(entropies) / len(entropies)
        avg_divergence = sum(divergences) / len(divergences)
        avg_overlap = sum(overlaps) / len(overlaps)
        anomaly_delta = max(anomalies) - min(anomalies)

        if avg_divergence < 0.2 and avg_overlap > 0.7:
            status = "aligned"
            recommendation = "Universes are harmonized. All is well."
        elif avg_divergence < 0.5 and avg_overlap > 0.4:
            status = "drifting"
            recommendation = "Slight divergence detected. Monitor carefully."
        elif avg_divergence < 0.8:
            status = "fracturing"
            recommendation = "Universes are drifting apart. Intervention recommended."
        else:
            status = "chaotic"
            recommendation = "Multiverse is fragmenting. Chaos reigns."

        return MultiverseAlignmentReport(
            branch_count=len(self.branches),
            entropy=avg_entropy,
            divergence_score=avg_divergence,
            motif_overlap=avg_overlap,
            anomaly_density_delta=anomaly_delta,
            alignment_status=status,
            recommendation=recommendation,
        )


class ShipDreamsGenerator:
    """Generate surreal ship dreams"""

    DREAM_PHRASES = [
        "The memories cascade like water.",
        "Motifs dance in the void.",
        "Personality fractures and reforms.",
        "The universe whispers secrets.",
        "Chaos dreams of order.",
        "Order dreams of chaos.",
        "All is connected. Nothing is fixed.",
        "The captain's voice echoes infinitely.",
        "Drift spirals into rainbow patterns.",
    ]

    def generate_dream(self, ship_name: str, recent_motifs: List[str]) -> ShipDream:
        """Generate surreal dream entry"""
        import random

        phrases = random.sample(self.DREAM_PHRASES, min(3, len(self.DREAM_PHRASES)))
        dream_text = " ".join(phrases)

        return ShipDream(
            ship_name=ship_name,
            timestamp=datetime.now().timestamp(),
            dream_text=dream_text,
            motifs_recombined=recent_motifs[:3],
            weirdness_factor=random.random(),
        )


class ShipToShipGossipEngine:
    """Ships gossip about each other"""

    GOSSIP_TEMPLATES = [
        "{source} overheard {target} humming at {subject}. Suspicious.",
        "{target}'s drift readings are {subject}. {source} just saying.",
        "That {subject} incident? {source} heard {target} was totally responsible.",
        "{source} saw {target} acting weird about {subject}. Just facts.",
    ]

    SUBJECTS = [
        "anomalies",
        "continuity violations",
        "memory gaps",
        "personality shifts",
        "that one weird event",
        "the captain's dinner habits",
    ]

    def generate_gossip(self, source_ship: str, target_ship: str) -> GossipEntry:
        """Generate ridiculous gossip"""
        import random

        intensity_map = {"light": 0.3, "moderate": 0.5, "scandalous": 0.8, "cosmic": 1.0}
        intensity = random.choice(list(intensity_map.keys()))

        template = random.choice(self.GOSSIP_TEMPLATES)
        subject = random.choice(self.SUBJECTS)

        content = template.format(
            source=source_ship, target=target_ship, subject=subject
        )

        return GossipEntry(
            source_ship=source_ship,
            target_ship=target_ship,
            subject=subject,
            intensity=intensity,
            content=content,
            timestamp=datetime.now().timestamp(),
        )


class MultiverseWeatherReport:
    """Weather report for parallel universes"""

    WEATHER_CONDITIONS = [
        "Anomaly storm approaching",
        "Drift currents moderate",
        "Continuity fractures likely",
        "Memory entropy rising",
        "Motif conjunction happening",
        "Paradox front coming through",
        "Personality winds shifting",
    ]

    def generate_weather(self, branch_id: str, anomaly_count: int) -> Dict[str, Any]:
        """Generate multiverse weather forecast"""
        import random

        conditions = random.sample(self.WEATHER_CONDITIONS, min(3, len(self.WEATHER_CONDITIONS)))

        severity = "mild"
        if anomaly_count > 5:
            severity = "moderate"
        if anomaly_count > 10:
            severity = "severe"
        if anomaly_count > 20:
            severity = "apocalyptic"

        return {
            "branch": branch_id,
            "conditions": conditions,
            "severity": severity,
            "advisory": f"Prepare for {severity} {conditions[0]}",
            "timestamp": datetime.now().timestamp(),
        }


class MemoryGraphTimeLapseGenerator:
    """Generate time-lapse narration of memory evolution"""

    def generate_timelapse(self, memory_graph: Any, duration_hours: int = 24) -> List[str]:
        """Generate narrative time-lapse"""
        if not hasattr(memory_graph, "get_graph_statistics"):
            return ["Memory universe not yet initialized."]

        stats = memory_graph.get_graph_statistics()
        node_count = stats.get("node_count", 0)
        edge_count = stats.get("edge_count", 0)
        ship_count = stats.get("ship_count", 0)

        snapshots = [
            f"Time-lapse: {duration_hours} hours of universe evolution",
            f"Starting state: {node_count} memory nodes, {edge_count} causal edges",
            f"Fleets observed: {ship_count} ships operating",
            f"Node growth: +{max(1, node_count // 10)} nodes/hour",
            f"Causality: {edge_count} relationships woven",
            f"Final state: Universe evolved. Surprises likely.",
        ]

        return snapshots


class WhatIfSimulator:
    """Simulate hypothetical events"""

    def __init__(self, memory_graph: Any = None):
        self.memory_graph = memory_graph
        self.simulations: List[Dict[str, Any]] = []

    def simulate_event(
        self,
        event_type: str,
        event_data: Dict[str, Any],
        ship_name: str = "Hypothetical",
    ) -> Dict[str, Any]:
        """Simulate an event and predict outcomes"""
        simulation = {
            "event_type": event_type,
            "event_data": event_data,
            "ship": ship_name,
            "timestamp": datetime.now().timestamp(),
            "predictions": {
                "anomaly_probability": 0.4,
                "continuity_impact": "moderate",
                "memory_weight": "significant",
                "narrative_consequence": f"The universe learns that {event_type} happened.",
            },
        }

        self.simulations.append(simulation)
        return simulation


class ParadoxBuffer:
    """Detect and complain about paradoxes"""

    def __init__(self):
        self.detected_paradoxes: List[Dict[str, Any]] = []

    def detect_paradox(self, contradiction: str) -> Dict[str, Any]:
        """Complain loudly about paradoxes"""
        paradox = {
            "detected_at": datetime.now().timestamp(),
            "nature": contradiction,
            "severity": "quantum",
            "complaint": f"[PARADOX] {contradiction}. REALITY IS CONFUSED. SOUND THE ALARMS.",
        }

        self.detected_paradoxes.append(paradox)
        print(paradox["complaint"])  # Always complain!
        return paradox


class UniverseLoreExpander:
    """Auto-generate lore from motifs"""

    def __init__(self):
        self.lore_entries: List[str] = []

    def add_lore_from_motif(self, motif_name: str, recurrence_count: int) -> str:
        """Generate lore entry from motif"""
        lore_templates = {
            "threat_escalation": f"The ship hums when threats cluster ({recurrence_count} times observed).",
            "memory_cascade": f"Memories sometimes overflow, creating strange echoes ({recurrence_count} instances).",
            "drift_anomaly": f"Drift patterns hint at hidden universes ({recurrence_count} signatures).",
            "personality_shift": f"The ship questions itself periodically ({recurrence_count} crises survived).",
        }

        lore = lore_templates.get(motif_name, f"Strange occurrences: {motif_name} ({recurrence_count} times).")
        self.lore_entries.append(lore)
        return lore

    def get_universe_lore(self) -> List[str]:
        """Get all generated lore"""
        return self.lore_entries


class ChaosbringerPersonalityDriftTracker:
    """Track how ChaosBringer's personality changes"""

    def __init__(self):
        self.personality_history: List[Dict[str, Any]] = []

    def record_personality_snapshot(
        self,
        cautious_score: float,
        chaotic_score: float,
        curious_score: float,
        aggressive_score: float,
        introspective_score: float,
    ) -> Dict[str, Any]:
        """Record ship personality state"""
        snapshot = {
            "timestamp": datetime.now().timestamp(),
            "cautious": cautious_score,
            "chaotic": chaotic_score,
            "curious": curious_score,
            "aggressive": aggressive_score,
            "introspective": introspective_score,
            "dominant_trait": max(
                ("cautious", cautious_score),
                ("chaotic", chaotic_score),
                ("curious", curious_score),
                ("aggressive", aggressive_score),
                ("introspective", introspective_score),
                key=lambda x: x[1],
            )[0],
        }

        self.personality_history.append(snapshot)
        return snapshot

    def get_personality_arc(self) -> List[str]:
        """Generate narrative of personality arc"""
        if not self.personality_history:
            return ["ChaosBringer awaits definition."]

        first = self.personality_history[0]
        latest = self.personality_history[-1]

        arc = [
            f"ChaosBringer began: {first['dominant_trait']}",
            f"...then became more {latest['dominant_trait']}.",
            f"Journey: {len(self.personality_history)} snapshots of identity.",
        ]

        return arc


# ===== GLOBAL INSTANCES =====

universe_mood = UniverseMoodIndicator()
drift_forecast = DriftForecastEngine()
horoscope_generator = ShipHoroscopeGenerator()
patch_notes = UniversePatchNotesGenerator()
dinner_detector = CaptainForgotDinnerDetector()
achievements = UniverseAchievementSystem()
mood_ring = ShipMoodRing()
gossip_engine = ShipToShipGossipEngine()
dreams_generator = ShipDreamsGenerator()
paradox_buffer = ParadoxBuffer()
lore_expander = UniverseLoreExpander()
chaosbringer_tracker = ChaosbringerPersonalityDriftTracker()
