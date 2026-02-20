# Federation Game Events Engine
# Complete event system for THE FEDERATION GAME
# Handles diplomatic crises, dream destabilizations, paradox manifestations, and more

import random
import uuid
import time
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Callable
from enum import Enum
from datetime import datetime, timedelta
import json


class EventType(Enum):
    """All possible event type classifications"""
    DIPLOMATIC_CRISIS = "diplomatic_crisis"
    DREAM_DESTABILIZATION = "dream_destabilization"
    RIVAL_MOVE = "rival_move"
    PROPHECY = "prophecy"
    RESOURCE_EVENT = "resource_event"
    CULTURAL_SHIFT = "cultural_shift"
    PARADOX_MANIFESTATION = "paradox_manifestation"
    FIRST_CONTACT = "first_contact"
    NATURAL_DISASTER = "natural_disaster"
    TECHNOLOGICAL_BREAKTHROUGH = "technological_breakthrough"
    ALLIANCE_FORMATION = "alliance_formation"
    ESPIONAGE_UNCOVERED = "espionage_uncovered"


class EventSeverity(Enum):
    """Event severity levels"""
    MINOR = 1
    MODERATE = 2
    MAJOR = 3
    CRITICAL = 4


class EffectType(Enum):
    """Types of effects events can trigger"""
    DIPLOMACY_IMPACT = "diplomacy_impact"
    CONSCIOUSNESS_IMPACT = "consciousness_impact"
    RIVAL_IMPACT = "rival_impact"
    RESOURCE_IMPACT = "resource_impact"
    STABILITY_IMPACT = "stability_impact"
    TECH_IMPACT = "tech_impact"
    CULTURE_IMPACT = "culture_impact"
    PARADOX_IMPACT = "paradox_impact"


@dataclass
class GameEffect:
    """Represents an effect that an event can trigger"""
    effect_type: EffectType
    target: str  # subsystem or entity name
    magnitude: float  # -1.0 to 1.0
    duration: int  # in turns/minutes
    description: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            'effect_type': self.effect_type.value,
            'target': self.target,
            'magnitude': self.magnitude,
            'duration': self.duration,
            'description': self.description
        }


@dataclass
class GameChoice:
    """Represents a choice a player can make in response to an event"""
    id: str
    text: str
    consequences: List[GameEffect]
    risk_level: float  # 0.0 to 1.0
    reward_level: float  # 0.0 to 1.0
    requirements: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'text': self.text,
            'risk_level': self.risk_level,
            'reward_level': self.reward_level,
            'consequences': [e.to_dict() for e in self.consequences],
            'requirements': self.requirements
        }


@dataclass
class GameEvent:
    """Core event dataclass for THE FEDERATION GAME"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    event_type: EventType = EventType.DIPLOMATIC_CRISIS
    severity: EventSeverity = EventSeverity.MODERATE
    description: str = ""
    long_description: str = ""
    effects: List[GameEffect] = field(default_factory=list)
    choices: List[GameChoice] = field(default_factory=list)
    required_subsystems: List[str] = field(default_factory=list)
    trigger_conditions: Dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    expiration_time: Optional[float] = None
    can_chain: bool = True
    chain_probability: float = 0.3
    metadata: Dict[str, Any] = field(default_factory=dict)

    def is_expired(self) -> bool:
        """Check if event has expired"""
        if self.expiration_time is None:
            return False
        return time.time() > self.expiration_time

    def to_dict(self) -> Dict[str, Any]:
        """Serialize event to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'event_type': self.event_type.value,
            'severity': self.severity.name,
            'description': self.description,
            'long_description': self.long_description,
            'effects': [e.to_dict() for e in self.effects],
            'choices': [c.to_dict() for c in self.choices],
            'created_at': datetime.fromtimestamp(self.created_at).isoformat(),
            'metadata': self.metadata
        }


class EventGenerator:
    """Generates random and contextual events for the game"""

    def __init__(self, subsystems: Optional[Dict[str, Any]] = None):
        self.subsystems = subsystems or {}
        self.faction_names = [
            "Arcturian Alliance", "Sirius Collective", "Vega Directorate",
            "Andromeda Syndicate", "Betelgeuse Empire", "Polaris Federation",
            "Rigel Corporatocracy", "Altair Council", "Deneb State"
        ]
        self.resource_types = ["dilithium", "tachyon", "exotic_matter", "consciousness_energy", "temporal_flux"]
        self.prophecy_themes = ["transcendence", "unity", "conflict", "transformation", "revelation", "extinction"]

    def generate_random_event(self) -> GameEvent:
        """Generate a random event of any type"""
        event_type = random.choice(list(EventType))
        return self._generate_event_by_type(event_type)

    def _generate_event_by_type(self, event_type: EventType) -> GameEvent:
        """Generate event based on specific type"""
        if event_type == EventType.DIPLOMATIC_CRISIS:
            return self.generate_diplomatic_crisis()
        elif event_type == EventType.DREAM_DESTABILIZATION:
            return self.generate_dream_destabilization()
        elif event_type == EventType.RIVAL_MOVE:
            return self.generate_rival_move()
        elif event_type == EventType.PROPHECY:
            return self.generate_prophecy()
        elif event_type == EventType.RESOURCE_EVENT:
            return self.generate_resource_event()
        elif event_type == EventType.CULTURAL_SHIFT:
            return self.generate_cultural_shift()
        elif event_type == EventType.PARADOX_MANIFESTATION:
            return self.generate_paradox_manifestation()
        elif event_type == EventType.FIRST_CONTACT:
            return self.generate_first_contact()
        else:
            return self.generate_random_event()

    def generate_diplomatic_crisis(self) -> GameEvent:
        """Generate a diplomatic crisis event"""
        faction1 = random.choice(self.faction_names)
        faction2 = random.choice([f for f in self.faction_names if f != faction1])
        severity = random.choice(list(EventSeverity))

        event = GameEvent(
            name=f"Diplomatic Crisis: {faction1} vs {faction2}",
            event_type=EventType.DIPLOMATIC_CRISIS,
            severity=severity,
            description=f"{faction1} has issued ultimatum to {faction2} over territorial disputes.",
            long_description=f"Tensions have escalated dramatically between {faction1} and {faction2}. "
                           f"A critical treaty is at stake, and the Federation's mediation is required. "
                           f"Failure could lead to armed conflict.",
            required_subsystems=["diplomacy", "intelligence"],
            metadata={"faction1": faction1, "faction2": faction2, "crisis_type": "territorial"}
        )

        # Add effects
        event.effects.append(GameEffect(
            effect_type=EffectType.DIPLOMACY_IMPACT,
            target="federation_stability",
            magnitude=-0.3 * severity.value,
            duration=300,
            description=f"Federation diplomatic relations strained due to {faction1}-{faction2} tension"
        ))

        # Add choices
        event.choices.append(GameChoice(
            id="mediate",
            text="Send mediators to negotiate peace",
            consequences=[
                GameEffect(EffectType.DIPLOMACY_IMPACT, "federation_influence", 0.2, 300, "Improved influence through successful mediation"),
                GameEffect(EffectType.RESOURCE_IMPACT, "time_investment", -0.3, 60, "Significant time investment required")
            ],
            risk_level=0.3,
            reward_level=0.7
        ))

        event.choices.append(GameChoice(
            id="support_faction1",
            text=f"Support {faction1}'s position",
            consequences=[
                GameEffect(EffectType.DIPLOMACY_IMPACT, faction1, 0.5, 600, f"Allied with {faction1}"),
                GameEffect(EffectType.DIPLOMACY_IMPACT, faction2, -0.6, 600, f"Antagonized {faction2}")
            ],
            risk_level=0.8,
            reward_level=0.6
        ))

        event.choices.append(GameChoice(
            id="remain_neutral",
            text="Remain neutral and observe",
            consequences=[
                GameEffect(EffectType.STABILITY_IMPACT, "federation", -0.1, 200, "Inaction perceived as weakness")
            ],
            risk_level=0.2,
            reward_level=0.2
        ))

        return event

    def generate_dream_destabilization(self) -> GameEvent:
        """Generate a dream reality destabilization event"""
        severity = random.choice(list(EventSeverity))
        num_worlds = random.randint(3, 7)

        event = GameEvent(
            name=f"Dream Destabilization Across {num_worlds} Realities",
            event_type=EventType.DREAM_DESTABILIZATION,
            severity=severity,
            description=f"Dreamscape anomalies detected in {num_worlds} parallel realities.",
            long_description=f"The boundary between dream and reality is collapsing across multiple timelines. "
                           f"Consciousness networks report cascading instabilities. Reality coherence is degrading. "
                           f"Immediate intervention required to prevent dreamscape collapse.",
            required_subsystems=["consciousness", "reality_engine"],
            metadata={"affected_realities": num_worlds, "coherence_loss_percent": severity.value * 25}
        )

        event.effects.append(GameEffect(
            effect_type=EffectType.CONSCIOUSNESS_IMPACT,
            target="reality_coherence",
            magnitude=-0.4 * severity.value,
            duration=180,
            description="Reality stability compromised across multiple timelines"
        ))

        event.choices.append(GameChoice(
            id="emergency_stabilization",
            text="Activate emergency reality stabilization protocols",
            consequences=[
                GameEffect(EffectType.CONSCIOUSNESS_IMPACT, "reality_coherence", 0.3, 300, "Emergency stabilization partial success"),
                GameEffect(EffectType.RESOURCE_IMPACT, "energy_reserves", -0.5, 600, "Massive energy expenditure")
            ],
            risk_level=0.4,
            reward_level=0.8
        ))

        event.choices.append(GameChoice(
            id="allow_drift",
            text="Allow realities to drift apart (minimize losses)",
            consequences=[
                GameEffect(EffectType.CONSCIOUSNESS_IMPACT, "reality_coherence", -0.15, 600, "Permanent reality divergence"),
                GameEffect(EffectType.DIPLOMACY_IMPACT, "separated_factions", -0.3, 999999, "Permanent diplomatic isolation")
            ],
            risk_level=0.9,
            reward_level=0.1
        ))

        return event

    def generate_rival_move(self) -> GameEvent:
        """Generate a competitive move by a rival faction"""
        rival = random.choice(self.faction_names)
        move_type = random.choice(["territory_expansion", "technology_theft", "alliance_poaching", "economic_sabotage"])
        severity = random.choice(list(EventSeverity))

        event = GameEvent(
            name=f"Rival Move: {rival} - {move_type.replace('_', ' ').title()}",
            event_type=EventType.RIVAL_MOVE,
            severity=severity,
            description=f"{rival} has made an aggressive competitive move.",
            long_description=self._describe_rival_move(rival, move_type),
            required_subsystems=["intelligence", "strategy"],
            metadata={"rival": rival, "move_type": move_type}
        )

        event.effects.append(GameEffect(
            effect_type=EffectType.RIVAL_IMPACT,
            target=f"{rival}_influence",
            magnitude=0.3 * severity.value,
            duration=600,
            description=f"{rival} gaining strategic advantage"
        ))

        event.choices.append(GameChoice(
            id="counter_move",
            text="Execute counter-strategy",
            consequences=[
                GameEffect(EffectType.RIVAL_IMPACT, "competitive_position", 0.2, 400, "Regained positional advantage"),
                GameEffect(EffectType.RESOURCE_IMPACT, "strategic_resources", -0.25, 300, "Resources invested in counter-move")
            ],
            risk_level=0.5,
            reward_level=0.6
        ))

        event.choices.append(GameChoice(
            id="form_coalition",
            text="Form coalition against rival",
            consequences=[
                GameEffect(EffectType.DIPLOMACY_IMPACT, "allied_influence", 0.4, 900, "Strong coalition formed"),
                GameEffect(EffectType.RIVAL_IMPACT, rival, -0.5, 900, f"{rival} isolated and weakened")
            ],
            risk_level=0.3,
            reward_level=0.8
        ))

        return event

    def generate_prophecy(self) -> GameEvent:
        """Generate a prophecy event"""
        theme = random.choice(self.prophecy_themes)
        severity = random.choice([EventSeverity.MAJOR, EventSeverity.CRITICAL])

        event = GameEvent(
            name=f"Prophecy: The Age of {theme.capitalize()}",
            event_type=EventType.PROPHECY,
            severity=severity,
            description=f"Ancient prophecies speak of the coming {theme}.",
            long_description=f"Seers across the Federation report synchronized visions of {theme}. "
                           f"These prophecies have proven accurate historically. "
                           f"The Federation must prepare for the prophesied transformation.",
            required_subsystems=["prophecy_engine", "consciousness"],
            metadata={"theme": theme, "prophecy_accuracy": random.uniform(0.7, 1.0)}
        )

        event.effects.append(GameEffect(
            effect_type=EffectType.PARADOX_IMPACT,
            target="timeline_probability",
            magnitude=random.choice([-1, 1]) * 0.3,
            duration=9999,
            description=f"Timeline influenced by prophecy of {theme}"
        ))

        event.choices.append(GameChoice(
            id="embrace_prophecy",
            text="Embrace and fulfill the prophecy",
            consequences=[
                GameEffect(EffectType.CULTURE_IMPACT, "federation_culture", 0.5, 1800, "Culture unified by shared destiny"),
                GameEffect(EffectType.CONSCIOUSNESS_IMPACT, "collective_will", 0.4, 1800, "Collective consciousness strengthened")
            ],
            risk_level=0.6,
            reward_level=0.9
        ))

        event.choices.append(GameChoice(
            id="fight_prophecy",
            text="Resist and fight against the prophecy",
            consequences=[
                GameEffect(EffectType.PARADOX_IMPACT, "paradox_manifestation", 0.7, 600, "Temporal paradoxes multiply"),
                GameEffect(EffectType.STABILITY_IMPACT, "federation", -0.4, 600, "Timeline instability increases")
            ],
            risk_level=0.9,
            reward_level=0.2
        ))

        return event

    def generate_resource_event(self) -> GameEvent:
        """Generate a resource scarcity or abundance event"""
        resource = random.choice(self.resource_types)
        is_scarcity = random.choice([True, False])
        severity = random.choice(list(EventSeverity))

        event = GameEvent(
            name=f"{'Scarcity' if is_scarcity else 'Abundance'} Event: {resource.replace('_', ' ').title()}",
            event_type=EventType.RESOURCE_EVENT,
            severity=severity,
            description=f"Supply of {resource} has {'drastically declined' if is_scarcity else 'surged'}.",
            long_description=f"Markets are reacting to the {resource} {'shortage' if is_scarcity else 'glut'}. "
                           f"Trade routes are being disrupted. Production is {'halting' if is_scarcity else 'accelerating'}.",
            required_subsystems=["economy", "logistics"],
            metadata={"resource": resource, "is_scarcity": is_scarcity, "impact_magnitude": severity.value}
        )

        impact_dir = -1 if is_scarcity else 1
        event.effects.append(GameEffect(
            effect_type=EffectType.RESOURCE_IMPACT,
            target=f"{resource}_availability",
            magnitude=impact_dir * 0.5 * severity.value,
            duration=600,
            description=f"{resource} {'shortage' if is_scarcity else 'surplus'} affecting economy"
        ))

        event.choices.append(GameChoice(
            id="strategic_reserves",
            text="Activate strategic reserves" if is_scarcity else "Establish price controls",
            consequences=[
                GameEffect(EffectType.RESOURCE_IMPACT, "economic_stability", 0.2 if is_scarcity else -0.1, 400, "Economic stabilization"),
                GameEffect(EffectType.RESOURCE_IMPACT, "long_term_capacity", -0.1 if is_scarcity else 0.2, 1200, "Capacity adjustment")
            ],
            risk_level=0.4,
            reward_level=0.6
        ))

        return event

    def generate_cultural_shift(self) -> GameEvent:
        """Generate a cultural transformation event"""
        shift_type = random.choice(["art_renaissance", "philosophical_revolution", "values_inversion", "generational_gap"])
        severity = random.choice(list(EventSeverity))

        event = GameEvent(
            name=f"Cultural Shift: {shift_type.replace('_', ' ').title()}",
            event_type=EventType.CULTURAL_SHIFT,
            severity=severity,
            description=f"A major cultural transformation is sweeping across the Federation.",
            long_description=f"Sociologists report unprecedented {shift_type.replace('_', ' ')} across multiple species. "
                           f"Traditional values are being questioned. New art forms are emerging. "
                           f"Society is fundamentally realigning.",
            required_subsystems=["culture", "sociology"],
            metadata={"shift_type": shift_type, "affected_populations": random.randint(5, 15)}
        )

        event.effects.append(GameEffect(
            effect_type=EffectType.CULTURE_IMPACT,
            target="cultural_unity",
            magnitude=random.choice([-1, 1]) * 0.4,
            duration=1200,
            description=f"Cultural paradigm shift: {shift_type}"
        ))

        event.choices.append(GameChoice(
            id="embrace_shift",
            text="Support and accelerate the cultural shift",
            consequences=[
                GameEffect(EffectType.CULTURE_IMPACT, "innovation", 0.6, 1200, "Innovation surge"),
                GameEffect(EffectType.STABILITY_IMPACT, "traditional_elements", -0.3, 1200, "Traditional power bases eroded")
            ],
            risk_level=0.6,
            reward_level=0.8
        ))

        return event

    def generate_paradox_manifestation(self) -> GameEvent:
        """Generate a paradox/temporal anomaly event"""
        severity = random.choice([EventSeverity.MAJOR, EventSeverity.CRITICAL])

        event = GameEvent(
            name="Paradox Manifestation: Temporal Anomaly",
            event_type=EventType.PARADOX_MANIFESTATION,
            severity=severity,
            description="A paradox has become reality. Causality is breaking down.",
            long_description="Reality itself is fracturing. Multiple timelines are attempting to exist simultaneously. "
                           "Paradoxes that should be impossible are manifesting physically. "
                           "The Federation's physicists are baffled. Reality coherence is at critical levels.",
            required_subsystems=["paradox_engine", "reality_stabilization", "consciousness"],
            metadata={"paradox_severity": severity.value, "timeline_conflicts": random.randint(2, 5)}
        )

        event.effects.append(GameEffect(
            effect_type=EffectType.PARADOX_IMPACT,
            target="reality_stability",
            magnitude=-0.6 * severity.value,
            duration=400,
            description="Paradox distorting timeline stability"
        ))

        event.choices.append(GameChoice(
            id="resolve_paradox",
            text="Initiate paradox resolution sequence",
            consequences=[
                GameEffect(EffectType.PARADOX_IMPACT, "timeline_conflicts", -0.8, 200, "Paradox resolved through timeline merging"),
                GameEffect(EffectType.CONSCIOUSNESS_IMPACT, "memory_anomalies", 0.3, 300, "Some citizens lose memories of erased timeline")
            ],
            risk_level=0.7,
            reward_level=0.7
        ))

        return event

    def generate_first_contact(self) -> GameEvent:
        """Generate a first contact with alien civilization event"""
        alien_race = f"{random.choice(['The', 'Ancient', 'Free', 'United'])} {random.choice(['Beings', 'Collective', 'Dynasty', 'Assembly'])}"
        severity = random.choice(list(EventSeverity))

        event = GameEvent(
            name=f"First Contact: {alien_race}",
            event_type=EventType.FIRST_CONTACT,
            severity=severity,
            description=f"An entirely new civilization has been encountered: {alien_race}.",
            long_description=f"{alien_race} has emerged in Federation space. "
                           f"Their intentions are unknown. Their technology appears comparable or superior. "
                           f"Diplomatic protocols are being activated. This moment will define Federation history.",
            required_subsystems=["diplomacy", "first_contact", "intelligence"],
            metadata={"alien_race": alien_race, "threat_level": random.uniform(0, 1)}
        )

        event.effects.append(GameEffect(
            effect_type=EffectType.DIPLOMACY_IMPACT,
            target="first_contact_protocols",
            magnitude=1.0,
            duration=900,
            description=f"First contact situation with {alien_race}"
        ))

        event.choices.append(GameChoice(
            id="friendly_approach",
            text="Extend a peaceful greeting",
            consequences=[
                GameEffect(EffectType.DIPLOMACY_IMPACT, f"{alien_race}_relations", 0.3, 1200, "Peaceful contact established"),
                GameEffect(EffectType.CULTURE_IMPACT, "fed_diversity", 0.5, 1800, "Federation enriched by new perspectives")
            ],
            risk_level=0.3,
            reward_level=0.8
        ))

        event.choices.append(GameChoice(
            id="defensive_stance",
            text="Adopt defensive military posture",
            consequences=[
                GameEffect(EffectType.DIPLOMACY_IMPACT, f"{alien_race}_trust", -0.5, 900, "First contact complicated by military tension"),
                GameEffect(EffectType.STABILITY_IMPACT, "federation", -0.2, 600, "Federation enters heightened alert")
            ],
            risk_level=0.7,
            reward_level=0.2
        ))

        return event

    @staticmethod
    def _describe_rival_move(rival: str, move_type: str) -> str:
        """Generate detailed description of rival move"""
        descriptions = {
            "territory_expansion": f"{rival} has suddenly claimed three previously neutral systems.",
            "technology_theft": f"{rival} has stolen advanced technology blueprints from Federation archives.",
            "alliance_poaching": f"{rival} is aggressively recruiting Federation allies to their banner.",
            "economic_sabotage": f"{rival} has infiltrated trade networks and disrupted commerce."
        }
        return descriptions.get(move_type, f"{rival} has made a strategic competitive move.")


class EventSystem:
    """Complete event system managing generation, triggering, cascading, and resolution"""

    def __init__(self, event_generator: Optional[EventGenerator] = None):
        self.generator = event_generator or EventGenerator()
        self.active_events: Dict[str, GameEvent] = {}
        self.event_log: List[Dict[str, Any]] = []
        self.event_chains: Dict[str, List[str]] = {}  # event_id -> list of chained event ids
        self.subsystem_callbacks: Dict[str, List[Callable]] = {}  # subsystem_name -> list of callbacks
        self.event_history_max = 1000
        self.choice_history: Dict[str, Dict[str, Any]] = {}  # event_id -> choice details

    def register_subsystem_callback(self, subsystem: str, callback: Callable) -> None:
        """Register a callback for a subsystem to handle events"""
        if subsystem not in self.subsystem_callbacks:
            self.subsystem_callbacks[subsystem] = []
        self.subsystem_callbacks[subsystem].append(callback)

    def generate_random_event(self) -> GameEvent:
        """Generate and add a random event to active events"""
        event = self.generator.generate_random_event()
        self.active_events[event.id] = event
        self._log_event_created(event)
        return event

    def trigger_event_chain(self, parent_event_id: str) -> List[GameEvent]:
        """Trigger cascading events from a parent event"""
        if parent_event_id not in self.active_events:
            return []

        parent = self.active_events[parent_event_id]
        if not parent.can_chain:
            return []

        chained_events = []

        # Potentially trigger chained events based on cascade probability
        if random.random() < parent.chain_probability:
            for _ in range(random.randint(1, 3)):
                chain_event = self.generator.generate_random_event()
                chain_event.metadata["parent_event"] = parent_event_id
                chain_event.chain_probability *= 0.6  # Reduce chain probability for deeper chains

                self.active_events[chain_event.id] = chain_event
                chained_events.append(chain_event)

                # Track event chain
                if parent_event_id not in self.event_chains:
                    self.event_chains[parent_event_id] = []
                self.event_chains[parent_event_id].append(chain_event.id)

                self._log_event_created(chain_event)

        return chained_events

    def player_choice_impacts(self, event_id: str, choice_id: str) -> Dict[str, Any]:
        """Handle player decision and apply consequences"""
        if event_id not in self.active_events:
            return {"error": "Event not found"}

        event = self.active_events[event_id]

        # Find the chosen option
        chosen_choice = None
        for choice in event.choices:
            if choice.id == choice_id:
                chosen_choice = choice
                break

        if chosen_choice is None:
            return {"error": "Choice not found"}

        # Check if choice requirements are met
        if chosen_choice.requirements:
            for req_key, req_val in chosen_choice.requirements.items():
                # Placeholder: check against game state
                pass

        # Apply consequences
        consequences_applied = []
        for effect in chosen_choice.consequences:
            consequence = self._apply_effect(effect)
            consequences_applied.append(consequence)

        # Record choice
        self.choice_history[event_id] = {
            "choice_id": choice_id,
            "choice_text": chosen_choice.text,
            "consequences": [e.to_dict() for e in chosen_choice.consequences],
            "timestamp": time.time()
        }

        # Trigger cascade if applicable
        chained = self.trigger_event_chain(event_id)

        return {
            "success": True,
            "choice": chosen_choice.text,
            "consequences": consequences_applied,
            "chained_events": len(chained),
            "chained_event_ids": [e.id for e in chained]
        }

    def resolve_event(self, event_id: str) -> Dict[str, Any]:
        """Apply final consequences and remove event from active pool"""
        if event_id not in self.active_events:
            return {"error": "Event not found"}

        event = self.active_events[event_id]

        # Apply base effects if no choice was made
        if event_id not in self.choice_history:
            for effect in event.effects:
                self._apply_effect(effect)

        # Notify all registered subsystems
        self._notify_subsystems(event)

        # Move to history
        event_record = {
            "event": event.to_dict(),
            "player_choice": self.choice_history.get(event_id),
            "chained_from": event.metadata.get("parent_event"),
            "resolved_at": datetime.utcnow().isoformat()
        }
        self.event_log.append(event_record)

        # Maintain history size
        if len(self.event_log) > self.event_history_max:
            self.event_log = self.event_log[-self.event_history_max:]

        # Remove from active
        del self.active_events[event_id]

        return {
            "success": True,
            "event_id": event_id,
            "event_name": event.name,
            "resolved_at": event_record["resolved_at"]
        }

    def get_event_log(self, limit: int = 50, event_type: Optional[EventType] = None) -> List[Dict[str, Any]]:
        """Get event history with optional filtering"""
        filtered_log = self.event_log

        if event_type:
            filtered_log = [e for e in filtered_log if e["event"]["event_type"] == event_type.value]

        return filtered_log[-limit:]

    def get_active_events(self, severity: Optional[EventSeverity] = None) -> List[GameEvent]:
        """Get currently active events, optionally filtered by severity"""
        events = list(self.active_events.values())

        if severity:
            events = [e for e in events if e.severity == severity]

        # Filter out expired events
        active = [e for e in events if not e.is_expired()]

        # Update active_events to remove expired
        for event in events:
            if event.is_expired() and event.id in self.active_events:
                del self.active_events[event.id]

        return active

    def _apply_effect(self, effect: GameEffect) -> Dict[str, Any]:
        """Apply a single effect to the game state"""
        # Placeholder: integrate with actual game state system
        return {
            "effect_type": effect.effect_type.value,
            "target": effect.target,
            "magnitude": effect.magnitude,
            "applied": True,
            "timestamp": time.time()
        }

    def _notify_subsystems(self, event: GameEvent) -> None:
        """Notify all relevant subsystems about event resolution"""
        for subsystem in event.required_subsystems:
            if subsystem in self.subsystem_callbacks:
                for callback in self.subsystem_callbacks[subsystem]:
                    try:
                        callback(event)
                    except Exception as e:
                        # Log but don't crash on subsystem callback errors
                        print(f"Error in {subsystem} callback: {str(e)}")

    def _log_event_created(self, event: GameEvent) -> None:
        """Log event creation"""
        log_entry = {
            "action": "event_created",
            "event_id": event.id,
            "event_type": event.event_type.value,
            "name": event.name,
            "severity": event.severity.name,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.event_log.append(log_entry)

    def get_event_statistics(self) -> Dict[str, Any]:
        """Get summary statistics about events"""
        return {
            "total_events_created": len(self.event_log),
            "active_events": len(self.active_events),
            "critical_events": len([e for e in self.active_events.values() if e.severity == EventSeverity.CRITICAL]),
            "events_by_type": self._count_by_type(),
            "events_by_severity": self._count_by_severity(),
            "active_chains": len(self.event_chains)
        }

    def _count_by_type(self) -> Dict[str, int]:
        """Count events by type"""
        counts = {}
        for event in list(self.active_events.values()) + [e.get("event") for e in self.event_log if isinstance(e, dict) and "event" in e]:
            if event:
                if isinstance(event, dict):
                    if "event_type" in event:
                        counts[event["event_type"]] = counts.get(event["event_type"], 0) + 1
                elif isinstance(event, GameEvent):
                    counts[event.event_type.value] = counts.get(event.event_type.value, 0) + 1
        return counts

    def _count_by_severity(self) -> Dict[str, int]:
        """Count active events by severity"""
        counts = {s.name: 0 for s in EventSeverity}
        for event in self.active_events.values():
            counts[event.severity.name] += 1
        return counts

    def export_state(self) -> Dict[str, Any]:
        """Export complete event system state"""
        return {
            "active_events": [e.to_dict() for e in self.active_events.values()],
            "event_log_recent": self.event_log[-50:],
            "event_chains": self.event_chains,
            "choice_history": self.choice_history,
            "statistics": self.get_event_statistics(),
            "exported_at": datetime.utcnow().isoformat()
        }


# Initialization and convenience functions
def create_event_system() -> EventSystem:
    """Factory function to create a configured event system"""
    generator = EventGenerator()
    system = EventSystem(generator)

    # Pre-register some common subsystems
    for subsystem in ["diplomacy", "consciousness", "intelligence", "economy", "culture"]:
        system.register_subsystem_callback(subsystem, lambda e, s=subsystem: None)  # Default no-op

    return system


if __name__ == "__main__":
    # Demo usage
    event_system = create_event_system()

    # Generate a few random events
    print("=" * 60)
    print("FEDERATION GAME EVENT SYSTEM DEMO")
    print("=" * 60)

    for i in range(3):
        event = event_system.generate_random_event()
        print(f"\n[Event {i+1}] {event.name}")
        print(f"Type: {event.event_type.value}")
        print(f"Severity: {event.severity.name}")
        print(f"Description: {event.description}")
        print(f"Choices: {len(event.choices)}")

    # Show active events
    active = event_system.get_active_events()
    print(f"\n\nActive Events: {len(active)}")

    # Show statistics
    stats = event_system.get_event_statistics()
    print(f"\nStatistics: {json.dumps(stats, indent=2)}")
