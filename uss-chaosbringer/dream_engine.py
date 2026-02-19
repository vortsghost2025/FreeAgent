#!/usr/bin/env python3
"""
PHASE XIX - DREAM ENGINE
Symbolic visions influencing diplomacy, expansion, first contact.
Dreams that guide federation decisions and predict outcomes.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from enum import Enum
import random


class DreamType(Enum):
    """Types of prophetic dreams"""
    VISIONARY = "visionary"  # Guiding vision for the future
    WARNING = "warning"  # Danger ahead
    PROPHETIC = "prophetic"  # Predicts specific outcome
    INSPIRATIONAL = "inspirational"  # Boosts morale
    CAUTIONARY = "cautionary"  # Advisory without strict warning
    REVELATORY = "revelatory"  # Reveals hidden truth


class DreamSymbolism(Enum):
    """Symbolic meanings in dreams"""
    CONVERGENCE = "convergence"  # Unity, alignment
    DIVERGENCE = "divergence"  # Conflict, separation
    GROWTH = "growth"  # Expansion, progress
    DECAY = "decay"  # Decline, dissolution
    ASCENSION = "ascension"  # Elevation, transcendence
    DESCENT = "descent"  # Diminishment, struggle
    HARMONY = "harmony"  # Coordination, peace
    DISCORD = "discord"  # Friction, dissonance
    ILLUMINATION = "illumination"  # Clarity, understanding
    OBSCURATION = "obscuration"  # Confusion, uncertainty


@dataclass
class Symbol:
    """A symbolic element within a dream"""
    symbol_id: str
    name: str
    meaning: DreamSymbolism
    associated_vector: str  # diplomatic, expansion, first_contact
    intensity: float  # 0.0-1.0 how strong the symbol is
    metaphorical_meaning: str


@dataclass
class Dream:
    """A prophetic dream guiding federation decisions"""
    dream_id: str
    dreamer: str  # Which ship had the dream
    dream_type: DreamType
    timestamp: float
    symbols: List[Symbol] = field(default_factory=list)
    narrative: str = ""  # Human-readable dream narrative
    interpretation: str = ""
    confidence: float = 0.5  # 0.0-1.0 how confident the interpretation is
    affected_vectors: List[str] = field(default_factory=list)
    predicted_outcome: str = ""
    successful: bool = False  # Did the prediction come true?


@dataclass
class PropheticInsight:
    """An insight extracted from dream analysis"""
    insight_id: str
    source_dream: str
    insight_type: str  # diplomatic_opportunity, expansion_risk, contact_scenario, etc.
    recommendation: str
    confidence: float
    time_horizon: str  # immediate, near_term, long_term


class DreamEngine:
    """Engine for generating and interpreting prophetic dreams"""

    def __init__(self):
        self.dreams: Dict[str, Dream] = {}
        self.dream_counter = 0
        self.dream_history: List[str] = []
        self.symbols_library: Dict[str, Symbol] = {}
        self._initialize_symbol_library()
        self.insights: Dict[str, PropheticInsight] = {}
        self.insight_counter = 0

    def _initialize_symbol_library(self):
        """Initialize library of dream symbols"""
        symbols_to_create = [
            ("star_convergence", "Converging Stars", DreamSymbolism.CONVERGENCE, "diplomatic", "Multiple civilizations uniting"),
            ("great_fleet", "Great Fleet", DreamSymbolism.GROWTH, "expansion", "Federation expanding its reach"),
            ("veiled_visitors", "Veiled Visitors", DreamSymbolism.OBSCURATION, "first_contact", "Unknown entities approaching"),
            ("breaking_chains", "Breaking Chains", DreamSymbolism.ASCENSION, "diplomatic", "Treaty breaking barriers"),
            ("fragmentation", "Fragmentation", DreamSymbolism.DECAY, "expansion", "Dispersal and decline"),
            ("harmony_chorus", "Harmony Chorus", DreamSymbolism.HARMONY, "diplomatic", "Aligned voices speaking together"),
            ("shadow_divide", "Shadow Divide", DreamSymbolism.DISCORD, "first_contact", "Incompatible civilizations"),
            ("ascending_spiral", "Ascending Spiral", DreamSymbolism.ASCENSION, "expansion", "Upward trajectory of growth"),
            ("crystal_clarity", "Crystal Clarity", DreamSymbolism.ILLUMINATION, "diplomatic", "Perfect understanding achieved"),
            ("fog_wall", "Fog Wall", DreamSymbolism.OBSCURATION, "first_contact", "Mysteries yet unveiled"),
        ]

        for i, (symbol_id, name, meaning, vector, metaphor) in enumerate(symbols_to_create):
            symbol = Symbol(
                symbol_id=symbol_id,
                name=name,
                meaning=meaning,
                associated_vector=vector,
                intensity=0.7 + random.random() * 0.3,
                metaphorical_meaning=metaphor,
            )
            self.symbols_library[symbol_id] = symbol

    def generate_dream(
        self,
        dreamer: str,
        dream_type: DreamType,
        context: Dict[str, Any],
    ) -> str:
        """Generate a prophetic dream for a ship"""
        self.dream_counter += 1
        dream_id = f"dream_{self.dream_counter:04d}"

        # Select symbols based on context
        symbols = self._select_symbols_for_context(context)

        # Generate narrative
        narrative = self._generate_dream_narrative(symbols, context)

        # Interpret dream
        interpretation = self._interpret_dream(symbols, dream_type)

        # Extract affected vectors
        affected_vectors = list(set(s.associated_vector for s in symbols))

        # Predict outcome
        predicted_outcome = self._predict_outcome_from_dream(symbols, dream_type)

        dream = Dream(
            dream_id=dream_id,
            dreamer=dreamer,
            dream_type=dream_type,
            timestamp=datetime.now().timestamp(),
            symbols=symbols,
            narrative=narrative,
            interpretation=interpretation,
            confidence=self._calculate_confidence(symbols),
            affected_vectors=affected_vectors,
            predicted_outcome=predicted_outcome,
        )

        self.dreams[dream_id] = dream
        self.dream_history.append(dream_id)
        return dream_id

    def _select_symbols_for_context(self, context: Dict[str, Any]) -> List[Symbol]:
        """Select dream symbols based on federation context"""
        symbols = []
        vector_focus = context.get("vector_focus", None)

        # Select 2-4 symbols
        num_symbols = random.randint(2, 4)
        available_symbols = list(self.symbols_library.values())

        # Bias selection toward context vector if provided
        if vector_focus:
            vector_focused = [s for s in available_symbols if s.associated_vector == vector_focus]
            if vector_focused:
                symbols.append(random.choice(vector_focused))

        # Add remaining random symbols
        remaining_needed = num_symbols - len(symbols)
        other_symbols = [s for s in available_symbols if s not in symbols]
        if remaining_needed > 0 and other_symbols:
            symbols.extend(random.sample(other_symbols, min(remaining_needed, len(other_symbols))))

        return symbols

    def _generate_dream_narrative(self, symbols: List[Symbol], context: Dict[str, Any]) -> str:
        """Generate human-readable dream narrative from symbols"""
        if not symbols:
            return "A mysterious dream fades before its meaning can be grasped."

        symbol_names = [s.name for s in symbols]
        symbolism = [s.meaning.value for s in symbols]

        narrative = f"In the dream, {symbol_names[0]} appears, radiating {symbolism[0]}. "
        if len(symbols) > 1:
            narrative += f"It merges with {symbol_names[1]}, creating {symbolism[1]}. "
        if len(symbols) > 2:
            narrative += f"Then {symbol_names[2]} emerges, bringing {symbolism[2]}. "

        narrative += "The vision fades as understanding begins to dawn."
        return narrative

    def _interpret_dream(self, symbols: List[Symbol], dream_type: DreamType) -> str:
        """Interpret meaning of dream from its symbols"""
        if not symbols:
            return "The dream's meaning remains obscure."

        meanings = [s.meaning.value for s in symbols]
        interpretation = f"This {dream_type.value} dream suggests: "

        if DreamSymbolism.CONVERGENCE.value in [s.meaning.value for s in symbols]:
            interpretation += "Unity and alignment are possible. "
        if DreamSymbolism.GROWTH.value in meanings:
            interpretation += "Expansion opportunities present themselves. "
        if DreamSymbolism.HARMONY.value in meanings:
            interpretation += "Coordination between factions would be beneficial. "
        if DreamSymbolism.DESCENT.value in [s.meaning.value for s in symbols]:
            interpretation += "Caution is advised in forthcoming decisions. "
        if DreamSymbolism.ILLUMINATION.value in meanings:
            interpretation += "Clarity will soon be achieved. "

        if not interpretation.endswith("."):
            interpretation += "Careful attention to developments is warranted."

        return interpretation

    def _predict_outcome_from_dream(self, symbols: List[Symbol], dream_type: DreamType) -> str:
        """Predict specific outcome based on dream symbols"""
        if dream_type == DreamType.PROPHETIC:
            for symbol in symbols:
                if symbol.meaning == DreamSymbolism.CONVERGENCE:
                    return "Multiple parties will find common ground and unite"
                elif symbol.meaning == DreamSymbolism.GROWTH:
                    return "The federation will successfully expand its reach"
                elif symbol.meaning == DreamSymbolism.HARMONY:
                    return "Conflict will resolve through mutual understanding"
                elif symbol.meaning == DreamSymbolism.DISCORD:
                    return "Significant disagreement will arise"

            return "A transformation will occur in the federation's structure"
        elif dream_type == DreamType.WARNING:
            return "Beware: recent trends may lead to unexpected reversal"
        elif dream_type == DreamType.INSPIRATIONAL:
            return "Hope and determination will lead to success"

        return "Future events remain uncertain, guided by choices yet to be made"

    def _calculate_confidence(self, symbols: List[Symbol]) -> float:
        """Calculate confidence in dream interpretation"""
        if not symbols:
            return 0.3

        avg_intensity = sum(s.intensity for s in symbols) / len(symbols)
        # Confidence based on symbol intensity and quantity
        base_confidence = avg_intensity * 0.8
        quantity_boost = min(0.2, len(symbols) * 0.1)
        return min(0.95, base_confidence + quantity_boost)

    def extract_insight(self, dream_id: str) -> Optional[str]:
        """Extract actionable insight from a dream"""
        if dream_id not in self.dreams:
            return None

        dream = self.dreams[dream_id]
        self.insight_counter += 1
        insight_id = f"insight_{self.insight_counter:04d}"

        # Determine insight type from symbols
        insight_type = "general_guidance"
        recommendation = "Proceed with caution and careful observation"

        for symbol in dream.symbols:
            if "diplomatic" in symbol.associated_vector:
                insight_type = "diplomatic_opportunity"
                recommendation = "Diplomatic overtures show promise"
            elif "expansion" in symbol.associated_vector:
                insight_type = "expansion_opportunity"
                recommendation = "Fleet expansion is favored by circumstances"
            elif "first_contact" in symbol.associated_vector:
                insight_type = "contact_scenario"
                recommendation = "First contact approaches, be prepared"

        time_horizon = (
            "immediate"
            if dream.confidence > 0.8
            else ("near_term" if dream.confidence > 0.6 else "long_term")
        )

        insight = PropheticInsight(
            insight_id=insight_id,
            source_dream=dream_id,
            insight_type=insight_type,
            recommendation=recommendation,
            confidence=dream.confidence,
            time_horizon=time_horizon,
        )

        self.insights[insight_id] = insight
        return insight_id

    def validate_dream_prediction(self, dream_id: str, actual_outcome: str) -> Dict[str, Any]:
        """Validate if dream's prediction came true"""
        if dream_id not in self.dreams:
            return {"valid": False, "error": "Dream not found"}

        dream = self.dreams[dream_id]
        predicted = dream.predicted_outcome.lower()
        actual = actual_outcome.lower()

        # Simple keyword matching for validation
        success = (
            any(word in actual for word in predicted.split()[:3])
            if predicted and actual
            else False
        )

        dream.successful = success

        return {
            "dream_id": dream_id,
            "predicted": dream.predicted_outcome,
            "actual": actual_outcome,
            "accurate": success,
            "confidence_was": dream.confidence,
            "confidence_updated": dream.confidence if success else dream.confidence * 0.7,
        }

    def influence_vector_decision(
        self,
        vector_type: str,
        current_state: Dict[str, Any],
        available_dreams: List[str],
    ) -> Dict[str, Any]:
        """Use dreams to influence a vector decision"""
        relevant_dreams = [
            self.dreams[did]
            for did in available_dreams
            if did in self.dreams and vector_type in self.dreams[did].affected_vectors
        ]

        if not relevant_dreams:
            return {
                "vector": vector_type,
                "dream_influenced": False,
                "recommendation": "No dream guidance available",
                "confidence": 0.0,
            }

        # Find most confident relevant dream
        best_dream = max(relevant_dreams, key=lambda d: d.confidence)

        return {
            "vector": vector_type,
            "dream_influenced": True,
            "dream_id": best_dream.dream_id,
            "recommendation": best_dream.predicted_outcome,
            "confidence": best_dream.confidence,
            "symbols": [s.name for s in best_dream.symbols],
            "interpretation": best_dream.interpretation,
        }

    def get_dream_statistics(self) -> Dict[str, Any]:
        """Get statistics on dream patterns"""
        if not self.dreams:
            return {
                "total_dreams": 0,
                "accurate_predictions": 0,
                "average_confidence": 0.0,
                "dreams_by_type": {},
                "symbols_by_meaning": {},
            }

        total_dreams = len(self.dreams)
        accurate = sum(1 for d in self.dreams.values() if d.successful)
        avg_confidence = sum(d.confidence for d in self.dreams.values()) / total_dreams

        dreams_by_type = {}
        for dream in self.dreams.values():
            dtype = dream.dream_type.value
            dreams_by_type[dtype] = dreams_by_type.get(dtype, 0) + 1

        symbols_by_meaning = {}
        for dream in self.dreams.values():
            for symbol in dream.symbols:
                meaning = symbol.meaning.value
                symbols_by_meaning[meaning] = symbols_by_meaning.get(meaning, 0) + 1

        return {
            "total_dreams": total_dreams,
            "accurate_predictions": accurate,
            "prediction_accuracy_rate": accurate / total_dreams if total_dreams > 0 else 0.0,
            "average_confidence": avg_confidence,
            "dreams_by_type": dreams_by_type,
            "symbols_by_meaning": symbols_by_meaning,
            "total_insights": len(self.insights),
        }
