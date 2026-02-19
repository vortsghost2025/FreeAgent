"""
PHASE XXVI - Cosmic Diplomacy Engine
~350 LOC

Manages diplomatic relations with external cosmic entities. Classifies unknowns,
generates first-contact protocols, scores ambiguity in threat assessment, and
handles impossible entities that defy conventional understanding.
"""

from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Tuple, Optional
import random


class EntityClassification(Enum):
    """Categories for external cosmic entities."""
    KNOWN_ALLY = "known_ally"           # Friendly, cooperative
    KNOWN_THREAT = "known_threat"       # Hostile, dangerous
    UNKNOWN = "unknown"                 # Unclassified, need more data
    ANOMALY = "anomaly"                 # Defies classification logic


@dataclass
class CosmicEntity:
    """Represents an external intelligence or cosmic presence."""
    entity_id: str
    classification: EntityClassification
    threat_level: float                 # 0.0 = harmless, 1.0 = extinction-class
    communication_attempts: int = 0
    last_contact_timestamp: Optional[datetime] = None
    protocol_used: str = "none"
    ambiguity_score: float = 0.5        # 0.0 = clear ally, 1.0 = clear threat
    attributes: Dict[str, any] = field(default_factory=dict)  # Entity-specific properties


@dataclass
class ContactProtocol:
    """First-contact procedure for unknown entities."""
    protocol_name: str
    risk_level: str                      # low, medium, high, extreme
    steps: List[str]
    prerequisites: List[str]
    fallback_protocol: str
    success_indicators: List[str]
    failure_conditions: List[str]
    estimated_duration_seconds: int


class CosmicDiplomacyEngine:
    """
    Manages diplomatic engagement with external cosmic entities.
    Handles classification, first contact, and negotiation protocols.
    """

    def __init__(self):
        """Initialize the cosmic diplomacy engine."""
        self.entities: Dict[str, CosmicEntity] = {}
        self.contact_history: List[Dict] = []
        self.negotiation_status: Dict[str, str] = {}
        self.protocols: Dict[str, ContactProtocol] = self._initialize_protocols()
        self.engine_online = True
        self.last_update = datetime.now()

    def classify_unknown_entity(self, entity_id: str, observed_data: Dict) -> Dict:
        """
        Classify an unknown entity based on observation data.

        Args:
            entity_id: Unique identifier for the entity
            observed_data: Dictionary with observable properties

        Returns:
            Dict with classification results
        """
        if not entity_id or not observed_data:
            return {"success": False, "error": "Missing entity_id or observed_data"}

        # Analyze observed data for classification signals
        signals = self._analyze_signals(observed_data)

        # Determine initial classification
        if signals.get("hostile_indicators", 0) >= 3:
            classification = EntityClassification.KNOWN_THREAT
            threat_level = min(1.0, 0.6 + (signals.get("hostility_score", 0) * 0.4))
        elif signals.get("cooperative_indicators", 0) >= 3:
            classification = EntityClassification.KNOWN_ALLY
            threat_level = max(0.0, signals.get("hostility_score", 0) - 0.3)
        elif signals.get("paradox_indicators", 0) >= 2:
            classification = EntityClassification.ANOMALY
            threat_level = random.uniform(0.4, 0.8)
        else:
            classification = EntityClassification.UNKNOWN
            threat_level = 0.5

        # Calculate ambiguity score
        ambiguity = self._calculate_ambiguity(signals)

        # Create entity record
        entity = CosmicEntity(
            entity_id=entity_id,
            classification=classification,
            threat_level=threat_level,
            ambiguity_score=ambiguity,
            attributes=observed_data
        )

        self.entities[entity_id] = entity

        return {
            "success": True,
            "entity_id": entity_id,
            "classification": classification.value,
            "threat_level": round(threat_level, 2),
            "ambiguity_score": round(ambiguity, 2),
            "signals": signals,
            "timestamp": datetime.now().isoformat()
        }

    def generate_contact_protocol(self, entity_id: str) -> Dict:
        """
        Generate first-contact procedure for an entity.

        Args:
            entity_id: ID of the entity to contact

        Returns:
            Dict with contact protocol details
        """
        if entity_id not in self.entities:
            return {"success": False, "error": f"Entity {entity_id} not found"}

        entity = self.entities[entity_id]

        # Select protocol based on classification
        if entity.classification == EntityClassification.KNOWN_ALLY:
            protocol_name = "Friendly_Communion"
            risk_level = "low"
            fallback = "Cautious_Probe"
        elif entity.classification == EntityClassification.KNOWN_THREAT:
            protocol_name = "Defensive_Containment"
            risk_level = "high"
            fallback = "Emergency_Evacuation"
        elif entity.classification == EntityClassification.ANOMALY:
            protocol_name = "Adaptive_Uncertainty"
            risk_level = "extreme"
            fallback = "Cosmic_Quarantine"
        else:  # UNKNOWN
            protocol_name = "Cautious_Probe"
            risk_level = "medium"
            fallback = "Retreat_Protocol"

        protocol_id = f"{entity_id}_{protocol_name}_{len(self.contact_history)}"

        # Generate protocol steps based on risk
        steps = self._generate_protocol_steps(entity.classification, entity.threat_level)

        protocol = ContactProtocol(
            protocol_name=protocol_name,
            risk_level=risk_level,
            steps=steps,
            prerequisites=[
                f"Verify entity exists at coordinates {entity_id}",
                f"Confirm entity classification {entity.classification.value}",
                "Ensure life support systems operational"
            ],
            fallback_protocol=fallback,
            success_indicators=[
                "Entity responds to communication attempt",
                "No hostile action detected",
                "Mutual understanding established"
            ],
            failure_conditions=[
                "Entity becomes aggressive",
                "Communication lost",
                "Paradox conditions detected"
            ],
            estimated_duration_seconds=300 + int(entity.threat_level * 600)
        )

        entity.protocol_used = protocol_name

        return {
            "success": True,
            "entity_id": entity_id,
            "protocol": {
                "name": protocol.protocol_name,
                "risk_level": protocol.risk_level,
                "steps": protocol.steps,
                "prerequisites": protocol.prerequisites,
                "fallback": protocol.fallback_protocol,
                "success_indicators": protocol.success_indicators,
                "estimated_duration": protocol.estimated_duration_seconds
            },
            "timestamp": datetime.now().isoformat()
        }

    def score_ambiguity(self, entity_id: str, additional_observations: Dict = None) -> Dict:
        """
        Calculate threat vs ally uncertainty score.

        Args:
            entity_id: ID of the entity to score
            additional_observations: New data to incorporate

        Returns:
            Dict with ambiguity analysis
        """
        if entity_id not in self.entities:
            return {"success": False, "error": f"Entity {entity_id} not found"}

        entity = self.entities[entity_id]

        # If we have new observations, update analysis
        if additional_observations:
            new_signals = self._analyze_signals(additional_observations)
            old_ambiguity = entity.ambiguity_score

            # Weight new information
            entity.ambiguity_score = (0.7 * entity.ambiguity_score +
                                     0.3 * self._calculate_ambiguity(new_signals))

            entity.attributes.update(additional_observations)
        else:
            old_ambiguity = entity.ambiguity_score

        # Generate interpretation
        if entity.ambiguity_score < 0.3:
            interpretation = "Clear ally - low threat"
        elif entity.ambiguity_score < 0.6:
            interpretation = "Mixed signals - moderate uncertainty"
        elif entity.ambiguity_score < 0.8:
            interpretation = "Potentially dangerous - high uncertainty"
        else:
            interpretation = "Paradoxical - severe uncertainty"

        return {
            "success": True,
            "entity_id": entity_id,
            "ambiguity_score": round(entity.ambiguity_score, 2),
            "threat_assessment": entity.threat_level,
            "interpretation": interpretation,
            "confidence_level": round(1.0 - entity.ambiguity_score, 2),
            "old_ambiguity": round(old_ambiguity, 2),
            "ambiguity_change": round(entity.ambiguity_score - old_ambiguity, 2),
            "timestamp": datetime.now().isoformat()
        }

    def attempt_negotiation(self, entity_id: str, message: str,
                          federation_offer: str = "") -> Dict:
        """
        Attempt cross-cosmic communication and negotiation.

        Args:
            entity_id: ID of entity to negotiate with
            message: Message content for entity
            federation_offer: What the federation is offering

        Returns:
            Dict with negotiation results
        """
        if entity_id not in self.entities:
            return {"success": False, "error": f"Entity {entity_id} not found"}

        entity = self.entities[entity_id]

        # Update communication counter
        entity.communication_attempts += 1
        entity.last_contact_timestamp = datetime.now()

        # Simulate response based on classification
        if entity.classification == EntityClassification.KNOWN_ALLY:
            response_likelihood = 0.95
            positive_response = True
        elif entity.classification == EntityClassification.KNOWN_THREAT:
            response_likelihood = 0.3
            positive_response = False
        elif entity.classification == EntityClassification.ANOMALY:
            response_likelihood = random.random()  # Unpredictable
            positive_response = random.choice([True, False])
        else:  # UNKNOWN
            response_likelihood = 0.5
            positive_response = random.random() > 0.5

        # Determine if entity responds
        entity_responds = random.random() < response_likelihood
        negotiation_status = "responded" if entity_responds else "no_response"

        # Generate entity response if applicable
        entity_response = ""
        if entity_responds:
            if positive_response:
                entity_response = f"Entity {entity_id} expresses interest in cooperation"
                entity.classification = EntityClassification.KNOWN_ALLY
            else:
                entity_response = f"Entity {entity_id} rejects negotiation terms"
                entity.classification = EntityClassification.KNOWN_THREAT

        # Record contact
        contact_record = {
            "timestamp": datetime.now().isoformat(),
            "entity_id": entity_id,
            "attempt_number": entity.communication_attempts,
            "message_sent": message,
            "federation_offer": federation_offer,
            "entity_responded": entity_responds,
            "entity_response": entity_response,
            "negotiation_status": negotiation_status
        }
        self.contact_history.append(contact_record)
        self.negotiation_status[entity_id] = negotiation_status

        return {
            "success": True,
            "entity_id": entity_id,
            "attempt_number": entity.communication_attempts,
            "entity_responded": entity_responds,
            "entity_response": entity_response,
            "negotiation_status": negotiation_status,
            "recommended_next_step": self._recommend_next_action(
                entity.classification,
                negotiation_status
            ),
            "timestamp": datetime.now().isoformat()
        }

    def handle_impossible_entity(self, entity_id: str, paradox_data: Dict) -> Dict:
        """
        Handle entities that defy classification logic.

        Args:
            entity_id: ID of the entity
            paradox_data: Data describing the paradox

        Returns:
            Dict with handling strategy
        """
        if entity_id not in self.entities:
            return {"success": False, "error": f"Entity {entity_id} not found"}

        entity = self.entities[entity_id]

        # Force classification as ANOMALY
        entity.classification = EntityClassification.ANOMALY
        entity.threat_level = random.uniform(0.4, 0.9)
        entity.ambiguity_score = 1.0  # Complete uncertainty

        # Determine containment strategy
        paradox_type = paradox_data.get("type", "unknown_paradox")

        if "temporal" in paradox_type.lower():
            strategy = "Temporal_Quarantine"
            containment_level = "extreme"
        elif "dimensional" in paradox_type.lower():
            strategy = "Dimensional_Isolation"
            containment_level = "extreme"
        elif "logical" in paradox_type.lower():
            strategy = "Logical_Sandbox"
            containment_level = "high"
        else:
            strategy = "Cosmic_Quarantine"
            containment_level = "maximum"

        recommendations = [
            f"Activate {strategy}",
            f"Establish containment level: {containment_level}",
            "Isolate entity from fleet communications",
            "Document all paradox parameters for scientific study",
            "Do not attempt further direct negotiation"
        ]

        entity.attributes["paradox_type"] = paradox_type
        entity.attributes["containment_strategy"] = strategy
        entity.attributes["paradox_data"] = paradox_data

        return {
            "success": True,
            "entity_id": entity_id,
            "classification": "ANOMALY",
            "paradox_type": paradox_type,
            "containment_strategy": strategy,
            "containment_level": containment_level,
            "threat_level": round(entity.threat_level, 2),
            "recommendations": recommendations,
            "timestamp": datetime.now().isoformat()
        }

    def get_cosmic_status(self) -> Dict:
        """
        Generate comprehensive report on external contacts and diplomacy status.

        Returns:
            Dict with complete cosmic relationships overview
        """
        # Count entities by classification
        classification_counts = {}
        threat_summary = {
            "critical_threats": [],
            "potential_allies": [],
            "unknown_unknowns": [],
            "paradoxes": []
        }

        for entity_id, entity in self.entities.items():
            # Count by classification
            key = entity.classification.value
            classification_counts[key] = classification_counts.get(key, 0) + 1

            # Categorize by threat assessment
            if entity.classification == EntityClassification.KNOWN_THREAT and entity.threat_level > 0.7:
                threat_summary["critical_threats"].append({
                    "entity_id": entity_id,
                    "threat_level": entity.threat_level
                })
            elif entity.classification == EntityClassification.KNOWN_ALLY:
                threat_summary["potential_allies"].append({
                    "entity_id": entity_id,
                    "rapport": 1.0 - entity.threat_level
                })
            elif entity.classification == EntityClassification.UNKNOWN:
                threat_summary["unknown_unknowns"].append({
                    "entity_id": entity_id,
                    "ambiguity": entity.ambiguity_score
                })
            elif entity.classification == EntityClassification.ANOMALY:
                threat_summary["paradoxes"].append({
                    "entity_id": entity_id,
                    "paradox_type": entity.attributes.get("paradox_type", "unknown")
                })

        return {
            "success": True,
            "cosmic_status": {
                "entities_tracked": len(self.entities),
                "classifications": classification_counts,
                "threat_assessment": threat_summary,
                "total_contact_attempts": sum(
                    e.communication_attempts for e in self.entities.values()
                ),
                "contact_history_length": len(self.contact_history),
                "engine_status": "online" if self.engine_online else "offline",
                "last_update": self.last_update.isoformat()
            },
            "critical_alerts": [
                threat["entity_id"]
                for threat in threat_summary["critical_threats"]
            ],
            "timestamp": datetime.now().isoformat()
        }

    # Helper methods

    def _analyze_signals(self, observed_data: Dict) -> Dict:
        """Analyze observed data for classification signals."""
        hostile_indicators = 0
        cooperative_indicators = 0
        paradox_indicators = 0
        hostility_score = 0.5

        for key, value in observed_data.items():
            key_lower = key.lower()

            if any(h in key_lower for h in ["weapon", "attack", "hostile", "aggress"]):
                hostile_indicators += 1
                hostility_score += 0.15
            elif any(c in key_lower for c in ["peace", "friendly", "cooperat", "alliance"]):
                cooperative_indicators += 1
                hostility_score -= 0.15
            elif any(p in key_lower for p in ["paradox", "impossible", "undefined"]):
                paradox_indicators += 1

        return {
            "hostile_indicators": hostile_indicators,
            "cooperative_indicators": cooperative_indicators,
            "paradox_indicators": paradox_indicators,
            "hostility_score": max(0.0, min(1.0, hostility_score))
        }

    def _calculate_ambiguity(self, signals: Dict) -> float:
        """Calculate how ambiguous/uncertain classification is."""
        hostile = signals.get("hostile_indicators", 0)
        cooperative = signals.get("cooperative_indicators", 0)
        paradox = signals.get("paradox_indicators", 0)

        # Equal signals = high ambiguity
        if hostile == cooperative and hostile > 0:
            return 0.8
        elif paradox > 0:
            return 0.9
        elif hostile == 0 and cooperative == 0:
            return 0.7
        else:
            difference = abs(hostile - cooperative)
            return max(0.0, 1.0 - (difference * 0.3))

    def _generate_protocol_steps(self, classification: EntityClassification,
                                threat_level: float) -> List[str]:
        """Generate protocol steps based on entity characteristics."""
        if classification == EntityClassification.KNOWN_ALLY:
            return [
                "Establish initial greeting broadcast",
                "Share peaceful intent indicators",
                "Propose trade or alliance discussion",
                "Exchange scientific data"
            ]
        elif classification == EntityClassification.KNOWN_THREAT:
            return [
                "Activate defensive protocols",
                "Maintain safe distance",
                "Broadcast peaceful intent",
                "Prepare for evasion if needed"
            ]
        elif classification == EntityClassification.ANOMALY:
            return [
                "Activate quantum sensors",
                "Establish observation perimeter",
                "Do not approach directly",
                "Record all observational data",
                "Alert science council"
            ]
        else:
            return [
                "Scan entity signature",
                "Broadcast greeting",
                "Monitor for response",
                "Prepare contingency plans"
            ]

    def _recommend_next_action(self, classification: EntityClassification,
                               status: str) -> str:
        """Recommend next diplomatic action."""
        if status == "responded":
            if classification == EntityClassification.KNOWN_ALLY:
                return "Establish permanent diplomatic channel"
            elif classification == EntityClassification.KNOWN_THREAT:
                return "Prepare defense formulations"
            else:
                return "Continue probing communication"
        else:
            if classification == EntityClassification.KNOWN_THREAT:
                return "Increase defensive readiness"
            else:
                return "Attempt communication on alternate frequencies"

    def _initialize_protocols(self) -> Dict[str, ContactProtocol]:
        """Initialize standard contact protocols."""
        return {
            "default": ContactProtocol(
                protocol_name="Standard_First_Contact",
                risk_level="unknown",
                steps=[],
                prerequisites=[],
                fallback_protocol="Retreat",
                success_indicators=[],
                failure_conditions=[],
                estimated_duration_seconds=300
            )
        }


# Integration test
def test_cosmic_diplomacy() -> bool:
    """Quick integration test for the cosmic diplomacy engine."""
    engine = CosmicDiplomacyEngine()

    # Classify an entity
    result = engine.classify_unknown_entity(
        "ENTITY-001",
        {"signals": "peaceful", "technology": "advanced"}
    )
    assert result["success"], "Failed to classify entity"

    # Generate contact protocol
    result = engine.generate_contact_protocol("ENTITY-001")
    assert result["success"], "Failed to generate protocol"

    # Score ambiguity
    result = engine.score_ambiguity("ENTITY-001")
    assert result["success"], "Failed to score ambiguity"

    # Attempt negotiation
    result = engine.attempt_negotiation(
        "ENTITY-001",
        "Greetings, unknown entity"
    )
    assert result["success"], "Failed to attempt negotiation"

    # Get status
    result = engine.get_cosmic_status()
    assert result["success"], "Failed to get status"

    return True
