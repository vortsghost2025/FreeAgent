#!/usr/bin/env python3
"""
PERSISTENT UNIVERSE SYSTEM - Phase XI
~1000 LOC - Production-Ready Persistence Layer

Core persistence infrastructure for THE FEDERATION GAME:
- UniverseState: Comprehensive universe snapshot at any point in time
- WorldSnapshot: Point-in-time world state for timeline tracking
- TimelineHistory: Complete historical record with branching/merging support
- PersistenceManager: Save/load and timeline management
- Async operations for non-blocking I/O

The persistent universe ensures the federation's world never vanishes and all
decisions create lasting impact. Time is recorded, explored, and altered.
"""

import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Dict, List, Optional, Any, Set, Tuple
from enum import Enum
from pathlib import Path
import hashlib
import copy
import asyncio
from collections import defaultdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("PersistentUniverse")


class TimelineEventType(Enum):
    """Types of timeline-shaping events"""
    TURN_ADVANCE = "turn_advance"
    STATE_CHANGE = "state_change"
    DECISION_MADE = "decision_made"
    MILESTONE_REACHED = "milestone_reached"
    WORLD_ALTERED = "world_altered"
    BRANCH_CREATED = "branch_created"
    TIMELINE_MERGED = "timeline_merged"
    SAVE_POINT = "save_point"


@dataclass
class UniverseMetadata:
    """Metadata about the universe"""
    universe_id: str
    creation_timestamp: datetime
    last_modified: datetime
    version: str = "1.0"
    total_snapshots: int = 0
    total_turns_recorded: int = 0
    timeline_branches: int = 0
    persistent_entity_count: int = 0


@dataclass
class TimelineEvent:
    """Single event in the timeline"""
    event_id: str
    event_type: TimelineEventType
    timestamp: datetime
    turn_number: int
    description: str
    impact_level: float  # 0.0-1.0
    affected_systems: List[str] = field(default_factory=list)
    state_hash: str = ""
    parent_timeline_id: str = ""
    created_branches: List[str] = field(default_factory=list)


@dataclass
class WorldSnapshot:
    """Complete snapshot of world state at a point in time"""
    snapshot_id: str
    timestamp: datetime
    turn_number: int
    timeline_id: str

    # Core federation state
    federation_state: Dict[str, Any] = field(default_factory=dict)
    subsystem_states: Dict[str, Any] = field(default_factory=dict)
    game_statistics: Dict[str, Any] = field(default_factory=dict)

    # World entities
    active_npcs: Dict[str, Any] = field(default_factory=dict)
    active_quests: Dict[str, Any] = field(default_factory=dict)
    active_campaigns: Dict[str, Any] = field(default_factory=dict)
    faction_statuses: Dict[str, Any] = field(default_factory=dict)
    technology_progress: Dict[str, Any] = field(default_factory=dict)

    # Environmental state
    world_stability: float = 0.5
    conflict_level: float = 0.3
    resource_abundance: float = 0.6
    cultural_diversity: float = 0.5

    # Derived from world state
    state_hash: str = ""
    compression_ratio: float = 0.0

    def compute_hash(self) -> str:
        """Compute hash of snapshot for integrity checking"""
        hashable_data = {
            "federation": self.federation_state,
            "subsystems": self.subsystem_states,
            "stats": self.game_statistics,
            "npcs": len(self.active_npcs),
            "quests": len(self.active_quests),
            "timestamp": self.timestamp.isoformat()
        }
        hash_str = json.dumps(hashable_data, sort_keys=True, default=str)
        self.state_hash = hashlib.sha256(hash_str.encode()).hexdigest()[:16]
        return self.state_hash


@dataclass
class Timeline:
    """A branch of history in the multiverse"""
    timeline_id: str
    created_at: datetime
    creation_turn: int
    parent_timeline_id: Optional[str] = None
    branch_point_turn: Optional[int] = None
    branch_reason: str = ""

    snapshots: List[WorldSnapshot] = field(default_factory=list)
    events: List[TimelineEvent] = field(default_factory=list)
    current_turn: int = 0
    is_active: bool = True
    merge_target_timeline_id: Optional[str] = None

    def add_snapshot(self, snapshot: WorldSnapshot) -> None:
        """Record a world snapshot to this timeline"""
        self.snapshots.append(snapshot)
        if snapshot.turn_number > self.current_turn:
            self.current_turn = snapshot.turn_number

    def add_event(self, event: TimelineEvent) -> None:
        """Record an event to this timeline"""
        self.events.append(event)
        if event.turn_number > self.current_turn:
            self.current_turn = event.turn_number

    def get_snapshot_at_turn(self, turn: int) -> Optional[WorldSnapshot]:
        """Retrieve world snapshot at specific turn"""
        for snapshot in reversed(self.snapshots):
            if snapshot.turn_number <= turn:
                return snapshot
        return None

    def get_events_since_turn(self, turn: int) -> List[TimelineEvent]:
        """Get all events after a specific turn"""
        return [e for e in self.events if e.turn_number > turn]


class UniverseState:
    """
    Central persistent universe manager.

    Maintains:
    - Complete world history across multiple timelines
    - Point-in-time snapshots for rollback capability
    - Timeline branching/merging for multiverse scenarios
    - Event causality tracking
    """

    def __init__(self, universe_id: str):
        """Initialize universe state manager"""
        self.universe_id = universe_id
        self.metadata = UniverseMetadata(
            universe_id=universe_id,
            creation_timestamp=datetime.now(),
            last_modified=datetime.now()
        )

        # Timeline management
        self.timelines: Dict[str, Timeline] = {}
        self.active_timeline_id: str = self._create_initial_timeline()
        self.timeline_graph: Dict[str, Set[str]] = defaultdict(set)

        # Snapshots by turn for quick access
        self.snapshots_by_turn: Dict[int, List[WorldSnapshot]] = defaultdict(list)

        # Persistent entities
        self.persistent_entities: Dict[str, Dict[str, Any]] = {}

        logger.info(f"Universe {universe_id} initialized with timeline {self.active_timeline_id}")

    def _create_initial_timeline(self) -> str:
        """Create the genesis timeline"""
        timeline_id = f"timeline_genesis_{datetime.now().timestamp()}"
        timeline = Timeline(
            timeline_id=timeline_id,
            created_at=datetime.now(),
            creation_turn=0,
            branch_reason="Genesis timeline"
        )
        self.timelines[timeline_id] = timeline
        return timeline_id

    def record_snapshot(self, snapshot: WorldSnapshot) -> str:
        """
        Record a world snapshot to the active timeline.

        Args:
            snapshot: WorldSnapshot to record

        Returns:
            snapshot_id of recorded snapshot
        """
        snapshot.timeline_id = self.active_timeline_id
        snapshot.compute_hash()

        timeline = self.timelines[self.active_timeline_id]
        timeline.add_snapshot(snapshot)
        self.snapshots_by_turn[snapshot.turn_number].append(snapshot)

        self.metadata.total_snapshots += 1
        self.metadata.last_modified = datetime.now()

        logger.info(f"Recorded snapshot {snapshot.snapshot_id} at turn {snapshot.turn_number}")
        return snapshot.snapshot_id

    def record_event(self, event_type: TimelineEventType, turn: int,
                    description: str, impact_level: float,
                    affected_systems: List[str] = None) -> str:
        """
        Record an event that shapes the timeline.

        Args:
            event_type: Type of timeline event
            turn: Turn number when event occurred
            description: Event description
            impact_level: How much this event impacts the world (0.0-1.0)
            affected_systems: List of affected federation systems

        Returns:
            event_id of recorded event
        """
        if affected_systems is None:
            affected_systems = []

        event = TimelineEvent(
            event_id=f"event_{turn}_{datetime.now().timestamp()}",
            event_type=event_type,
            timestamp=datetime.now(),
            turn_number=turn,
            description=description,
            impact_level=impact_level,
            affected_systems=affected_systems,
            parent_timeline_id=self.active_timeline_id
        )

        timeline = self.timelines[self.active_timeline_id]
        timeline.add_event(event)

        if event_type == TimelineEventType.TURN_ADVANCE:
            self.metadata.total_turns_recorded += 1

        self.metadata.last_modified = datetime.now()

        logger.info(f"Recorded event {event.event_id}: {description}")
        return event.event_id

    def create_branch(self, branch_reason: str, from_turn: int) -> str:
        """
        Create a new timeline branch from current point.

        Args:
            branch_reason: Why this branch was created
            from_turn: Turn number to branch from

        Returns:
            timeline_id of new branch
        """
        parent_timeline = self.timelines[self.active_timeline_id]
        source_snapshot = parent_timeline.get_snapshot_at_turn(from_turn)

        new_timeline_id = f"timeline_branch_{from_turn}_{datetime.now().timestamp()}"
        new_timeline = Timeline(
            timeline_id=new_timeline_id,
            created_at=datetime.now(),
            creation_turn=from_turn,
            parent_timeline_id=self.active_timeline_id,
            branch_point_turn=from_turn,
            branch_reason=branch_reason
        )

        # Copy snapshot from branch point
        if source_snapshot:
            copied_snapshot = copy.deepcopy(source_snapshot)
            copied_snapshot.snapshot_id = f"snapshot_branch_{datetime.now().timestamp()}"
            copied_snapshot.timeline_id = new_timeline_id
            new_timeline.add_snapshot(copied_snapshot)

        self.timelines[new_timeline_id] = new_timeline
        self.timeline_graph[self.active_timeline_id].add(new_timeline_id)
        self.timeline_graph[new_timeline_id].add(self.active_timeline_id)

        self.metadata.timeline_branches += 1
        self.metadata.last_modified = datetime.now()

        logger.info(f"Created timeline branch {new_timeline_id}: {branch_reason}")
        return new_timeline_id

    def switch_timeline(self, timeline_id: str) -> bool:
        """
        Switch to a different timeline.

        Args:
            timeline_id: ID of timeline to switch to

        Returns:
            True if switch successful
        """
        if timeline_id not in self.timelines:
            logger.error(f"Timeline {timeline_id} does not exist")
            return False

        self.active_timeline_id = timeline_id
        self.metadata.last_modified = datetime.now()

        logger.info(f"Switched to timeline {timeline_id}")
        return True

    def merge_timelines(self, target_timeline_id: str, merge_turn: int) -> bool:
        """
        Merge current timeline into target timeline at specified turn.

        Args:
            target_timeline_id: Timeline to merge into
            merge_turn: Turn number for merge point

        Returns:
            True if merge successful
        """
        if target_timeline_id not in self.timelines:
            return False

        source_timeline = self.timelines[self.active_timeline_id]
        target_timeline = self.timelines[target_timeline_id]

        # Record merge event on source
        merge_event = TimelineEvent(
            event_id=f"merge_{datetime.now().timestamp()}",
            event_type=TimelineEventType.TIMELINE_MERGED,
            timestamp=datetime.now(),
            turn_number=merge_turn,
            description=f"Merged with timeline {target_timeline_id}",
            impact_level=0.8,
            parent_timeline_id=self.active_timeline_id
        )
        source_timeline.add_event(merge_event)
        source_timeline.merge_target_timeline_id = target_timeline_id
        source_timeline.is_active = False

        logger.info(f"Merged timeline {self.active_timeline_id} into {target_timeline_id}")
        return True

    def register_persistent_entity(self, entity_id: str, entity_type: str,
                                   entity_data: Dict[str, Any]) -> None:
        """
        Register an entity that persists across saves.

        Args:
            entity_id: Unique entity identifier
            entity_type: Type of entity (npc, quest, faction, etc.)
            entity_data: Entity state data
        """
        self.persistent_entities[entity_id] = {
            "type": entity_type,
            "created_at": datetime.now().isoformat(),
            "data": entity_data,
            "last_updated": datetime.now().isoformat()
        }

        self.metadata.persistent_entity_count = len(self.persistent_entities)
        self.metadata.last_modified = datetime.now()

        logger.info(f"Registered persistent entity {entity_id}")

    def get_persistent_entity(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve persistent entity data"""
        return self.persistent_entities.get(entity_id)

    def get_timeline_history(self, timeline_id: Optional[str] = None,
                           start_turn: int = 0,
                           end_turn: Optional[int] = None) -> Dict[str, Any]:
        """
        Get complete history of a timeline.

        Args:
            timeline_id: Timeline to get history for (default: active)
            start_turn: Starting turn number
            end_turn: Ending turn number

        Returns:
            Timeline history with events and snapshots
        """
        if timeline_id is None:
            timeline_id = self.active_timeline_id

        if timeline_id not in self.timelines:
            return {"success": False, "error": "Timeline not found"}

        timeline = self.timelines[timeline_id]

        return {
            "success": True,
            "timeline_id": timeline_id,
            "created_at": timeline.created_at.isoformat(),
            "current_turn": timeline.current_turn,
            "is_active": timeline.is_active,
            "total_snapshots": len(timeline.snapshots),
            "total_events": len(timeline.events),
            "events": [
                {
                    "event_id": e.event_id,
                    "type": e.event_type.value,
                    "turn": e.turn_number,
                    "description": e.description,
                    "impact": e.impact_level
                }
                for e in timeline.events
                if e.turn_number >= start_turn and (end_turn is None or e.turn_number <= end_turn)
            ]
        }

    def get_snapshot_at_turn(self, turn: int, timeline_id: Optional[str] = None) -> Optional[WorldSnapshot]:
        """
        Retrieve world snapshot at specific turn.

        Args:
            turn: Turn number to retrieve
            timeline_id: Timeline to search (default: active)

        Returns:
            WorldSnapshot at that turn, or None if not found
        """
        if timeline_id is None:
            timeline_id = self.active_timeline_id

        if timeline_id not in self.timelines:
            return None

        return self.timelines[timeline_id].get_snapshot_at_turn(turn)

    def validate_universe_integrity(self) -> Dict[str, Any]:
        """
        Validate integrity of universe state.

        Returns:
            Validation report with issues found
        """
        issues = []

        if self.active_timeline_id not in self.timelines:
            issues.append("Active timeline does not exist")

        for timeline_id, timeline in self.timelines.items():
            if timeline.parent_timeline_id and timeline.parent_timeline_id not in self.timelines:
                issues.append(f"Timeline {timeline_id} has non-existent parent")

            if not timeline.snapshots:
                if timeline_id != self.active_timeline_id:
                    issues.append(f"Timeline {timeline_id} has no snapshots")

        if self.metadata.persistent_entity_count != len(self.persistent_entities):
            issues.append("Persistent entity count mismatch")

        return {
            "success": True,
            "is_valid": len(issues) == 0,
            "issues_found": len(issues),
            "issues": issues,
            "timeline_count": len(self.timelines),
            "total_snapshots": self.metadata.total_snapshots,
            "active_timeline": self.active_timeline_id
        }

    def export_universe_summary(self) -> Dict[str, Any]:
        """
        Export complete universe summary.

        Returns:
            Comprehensive universe state summary
        """
        timeline_summaries = []
        for timeline_id, timeline in self.timelines.items():
            timeline_summaries.append({
                "timeline_id": timeline_id,
                "created_at": timeline.created_at.isoformat(),
                "current_turn": timeline.current_turn,
                "is_active": timeline.is_active,
                "snapshots": len(timeline.snapshots),
                "events": len(timeline.events),
                "parent": timeline.parent_timeline_id
            })

        return {
            "universe_id": self.universe_id,
            "created_at": self.metadata.creation_timestamp.isoformat(),
            "last_modified": self.metadata.last_modified.isoformat(),
            "timeline_count": len(self.timelines),
            "total_snapshots": self.metadata.total_snapshots,
            "total_turns_recorded": self.metadata.total_turns_recorded,
            "timeline_branches": self.metadata.timeline_branches,
            "persistent_entities": self.metadata.persistent_entity_count,
            "active_timeline": self.active_timeline_id,
            "timelines": timeline_summaries
        }

    def reset(self):
        """Reset universe state and progression."""
        self.state.clear()
        self.progression.clear()


class PersistenceManager:
    """
    Manages save/load operations for persistent universe.
    Handles JSON serialization and async file I/O.
    """

    def __init__(self, save_directory: str = "./game_saves"):
        """
        Initialize persistence manager.

        Args:
            save_directory: Directory for save files
        """
        self.save_directory = Path(save_directory)
        self.save_directory.mkdir(parents=True, exist_ok=True)
        logger.info(f"Persistence manager initialized at {self.save_directory}")

    async def save_universe(self, universe: UniverseState, save_name: str) -> Dict[str, Any]:
        """
        Asynchronously save universe to disk.

        Args:
            universe: UniverseState to save
            save_name: Name for this save

        Returns:
            Save confirmation with file info
        """
        return await asyncio.to_thread(self._save_universe_sync, universe, save_name)

    def _save_universe_sync(self, universe: UniverseState, save_name: str) -> Dict[str, Any]:
        """Synchronous save implementation"""
        try:
            save_path = self.save_directory / f"{save_name}.universe.json"

            save_data = {
                "metadata": asdict(universe.metadata),
                "active_timeline_id": universe.active_timeline_id,
                "timelines": self._serialize_timelines(universe),
                "persistent_entities": universe.persistent_entities,
                "save_timestamp": datetime.now().isoformat()
            }

            with open(save_path, 'w') as f:
                json.dump(save_data, f, indent=2, default=str)

            file_size = save_path.stat().st_size

            logger.info(f"Saved universe to {save_path} ({file_size} bytes)")

            return {
                "success": True,
                "save_successful": True,
                "save_name": save_name,
                "filepath": str(save_path.absolute()),
                "file_size_bytes": file_size,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to save universe: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    async def load_universe(self, save_name: str) -> Tuple[Optional[UniverseState], Dict[str, Any]]:
        """
        Asynchronously load universe from disk.

        Args:
            save_name: Name of save to load

        Returns:
            Tuple of (UniverseState, load_info) or (None, error_info)
        """
        return await asyncio.to_thread(self._load_universe_sync, save_name)

    def _load_universe_sync(self, save_name: str) -> Tuple[Optional[UniverseState], Dict[str, Any]]:
        """Synchronous load implementation"""
        try:
            save_path = self.save_directory / f"{save_name}.universe.json"

            if not save_path.exists():
                return None, {"success": False, "error": "Save file not found"}

            with open(save_path, 'r') as f:
                save_data = json.load(f)

            # Reconstruct universe
            universe_id = save_data["metadata"]["universe_id"]
            universe = UniverseState(universe_id)

            # Restore metadata
            universe.metadata.last_modified = datetime.fromisoformat(save_data["metadata"]["last_modified"])
            universe.metadata.total_snapshots = save_data["metadata"]["total_snapshots"]
            universe.metadata.total_turns_recorded = save_data["metadata"]["total_turns_recorded"]
            universe.metadata.timeline_branches = save_data["metadata"]["timeline_branches"]
            universe.metadata.persistent_entity_count = save_data["metadata"]["persistent_entity_count"]

            # Restore timelines
            self._deserialize_timelines(universe, save_data["timelines"])

            # Restore persistent entities
            universe.persistent_entities = save_data.get("persistent_entities", {})

            # Restore active timeline
            universe.active_timeline_id = save_data.get("active_timeline_id")

            logger.info(f"Loaded universe from {save_path}")

            return universe, {
                "success": True,
                "load_successful": True,
                "universe_id": universe_id,
                "timeline_count": len(universe.timelines),
                "total_snapshots": universe.metadata.total_snapshots,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to load universe: {e}")
            return None, {"success": False, "error": str(e)}

    def _serialize_timelines(self, universe: UniverseState) -> Dict[str, Any]:
        """Serialize all timelines to JSON-safe format"""
        timelines_data = {}

        for timeline_id, timeline in universe.timelines.items():
            timelines_data[timeline_id] = {
                "timeline_id": timeline.timeline_id,
                "created_at": timeline.created_at.isoformat(),
                "creation_turn": timeline.creation_turn,
                "parent_timeline_id": timeline.parent_timeline_id,
                "branch_point_turn": timeline.branch_point_turn,
                "branch_reason": timeline.branch_reason,
                "current_turn": timeline.current_turn,
                "is_active": timeline.is_active,
                "snapshots": [self._serialize_snapshot(s) for s in timeline.snapshots],
                "events": [self._serialize_event(e) for e in timeline.events]
            }

        return timelines_data

    def _deserialize_timelines(self, universe: UniverseState, timelines_data: Dict[str, Any]) -> None:
        """Deserialize timelines from JSON"""
        for timeline_id, data in timelines_data.items():
            timeline = Timeline(
                timeline_id=data["timeline_id"],
                created_at=datetime.fromisoformat(data["created_at"]),
                creation_turn=data["creation_turn"],
                parent_timeline_id=data.get("parent_timeline_id"),
                branch_point_turn=data.get("branch_point_turn"),
                branch_reason=data.get("branch_reason", "")
            )
            timeline.current_turn = data["current_turn"]
            timeline.is_active = data["is_active"]

            # Restore snapshots
            for snap_data in data.get("snapshots", []):
                snapshot = self._deserialize_snapshot(snap_data)
                timeline.add_snapshot(snapshot)

            # Restore events
            for event_data in data.get("events", []):
                event = self._deserialize_event(event_data)
                timeline.add_event(event)

            universe.timelines[timeline_id] = timeline

    def _serialize_snapshot(self, snapshot: WorldSnapshot) -> Dict[str, Any]:
        """Convert snapshot to JSON-safe format"""
        return {
            "snapshot_id": snapshot.snapshot_id,
            "timestamp": snapshot.timestamp.isoformat(),
            "turn_number": snapshot.turn_number,
            "timeline_id": snapshot.timeline_id,
            "federation_state": snapshot.federation_state,
            "subsystem_states": snapshot.subsystem_states,
            "game_statistics": snapshot.game_statistics,
            "active_npcs": snapshot.active_npcs,
            "active_quests": snapshot.active_quests,
            "active_campaigns": snapshot.active_campaigns,
            "faction_statuses": snapshot.faction_statuses,
            "technology_progress": snapshot.technology_progress,
            "world_stability": snapshot.world_stability,
            "conflict_level": snapshot.conflict_level,
            "resource_abundance": snapshot.resource_abundance,
            "cultural_diversity": snapshot.cultural_diversity,
            "state_hash": snapshot.state_hash,
            "compression_ratio": snapshot.compression_ratio
        }

    def _deserialize_snapshot(self, data: Dict[str, Any]) -> WorldSnapshot:
        """Reconstruct snapshot from JSON"""
        return WorldSnapshot(
            snapshot_id=data["snapshot_id"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            turn_number=data["turn_number"],
            timeline_id=data["timeline_id"],
            federation_state=data.get("federation_state", {}),
            subsystem_states=data.get("subsystem_states", {}),
            game_statistics=data.get("game_statistics", {}),
            active_npcs=data.get("active_npcs", {}),
            active_quests=data.get("active_quests", {}),
            active_campaigns=data.get("active_campaigns", {}),
            faction_statuses=data.get("faction_statuses", {}),
            technology_progress=data.get("technology_progress", {}),
            world_stability=data.get("world_stability", 0.5),
            conflict_level=data.get("conflict_level", 0.3),
            resource_abundance=data.get("resource_abundance", 0.6),
            cultural_diversity=data.get("cultural_diversity", 0.5),
            state_hash=data.get("state_hash", ""),
            compression_ratio=data.get("compression_ratio", 0.0)
        )

    def _serialize_event(self, event: TimelineEvent) -> Dict[str, Any]:
        """Convert event to JSON-safe format"""
        return {
            "event_id": event.event_id,
            "event_type": event.event_type.value,
            "timestamp": event.timestamp.isoformat(),
            "turn_number": event.turn_number,
            "description": event.description,
            "impact_level": event.impact_level,
            "affected_systems": event.affected_systems,
            "state_hash": event.state_hash,
            "parent_timeline_id": event.parent_timeline_id,
            "created_branches": event.created_branches
        }

    def _deserialize_event(self, data: Dict[str, Any]) -> TimelineEvent:
        """Reconstruct event from JSON"""
        return TimelineEvent(
            event_id=data["event_id"],
            event_type=TimelineEventType[data["event_type"].upper()],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            turn_number=data["turn_number"],
            description=data["description"],
            impact_level=data["impact_level"],
            affected_systems=data.get("affected_systems", []),
            state_hash=data.get("state_hash", ""),
            parent_timeline_id=data.get("parent_timeline_id", ""),
            created_branches=data.get("created_branches", [])
        )

    def list_saves(self) -> List[str]:
        """List all available save files"""
        saves = []
        for save_file in self.save_directory.glob("*.universe.json"):
            saves.append(save_file.stem.replace(".universe", ""))
        return sorted(saves)

    def delete_save(self, save_name: str) -> Dict[str, Any]:
        """Delete a save file"""
        try:
            save_path = self.save_directory / f"{save_name}.universe.json"
            if save_path.exists():
                save_path.unlink()
                return {"success": True, "deleted": True, "save_name": save_name}
            return {"success": False, "error": "Save file not found"}
        except Exception as e:
            return {"success": False, "error": str(e)}
