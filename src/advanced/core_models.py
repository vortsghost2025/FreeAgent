"""
Core models for the persistent universe framework.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from datetime import datetime

@dataclass
class Federation:
    id: str
    name: str
    stability: float
    members: List[str] = field(default_factory=list)
    history: List[str] = field(default_factory=list)

@dataclass
class Event:
    id: str
    federation_id: str
    event_type: str
    timestamp: datetime
    narrative_summary: str
    source_epoch: int
    target_epoch: int
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class UniverseState:
    epoch: int
    entropy: float
    narratives: Dict[str, Any] = field(default_factory=dict)
    metrics: Dict[str, Any] = field(default_factory=dict)
    federations: List[Federation] = field(default_factory=list)
    events: List[Event] = field(default_factory=list)

@dataclass
class Narrative:
    id: str
    text: str
    coherence: float
    related_events: List[str] = field(default_factory=list)
    timestamp: Optional[datetime] = None
