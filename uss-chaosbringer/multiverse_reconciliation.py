#!/usr/bin/env python3
"""
PHASE XVII - MULTIVERSE RECONCILIATION
Merges micro-forking universes with federation mainline.
Detects conflicts, resolves causality violations, preserves causal history.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple, Set
from datetime import datetime
from enum import Enum


class TimelineStatus(Enum):
    ACTIVE = "active"
    MERGED = "merged"
    ARCHIVED = "archived"
    BRANCH_PENDING = "branch_pending"


class ConflictType(Enum):
    CAUSALITY_VIOLATION = "causality_violation"
    STATE_CONTRADICTION = "state_contradiction"
    NARRATIVE_DIVERGENCE = "narrative_divergence"
    EVENT_ORDERING_CONFLICT = "event_ordering_conflict"
    DECISION_REVERSAL = "decision_reversal"
    METAPHYSICAL_MISMATCH = "metaphysical_mismatch"


@dataclass
class Timeline:
    """Represents a quantum timeline branch"""
    timeline_id: str
    status: TimelineStatus
    divergence_point: int  # Event index where this timeline branched
    parent_timeline: Optional[str] = None
    events_count: int = 0
    federation_state: Dict[str, Any] = field(default_factory=dict)
    causal_events: List[str] = field(default_factory=list)  # Event IDs in causal order
    created_at: float = field(default_factory=datetime.now().timestamp)
    probability: float = 0.5  # Likelihood of this timeline being "real"
    stability_score: float = 1.0  # How coherent is this timeline (0.0-1.0)


@dataclass
class MergeConflict:
    """Represents a contradiction between two timelines"""
    conflict_id: str
    timeline_a: str
    timeline_b: str
    conflict_type: ConflictType
    description: str
    affected_events: List[str] = field(default_factory=list)
    severity: str = "ALERT"  # INFO, WARNING, ALERT, CRITICAL
    resolution: str = ""
    resolved: bool = False
    resolution_method: str = ""  # RETAINED_A, RETAINED_B, MERGED, BRANCHED, OVERWRITTEN


@dataclass
class TimelineSnapshot:
    """Snapshot of state before merge for rollback capability"""
    timeline_id: str
    timestamp: float
    federation_state: Dict[str, Any]
    causal_chain: List[str]
    conflicts_at_time: List[str]


class MultiverseReconciliationEngine:
    """Merges micro-forking universes with federation mainline"""

    def __init__(self):
        self.timelines: Dict[str, Timeline] = {}
        self.merge_history: List[str] = []
        self.conflicts: Dict[str, MergeConflict] = {}
        self.snapshots: List[TimelineSnapshot] = []
        self._conflict_counter = 0
        self._timeline_counter = 0

    def create_timeline_branch(
        self, parent_timeline: str, divergence_point: int
    ) -> Timeline:
        """Create a new timeline branch from divergence point"""
        self._timeline_counter += 1
        timeline_id = f"timeline_{self._timeline_counter:04d}"

        timeline = Timeline(
            timeline_id=timeline_id,
            status=TimelineStatus.BRANCH_PENDING,
            divergence_point=divergence_point,
            parent_timeline=parent_timeline,
            created_at=datetime.now().timestamp(),
        )
        self.timelines[timeline_id] = timeline
        return timeline

    def detect_timeline(self, timeline_id: str, divergence_point: int) -> Timeline:
        """Detect and register a new timeline"""
        if timeline_id in self.timelines:
            return self.timelines[timeline_id]

        timeline = Timeline(
            timeline_id=timeline_id,
            status=TimelineStatus.ACTIVE,
            divergence_point=divergence_point,
            events_count=0,
            federation_state={},
            created_at=datetime.now().timestamp(),
        )
        self.timelines[timeline_id] = timeline
        return timeline

    def record_timeline_state(
        self, timeline_id: str, federation_state: Dict[str, Any], events: List[str]
    ):
        """Update timeline state and causal chain"""
        if timeline_id not in self.timelines:
            return False

        timeline = self.timelines[timeline_id]
        timeline.federation_state = federation_state
        timeline.causal_events = events
        timeline.events_count = len(events)
        return True

    def detect_conflict(
        self,
        timeline_a: str,
        timeline_b: str,
        conflict_type: ConflictType,
        description: str,
        affected_events: List[str] = None,
    ) -> str:
        """Detect conflict between two timelines"""
        if affected_events is None:
            affected_events = []

        self._conflict_counter += 1
        conflict_id = f"conflict_{self._conflict_counter:04d}"

        # Determine severity based on type
        severity = self._calculate_conflict_severity(conflict_type, len(affected_events))

        conflict = MergeConflict(
            conflict_id=conflict_id,
            timeline_a=timeline_a,
            timeline_b=timeline_b,
            conflict_type=conflict_type,
            description=description,
            affected_events=affected_events,
            severity=severity,
        )
        self.conflicts[conflict_id] = conflict
        return conflict_id

    def _calculate_conflict_severity(self, conflict_type: ConflictType, affected_count: int) -> str:
        """Calculate conflict severity based on type and scope"""
        if conflict_type == ConflictType.CAUSALITY_VIOLATION:
            return "CRITICAL"
        elif conflict_type == ConflictType.STATE_CONTRADICTION:
            return "CRITICAL" if affected_count > 5 else "ALERT"
        elif conflict_type == ConflictType.DECISION_REVERSAL:
            return "ALERT"
        else:
            return "WARNING"

    def detect_causality_conflict(
        self, timeline_a: str, timeline_b: str
    ) -> Optional[str]:
        """Detect if causal chains diverge in incompatible ways"""
        if timeline_a not in self.timelines or timeline_b not in self.timelines:
            return None

        timeline_a_obj = self.timelines[timeline_a]
        timeline_b_obj = self.timelines[timeline_b]

        # Check for branching before shared convergence
        if (
            timeline_a_obj.causal_events
            and timeline_b_obj.causal_events
        ):
            # Find first diverging event
            for i, (e_a, e_b) in enumerate(
                zip(timeline_a_obj.causal_events, timeline_b_obj.causal_events)
            ):
                if e_a != e_b:
                    return self.detect_conflict(
                        timeline_a,
                        timeline_b,
                        ConflictType.CAUSALITY_VIOLATION,
                        f"Causal chains diverge at event {i}",
                        affected_events=[e_a, e_b],
                    )

        return None

    def detect_state_conflict(self, timeline_a: str, timeline_b: str) -> Optional[str]:
        """Detect state contradictions (different event outcomes)"""
        if timeline_a not in self.timelines or timeline_b not in self.timelines:
            return None

        state_a = self.timelines[timeline_a].federation_state
        state_b = self.timelines[timeline_b].federation_state

        contradictions = []
        for key in set(state_a.keys()) | set(state_b.keys()):
            val_a = state_a.get(key)
            val_b = state_b.get(key)
            if val_a != val_b and val_a is not None and val_b is not None:
                contradictions.append(key)

        if contradictions:
            return self.detect_conflict(
                timeline_a,
                timeline_b,
                ConflictType.STATE_CONTRADICTION,
                f"State divergence: {', '.join(contradictions)}",
                affected_events=contradictions,
            )

        return None

    def resolve_conflict(
        self, conflict_id: str, resolution_method: str, canonical_value: Any = None
    ) -> bool:
        """Resolve a conflict using specified method"""
        if conflict_id not in self.conflicts:
            return False

        conflict = self.conflicts[conflict_id]

        if resolution_method == "RETAINED_A":
            conflict.resolution = f"Retained state from {conflict.timeline_a}"
            conflict.resolution_method = "RETAINED_A"
        elif resolution_method == "RETAINED_B":
            conflict.resolution = f"Retained state from {conflict.timeline_b}"
            conflict.resolution_method = "RETAINED_B"
        elif resolution_method == "MERGED":
            conflict.resolution = "Merged both states"
            conflict.resolution_method = "MERGED"
        elif resolution_method == "BRANCHED":
            conflict.resolution = "Both timelines preserved as separate branches"
            conflict.resolution_method = "BRANCHED"
        elif resolution_method == "OVERWRITTEN":
            conflict.resolution = f"Overwrote with canonical value: {canonical_value}"
            conflict.resolution_method = "OVERWRITTEN"
        else:
            return False

        conflict.resolved = True
        return True

    def merge_timelines(self, primary: str, secondary: str) -> Dict[str, Any]:
        """Merge two timelines, resolving all conflicts"""
        if primary not in self.timelines or secondary not in self.timelines:
            return {"success": False, "error": "Timeline not found"}

        # Create snapshot before merge
        self._snapshot_timeline(secondary)

        primary_obj = self.timelines[primary]
        secondary_obj = self.timelines[secondary]

        # Detect and resolve conflicts
        conflicts_to_resolve = []
        for conflict_id, conflict in self.conflicts.items():
            if (
                (conflict.timeline_a == primary and conflict.timeline_b == secondary)
                or (conflict.timeline_a == secondary and conflict.timeline_b == primary)
            ) and not conflict.resolved:
                conflicts_to_resolve.append(conflict_id)

        # Resolve conflicts using heuristics
        for conflict_id in conflicts_to_resolve:
            # Default: retain primary timeline's state
            self.resolve_conflict(conflict_id, "RETAINED_A")

        # Merge causal chains
        merged_events = self._merge_causal_chains(primary_obj, secondary_obj)

        # Merge federation states
        merged_state = self._merge_federation_states(
            primary_obj.federation_state, secondary_obj.federation_state
        )

        # Update primary timeline
        primary_obj.causal_events = merged_events
        primary_obj.federation_state = merged_state
        primary_obj.events_count = len(merged_events)
        primary_obj.stability_score = self._calculate_stability_score(
            primary_obj, len(conflicts_to_resolve)
        )

        # Mark secondary as merged
        secondary_obj.status = TimelineStatus.MERGED

        # Record merge
        self.merge_history.append(f"{primary}←{secondary}")

        return {
            "success": True,
            "primary": primary,
            "secondary": secondary,
            "conflicts_resolved": len(conflicts_to_resolve),
            "merged_events": len(merged_events),
            "stability_score": primary_obj.stability_score,
        }

    def _merge_causal_chains(self, timeline_a: Timeline, timeline_b: Timeline) -> List[str]:
        """Merge two causal chains, preserving causality in primary"""
        # Start with primary's chain
        merged = list(timeline_a.causal_events)

        # Add secondary's unique events
        for event in timeline_b.causal_events:
            if event not in merged:
                merged.append(event)

        return merged

    def _merge_federation_states(
        self, state_a: Dict[str, Any], state_b: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Merge two federation states, preferring primary"""
        merged = dict(state_a)

        for key, val_b in state_b.items():
            if key not in merged:
                merged[key] = val_b
            elif isinstance(val_b, (int, float)):
                # Average numeric values
                val_a = merged[key]
                if isinstance(val_a, (int, float)):
                    merged[key] = (val_a + val_b) / 2

        return merged

    def _calculate_stability_score(self, timeline: Timeline, conflicts_resolved: int) -> float:
        """Calculate timeline stability after merge"""
        base_score = 1.0
        conflict_penalty = min(0.3, conflicts_resolved * 0.1)
        return max(0.5, base_score - conflict_penalty)

    def _snapshot_timeline(self, timeline_id: str):
        """Create a snapshot of timeline state before merge"""
        if timeline_id not in self.timelines:
            return

        timeline = self.timelines[timeline_id]
        active_conflicts = [
            cid
            for cid, c in self.conflicts.items()
            if (c.timeline_a == timeline_id or c.timeline_b == timeline_id)
            and not c.resolved
        ]

        snapshot = TimelineSnapshot(
            timeline_id=timeline_id,
            timestamp=datetime.now().timestamp(),
            federation_state=dict(timeline.federation_state),
            causal_chain=list(timeline.causal_events),
            conflicts_at_time=active_conflicts,
        )
        self.snapshots.append(snapshot)

    def rollback_merge(self, timeline_id: str) -> bool:
        """Rollback to previous timeline state from snapshot"""
        snapshots = [s for s in self.snapshots if s.timeline_id == timeline_id]
        if not snapshots:
            return False

        # Use most recent snapshot
        latest = max(snapshots, key=lambda s: s.timestamp)

        if timeline_id in self.timelines:
            timeline = self.timelines[timeline_id]
            timeline.federation_state = dict(latest.federation_state)
            timeline.causal_events = list(latest.causal_chain)
            timeline.status = TimelineStatus.ACTIVE
            return True

        return False

    def validate_timeline_integrity(self, timeline_id: str) -> Dict[str, Any]:
        """Validate timeline for paradoxes and inconsistencies"""
        if timeline_id not in self.timelines:
            return {"valid": False, "error": "Timeline not found"}

        timeline = self.timelines[timeline_id]
        issues = []

        # Check for causality violations
        if timeline.causal_events:
            if len(timeline.causal_events) != len(set(timeline.causal_events)):
                issues.append("Duplicate events in causal chain")

        # Check for merge artifacts
        if timeline.status == TimelineStatus.MERGED and not timeline.parent_timeline:
            issues.append("Merged timeline without parent reference")

        # Check stability
        if timeline.stability_score < 0.6:
            issues.append(f"Low stability score: {timeline.stability_score}")

        return {
            "valid": len(issues) == 0,
            "timeline_id": timeline_id,
            "issues": issues,
            "stability_score": timeline.stability_score,
            "event_count": timeline.events_count,
        }

    def get_timeline_tree(self) -> Dict[str, Any]:
        """Get timeline branching structure"""
        tree = {}
        root_timelines = [
            t
            for t in self.timelines.values()
            if t.parent_timeline is None and t.status != TimelineStatus.ARCHIVED
        ]

        for root in root_timelines:
            tree[root.timeline_id] = self._build_branch_tree(root)

        return tree

    def _build_branch_tree(self, timeline: Timeline) -> Dict[str, Any]:
        """Recursively build timeline branch tree"""
        children = [
            self.timelines[tid]
            for tid in self.timelines
            if self.timelines[tid].parent_timeline == timeline.timeline_id
        ]

        return {
            "timeline_id": timeline.timeline_id,
            "status": timeline.status.value,
            "divergence_point": timeline.divergence_point,
            "stability": timeline.stability_score,
            "probability": timeline.probability,
            "children": [self._build_branch_tree(child) for child in children],
        }

    def get_multiverse_status(self) -> Dict[str, Any]:
        """Get comprehensive multiverse status"""
        active = sum(
            1 for t in self.timelines.values() if t.status == TimelineStatus.ACTIVE
        )
        merged = sum(
            1 for t in self.timelines.values() if t.status == TimelineStatus.MERGED
        )
        archived = sum(
            1 for t in self.timelines.values() if t.status == TimelineStatus.ARCHIVED
        )
        unresolved = sum(1 for c in self.conflicts.values() if not c.resolved)

        # Calculate average stability
        avg_stability = (
            sum(t.stability_score for t in self.timelines.values()) / len(self.timelines)
            if self.timelines
            else 0.0
        )

        return {
            "total_timelines": len(self.timelines),
            "active_timelines": active,
            "merged_timelines": merged,
            "archived_timelines": archived,
            "total_conflicts": len(self.conflicts),
            "unresolved_conflicts": unresolved,
            "merge_operations": len(self.merge_history),
            "snapshots_stored": len(self.snapshots),
            "average_stability": avg_stability,
            "timeline_tree": self.get_timeline_tree(),
        }
