#!/usr/bin/env python3
"""
PHASE XXIII - PARADOX HARMONIZER
Engine that uses contradictions and paradoxes for federation optimization.
Converts apparent contradictions into optimization vectors instead of resolving them.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import hashlib
import math


class ParadoxType(Enum):
    """Classification of paradox types"""
    CONTRADICTION = "contradiction"  # Two mutually exclusive truths coexist
    PARADOX = "paradox"  # Self-referential logical contradiction
    KOANS = "koans"  # Zen-like wisdom through paradoxical statements
    DUAL_TRUTH = "dual_truth"  # Both seemingly opposite states are simultaneously valid


class ResolutionMethod(Enum):
    """How a paradox is harmonized"""
    QUANTUM_SUPERPOSITION = "quantum_superposition"  # Both states collapse into optimized result
    CATEGORICAL_EXPANSION = "categorical_expansion"  # Expand system to accommodate both
    CONTEXT_SHIFT = "context_shift"  # Change interpretation context
    OSCILLATION = "oscillation"  # Alternate between states systematically
    SYNTHESIS = "synthesis"  # Create third option transcending the dichotomy
    AMPLIFICATION = "amplification"  # Use contradiction as resonance amplifier


@dataclass
class Paradox:
    """Represents a recorded paradox in the federation"""
    paradox_id: str
    name: str
    paradox_type: ParadoxType
    statement_a: str  # First contradictory statement
    statement_b: str  # Second contradictory statement
    severity_score: float  # 0.0-1.0, how contradictory
    resolution_method: ResolutionMethod
    stability_impact: float  # -1.0 to 1.0, effect on system stability
    energy_potential: float  # 0.0-1.0, useful energy available from contradiction
    registered_at: float = field(default_factory=datetime.now().timestamp)
    harmonization_count: int = 0
    total_energy_extracted: float = 0.0
    last_harmonization_at: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ParadoxEnergyPacket:
    """Represents extracted energy from a paradox"""
    energy_id: str
    source_paradox_id: str
    energy_amount: float  # 0.0-1.0
    quality: str  # "pure", "coherent", "chaotic"
    usable_for: List[str]  # Which systems can use this energy
    extracted_at: float = field(default_factory=datetime.now().timestamp)
    metadata: Dict[str, Any] = field(default_factory=dict)


class ParadoxHarmonizer:
    """
    Federation engine that harmonizes paradoxes for optimization.

    Rather than resolving contradictions (eliminating them), this engine
    recognizes that paradoxes encode optimization vectors. By using both
    contradictory states simultaneously, the federation can achieve
    higher-order solutions.
    """

    def __init__(self):
        """Initialize the Paradox Harmonizer"""
        self.paradoxes: Dict[str, Paradox] = {}
        self.energy_packets: Dict[str, ParadoxEnergyPacket] = []
        self.harmonization_history: List[Dict[str, Any]] = []
        self.total_paradoxes_registered = 0
        self.total_energy_extracted = 0.0
        self.federation_coherence = 1.0  # 0.0-1.0, measures system cohesion
        self.paradox_density = 0.0  # How many active paradoxes relative to system size
        self.resonance_frequency = 0.5  # 0.0-1.0, amplitude of paradox oscillation
        self.optimization_gain = 1.0  # Multiplier from using paradoxes
        self.last_harmonization = None

    def register_paradox(
        self,
        name: str,
        statement_a: str,
        statement_b: str,
        paradox_type: ParadoxType,
        severity_estimate: float = 0.5,
        metadata: Dict[str, Any] = None,
    ) -> str:
        """
        Register a new paradox in the federation.

        Args:
            name: Human-readable paradox name
            statement_a: First contradictory statement
            statement_b: Second contradictory statement
            paradox_type: Type of paradox
            severity_estimate: User's initial severity estimate (0.0-1.0)
            metadata: Additional context about the paradox

        Returns:
            paradox_id: Unique ID for the registered paradox
        """
        paradox_id = self._generate_paradox_id(name, statement_a, statement_b)

        # Validate severity estimate
        severity = max(0.0, min(1.0, severity_estimate))

        # Determine initial resolution method based on type
        resolution_method = self._select_resolution_method(paradox_type, severity)

        # Calculate energy potential
        energy_potential = self._calculate_energy_potential(severity, paradox_type)

        # Create paradox record
        paradox = Paradox(
            paradox_id=paradox_id,
            name=name,
            paradox_type=paradox_type,
            statement_a=statement_a,
            statement_b=statement_b,
            severity_score=severity,
            resolution_method=resolution_method,
            stability_impact=0.0,  # Will be updated after scoring
            energy_potential=energy_potential,
            metadata=metadata or {}
        )

        self.paradoxes[paradox_id] = paradox
        self.total_paradoxes_registered += 1

        return paradox_id

    def score_paradox(self, paradox_id: str) -> float:
        """
        Calculate the severity score of a paradox (0.0-1.0).

        Scoring considers:
        - Logical contradiction strength
        - System impact
        - Resolution difficulty
        - Energy potential
        - Resonance with other paradoxes

        Args:
            paradox_id: ID of paradox to score

        Returns:
            score: Numeric score 0.0-1.0

        Raises:
            ValueError: If paradox not found
        """
        if paradox_id not in self.paradoxes:
            raise ValueError(f"Paradox {paradox_id} not found")

        paradox = self.paradoxes[paradox_id]

        # Base score from registered severity
        base_score = paradox.severity_score

        # Adjust based on type
        type_multiplier = {
            ParadoxType.CONTRADICTION: 0.8,
            ParadoxType.PARADOX: 1.0,
            ParadoxType.KOANS: 0.6,
            ParadoxType.DUAL_TRUTH: 0.9,
        }
        adjusted_score = base_score * type_multiplier.get(paradox.paradox_type, 0.8)

        # Resonance bonus: paradoxes that harmonize with others get higher scores
        resonance_bonus = self._calculate_resonance_bonus(paradox_id)

        # Final score
        final_score = min(1.0, adjusted_score + resonance_bonus)

        # Update paradox with refined score
        paradox.severity_score = final_score

        return final_score

    def harmonize_paradox(self, paradox_id: str) -> Dict[str, Any]:
        """
        Harmonize (activate) a paradox to extract optimization value.

        Instead of resolving the contradiction, this method uses both
        contradictory states simultaneously to achieve higher-order solutions.

        Args:
            paradox_id: ID of paradox to harmonize

        Returns:
            harmonization_result: Details of the harmonization

        Raises:
            ValueError: If paradox not found
        """
        if paradox_id not in self.paradoxes:
            raise ValueError(f"Paradox {paradox_id} not found")

        paradox = self.paradoxes[paradox_id]

        # Execute harmonization based on selected method
        method = paradox.resolution_method

        if method == ResolutionMethod.QUANTUM_SUPERPOSITION:
            result = self._harmonize_quantum_superposition(paradox)
        elif method == ResolutionMethod.CATEGORICAL_EXPANSION:
            result = self._harmonize_categorical_expansion(paradox)
        elif method == ResolutionMethod.CONTEXT_SHIFT:
            result = self._harmonize_context_shift(paradox)
        elif method == ResolutionMethod.OSCILLATION:
            result = self._harmonize_oscillation(paradox)
        elif method == ResolutionMethod.SYNTHESIS:
            result = self._harmonize_synthesis(paradox)
        elif method == ResolutionMethod.AMPLIFICATION:
            result = self._harmonize_amplification(paradox)
        else:
            result = {"success": False, "reason": "Unknown harmonization method"}

        # Update paradox state
        paradox.harmonization_count += 1
        paradox.last_harmonization_at = datetime.now().timestamp()

        # Calculate stability impact
        stability_delta = self._calculate_stability_impact(paradox, result)
        paradox.stability_impact = stability_delta

        # Update federation state
        self.federation_coherence = max(0.0, self.federation_coherence + stability_delta * 0.1)
        self.last_harmonization = datetime.now().timestamp()

        # Record harmonization
        harmonization_record = {
            "paradox_id": paradox_id,
            "paradox_name": paradox.name,
            "method": method.value,
            "timestamp": datetime.now().timestamp(),
            "stability_impact": stability_delta,
            "energy_extracted": result.get("energy", 0.0),
            "optimization_vector": result.get("optimization_vector", "")
        }
        self.harmonization_history.append(harmonization_record)

        return result

    def extract_paradox_energy(self, paradox_id: str) -> ParadoxEnergyPacket:
        """
        Extract usable energy from a paradox's contradiction.

        The contradiction inherently contains energy that can be:
        - Used for decision-making (both options simultaneously)
        - Converted to entropy reduction
        - Applied as amplification in other systems
        - Stored as potential for future use

        Args:
            paradox_id: ID of paradox to extract energy from

        Returns:
            energy_packet: Extracted energy ready for use

        Raises:
            ValueError: If paradox not found
        """
        if paradox_id not in self.paradoxes:
            raise ValueError(f"Paradox {paradox_id} not found")

        paradox = self.paradoxes[paradox_id]

        # Calculate available energy based on severity and frequency
        base_energy = paradox.energy_potential * paradox.severity_score
        frequency_bonus = math.log(paradox.harmonization_count + 1) * 0.1
        available_energy = min(1.0, base_energy + frequency_bonus)

        # Determine energy quality based on paradox type and history
        quality = self._determine_energy_quality(paradox)

        # Identify which systems can use this energy
        usable_for = self._identify_energy_consumers(paradox)

        # Create and register energy packet
        energy_id = f"energy_{paradox_id}_{len(self.energy_packets)}"
        energy_packet = ParadoxEnergyPacket(
            energy_id=energy_id,
            source_paradox_id=paradox_id,
            energy_amount=available_energy,
            quality=quality,
            usable_for=usable_for,
            metadata={
                "extraction_method": paradox.resolution_method.value,
                "paradox_type": paradox.paradox_type.value,
                "harmonization_count": paradox.harmonization_count
            }
        )

        self.energy_packets.append(energy_packet)

        # Update paradox tracking
        paradox.total_energy_extracted += available_energy
        self.total_energy_extracted += available_energy

        return energy_packet

    def get_paradox_status(self) -> Dict[str, Any]:
        """
        Get comprehensive status of all tracked paradoxes and harmonizations.

        Returns:
            status: Detailed report of paradox engine state
        """
        active_paradoxes = list(self.paradoxes.values())

        # Calculate statistics
        total_severity = sum(p.severity_score for p in active_paradoxes)
        avg_severity = total_severity / len(active_paradoxes) if active_paradoxes else 0.0

        harmonized_count = sum(1 for p in active_paradoxes if p.harmonization_count > 0)
        total_harmonizations = sum(p.harmonization_count for p in active_paradoxes)

        # Paradox density
        self.paradox_density = len(active_paradoxes) / max(1, len(active_paradoxes) + 100)

        # Energy status
        total_energy = sum(p.total_energy_extracted for p in active_paradoxes)
        available_energy = sum(p.energy_potential for p in active_paradoxes)

        # Type distribution
        type_distribution = {}
        for paradox in active_paradoxes:
            ptype = paradox.paradox_type.value
            type_distribution[ptype] = type_distribution.get(ptype, 0) + 1

        # Resolution method distribution
        method_distribution = {}
        for paradox in active_paradoxes:
            method = paradox.resolution_method.value
            method_distribution[method] = method_distribution.get(method, 0) + 1

        return {
            "total_paradoxes": len(active_paradoxes),
            "total_registered": self.total_paradoxes_registered,
            "harmonized_count": harmonized_count,
            "total_harmonizations": total_harmonizations,
            "avg_severity": round(avg_severity, 4),
            "paradox_density": round(self.paradox_density, 4),
            "federation_coherence": round(self.federation_coherence, 4),
            "resonance_frequency": round(self.resonance_frequency, 4),
            "optimization_gain": round(self.optimization_gain, 4),
            "total_energy_extracted": round(self.total_energy_extracted, 4),
            "available_energy_potential": round(available_energy, 4),
            "type_distribution": type_distribution,
            "method_distribution": method_distribution,
            "active_paradoxes": [
                {
                    "id": p.paradox_id,
                    "name": p.name,
                    "type": p.paradox_type.value,
                    "severity": round(p.severity_score, 4),
                    "method": p.resolution_method.value,
                    "harmonization_count": p.harmonization_count,
                    "total_energy_extracted": round(p.total_energy_extracted, 4),
                }
                for p in sorted(active_paradoxes, key=lambda x: x.severity_score, reverse=True)[:10]
            ],
            "energy_packets_created": len(self.energy_packets),
            "last_harmonization": self.last_harmonization,
        }

    # ==================== PRIVATE HELPER METHODS ====================

    def _generate_paradox_id(self, name: str, statement_a: str, statement_b: str) -> str:
        """Generate unique ID for a paradox"""
        combined = f"{name}:{statement_a}:{statement_b}"
        hash_digest = hashlib.md5(combined.encode()).hexdigest()[:8]
        return f"paradox_{hash_digest}"

    def _select_resolution_method(self, ptype: ParadoxType, severity: float) -> ResolutionMethod:
        """Select appropriate harmonization method based on type and severity"""
        if ptype == ParadoxType.CONTRADICTION:
            if severity > 0.7:
                return ResolutionMethod.CATEGORICAL_EXPANSION
            else:
                return ResolutionMethod.CONTEXT_SHIFT
        elif ptype == ParadoxType.PARADOX:
            return ResolutionMethod.QUANTUM_SUPERPOSITION
        elif ptype == ParadoxType.KOANS:
            return ResolutionMethod.SYNTHESIS
        elif ptype == ParadoxType.DUAL_TRUTH:
            if severity > 0.6:
                return ResolutionMethod.OSCILLATION
            else:
                return ResolutionMethod.AMPLIFICATION
        return ResolutionMethod.SYNTHESIS

    def _calculate_energy_potential(self, severity: float, ptype: ParadoxType) -> float:
        """Calculate potential energy available in a paradox"""
        type_base = {
            ParadoxType.CONTRADICTION: 0.7,
            ParadoxType.PARADOX: 0.9,
            ParadoxType.KOANS: 0.6,
            ParadoxType.DUAL_TRUTH: 0.8,
        }
        base = type_base.get(ptype, 0.7)
        return min(1.0, base * severity + 0.1)

    def _calculate_resonance_bonus(self, paradox_id: str) -> float:
        """Calculate bonus score based on resonance with other paradoxes"""
        if len(self.paradoxes) < 2:
            return 0.0

        # Simple resonance: similar paradoxes boost each other's scores
        paradox = self.paradoxes[paradox_id]
        resonant_count = 0

        for other_id, other in self.paradoxes.items():
            if other_id != paradox_id and other.paradox_type == paradox.paradox_type:
                resonant_count += 1

        return min(0.2, resonant_count * 0.05)

    def _harmonize_quantum_superposition(self, paradox: Paradox) -> Dict[str, Any]:
        """Harmonize by maintaining both states in superposition"""
        return {
            "success": True,
            "method": "quantum_superposition",
            "outcome": f"Both '{paradox.statement_a}' and '{paradox.statement_b}' simultaneously valid",
            "energy": paradox.severity_score * 0.8,
            "optimization_vector": "parallel_processing"
        }

    def _harmonize_categorical_expansion(self, paradox: Paradox) -> Dict[str, Any]:
        """Harmonize by expanding categories to accommodate both truths"""
        return {
            "success": True,
            "method": "categorical_expansion",
            "outcome": f"Created new category containing both statements",
            "energy": paradox.severity_score * 0.7,
            "optimization_vector": "hierarchical_organization"
        }

    def _harmonize_context_shift(self, paradox: Paradox) -> Dict[str, Any]:
        """Harmonize by changing interpretation context"""
        return {
            "success": True,
            "method": "context_shift",
            "outcome": f"Recontextualized contradiction as complementary in new frame",
            "energy": paradox.severity_score * 0.6,
            "optimization_vector": "perspective_flexibility"
        }

    def _harmonize_oscillation(self, paradox: Paradox) -> Dict[str, Any]:
        """Harmonize by oscillating between both states systematically"""
        self.resonance_frequency = min(1.0, self.resonance_frequency + 0.05)
        return {
            "success": True,
            "method": "oscillation",
            "outcome": f"System oscillates between both states at resonance frequency",
            "energy": paradox.severity_score * 0.75,
            "optimization_vector": "dynamic_equilibrium"
        }

    def _harmonize_synthesis(self, paradox: Paradox) -> Dict[str, Any]:
        """Harmonize by synthesizing third option transcending dichotomy"""
        return {
            "success": True,
            "method": "synthesis",
            "outcome": f"Synthesized higher-order solution transcending both statements",
            "energy": paradox.severity_score * 0.85,
            "optimization_vector": "emergent_properties"
        }

    def _harmonize_amplification(self, paradox: Paradox) -> Dict[str, Any]:
        """Harmonize by using contradiction as resonance amplifier"""
        self.optimization_gain = min(2.0, self.optimization_gain + (paradox.severity_score * 0.1))
        return {
            "success": True,
            "method": "amplification",
            "outcome": f"Paradox amplifies system effectiveness through constructive interference",
            "energy": paradox.severity_score * 0.9,
            "optimization_vector": "gain_amplification"
        }

    def _calculate_stability_impact(self, paradox: Paradox, harmonization_result: Dict[str, Any]) -> float:
        """Calculate impact on federation stability"""
        if not harmonization_result.get("success", False):
            return -0.05

        # Successful harmonizations generally improve stability
        method = paradox.resolution_method
        impact_by_method = {
            ResolutionMethod.QUANTUM_SUPERPOSITION: 0.1,
            ResolutionMethod.CATEGORICAL_EXPANSION: 0.05,
            ResolutionMethod.CONTEXT_SHIFT: 0.02,
            ResolutionMethod.OSCILLATION: 0.08,
            ResolutionMethod.SYNTHESIS: 0.12,
            ResolutionMethod.AMPLIFICATION: 0.10,
        }
        return impact_by_method.get(method, 0.05)

    def _determine_energy_quality(self, paradox: Paradox) -> str:
        """Determine quality of extracted energy"""
        if paradox.harmonization_count > 5:
            return "pure"
        elif paradox.harmonization_count > 2:
            return "coherent"
        else:
            return "chaotic"

    def _identify_energy_consumers(self, paradox: Paradox) -> List[str]:
        """Identify which federation systems can use this energy"""
        consumers = []

        method = paradox.resolution_method
        if method in [ResolutionMethod.QUANTUM_SUPERPOSITION, ResolutionMethod.OSCILLATION]:
            consumers.extend(["orchestration_brain", "multiverse_reconciliation"])

        if method in [ResolutionMethod.CATEGORICAL_EXPANSION, ResolutionMethod.SYNTHESIS]:
            consumers.extend(["constitution_engine", "ontology_engine"])

        if method == ResolutionMethod.AMPLIFICATION:
            consumers.extend(["fleet_coordinator", "first_contact_engine"])

        if method == ResolutionMethod.CONTEXT_SHIFT:
            consumers.extend(["dream_engine", "narrator_engine"])

        return list(set(consumers))

    def __repr__(self):
        return (
            f"<ParadoxHarmonizer "
            f"paradoxes={len(self.paradoxes)} "
            f"coherence={self.federation_coherence:.2f} "
            f"energy_extracted={self.total_energy_extracted:.2f} "
            f"gain={self.optimization_gain:.2f}>"
        )
