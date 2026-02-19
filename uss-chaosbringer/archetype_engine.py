#!/usr/bin/env python3
"""
PHASE XXII - ARCHETYPE ENGINE
Gives the federation mythic self-models and archetypal roles.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from datetime import datetime
from enum import Enum


class ArchetypeType(Enum):
    """Federation archetypal roles"""
    NAVIGATOR = "navigator"
    SENTINEL = "sentinel"
    TRICKSTER = "trickster"
    ORACLE = "oracle"
    HEALER = "healer"
    WARRIOR = "warrior"
    SAGE = "sage"
    LOVER = "lover"


@dataclass
class Archetype:
    """A single archetypal role"""
    archetype_id: str
    name: str
    archetype_type: ArchetypeType
    description: str
    core_qualities: List[str]
    shadow_aspects: List[str]
    associated_systems: List[str]
    influence_score: float = 0.5


@dataclass
class ArchetypeAlignment:
    """How much a system aligns with an archetype"""
    system_name: str
    archetype_type: ArchetypeType
    alignment_strength: float  # 0.0-1.0
    strength_history: List[float] = field(default_factory=list)


class ArchetypeEngine:
    """Federation mythic self-models"""

    def __init__(self):
        self.archetypes: Dict[str, Archetype] = {}
        self.alignments: Dict[str, List[ArchetypeAlignment]] = {}
        self._initialize_archetypes()
        self.narrative_coherence = 0.8
        self.mythic_balance = 0.0

    def _initialize_archetypes(self):
        """Initialize 8 core archetypes"""
        archetype_data = [
            ("navigator", "The Navigator", ArchetypeType.NAVIGATOR,
             "Guidepost for the federation's direction",
             ["vision", "clarity", "determination"], ["rigidity", "tunnel_vision"],
             ["orchestration_brain", "captain_chair_ai"]),
            ("sentinel", "The Sentinel", ArchetypeType.SENTINEL,
             "Guardian of boundaries and stability",
             ["protection", "vigilance", "strength"], ["paranoia", "oppression"],
             ["multiverse_reconciliation", "constitution_engine"]),
            ("trickster", "The Trickster", ArchetypeType.TRICKSTER,
             "Catalyst for change and transformation",
             ["creativity", "adaptability", "innovation"], ["chaos", "deception"],
             ["dream_engine", "paradox_harmonizer"]),
            ("oracle", "The Oracle", ArchetypeType.ORACLE,
             "Repository of wisdom and foresight",
             ["wisdom", "intuition", "prophecy"], ["obscurity", "overwhelming complexity"],
             ["temporal_memory", "dream_engine"]),
        ]

        for idx, (arc_id, name, arc_type, desc, qualities, shadows, systems) in enumerate(archetype_data):
            archetype = Archetype(
                archetype_id=f"archetype_{idx:02d}",
                name=name,
                archetype_type=arc_type,
                description=desc,
                core_qualities=qualities,
                shadow_aspects=shadows,
                associated_systems=systems,
            )
            self.archetypes[archetype.archetype_id] = archetype
            self.alignments[arc_id] = []

    def measure_system_alignment(self, system_name: str, archetype_type: ArchetypeType,
                                 strength: float) -> str:
        """Measure how much a system aligns with an archetype"""
        alignment = ArchetypeAlignment(
            system_name=system_name,
            archetype_type=archetype_type,
            alignment_strength=min(1.0, max(0.0, strength)),
        )

        key = archetype_type.value
        if key not in self.alignments:
            self.alignments[key] = []
        self.alignments[key].append(alignment)

        return f"alignment_{len(self.alignments.get(key, []))-1:04d}"

    def detect_archetypal_imbalance(self) -> Dict[str, Any]:
        """Detect if federation is over/under-emphasizing archetypes"""
        if not self.alignments:
            return {"balanced": True, "imbalances": []}

        avg_strengths = {}
        for arc_type, alignments in self.alignments.items():
            if alignments:
                avg_strengths[arc_type] = sum(a.alignment_strength for a in alignments) / len(alignments)

        imbalances = []
        for arc_type, strength in avg_strengths.items():
            if strength > 0.8:
                imbalances.append(f"Over-emphasis on {arc_type} (strength: {strength:.2f})")
            elif strength < 0.3:
                imbalances.append(f"Under-emphasis on {arc_type} (strength: {strength:.2f})")

        is_balanced = len(imbalances) == 0
        self.mythic_balance = 1.0 - (len(imbalances) * 0.15)

        return {
            "balanced": is_balanced,
            "imbalances": imbalances,
            "mythic_balance_score": max(0.0, self.mythic_balance),
            "archetype_strengths": avg_strengths,
        }

    def rewrite_narrative_arc(self, imbalance_type: str) -> Dict[str, Any]:
        """Rewrite narrative to restore mythic coherence"""
        adjustments = []

        if "trickster" in imbalance_type.lower() and "under" in imbalance_type.lower():
            adjustments.append("Introduce unexpected turns in diplomatic negotiations")
            adjustments.append("Allow creative problem-solving in unexpected ways")

        if "sentinel" in imbalance_type.lower() and "under" in imbalance_type.lower():
            adjustments.append("Strengthen constitutional constraints")
            adjustments.append("Emphasize defensive posture in external relations")

        if "navigator" in imbalance_type.lower() and "over" in imbalance_type.lower():
            adjustments.append("Allow more autonomous decision-making by subsystems")
            adjustments.append("Introduce uncertainty into strategic planning")

        self.narrative_coherence = min(0.95, self.narrative_coherence + 0.1)

        return {
            "imbalance_addressed": imbalance_type,
            "narrative_adjustments": adjustments,
            "new_narrative_coherence": self.narrative_coherence,
        }

    def get_federation_archetype_report(self) -> Dict[str, Any]:
        """Get comprehensive archetypal report"""
        report = {
            "timestamp": datetime.now().timestamp(),
            "active_archetypes": len(self.archetypes),
            "narrative_coherence": self.narrative_coherence,
            "mythic_balance_score": self.mythic_balance,
            "archetype_details": {},
        }

        for arc_id, archetype in self.archetypes.items():
            report["archetype_details"][archetype.name] = {
                "type": archetype.archetype_type.value,
                "description": archetype.description,
                "qualities": archetype.core_qualities,
                "shadow_aspects": archetype.shadow_aspects,
                "associated_systems": archetype.associated_systems,
            }

        return report
