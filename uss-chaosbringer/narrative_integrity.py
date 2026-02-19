#!/usr/bin/env python3
"""
PHASE XXVII - NARRATIVE INTEGRITY ENGINE
Ensures federation saga remains coherent across infinite expansions.
Tracks narrative arcs, tone consistency, continuity, retroactive changes (retcons),
and predicts narrative direction for maintaining story coherence.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Set
from datetime import datetime
from enum import Enum
from uuid import uuid4
import math


class ToneType(Enum):
    """Emotional/stylistic tone of a narrative thread"""
    HEROIC = "heroic"
    TRAGIC = "tragic"
    COMEDIC = "comedic"
    EPIC = "epic"
    MYSTERIOUS = "mysterious"


class ArcStatus(Enum):
    """Status of a narrative arc"""
    PENDING = "pending"
    ACTIVE = "active"
    CLIMAX = "climax"
    RESOLUTION = "resolution"
    CONCLUDED = "concluded"
    RETCONNED = "retconned"


@dataclass
class NarrativeEvent:
    """A single event in a narrative thread"""
    event_id: str
    timestamp: float
    content: str
    tone: ToneType
    significance: float  # 0.0-1.0 importance level
    agents_involved: List[str]
    foreshadowing: List[str] = field(default_factory=list)  # IDs of events being foreshadowed
    callbacks: List[str] = field(default_factory=list)  # IDs of prior events being referenced


@dataclass
class NarrativeThread:
    """A major narrative arc in the federation saga"""
    thread_id: str
    uuid: str
    arc: str  # Name of the arc (e.g., "Rise of the Ensemble", "Constitutional Crisis")
    status: ArcStatus
    continuity_score: float  # 0.0-1.0 coherence measure
    primary_tone: ToneType
    created_at: float
    events: List[NarrativeEvent] = field(default_factory=list)
    participants: Set[str] = field(default_factory=set)
    themes: List[str] = field(default_factory=list)
    contradictions: List[Tuple[str, str]] = field(default_factory=list)  # (event_id, event_id)
    tone_drift: float = 0.0  # How much tone has deviated from primary


@dataclass
class ToneConsistencyReport:
    """Report on tone consistency across threads"""
    overall_consistency: float
    per_thread_consistency: Dict[str, float]
    tone_drift_warnings: List[str]
    drift_severity: Dict[str, float]  # thread_id -> severity


@dataclass
class ContinuityRepair:
    """A repair made to fix narrative continuity"""
    repair_id: str
    thread_id: str
    affected_events: List[str]
    repair_type: str  # "retcon", "expansion", "recontextualization"
    repair_content: str
    applied_at: float
    effectiveness: float  # 0.0-1.0 how well it fixed the issue


@dataclass
class RetconDetection:
    """Detection of a retroactive continuity change"""
    detection_id: str
    thread_id: str
    changed_event_id: str
    previous_content: str
    new_content: str
    detected_at: float
    severity: float  # 0.0-1.0 how much this breaks continuity


@dataclass
class NarrativeStatus:
    """Comprehensive status of all narrative threads"""
    timestamp: float
    total_threads: int
    active_threads: int
    overall_continuity: float
    threads_in_crisis: List[str]
    top_retcons: List[RetconDetection]
    tone_analysis: Dict[ToneType, float]  # Tone -> prevalence


class NarrativeIntegrityEngine:
    """
    Ensures narrative coherence across the federation saga.
    Tracks threads, measures tone consistency, repairs continuity breaks,
    detects retcons, and forecasts narrative direction.
    """

    def __init__(self):
        self.threads: Dict[str, NarrativeThread] = {}
        self.events: Dict[str, NarrativeEvent] = {}
        self.repairs: Dict[str, ContinuityRepair] = {}
        self.retcons: Dict[str, RetconDetection] = {}
        self.thread_counter = 0
        self.event_counter = 0
        self.repair_counter = 0
        self.retcon_counter = 0
        self.tone_history: Dict[str, List[Tuple[float, ToneType]]] = {}
        self.continuity_history: Dict[str, List[Tuple[float, float]]] = {}

    def register_thread(
        self,
        arc: str,
        primary_tone: ToneType,
        themes: Optional[List[str]] = None,
        initial_events: Optional[List[NarrativeEvent]] = None,
    ) -> str:
        """
        Register a new narrative thread/arc.

        Args:
            arc: Name of the narrative arc
            primary_tone: Primary emotional tone
            themes: List of thematic elements
            initial_events: Initial events in the thread

        Returns:
            thread_id of the created thread
        """
        self.thread_counter += 1
        thread_id = f"thread_{self.thread_counter}"
        thread_uuid = str(uuid4())

        thread = NarrativeThread(
            thread_id=thread_id,
            uuid=thread_uuid,
            arc=arc,
            status=ArcStatus.ACTIVE,
            continuity_score=1.0,
            primary_tone=primary_tone,
            created_at=datetime.now().timestamp(),
            themes=themes or [],
            events=[],
            participants=set(),
        )

        if initial_events:
            for event in initial_events:
                thread.events.append(event)
                self.events[event.event_id] = event
                thread.participants.update(event.agents_involved)

        self.threads[thread_id] = thread
        self.tone_history[thread_id] = [(datetime.now().timestamp(), primary_tone)]
        self.continuity_history[thread_id] = [(datetime.now().timestamp(), 1.0)]

        return thread_id

    def add_event_to_thread(
        self,
        thread_id: str,
        event: NarrativeEvent,
    ) -> bool:
        """Add an event to an existing thread."""
        if thread_id not in self.threads:
            return False

        thread = self.threads[thread_id]
        thread.events.append(event)
        self.events[event.event_id] = event
        thread.participants.update(event.agents_involved)

        # Update tone drift
        tone_matches = 1.0 if event.tone == thread.primary_tone else 0.0
        thread.tone_drift = self._calculate_tone_drift(thread)

        return True

    def measure_tone_consistency(self) -> ToneConsistencyReport:
        """
        Measure tone consistency across all threads.
        Returns a score 0.0-1.0 where 1.0 is perfect consistency.
        """
        if not self.threads:
            return ToneConsistencyReport(
                overall_consistency=1.0,
                per_thread_consistency={},
                tone_drift_warnings=[],
                drift_severity={},
            )

        per_thread_consistency = {}
        tone_drift_warnings = []
        drift_severity = {}

        for thread_id, thread in self.threads.items():
            if not thread.events:
                per_thread_consistency[thread_id] = 1.0
                continue

            # Calculate consistency as % of events matching primary tone
            matching_events = sum(
                1 for event in thread.events
                if event.tone == thread.primary_tone
            )
            consistency = matching_events / len(thread.events)
            per_thread_consistency[thread_id] = consistency

            # Track tone drift
            drift = 1.0 - consistency
            drift_severity[thread_id] = drift

            if drift > 0.3:
                tone_drift_warnings.append(
                    f"Thread '{thread.arc}' has significant tone drift ({drift:.1%})"
                )

            thread.tone_drift = drift

        # Overall consistency
        overall = sum(per_thread_consistency.values()) / len(per_thread_consistency)

        return ToneConsistencyReport(
            overall_consistency=overall,
            per_thread_consistency=per_thread_consistency,
            tone_drift_warnings=tone_drift_warnings,
            drift_severity=drift_severity,
        )

    def repair_continuity(
        self,
        thread_id: str,
        affected_event_ids: List[str],
        repair_type: str,
        repair_content: str,
    ) -> str:
        """
        Repair a continuity break in a narrative thread.
        Can apply retcons, expansions, or recontextualizations.

        Args:
            thread_id: Thread to repair
            affected_event_ids: Events involved in the break
            repair_type: Type of repair (retcon, expansion, recontextualization)
            repair_content: Description/content of the repair

        Returns:
            repair_id
        """
        if thread_id not in self.threads:
            return ""

        self.repair_counter += 1
        repair_id = f"repair_{self.repair_counter}"

        thread = self.threads[thread_id]

        # Calculate repair effectiveness based on repair type
        if repair_type == "retcon":
            effectiveness = 0.8  # Retcons are fairly effective
        elif repair_type == "expansion":
            effectiveness = 0.9  # Expansions usually work well
        elif repair_type == "recontextualization":
            effectiveness = 0.7  # Recontextualizations are tricky
        else:
            effectiveness = 0.5

        repair = ContinuityRepair(
            repair_id=repair_id,
            thread_id=thread_id,
            affected_events=affected_event_ids,
            repair_type=repair_type,
            repair_content=repair_content,
            applied_at=datetime.now().timestamp(),
            effectiveness=effectiveness,
        )

        self.repairs[repair_id] = repair

        # Update thread continuity score
        original_score = thread.continuity_score
        thread.continuity_score = min(1.0, original_score + (effectiveness * 0.1))

        self.continuity_history[thread_id].append(
            (datetime.now().timestamp(), thread.continuity_score)
        )

        return repair_id

    def detect_retcon(
        self,
        thread_id: str,
        event_id: str,
        previous_content: str,
        new_content: str,
    ) -> str:
        """
        Detect and register a retroactive continuity change (retcon).

        Args:
            thread_id: Thread affected
            event_id: Event being retconned
            previous_content: Original event content
            new_content: Revised event content

        Returns:
            detection_id
        """
        if thread_id not in self.threads or event_id not in self.events:
            return ""

        self.retcon_counter += 1
        detection_id = f"retcon_{self.retcon_counter}"

        # Calculate severity based on content similarity
        severity = self._calculate_content_divergence(
            previous_content, new_content
        )

        detection = RetconDetection(
            detection_id=detection_id,
            thread_id=thread_id,
            changed_event_id=event_id,
            previous_content=previous_content,
            new_content=new_content,
            detected_at=datetime.now().timestamp(),
            severity=severity,
        )

        self.retcons[detection_id] = detection

        # Update thread continuity (retcons hurt it)
        thread = self.threads[thread_id]
        thread.continuity_score = max(
            0.0, thread.continuity_score - (severity * 0.2)
        )

        self.continuity_history[thread_id].append(
            (datetime.now().timestamp(), thread.continuity_score)
        )

        return detection_id

    def forecast_arc(self, thread_id: str) -> Dict[str, any]:
        """
        Forecast the likely narrative direction of a thread.
        Analyzes events, tone, themes, and continuity to predict arc resolution.

        Args:
            thread_id: Thread to forecast

        Returns:
            Dictionary with forecast info
        """
        if thread_id not in self.threads:
            return {}

        thread = self.threads[thread_id]

        if not thread.events:
            return {
                "confidence": 0.0,
                "predicted_status": ArcStatus.PENDING,
                "likely_resolution": "Unknown - no events yet",
                "tone_projection": None,
            }

        # Analyze event significance trend
        recent_events = thread.events[-min(5, len(thread.events)):]
        avg_recent_significance = sum(
            e.significance for e in recent_events
        ) / len(recent_events)

        # Predict next arc status
        if avg_recent_significance > 0.7:
            predicted_status = ArcStatus.CLIMAX
            tone_projection = "approaching climax"
        elif thread.status == ArcStatus.CLIMAX:
            predicted_status = ArcStatus.RESOLUTION
            tone_projection = "moving toward resolution"
        elif thread.status == ArcStatus.RESOLUTION:
            predicted_status = ArcStatus.CONCLUDED
            tone_projection = "reaching conclusion"
        else:
            predicted_status = ArcStatus.ACTIVE
            tone_projection = "continuing active narrative"

        # Confidence based on continuity and event count
        confidence = (thread.continuity_score * 0.6) + (
            min(len(thread.events) / 10.0, 1.0) * 0.4
        )

        # Determine likely resolution tone
        if thread.status == ArcStatus.CLIMAX:
            if thread.primary_tone == ToneType.TRAGIC:
                resolution = "toward tragedy/sacrifice"
            elif thread.primary_tone == ToneType.HEROIC:
                resolution = "toward triumph/victory"
            elif thread.primary_tone == ToneType.COMEDIC:
                resolution = "toward comedic payoff"
            elif thread.primary_tone == ToneType.EPIC:
                resolution = "toward epic climax"
            else:
                resolution = "toward revelation/mystery resolved"
        else:
            resolution = f"continuing {thread.primary_tone.value} tone"

        # Foreshadowing analysis
        foreshadowing_count = sum(
            len(event.foreshadowing) for event in thread.events
        )
        callback_count = sum(
            len(event.callbacks) for event in thread.events
        )

        return {
            "thread_id": thread_id,
            "arc": thread.arc,
            "confidence": confidence,
            "current_status": thread.status.value,
            "predicted_status": predicted_status.value,
            "event_count": len(thread.events),
            "avg_recent_significance": avg_recent_significance,
            "tone_projection": tone_projection,
            "likely_resolution": resolution,
            "foreshadowing_setup_count": foreshadowing_count,
            "callback_count": callback_count,
            "continuity_score": thread.continuity_score,
        }

    def get_narrative_status(self) -> NarrativeStatus:
        """
        Get comprehensive status report of all narrative threads.

        Returns:
            NarrativeStatus with full analysis
        """
        if not self.threads:
            return NarrativeStatus(
                timestamp=datetime.now().timestamp(),
                total_threads=0,
                active_threads=0,
                overall_continuity=1.0,
                threads_in_crisis=[],
                top_retcons=[],
                tone_analysis={},
            )

        timestamp = datetime.now().timestamp()
        total_threads = len(self.threads)
        active_threads = sum(
            1 for t in self.threads.values()
            if t.status == ArcStatus.ACTIVE
        )

        # Overall continuity
        overall_continuity = sum(
            t.continuity_score for t in self.threads.values()
        ) / total_threads

        # Threads in crisis (continuity < 0.5)
        threads_in_crisis = [
            t.arc for t in self.threads.values()
            if t.continuity_score < 0.5
        ]

        # Top retcons by severity
        sorted_retcons = sorted(
            self.retcons.values(),
            key=lambda r: r.severity,
            reverse=True,
        )
        top_retcons = sorted_retcons[:5]

        # Tone analysis
        tone_counts: Dict[ToneType, int] = {tone: 0 for tone in ToneType}
        for thread in self.threads.values():
            tone_counts[thread.primary_tone] += 1

        tone_analysis = {
            tone.value: count / total_threads
            for tone, count in tone_counts.items()
        }

        return NarrativeStatus(
            timestamp=timestamp,
            total_threads=total_threads,
            active_threads=active_threads,
            overall_continuity=overall_continuity,
            threads_in_crisis=threads_in_crisis,
            top_retcons=top_retcons,
            tone_analysis=tone_analysis,
        )

    # Helper methods

    def _calculate_tone_drift(self, thread: NarrativeThread) -> float:
        """Calculate how much a thread's tone has drifted from primary tone."""
        if not thread.events:
            return 0.0

        matching = sum(
            1 for event in thread.events
            if event.tone == thread.primary_tone
        )
        return 1.0 - (matching / len(thread.events))

    def _calculate_content_divergence(
        self, content1: str, content2: str
    ) -> float:
        """
        Calculate how much two content strings diverge.
        Simple implementation using string similarity.
        Returns 0.0-1.0 where 1.0 is completely different.
        """
        if content1 == content2:
            return 0.0

        if not content1 or not content2:
            return 1.0

        # Simple Levenshtein-inspired distance
        common_chars = sum(
            1 for c1, c2 in zip(content1, content2)
            if c1 == c2
        )
        max_len = max(len(content1), len(content2))
        similarity = common_chars / max_len if max_len > 0 else 0.0

        return 1.0 - similarity

    def update_thread_status(
        self, thread_id: str, new_status: ArcStatus
    ) -> bool:
        """Update the status of a narrative thread."""
        if thread_id not in self.threads:
            return False

        self.threads[thread_id].status = new_status
        return True

    def get_thread_details(self, thread_id: str) -> Optional[NarrativeThread]:
        """Get full details of a narrative thread."""
        return self.threads.get(thread_id)

    def get_all_threads(self) -> List[NarrativeThread]:
        """Get all registered narrative threads."""
        return list(self.threads.values())

    def analyze_contradiction(
        self, thread_id: str, event_id_1: str, event_id_2: str
    ) -> Dict[str, any]:
        """Analyze a potential contradiction between two events."""
        if thread_id not in self.threads:
            return {}

        thread = self.threads[thread_id]
        event1 = self.events.get(event_id_1)
        event2 = self.events.get(event_id_2)

        if not event1 or not event2:
            return {}

        # Calculate contradiction severity
        severity = abs(event1.significance - event2.significance) * 0.5

        # Check for direct callback relationships
        is_callback = event_id_1 in event2.callbacks or event_id_2 in event1.callbacks

        # Check agent involvement overlap
        agent_overlap = len(
            set(event1.agents_involved) & set(event2.agents_involved)
        )

        return {
            "event_1": event_id_1,
            "event_2": event_id_2,
            "contradiction_severity": severity,
            "is_intentional_callback": is_callback,
            "shared_agents": agent_overlap,
            "temporal_order": "chronological" if event1.timestamp < event2.timestamp else "reverse",
        }
