#!/usr/bin/env python3
"""
PHASE XXI - CAPTAIN'S CHAIR AI
Meta-layer interpreting all signals and advising the captain.
Synthesizes recommendations from all systems for decision-making.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from enum import Enum


class ConfidenceLevel(Enum):
    """Confidence in recommendations"""
    CRITICAL = "critical"  # < 40%
    LOW = "low"  # 40-60%
    MODERATE = "moderate"  # 60-75%
    HIGH = "high"  # 75-90%
    VERY_HIGH = "very_high"  # > 90%


@dataclass
class SystemInput:
    """Input from a federation system"""
    system_name: str  # temporal_memory, constitution, dream_engine, etc.
    signal_type: str  # prediction, warning, recommendation, status
    data: Dict[str, Any]
    confidence: float  # 0.0-1.0
    priority: int  # Higher = more urgent
    timestamp: float


@dataclass
class CaptainRecommendation:
    """Recommendation from AI to captain"""
    recommendation_id: str
    title: str
    description: str
    recommended_action: str
    affected_vectors: List[str]
    confidence_level: ConfidenceLevel
    reasoning: List[str]
    alternatives: List[str] = field(default_factory=list)
    potential_risks: List[str] = field(default_factory=list)
    potential_benefits: List[str] = field(default_factory=list)
    systems_consulted: List[str] = field(default_factory=list)
    issued_at: float = field(default_factory=datetime.now().timestamp)


class CaptainChairAI:
    """AI advisor synthesizing all federation systems"""

    def __init__(self):
        self.system_inputs: List[SystemInput] = []
        self.recommendations: Dict[str, CaptainRecommendation] = {}
        self.recommendation_counter = 0
        self.decision_history: List[str] = []
        self.system_weights = {
            "temporal_memory": 0.15,  # Historical precedent
            "constitution_engine": 0.20,  # Legality/legitimacy
            "dream_engine": 0.10,  # Prophetic guidance
            "emotion_matrix": 0.15,  # Fleet morale
            "orchestration_brain": 0.20,  # Strategic analysis
            "multiverse_reconciliation": 0.10,  # Multiverse stability
            "first_contact_engine": 0.10,  # External factors
        }

    def ingest_system_signal(
        self,
        system_name: str,
        signal_type: str,
        data: Dict[str, Any],
        confidence: float,
        priority: int = 5,
    ) -> str:
        """Ingest signal from another federation system"""
        signal = SystemInput(
            system_name=system_name,
            signal_type=signal_type,
            data=data,
            confidence=confidence,
            priority=priority,
            timestamp=datetime.now().timestamp(),
        )
        self.system_inputs.append(signal)
        return f"signal_{len(self.system_inputs):04d}"

    def synthesize_recommendation(self) -> Optional[str]:
        """Synthesize recommendation from all ingested signals"""
        if not self.system_inputs:
            return None

        # Analyze high-priority signals
        high_priority_signals = [s for s in self.system_inputs if s.priority >= 7]
        if not high_priority_signals:
            high_priority_signals = self.system_inputs[-3:] if len(self.system_inputs) >= 3 else self.system_inputs

        # Determine recommendation topic
        topic = self._determine_recommendation_topic(high_priority_signals)

        # Calculate weighted confidence
        weighted_confidence = self._calculate_weighted_confidence(high_priority_signals)
        confidence_level = self._confidence_to_level(weighted_confidence)

        # Build reasoning
        reasoning = self._build_reasoning(high_priority_signals, topic)

        # Identify affected vectors
        affected_vectors = self._identify_affected_vectors(high_priority_signals)

        # Generate recommendation
        self.recommendation_counter += 1
        rec_id = f"recommendation_{self.recommendation_counter:04d}"

        recommendation = CaptainRecommendation(
            recommendation_id=rec_id,
            title=f"Navigation Guidance: {topic}",
            description=self._generate_description(topic, high_priority_signals),
            recommended_action=self._generate_action(topic, high_priority_signals),
            affected_vectors=affected_vectors,
            confidence_level=confidence_level,
            reasoning=reasoning,
            alternatives=self._generate_alternatives(topic),
            potential_risks=self._identify_risks(topic, high_priority_signals),
            potential_benefits=self._identify_benefits(topic, high_priority_signals),
            systems_consulted=[s.system_name for s in high_priority_signals],
        )

        self.recommendations[rec_id] = recommendation
        self.decision_history.append(rec_id)

        return rec_id

    def _determine_recommendation_topic(self, signals: List[SystemInput]) -> str:
        """Determine main topic from signals"""
        topics = {}
        for signal in signals:
            data = signal.data
            if "vector" in data:
                vec = data["vector"]
                topics[vec] = topics.get(vec, 0) + signal.confidence
            elif "threat_level" in data:
                topics["first_contact"] = topics.get("first_contact", 0) + signal.confidence * signal.priority

        if topics:
            return max(topics, key=topics.get)
        return "Federation Stability"

    def _calculate_weighted_confidence(self, signals: List[SystemInput]) -> float:
        """Calculate confidence weighted by system importance and signal confidence"""
        if not signals:
            return 0.0

        total_weight = 0.0
        weighted_confidence = 0.0

        for signal in signals:
            weight = self.system_weights.get(signal.system_name, 0.1)
            total_weight += weight
            weighted_confidence += signal.confidence * weight

        return weighted_confidence / total_weight if total_weight > 0 else 0.0

    def _confidence_to_level(self, confidence: float) -> ConfidenceLevel:
        """Convert numeric confidence to level"""
        if confidence < 0.4:
            return ConfidenceLevel.CRITICAL
        elif confidence < 0.6:
            return ConfidenceLevel.LOW
        elif confidence < 0.75:
            return ConfidenceLevel.MODERATE
        elif confidence < 0.9:
            return ConfidenceLevel.HIGH
        else:
            return ConfidenceLevel.VERY_HIGH

    def _build_reasoning(self, signals: List[SystemInput], topic: str) -> List[str]:
        """Build reasoning chain from signals"""
        reasoning = []

        for signal in signals:
            if signal.system_name == "dream_engine":
                if "predicted_outcome" in signal.data:
                    reasoning.append(f"Dream visions predict: {signal.data['predicted_outcome']}")
            elif signal.system_name == "emotion_matrix":
                if "readiness" in signal.data:
                    reasoning.append(f"Fleet readiness: {signal.data['readiness']:.1%}")
            elif signal.system_name == "constitution_engine":
                if "valid" in signal.data:
                    validity = "constitutionally sound" if signal.data["valid"] else "may require amendment"
                    reasoning.append(f"Legal analysis: {validity}")
            elif signal.system_name == "orchestration_brain":
                if "confidence" in signal.data:
                    reasoning.append(f"Strategic confidence: {signal.data['confidence']:.1%}")
            elif signal.system_name == "temporal_memory":
                if "precedent" in signal.data:
                    reasoning.append(f"Historical precedent available")

        if not reasoning:
            reasoning = [f"Multiple federation systems indicate {topic} is priority"]

        return reasoning

    def _identify_affected_vectors(self, signals: List[SystemInput]) -> List[str]:
        """Identify which decision vectors are affected"""
        vectors = set()
        for signal in signals:
            if "vector" in signal.data:
                vectors.add(signal.data["vector"])
            elif signal.system_name == "first_contact_engine":
                vectors.add("first_contact")
            elif signal.system_name == "orchestration_brain":
                vectors.update(["diplomatic", "expansion", "first_contact"])

        return list(vectors) if vectors else ["federation_strategy"]

    def _generate_description(self, topic: str, signals: List[SystemInput]) -> str:
        """Generate natural description of situation"""
        if "threat" in topic.lower():
            return "External or internal threat assessment indicates prudent preparation"
        elif "grow" in topic.lower() or "expansion" in topic.lower():
            return "Growth opportunity detected across federation systems"
        elif "stability" in topic.lower():
            return "Federation stability metrics require attention"
        elif "diplomatic" in topic.lower():
            return "Diplomatic overtures show promise for alliance building"
        else:
            return f"Federation systems converge on {topic} as priority area"

    def _generate_action(self, topic: str, signals: List[SystemInput]) -> str:
        """Generate recommended action"""
        if "threat" in topic.lower():
            return "Increase monitoring, prepare defensive protocols, review readiness status"
        elif "growth" in topic.lower() or "expansion" in topic.lower():
            return "Evaluate expansion opportunities, allocate resources, set realistic targets"
        elif "diplomatic" in topic.lower():
            return "Open diplomatic channels, propose treaties, build alliances"
        elif "stability" in topic.lower():
            return "Review emotional state, apply healing measures, assess governance integrity"
        else:
            return "Convene strategic council and review recommendations in detail"

    def _generate_alternatives(self, topic: str) -> List[str]:
        """Generate alternative actions"""
        if "threat" in topic.lower():
            return [
                "Diplomatic negotiation with potential adversaries",
                "Fortify defensive positions and prepare for withdrawal",
                "Attempt early peace treaty before escalation",
            ]
        elif "growth" in topic.lower():
            return [
                "Focus on consolidation instead of expansion",
                "Expand more aggressively with higher risk",
                "Seek partnerships for shared expansion",
            ]
        else:
            return [
                "Maintain status quo",
                "Take cautious incrementalist approach",
                "Attempt bold transformation",
            ]

    def _identify_risks(self, topic: str, signals: List[SystemInput]) -> List[str]:
        """Identify potential risks"""
        risks = []

        for signal in signals:
            if signal.confidence < 0.6:
                risks.append(f"Low confidence in {signal.system_name} signal")
            if "risk_factors" in signal.data:
                risks.extend(signal.data["risk_factors"])

        if "expansion" in topic.lower():
            risks.append("Over-extension could strain resources")
        if "diplomatic" in topic.lower():
            risks.append("Alliances may collapse if trust erodes")

        return risks[:3] if risks else ["Unknown unknowns in federation dynamics"]

    def _identify_benefits(self, topic: str, signals: List[SystemInput]) -> List[str]:
        """Identify potential benefits"""
        benefits = []

        if "expansion" in topic.lower():
            benefits.append("Increased defensive capability")
            benefits.append("Economic expansion and resource access")

        if "diplomatic" in topic.lower():
            benefits.append("Shared responsibility and resource pooling")
            benefits.append("Reduced external threats through alliances")

        if "stability" in topic.lower():
            benefits.append("Improved federation coherence")
            benefits.append("Better decision-making through clarity")

        return benefits if benefits else ["Pursuit of recommended course strengthens federation"]

    def get_captain_briefing(self) -> Dict[str, Any]:
        """Get comprehensive briefing for captain"""
        latest_rec = None
        if self.recommendations:
            latest_rec = self.recommendations[self.decision_history[-1]]

        return {
            "timestamp": datetime.now().timestamp(),
            "active_recommendations": len([r for r in self.recommendations.values()]),
            "latest_recommendation": {
                "id": latest_rec.recommendation_id if latest_rec else None,
                "title": latest_rec.title if latest_rec else None,
                "action": latest_rec.recommended_action if latest_rec else None,
                "confidence": latest_rec.confidence_level.value if latest_rec else None,
                "reasoning": latest_rec.reasoning if latest_rec else [],
            } if latest_rec else None,
            "systems_active": len(set(s.system_name for s in self.system_inputs)),
            "total_signals_ingested": len(self.system_inputs),
            "decisions_made": len(self.decision_history),
        }

    def get_ai_status(self) -> Dict[str, Any]:
        """Get AI system status"""
        return {
            "timestamp": datetime.now().timestamp(),
            "recommendations_generated": len(self.recommendations),
            "signals_processed": len(self.system_inputs),
            "system_weights": self.system_weights,
            "decision_history_length": len(self.decision_history),
            "active_recommendation_id": self.decision_history[-1] if self.decision_history else None,
        }
