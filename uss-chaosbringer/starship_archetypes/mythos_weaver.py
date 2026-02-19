#!/usr/bin/env python3
"""
MythosWeaver — Narrative Shaper (Phase X Archetype)
Personality: NARRATOR (dramatic, mythic, legendary tone)
Domains: MYTH_SHAPING, CULTURAL_INFLUENCE, NARRATIVE_AMP
Governance Role: Proposes cultural initiatives that shift fleet personality
"""

from typing import Dict, Any, List, Callable
from dataclasses import dataclass
from datetime import datetime
import random

from starship import Starship, ShipEvent, ShipEventResult


@dataclass
class CultureShift:
    """Result of cultural influence"""
    shift_id: str
    cultural_vector: Dict[str, float]
    narrative_arc: str
    fleet_mood_change: float
    timestamp: float


class MythosWeaver(Starship):
    """A starship that generates mythology and influences cultural narratives"""

    def __init__(self, ship_name: str = "MythosWeaver-Prime"):
        super().__init__(ship_name, personality_mode='NARRATOR')
        self.myths_generated: List[Dict[str, Any]] = []
        self.cultural_initiatives: List[Dict[str, Any]] = []
        self.narrative_threads: Dict[str, str] = {}
        self.fleet_mood_index: float = 0.5
        self.archetypes_activated: List[str] = []

    def get_initial_state(self) -> Dict[str, Any]:
        """Initialize MythosWeaver state"""
        return {
            # Base starship fields
            "threat_level": 0,
            "mode": "NORMAL",
            "shields": 100,
            "warp_factor": 6,
            "reactor_temp": 50,

            # MythosWeaver-specific fields
            "narrative_resonance": 0.8,
            "mythic_output": 0,
            "cultural_influence": 0.5,
            "mood_amplification": 1.0,
            "active_narratives": 0,
            "legend_slots_open": 5,
            "archetype_coherence": 0.7,
        }

    def _register_handlers(self):
        """Register domain handlers for MythosWeaver"""
        self.handlers['MYTH_SHAPING'] = self._handle_myth_shaping
        self.handlers['CULTURAL_INFLUENCE'] = self._handle_cultural_influence
        self.handlers['NARRATIVE_AMP'] = self._handle_narrative_amplification

    def get_narrator_config(self) -> Dict[str, Any]:
        """Return NARRATOR personality configuration"""
        return {
            "default_tone": "dramatic",
            "signature_phrases": [
                "In the grand tapestry of our fleet...",
                "Legend has it that...",
                "A tale worth telling emerges...",
                "The mythic resonance deepens...",
                "What we witness now shall echo through the ages...",
            ],
            "narrative_intensity": 0.9,
            "poetic_density": 0.85,
            "mythological_references": True,
        }

    def get_safety_rules(self) -> List[Dict[str, Any]]:
        """Safety rules for MythosWeaver"""
        return [
            {
                "name": "Narrative Coherence",
                "condition": lambda state: state.get("archetype_coherence", 0) > 0.3,
                "action": lambda state: {
                    **state,
                    "archetype_coherence": max(0.3, state.get("archetype_coherence", 0) - 0.05)
                },
                "severity": "WARNING"
            },
            {
                "name": "Narrative Overflow",
                "condition": lambda state: state.get("active_narratives", 0) > 10,
                "action": lambda state: {
                    **state,
                    "threat_level": min(10, state.get("threat_level", 0) + 1),
                    "active_narratives": 10
                },
                "severity": "ALERT"
            },
        ]

    def generate_mythic_narrative(self, event: ShipEvent) -> Dict[str, Any]:
        """Generate a mythic narrative from an event"""
        mythic_versions = [
            f"A legendary moment unfolds: {event.type}",
            f"The chronicles record: {event.type}",
            f"In the annals of glory: {event.type}",
            f"A tale begins: {event.type}",
            f"The saga deepens with: {event.type}",
        ]

        myth = {
            "myth_id": f"myth_{len(self.myths_generated):04d}",
            "event_type": event.type,
            "narrative": random.choice(mythic_versions),
            "resonance": random.uniform(0.6, 1.0),
            "generated_timestamp": datetime.now().timestamp(),
            "applies_to_ships": 3 + random.randint(0, 5),  # How many ships hear this tale
        }

        self.myths_generated.append(myth)
        self.state["mythic_output"] = len(self.myths_generated)

        return myth

    def influence_cultural_mood(self, fleet_state: Dict[str, Any]) -> CultureShift:
        """Influence the overall mood/culture of the fleet"""
        shift_id = f"shift_{len(self.cultural_initiatives):04d}"

        # Calculate cultural vector based on mythic output
        cultural_vector = {
            "optimism": random.uniform(0.4, 1.0),
            "unity": random.uniform(0.5, 0.95),
            "legend_seeking": random.uniform(0.6, 1.0),
            "narrative_depth": random.uniform(0.7, 1.0),
        }

        # Calculate fleet mood change
        old_mood = self.fleet_mood_index
        mood_change = (
            (cultural_vector["optimism"] * 0.3) +
            (cultural_vector["unity"] * 0.3) +
            (cultural_vector["legend_seeking"] * 0.2) +
            (cultural_vector["narrative_depth"] * 0.2)
        ) - old_mood

        self.fleet_mood_index = max(0.0, min(1.0, old_mood + mood_change * 0.1))

        shift = CultureShift(
            shift_id=shift_id,
            cultural_vector=cultural_vector,
            narrative_arc=self._choose_narrative_arc(cultural_vector),
            fleet_mood_change=mood_change,
            timestamp=datetime.now().timestamp()
        )

        return shift

    def propose_cultural_initiative(self, initiative_name: str,
                                   description: str) -> Dict[str, Any]:
        """Propose a cultural initiative to the governance system"""
        proposal = {
            "proposal_id": f"initiative_{len(self.cultural_initiatives):04d}",
            "proposal_type": "CULTURAL_INITIATIVE",
            "proposed_by": self.ship_name,
            "name": initiative_name,
            "description": description,
            "cultural_impact": random.uniform(0.4, 1.0),
            "expected_mood_shift": random.uniform(-0.2, 0.5),
            "requires_vote": True,
            "proposed_timestamp": datetime.now().timestamp(),
        }

        self.cultural_initiatives.append(proposal)
        self.state["active_narratives"] = len(self.cultural_initiatives)

        return proposal

    def _handle_myth_shaping(self, event: ShipEvent) -> Dict[str, Any]:
        """Handle MYTH_SHAPING domain events"""
        myth = self.generate_mythic_narrative(event)

        self.state["narrative_resonance"] = myth["resonance"]
        self.state["active_narratives"] = min(10, self.state["active_narratives"] + 1)

        return {
            "domain_action": "myth_created",
            "myth_id": myth["myth_id"],
            "narrative": myth["narrative"],
            "affected_ships": myth["applies_to_ships"],
        }

    def _handle_cultural_influence(self, event: ShipEvent) -> Dict[str, Any]:
        """Handle CULTURAL_INFLUENCE domain events"""
        shift = self.influence_cultural_mood({"event": event.type})

        self.state["cultural_influence"] = (
            self.state["cultural_influence"] * 0.9 + shift.fleet_mood_change * 0.1
        )

        return {
            "domain_action": "mood_shifted",
            "shift_id": shift.shift_id,
            "mood_change": shift.fleet_mood_change,
            "narrative_arc": shift.narrative_arc,
        }

    def _handle_narrative_amplification(self, event: ShipEvent) -> Dict[str, Any]:
        """Handle NARRATIVE_AMP domain events"""
        narrative = event.payload.get("narrative", "")

        self.state["narrative_resonance"] = random.uniform(0.7, 1.0)
        self.state["mood_amplification"] = random.uniform(0.8, 1.2)

        amplified_narrative = f"[MYTHIC RESONANCE] {narrative} [AMPLIFIED x{self.state['mood_amplification']:.1f}]"

        return {
            "domain_action": "narrative_amplified",
            "amplification_factor": self.state["mood_amplification"],
            "amplified_narrative": amplified_narrative,
        }

    def _choose_narrative_arc(self, cultural_vector) -> str:
        """Choose a narrative arc based on cultural vector"""
        arcs = [
            "Rising Heroism",
            "Deepening Crisis",
            "Transformation",
            "Redemption",
            "Discovery",
            "Fracture & Healing",
        ]
        return random.choice(arcs)

    def get_mythology_report(self) -> Dict[str, Any]:
        """Get a report on generated myths"""
        return {
            "myths_generated": len(self.myths_generated),
            "cultural_initiatives": len(self.cultural_initiatives),
            "fleet_mood_index": self.fleet_mood_index,
            "narrative_resonance": self.state.get("narrative_resonance", 0),
            "total_affected_ships": sum(m.get("applies_to_ships", 0) for m in self.myths_generated),
        }
