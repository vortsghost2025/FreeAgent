#!/usr/bin/env python3
"""
Faction system for Phase X governance.
Manages factions, faction membership, and influence calculations.
"""

from dataclasses import dataclass
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from governance.governance_types import (
    Faction, FactionAllegiance, FactionIdeology
)


class FactionManager:
    """Manages factions and ship allegiances"""

    def __init__(self):
        self.factions: Dict[str, Faction] = {}
        self.allegiances: Dict[str, FactionAllegiance] = {}  # ship_name -> FactionAllegiance
        self.enabled = True
        self._initialize_default_factions()

    def _initialize_default_factions(self):
        """Initialize default factions for the fleet"""
        if not self.enabled:
            return

        default_factions = [
            ("faction_culture", "Cultural Bloc", FactionIdeology.CULTURE_FIRST,
             "Prioritizes narrative, culture, and mythic expression"),
            ("faction_science", "Science Faction", FactionIdeology.SCIENCE_FIRST,
             "Prioritizes anomaly research and knowledge"),
            ("faction_law", "Law & Order", FactionIdeology.LAW_ORDER,
             "Prioritizes rules, continuity, and canonical stability"),
            ("faction_pragma", "Pragmatist Coalition", FactionIdeology.PRAGMATISM,
             "Prioritizes practical solutions and balance"),
        ]

        for fid, name, ideology, description in default_factions:
            faction = Faction(
                faction_id=fid,
                name=name,
                ideology=ideology,
                description=description,
                created_timestamp=datetime.now().timestamp()
            )
            self.factions[fid] = faction

    def create_faction(self, name: str, ideology: FactionIdeology,
                      description: str) -> Tuple[bool, Faction]:
        """Create a new faction"""
        if not self.enabled:
            return False, None

        faction_id = f"faction_{len(self.factions):04d}"
        faction = Faction(
            faction_id=faction_id,
            name=name,
            ideology=ideology,
            description=description,
            created_timestamp=datetime.now().timestamp()
        )

        self.factions[faction_id] = faction
        return True, faction

    def recruit_ship(self, ship_name: str, faction_id: str,
                    strength: float = 0.5) -> Tuple[bool, str]:
        """Recruit a ship to a faction"""
        if not self.enabled:
            return False, "Faction manager disabled"

        if faction_id not in self.factions:
            return False, f"Faction {faction_id} not found"

        # Create allegiance
        allegiance = FactionAllegiance(
            ship_name=ship_name,
            faction_id=faction_id,
            strength=strength,
            joined_timestamp=datetime.now().timestamp()
        )

        self.allegiances[ship_name] = allegiance

        # Add ship to faction members
        faction = self.factions[faction_id]
        if ship_name not in faction.members:
            faction.members.append(ship_name)

        return True, f"{ship_name} joined {faction.name} with strength {strength}"

    def auto_align_ship(self, ship_name: str, personality_archetype: str) -> Tuple[bool, str]:
        """Automatically align ship to faction based on personality"""
        if not self.enabled:
            return False, "Faction manager disabled"

        # Map personalities to faction ideologies
        archetype_to_faction = {
            "NARRATOR": "faction_culture",        # MythosWeaver
            "OBSESSIVE": "faction_science",       # AnomalyHunter
            "STERN": "faction_law",               # ContinuityGuardian
        }

        faction_id = archetype_to_faction.get(personality_archetype, "faction_pragma")
        strength = 0.8 if personality_archetype in archetype_to_faction else 0.5

        return self.recruit_ship(ship_name, faction_id, strength)

    def calculate_faction_influence(self) -> Dict[str, float]:
        """Calculate relative influence of each faction"""
        if not self.enabled:
            return {}

        total_ships = len(self.allegiances)
        if total_ships == 0:
            return {fid: 0.5 for fid in self.factions}

        influence = {}
        for faction_id, faction in self.factions.items():
            member_count = len(faction.members)
            # Influence = raw member count + weighted by allegiance strength
            strength_sum = sum(
                self.allegiances[member].strength
                for member in faction.members
                if member in self.allegiances
            )

            raw_influence = member_count / total_ships if total_ships > 0 else 0
            weighted_influence = strength_sum / total_ships if total_ships > 0 else 0
            faction.influence_score = (raw_influence + weighted_influence) / 2

            influence[faction_id] = faction.influence_score

        return influence

    def get_ship_faction(self, ship_name: str) -> Optional[Faction]:
        """Get the faction a ship belongs to"""
        if ship_name not in self.allegiances:
            return None

        allegiance = self.allegiances[ship_name]
        return self.factions.get(allegiance.faction_id)

    def get_ship_alignment_strength(self, ship_name: str) -> float:
        """Get how strongly a ship is aligned with its faction"""
        if ship_name not in self.allegiances:
            return 0.0

        return self.allegiances[ship_name].strength

    def declare_alliance(self, faction1_id: str, faction2_id: str) -> Tuple[bool, str]:
        """Declare alliance between two factions"""
        if not self.enabled:
            return False, "Faction manager disabled"

        if faction1_id not in self.factions or faction2_id not in self.factions:
            return False, "One or both factions not found"

        faction1 = self.factions[faction1_id]
        faction2 = self.factions[faction2_id]

        return True, f"{faction1.name} and {faction2.name} are now allied"

    def declare_rivalry(self, faction1_id: str, faction2_id: str) -> Tuple[bool, str]:
        """Declare rivalry between two factions"""
        if not self.enabled:
            return False, "Faction manager disabled"

        if faction1_id not in self.factions or faction2_id not in self.factions:
            return False, "One or both factions not found"

        faction1 = self.factions[faction1_id]
        faction2 = self.factions[faction2_id]

        return True, f"{faction1.name} and {faction2.name} are now rivals"

    def merge_factions(self, faction1_id: str, faction2_id: str) -> Tuple[bool, Faction]:
        """Merge two factions into one"""
        if not self.enabled:
            return False, None

        if faction1_id not in self.factions or faction2_id not in self.factions:
            return False, None

        faction1 = self.factions[faction1_id]
        faction2 = self.factions[faction2_id]

        # Merge members
        faction1.members.extend(faction2.members)
        faction1.members = list(set(faction1.members))  # Remove duplicates

        # Mark faction2 as dissolved
        del self.factions[faction2_id]

        return True, faction1

    def dissolve_faction(self, faction_id: str) -> Tuple[bool, str]:
        """Dissolve a faction and reassign members"""
        if not self.enabled:
            return False, "Faction manager disabled"

        if faction_id not in self.factions:
            return False, "Faction not found"

        faction = self.factions[faction_id]
        disbanding_members = list(faction.members)

        # Reassign to Pragmatist Coalition (neutral faction)
        pragmatist_id = "faction_pragma"
        for member in disbanding_members:
            if member in self.allegiances:
                self.allegiances[member].faction_id = pragmatist_id

        # Add to pragmatist faction
        if pragmatist_id in self.factions:
            self.factions[pragmatist_id].members.extend(disbanding_members)

        # Delete original faction
        del self.factions[faction_id]

        return True, f"{faction.name} dissolved. Members reassigned to Pragmatist Coalition."

    def get_faction_members(self, faction_id: str) -> List[str]:
        """Get all ships in a faction"""
        if faction_id not in self.factions:
            return []

        return self.factions[faction_id].members

    def get_faction_stats(self) -> Dict[str, Any]:
        """Get aggregate faction statistics"""
        stats = {}
        for faction_id, faction in self.factions.items():
            stats[faction_id] = {
                "name": faction.name,
                "members": len(faction.members),
                "influence": faction.influence_score,
                "ideology": faction.ideology.value,
            }
        return stats
