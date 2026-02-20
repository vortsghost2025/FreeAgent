from dataclasses import dataclass
from typing import List

@dataclass
class HiddenHistoryEvent:
    year: int
    event_type: str
    description: str
    consequences: List[str]
    faction_involvement: List[str]
    cosmic_significance: float

@dataclass
class CreatureTaxonomy:
    species_name: str
    consciousness_signature: str
    habitat: str
    behavior_patterns: List[str]
    evolutionary_pressures: List[str]
    mythic_anomalies: List[str]
    genetic_marker: str

@dataclass
class RivalArchetype:
    name: str
    personality: str
    motives: List[str]
    domain: str
    conflict_patterns: List[str]
    alliance_preferences: List[str]
    cosmic_signature: str
