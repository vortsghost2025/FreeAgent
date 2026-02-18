#!/usr/bin/env python3
"""
LORE ENGINE — Persistent Story Generation System
Transforms telemetry + events + severity into a living narrative chronicle.
Every system action becomes a chapter in the fleet's history.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
import json


class LoreEntryType(Enum):
    """Types of lore entries"""
    CHAPTER = "chapter"
    MYSTERY = "mystery"
    BATTLE = "battle"
    RESOLUTION = "resolution"
    MISSION_LOG = "mission_log"
    ANOMALY = "anomaly"
    DISCOVERY = "discovery"


@dataclass
class LoreEntry:
    """A single entry in the fleet's chronicle"""
    entry_id: str
    type: LoreEntryType
    title: str
    narrative: str
    ships_involved: List[str]
    timestamp: float
    severity: str
    tags: List[str] = field(default_factory=list)
    related_entries: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['type'] = self.type.value
        return data


class LoreEngine:
    """
    Central system for generating and maintaining the fleet's persistent chronicle.

    Purpose:
    - Consume telemetry + events + hooks
    - Generate narrative entries (chapters, mysteries, battles, resolutions)
    - Build persistent chronicle of fleet history
    - Export lore in human-readable formats
    - Track mission logs from test/event sequences
    """

    def __init__(self):
        """Initialize LoreEngine"""
        self.chronicle: List[LoreEntry] = []
        self.entry_counter = 0
        self.mission_logs: List[Dict[str, Any]] = []
        self.active_mysteries: Dict[str, LoreEntry] = {}
        self.active_battles: Dict[str, LoreEntry] = {}

    def generate_from_telemetry_hook(self, hook_result: 'TelemetryHookResult', fleet_metrics: 'FleetMetrics') -> Optional[LoreEntry]:
        """
        Generate a lore entry from a telemetry hook result.

        This is the main integration point between observability and story generation.
        """
        if not hook_result.triggered or not hook_result.lore_event:
            return None

        lore_event = hook_result.lore_event
        entry_type = self._infer_entry_type(hook_result.hook_name, lore_event)
        severity = self._infer_severity_from_metrics(fleet_metrics)
        ships_involved = fleet_metrics.critical_ships if fleet_metrics.critical_ships else list(fleet_metrics.ships.keys())

        narrative = self._generate_narrative(entry_type, lore_event, hook_result, fleet_metrics)
        title = self._generate_title(entry_type, lore_event)
        tags = self._extract_tags(lore_event)

        entry = LoreEntry(
            entry_id=self._generate_entry_id(),
            type=entry_type,
            title=title,
            narrative=narrative,
            ships_involved=ships_involved,
            timestamp=fleet_metrics.timestamp,
            severity=severity,
            tags=tags,
            metadata=lore_event
        )

        self._add_to_chronicle(entry)
        self._track_narrative_arcs(entry)

        return entry

    def _infer_entry_type(self, hook_name: str, lore_event: Dict[str, Any]) -> LoreEntryType:
        """Infer entry type from hook and event data"""
        if 'chapter' in lore_event:
            return LoreEntryType.CHAPTER

        if hook_name == 'threat_escalation':
            return LoreEntryType.BATTLE

        if hook_name == 'critical_ship_detection':
            return LoreEntryType.CHAPTER

        if hook_name == 'fleet_health':
            if lore_event.get('health_score', 1.0) < 0.3:
                return LoreEntryType.MYSTERY
            return LoreEntryType.RESOLUTION

        if hook_name == 'event_rate_spike':
            return LoreEntryType.CHAPTER

        return LoreEntryType.CHAPTER

    def _infer_severity_from_metrics(self, fleet_metrics: 'FleetMetrics') -> str:
        """Determine severity level from fleet metrics"""
        if fleet_metrics.threat_level_max >= 9:
            return 'CRITICAL'
        elif fleet_metrics.threat_level_avg >= 6:
            return 'ALERT'
        elif fleet_metrics.threat_level_avg >= 3:
            return 'WARNING'
        return 'INFO'

    def _generate_narrative(
        self,
        entry_type: LoreEntryType,
        lore_event: Dict[str, Any],
        hook_result: 'TelemetryHookResult',
        fleet_metrics: 'FleetMetrics'
    ) -> str:
        """Generate narrative prose for the lore entry"""
        chapter_hint = lore_event.get('chapter', '')

        if entry_type == LoreEntryType.CHAPTER:
            return self._narrative_chapter(lore_event, chapter_hint, fleet_metrics)
        elif entry_type == LoreEntryType.MYSTERY:
            return self._narrative_mystery(lore_event, fleet_metrics)
        elif entry_type == LoreEntryType.BATTLE:
            return self._narrative_battle(lore_event, fleet_metrics)
        elif entry_type == LoreEntryType.RESOLUTION:
            return self._narrative_resolution(lore_event, fleet_metrics)
        else:
            return f"An event occurred at stardate {fleet_metrics.timestamp}: {lore_event}"

    def _narrative_chapter(self, event: Dict[str, Any], chapter_hint: str, fleet_metrics: 'FleetMetrics') -> str:
        """Generate narrative for chapter entry"""
        if chapter_hint:
            narratives = [
                f"{chapter_hint}. The crew faced challenges they hadn't anticipated.",
                f"Chapter: {chapter_hint}. What happened next would test the limits of the fleet.",
                f"The logs recorded it as '{chapter_hint}'.The crew moved forward with grim determination.",
            ]
        else:
            narratives = [
                f"Another day in the fleet. Average threat: {fleet_metrics.threat_level_avg:.1f}/10.",
                f"The fleet resumed its operations. All hands steady.",
                f"Time marched on. The ships did their work.",
            ]

        return narratives[hash(str(event)) % len(narratives)]

    def _narrative_mystery(self, event: Dict[str, Any], fleet_metrics: 'FleetMetrics') -> str:
        """Generate mystery narrative"""
        narratives = [
            f"Something was wrong. The metrics didn't add up. The fleet's health degraded to {fleet_metrics.fleet_health_score:.1%}.",
            f"A puzzle emerged. What caused the cascade? The fleet investigated...",
            f"The data suggested something deeper. A mystery unfolded across the network.",
        ]
        return narratives[hash(str(event)) % len(narratives)]

    def _narrative_battle(self, event: Dict[str, Any], fleet_metrics: 'FleetMetrics') -> str:
        """Generate battle narrative"""
        threat_delta = event.get('threat_delta', 0)
        narratives = [
            f"The threat escalated. +{threat_delta:.1f} threat units in a single cycle. This was a crisis.",
            f"Battle stations. Threat level climbing: {fleet_metrics.threat_level_max}/10. The fleet held its breath.",
            f"The enemy was the market itself—volatility, anomalies, the weight of decisions. The fleet fought back.",
        ]
        return narratives[hash(str(event)) % len(narratives)]

    def _narrative_resolution(self, event: Dict[str, Any], fleet_metrics: 'FleetMetrics') -> str:
        """Generate resolution narrative"""
        health = event.get('health_score', fleet_metrics.fleet_health_score)
        narratives = [
            f"The solutions came slowly. Health improving: {health:.1%}. The fleet had survived.",
            f"Recovery. The metrics stabilized. Hope returned to the bridge.",
            f"In the end, they prevailed. The fleet emerged stronger, wiser.",
        ]
        return narratives[hash(str(event)) % len(narratives)]

    def _generate_title(self, entry_type: LoreEntryType, lore_event: Dict[str, Any]) -> str:
        """Generate title for the lore entry"""
        chapter = lore_event.get('chapter', '')
        if chapter:
            return chapter

        if entry_type == LoreEntryType.CHAPTER:
            return f"Chapter {self.entry_counter}: The Day Systems Spoke"
        elif entry_type == LoreEntryType.MYSTERY:
            return f"Mystery: The Cascading Failure"
        elif entry_type == LoreEntryType.BATTLE:
            return f"Battle: Against the Rising Tide"
        elif entry_type == LoreEntryType.RESOLUTION:
            return f"Resolution: How the Fleet Recovered"
        else:
            return f"Entry {self.entry_counter}"

    def _extract_tags(self, lore_event: Dict[str, Any]) -> List[str]:
        """Extract tags from lore event"""
        tags = []

        if 'critical_ships' in lore_event:
            tags.append('critical')
            tags.extend([f"ship:{s}" for s in lore_event['critical_ships']])

        if 'threat_delta' in lore_event:
            tags.append('threat-escalation')

        if 'health_score' in lore_event:
            if lore_event['health_score'] < 0.3:
                tags.append('critical-health')

        if 'spike' in lore_event:
            tags.append('system-load')

        return tags

    def _add_to_chronicle(self, entry: LoreEntry):
        """Add entry to chronicle and maintain ordering"""
        self.chronicle.append(entry)

    def _track_narrative_arcs(self, entry: LoreEntry):
        """Track ongoing mysteries and battles"""
        if entry.type == LoreEntryType.MYSTERY:
            self.active_mysteries[entry.entry_id] = entry
        elif entry.type == LoreEntryType.BATTLE:
            self.active_battles[entry.entry_id] = entry
        elif entry.type == LoreEntryType.RESOLUTION:
            # Resolve related mysteries/battles
            for mystery_id in list(self.active_mysteries.keys()):
                self.active_mysteries[mystery_id].related_entries.append(entry.entry_id)
                del self.active_mysteries[mystery_id]

    def _generate_entry_id(self) -> str:
        """Generate unique entry ID"""
        self.entry_counter += 1
        return f"lore-{self.entry_counter:06d}"

    def start_mission(self, mission_name: str, description: str) -> str:
        """Start recording a mission (test suite, experiment, etc.)"""
        mission_id = f"mission-{datetime.now().timestamp():.0f}-{self.entry_counter}"
        mission = {
            'mission_id': mission_id,
            'name': mission_name,
            'description': description,
            'start_time': datetime.now().timestamp(),
            'events': [],
            'status': 'in_progress',
        }
        self.mission_logs.append(mission)
        return mission_id

    def log_mission_event(self, mission_id: str, event_description: str):
        """Log an event within a mission"""
        for mission in self.mission_logs:
            if mission['mission_id'] == mission_id:
                mission['events'].append({
                    'timestamp': datetime.now().timestamp(),
                    'description': event_description
                })
                break

    def complete_mission(self, mission_id: str, status: str = 'success'):
        """Mark mission as complete"""
        for mission in self.mission_logs:
            if mission['mission_id'] == mission_id:
                mission['status'] = status
                mission['end_time'] = datetime.now().timestamp()
                break

    def generate_chronicle_summary(self) -> str:
        """Generate human-readable chronicle summary"""
        if not self.chronicle:
            return "The chronicle is empty. The fleet awaits its first story."

        summary = f"""
╔════════════════════════════════════════════════════════════════╗
║           USS CHAOSBRINGER FLEET CHRONICLE                     ║
╚════════════════════════════════════════════════════════════════╝

Total Entries: {len(self.chronicle)}
Chronicles Recorded:
"""
        for entry in self.chronicle[-20:]:  # Last 20 entries
            summary += f"""
  [{entry.type.value.upper()}] {entry.title}
    Stardate: {datetime.fromtimestamp(entry.timestamp).isoformat()}
    Severity: {entry.severity}
    Ships: {', '.join(entry.ships_involved)}
    Tags: {', '.join(entry.tags) if entry.tags else '(none)'}

    {entry.narrative}
"""

        if self.active_mysteries:
            summary += f"\n\nActive Mysteries: {len(self.active_mysteries)}\n"
            for mystery_id, entry in self.active_mysteries.items():
                summary += f"  - {entry.title}\n"

        if self.active_battles:
            summary += f"\nActive Battles: {len(self.active_battles)}\n"
            for battle_id, entry in self.active_battles.items():
                summary += f"  - {entry.title}\n"

        summary += "\n" + "="*70 + "\n"
        return summary

    def export_chronicle_json(self) -> str:
        """Export entire chronicle as JSON"""
        chronicle_data = [entry.to_dict() for entry in self.chronicle]
        return json.dumps(chronicle_data, default=str, indent=2)

    def generate_mission_report(self, mission_id: Optional[str] = None) -> str:
        """Generate report for a mission or all missions"""
        if mission_id:
            missions = [m for m in self.mission_logs if m['mission_id'] == mission_id]
        else:
            missions = self.mission_logs

        report = """
╔════════════════════════════════════════════════════════════════╗
║           MISSION LOGS                                         ║
╚════════════════════════════════════════════════════════════════╝
"""

        for mission in missions:
            duration = (mission.get('end_time', datetime.now().timestamp()) - mission['start_time']) if 'end_time' in mission else None
            duration_str = f"{duration:.2f}s" if duration else "in progress"

            report += f"""
MISSION: {mission['name']}
ID: {mission['mission_id']}
Description: {mission['description']}
Status: {mission['status']}
Duration: {duration_str}
Events: {len(mission['events'])}

Events:
"""
            for event in mission['events']:
                event_time = datetime.fromtimestamp(event['timestamp']).isoformat()
                report += f"  [{event_time}] {event['description']}\n"

            report += "\n" + "-"*70 + "\n"

        return report

    def get_chronicle_stats(self) -> Dict[str, Any]:
        """Get statistics about the chronicle"""
        type_counts = {}
        severity_counts = {}

        for entry in self.chronicle:
            type_name = entry.type.value
            type_counts[type_name] = type_counts.get(type_name, 0) + 1
            severity_counts[entry.severity] = severity_counts.get(entry.severity, 0) + 1

        return {
            'total_entries': len(self.chronicle),
            'by_type': type_counts,
            'by_severity': severity_counts,
            'active_mysteries': len(self.active_mysteries),
            'active_battles': len(self.active_battles),
            'total_missions': len(self.mission_logs),
        }

    def __repr__(self):
        stats = self.get_chronicle_stats()
        return f"<LoreEngine entries={stats['total_entries']} mysteries={stats['active_mysteries']} battles={stats['active_battles']}>"
