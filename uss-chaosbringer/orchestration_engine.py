#!/usr/bin/env python3
"""
PHASE XV - FEDERATION ORCHESTRATION BRAIN
Meta-engine that synthesizes cross-vector decisions from all Phase XIV engines.
Reads signals, predicts outcomes, generates actions, maintains federation coherence.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple, Callable
from datetime import datetime
from enum import Enum
import threading
import time
from collections import defaultdict


class DecisionVector(Enum):
    DIPLOMATIC = "diplomatic"
    EXPANSION = "expansion"
    FIRST_CONTACT = "first_contact"


class ActionPriority(Enum):
    CRITICAL = 10
    HIGH = 7
    NORMAL = 5
    LOW = 2


@dataclass
class Signal:
    """Unified signal from any engine"""
    vector: DecisionVector
    signal_type: str
    value: float
    confidence: float
    timestamp: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Decision:
    """Orchestrated federation decision"""
    decision_id: str
    vectors_involved: List[DecisionVector]
    action_recommended: str
    confidence: float
    reasoning: str
    priority: ActionPriority
    affected_systems: List[str]
    timestamp: float
    implementation_status: str = "PENDING"  # PENDING, EXECUTING, COMPLETE, FAILED


@dataclass
class FederationState:
    """Unified federation state across all vectors"""
    timestamp: float
    overall_readiness: float
    diplomatic_readiness: float
    expansion_readiness: float
    first_contact_readiness: float
    active_decisions: int
    queued_actions: int
    threat_level: float
    stability_score: float
    vector_coherence: float  # How well aligned are the three vectors


class SignalFusionLayer:
    """Fuses signals from all three engines into unified decision signals"""

    def __init__(self):
        self.signal_history: Dict[DecisionVector, List[Signal]] = defaultdict(list)
        self.fusion_rules = {}
        self._setup_fusion_rules()

    def _setup_fusion_rules(self):
        """Setup rules for fusing signals from different vectors"""
        self.fusion_rules = {
            ("diplomatic", "expansion"): self._fuse_diplomacy_expansion,
            ("diplomatic", "first_contact"): self._fuse_diplomacy_firstcontact,
            ("expansion", "first_contact"): self._fuse_expansion_firstcontact,
        }

    def add_signal(self, signal: Signal):
        """Add signal from an engine"""
        self.signal_history[signal.vector].append(signal)

    def fuse_signals(self) -> List[Dict[str, Any]]:
        """Fuse signals across vectors to identify cross-vector patterns"""
        fused_signals = []

        # Get latest signals from each vector
        diplomatic_latest = (
            self.signal_history[DecisionVector.DIPLOMATIC][-1]
            if self.signal_history[DecisionVector.DIPLOMATIC]
            else None
        )
        expansion_latest = (
            self.signal_history[DecisionVector.EXPANSION][-1]
            if self.signal_history[DecisionVector.EXPANSION]
            else None
        )
        firstcontact_latest = (
            self.signal_history[DecisionVector.FIRST_CONTACT][-1]
            if self.signal_history[DecisionVector.FIRST_CONTACT]
            else None
        )

        # Fuse diplomatic + expansion
        if diplomatic_latest and expansion_latest:
            fused = self._fuse_diplomacy_expansion(
                diplomatic_latest, expansion_latest
            )
            if fused:
                fused_signals.append(fused)

        # Fuse diplomatic + first contact
        if diplomatic_latest and firstcontact_latest:
            fused = self._fuse_diplomacy_firstcontact(
                diplomatic_latest, firstcontact_latest
            )
            if fused:
                fused_signals.append(fused)

        # Fuse expansion + first contact
        if expansion_latest and firstcontact_latest:
            fused = self._fuse_expansion_firstcontact(
                expansion_latest, firstcontact_latest
            )
            if fused:
                fused_signals.append(fused)

        return fused_signals

    def _fuse_diplomacy_expansion(
        self, dip_signal: Signal, exp_signal: Signal
    ) -> Optional[Dict[str, Any]]:
        """Fuse diplomatic and expansion signals"""
        # Diplomatic growth enables fleet expansion
        if (
            dip_signal.signal_type == "coalition_formed"
            and exp_signal.signal_type == "expansion_ready"
        ):
            return {
                "type": "DIPLOMATIC_EXPANSION_OPPORTUNITY",
                "pattern": "New coalition enables rapid fleet growth",
                "confidence": (dip_signal.confidence + exp_signal.confidence) / 2,
                "recommendation": "Execute expansion with diplomatic backing",
            }
        return None

    def _fuse_diplomacy_firstcontact(
        self, dip_signal: Signal, fc_signal: Signal
    ) -> Optional[Dict[str, Any]]:
        """Fuse diplomatic and first contact signals"""
        # Strong diplomacy improves first contact success
        if (
            dip_signal.signal_type == "diplomatic_stability_high"
            and fc_signal.signal_type == "external_fleet_detected"
        ):
            return {
                "type": "FIRST_CONTACT_READY",
                "pattern": "Stable diplomacy enables successful first contact",
                "confidence": (dip_signal.confidence + fc_signal.confidence) / 2,
                "recommendation": "Initiate first contact with confidence",
            }
        return None

    def _fuse_expansion_firstcontact(
        self, exp_signal: Signal, fc_signal: Signal
    ) -> Optional[Dict[str, Any]]:
        """Fuse expansion and first contact signals"""
        # Large fleet improves first contact capability
        if (
            exp_signal.signal_type == "fleet_size_increased"
            and fc_signal.signal_type == "external_threat_detected"
        ):
            return {
                "type": "DEFENSIVE_EXPANSION",
                "pattern": "Fleet growth enables defense against external threat",
                "confidence": (exp_signal.confidence + fc_signal.confidence) / 2,
                "recommendation": "Maintain fleet growth for defensive posture",
            }
        return None


class DecisionSynthesizer:
    """Synthesizes fused signals into actionable decisions"""

    def __init__(self):
        self.decision_templates = {}
        self.decision_history = []
        self._setup_decision_templates()

    def _setup_decision_templates(self):
        """Setup templates for common decision scenarios"""
        self.decision_templates = {
            "DIPLOMATIC_EXPANSION_OPPORTUNITY": {
                "action": "Initiate coalition-backed expansion",
                "systems_affected": ["diplomatic", "expansion"],
                "priority": ActionPriority.HIGH,
            },
            "FIRST_CONTACT_READY": {
                "action": "Execute first contact protocol",
                "systems_affected": ["diplomatic", "first_contact"],
                "priority": ActionPriority.HIGH,
            },
            "DEFENSIVE_EXPANSION": {
                "action": "Accelerate defensive fleet expansion",
                "systems_affected": ["expansion", "first_contact"],
                "priority": ActionPriority.CRITICAL,
            },
        }

    def synthesize_decision(
        self,
        decision_id: str,
        fused_signal: Dict[str, Any],
        confidence_threshold: float = 0.6,
    ) -> Optional[Decision]:
        """Synthesize a fused signal into a decision"""
        signal_type = fused_signal.get("type")
        if signal_type not in self.decision_templates:
            return None

        template = self.decision_templates[signal_type]
        fused_confidence = fused_signal.get("confidence", 0.5)

        if fused_confidence < confidence_threshold:
            return None

        vectors_involved = []
        # Check signal type and affected systems
        signal_and_systems = (signal_type.lower() + " " + " ".join(template.get("systems_affected", []))).lower()

        if "diplomatic" in signal_and_systems:
            vectors_involved.append(DecisionVector.DIPLOMATIC)
        if "expansion" in signal_and_systems:
            vectors_involved.append(DecisionVector.EXPANSION)
        if "contact" in signal_and_systems or "first_contact" in signal_and_systems:
            vectors_involved.append(DecisionVector.FIRST_CONTACT)

        decision = Decision(
            decision_id=decision_id,
            vectors_involved=vectors_involved,
            action_recommended=template["action"],
            confidence=fused_confidence,
            reasoning=fused_signal.get("pattern", ""),
            priority=template["priority"],
            affected_systems=template["systems_affected"],
            timestamp=datetime.now().timestamp(),
        )

        self.decision_history.append(decision)
        return decision


class OutcomePredictor:
    """Predicts outcomes of potential actions"""

    def __init__(self):
        self.prediction_models = {}
        self.outcome_history = []
        self._setup_prediction_models()

    def _setup_prediction_models(self):
        """Setup prediction models for different action types"""
        self.prediction_models = {
            "expansion": self._predict_expansion_outcome,
            "diplomatic": self._predict_diplomatic_outcome,
            "first_contact": self._predict_contact_outcome,
        }

    def predict_outcome(self, action: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Predict outcome of an action"""
        action_type = action.split("_")[0].lower()
        predictor = self.prediction_models.get(
            action_type
        )

        # Handle "contact" -> "first_contact" mapping
        if not predictor and action_type == "contact":
            predictor = self.prediction_models.get("first_contact")

        if not predictor:
            predictor = self._predict_generic_outcome

        return predictor(action, context)

    def _predict_expansion_outcome(
        self, action: str, context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Predict expansion action outcome"""
        current_ships = context.get("current_ships", 0)
        readiness = context.get("expansion_readiness", 0.5)

        # Predict success based on readiness and current state
        success_chance = readiness * 0.9 + (current_ships / 100) * 0.1
        success_chance = min(1.0, max(0.0, success_chance))

        return {
            "action": action,
            "predicted_success_chance": success_chance,
            "expected_outcomes": {
                "ships_added": int(5 * success_chance),
                "morale_impact": 0.05 * success_chance,
                "stability_impact": -0.02 * (1 - success_chance),
            },
            "risk_factors": (
                ["insufficient_readiness"] if readiness < 0.7 else []
            ),
            "confidence": 0.75,
        }

    def _predict_diplomatic_outcome(
        self, action: str, context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Predict diplomatic action outcome"""
        current_alliances = context.get("current_alliances", 0)
        stability = context.get("diplomatic_stability", 0.5)

        # Predict success based on stability
        success_chance = stability * 0.85 + (current_alliances / 20) * 0.15
        success_chance = min(1.0, max(0.0, success_chance))

        return {
            "action": action,
            "predicted_success_chance": success_chance,
            "expected_outcomes": {
                "alliances_formed": int(2 * success_chance),
                "relations_improved": success_chance * 0.8,
                "treaties_possible": int(3 * success_chance),
            },
            "risk_factors": (
                ["low_stability"] if stability < 0.6 else []
            ),
            "confidence": 0.70,
        }

    def _predict_contact_outcome(
        self, action: str, context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Predict first contact action outcome"""
        external_fleets = context.get("external_fleets_detected", 0)
        threat_level = context.get("threat_level", 0.5)

        # Predict success based on threat level
        success_chance = (1.0 - threat_level) * 0.8 + 0.2
        success_chance = min(1.0, max(0.0, success_chance))

        return {
            "action": action,
            "predicted_success_chance": success_chance,
            "expected_outcomes": {
                "peaceful_contact": int(external_fleets * success_chance),
                "alliance_potential": success_chance * 0.6,
            },
            "risk_factors": (
                ["high_threat"] if threat_level > 0.7 else []
            ),
            "confidence": 0.65,
        }

    def _predict_generic_outcome(
        self, action: str, context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generic outcome prediction"""
        return {
            "action": action,
            "predicted_success_chance": 0.5,
            "expected_outcomes": {},
            "risk_factors": ["unknown_action_type"],
            "confidence": 0.4,
        }


class ActionQueueManager:
    """Manages queue of federation actions with prioritization"""

    def __init__(self):
        self.action_queue: List[Decision] = []
        self.executed_actions: List[Decision] = []
        self.action_handlers: Dict[str, Callable] = {}
        self._setup_action_handlers()

    def _setup_action_handlers(self):
        """Setup handlers for different action types"""
        self.action_handlers = {
            "expansion": self._handle_expansion,
            "diplomatic": self._handle_diplomatic,
            "contact": self._handle_contact,
        }

    def queue_action(self, decision: Decision):
        """Queue a decision for execution"""
        self.action_queue.append(decision)
        # Sort by priority
        self.action_queue.sort(
            key=lambda d: d.priority.value, reverse=True
        )

    def execute_next_action(self) -> Optional[Decision]:
        """Execute the highest priority queued action"""
        if not self.action_queue:
            return None

        decision = self.action_queue.pop(0)
        action_type = decision.action_recommended.split("_")[0].lower()
        handler = self.action_handlers.get(
            action_type, self._handle_generic
        )

        try:
            result = handler(decision)
            decision.implementation_status = "COMPLETE"
        except Exception as e:
            decision.implementation_status = "FAILED"

        self.executed_actions.append(decision)
        return decision

    def _handle_expansion(self, decision: Decision) -> bool:
        """Handle expansion action"""
        # Fleet expansion logic would go here
        return True

    def _handle_diplomatic(self, decision: Decision) -> bool:
        """Handle diplomatic action"""
        # Diplomatic action logic would go here
        return True

    def _handle_contact(self, decision: Decision) -> bool:
        """Handle first contact action"""
        # Contact action logic would go here
        return True

    def _handle_generic(self, decision: Decision) -> bool:
        """Handle generic action"""
        return True

    def get_queue_status(self) -> Dict[str, Any]:
        """Get current queue status"""
        return {
            "queued_actions": len(self.action_queue),
            "executed_actions": len(self.executed_actions),
            "next_priority": (
                self.action_queue[0].priority.name
                if self.action_queue
                else "NONE"
            ),
            "top_action": (
                self.action_queue[0].action_recommended
                if self.action_queue
                else "NONE"
            ),
        }


class FederationStateAggregator:
    """Aggregates all federat states into unified FederationState"""

    def __init__(
        self,
        diplomatic_engine=None,
        expansion_engine=None,
        first_contact_engine=None,
    ):
        self.diplomatic_engine = diplomatic_engine
        self.expansion_engine = expansion_engine
        self.first_contact_engine = first_contact_engine

    def aggregate_state(self) -> FederationState:
        """Aggregate current federation state from all engines"""
        dip_readiness = (
            self.diplomatic_engine.get_diplomatic_status().overall_stability
            if self.diplomatic_engine
            else 0.5
        )
        exp_readiness = (
            self.expansion_engine.get_expansion_status().fleet_complexity
            if self.expansion_engine
            else 0.5
        )
        fc_readiness = (
            self.first_contact_engine.get_first_contact_status().federation_stability_under_contact
            if self.first_contact_engine
            else 0.5
        )

        # Overall readiness is average of all vectors
        overall_readiness = (
            dip_readiness + exp_readiness + fc_readiness
        ) / 3.0

        # Threat level from first contact
        threat_level = (
            1.0
            - self.first_contact_engine.get_first_contact_status().federation_stability_under_contact
            if self.first_contact_engine
            else 0.5
        )

        # Vector coherence: how well aligned are efforts
        vector_coherence = self._calculate_vector_coherence(
            dip_readiness, exp_readiness, fc_readiness
        )

        return FederationState(
            timestamp=datetime.now().timestamp(),
            overall_readiness=overall_readiness,
            diplomatic_readiness=dip_readiness,
            expansion_readiness=exp_readiness,
            first_contact_readiness=fc_readiness,
            active_decisions=0,  # Set by orchestrator
            queued_actions=0,  # Set by orchestrator
            threat_level=threat_level,
            stability_score=overall_readiness,
            vector_coherence=vector_coherence,
        )

    def _calculate_vector_coherence(
        self, dip: float, exp: float, fc: float
    ) -> float:
        """Calculate how well aligned the three vectors are"""
        # High coherence when all three readiness levels are similar
        # Use squared differences for stronger penalization of divergence
        variance = (
            (dip - exp) ** 2 + (exp - fc) ** 2 + (fc - dip) ** 2
        ) / 3

        # More aggressive penalty: multiply variance by 2.5 for stronger sensitivity
        coherence = 1.0 - min(1.0, variance * 2.5)
        return max(0.0, coherence)


class FederationOrchestrationBrain:
    """Main orchestration engine combining all components"""

    def __init__(
        self,
        diplomatic_engine=None,
        expansion_engine=None,
        first_contact_engine=None,
    ):
        self.diplomatic_engine = diplomatic_engine
        self.expansion_engine = expansion_engine
        self.first_contact_engine = first_contact_engine

        self.signal_fusion = SignalFusionLayer()
        self.decision_synthesizer = DecisionSynthesizer()
        self.outcome_predictor = OutcomePredictor()
        self.action_queue = ActionQueueManager()
        self.state_aggregator = FederationStateAggregator(
            diplomatic_engine, expansion_engine, first_contact_engine
        )

        self.orchestration_loop_active = False
        self.orchestration_thread = None
        self._decision_counter = 0

    def start_orchestration(self):
        """Start the orchestration loop"""
        self.orchestration_loop_active = True
        self.orchestration_thread = threading.Thread(
            target=self._orchestration_loop, daemon=True
        )
        self.orchestration_thread.start()

    def stop_orchestration(self):
        """Stop the orchestration loop"""
        self.orchestration_loop_active = False

    def _orchestration_loop(self):
        """Main orchestration loop that continuously synthesizes decisions"""
        while self.orchestration_loop_active:
            try:
                # 1. Collect signals from all engines
                self._collect_signals()

                # 2. Fuse signals across vectors
                fused_signals = self.signal_fusion.fuse_signals()

                # 3. Synthesize decisions from fused signals
                for fused_signal in fused_signals:
                    self._decision_counter += 1
                    decision = self.decision_synthesizer.synthesize_decision(
                        f"decision_{self._decision_counter}",
                        fused_signal,
                    )

                    if decision:
                        # 4. Predict outcome
                        outcome = self.outcome_predictor.predict_outcome(
                            decision.action_recommended,
                            self._get_decision_context(),
                        )

                        # 5. Queue action if confidence is high enough
                        if outcome["predicted_success_chance"] > 0.6:
                            self.action_queue.queue_action(decision)

                # 6. Execute queued actions
                self.action_queue.execute_next_action()

                time.sleep(2.0)  # Orchestration cycle every 2 seconds

            except Exception as e:
                print(f"Orchestration loop error: {e}")
                time.sleep(5.0)

    def _collect_signals(self):
        """Collect signals from all engines"""
        # Diplomatic signals
        if self.diplomatic_engine:
            dip_status = self.diplomatic_engine.get_diplomatic_status()
            signal = Signal(
                vector=DecisionVector.DIPLOMATIC,
                signal_type=(
                    "diplomatic_stability_high"
                    if dip_status.overall_stability > 0.7
                    else "diplomatic_stability_low"
                ),
                value=dip_status.overall_stability,
                confidence=0.8,
                timestamp=datetime.now().timestamp(),
            )
            self.signal_fusion.add_signal(signal)

        # Expansion signals
        if self.expansion_engine:
            exp_status = self.expansion_engine.get_expansion_status()
            signal = Signal(
                vector=DecisionVector.EXPANSION,
                signal_type=(
                    "expansion_ready"
                    if exp_status.fleet_complexity > 0.6
                    else "expansion_limited"
                ),
                value=exp_status.fleet_complexity,
                confidence=0.8,
                timestamp=datetime.now().timestamp(),
            )
            self.signal_fusion.add_signal(signal)

        # First contact signals
        if self.first_contact_engine:
            fc_status = self.first_contact_engine.get_first_contact_status()
            signal = Signal(
                vector=DecisionVector.FIRST_CONTACT,
                signal_type=(
                    "external_fleet_detected"
                    if fc_status.external_fleets_detected > 0
                    else "space_clear"
                ),
                value=fc_status.total_threat_assessment,
                confidence=0.8,
                timestamp=datetime.now().timestamp(),
            )
            self.signal_fusion.add_signal(signal)

    def _get_decision_context(self) -> Dict[str, Any]:
        """Get current context for decisions"""
        context = {}

        if self.diplomatic_engine:
            dip_status = self.diplomatic_engine.get_diplomatic_status()
            context["current_alliances"] = dip_status.active_alliances
            context["diplomatic_stability"] = dip_status.overall_stability

        if self.expansion_engine:
            exp_status = self.expansion_engine.get_expansion_status()
            context["current_ships"] = exp_status.active_ships
            context["expansion_readiness"] = exp_status.fleet_complexity

        if self.first_contact_engine:
            fc_status = self.first_contact_engine.get_first_contact_status()
            context["external_fleets_detected"] = (
                fc_status.external_fleets_detected
            )
            context[
                "threat_level"
            ] = fc_status.total_threat_assessment

        return context

    def get_federation_state(self) -> FederationState:
        """Get current federation state"""
        state = self.state_aggregator.aggregate_state()
        state.active_decisions = len(
            self.decision_synthesizer.decision_history
        )
        state.queued_actions = len(self.action_queue.action_queue)
        return state

    def get_orchestration_status(self) -> Dict[str, Any]:
        """Get comprehensive orchestration status"""
        fed_state = self.get_federation_state()
        queue_status = self.action_queue.get_queue_status()

        return {
            "timestamp": datetime.now().timestamp(),
            "orchestration_active": self.orchestration_loop_active,
            "federation_state": {
                "overall_readiness": fed_state.overall_readiness,
                "diplomatic_readiness": fed_state.diplomatic_readiness,
                "expansion_readiness": fed_state.expansion_readiness,
                "first_contact_readiness": fed_state.first_contact_readiness,
                "threat_level": fed_state.threat_level,
                "stability_score": fed_state.stability_score,
                "vector_coherence": fed_state.vector_coherence,
            },
            "decision_synthesis": {
                "total_decisions": len(
                    self.decision_synthesizer.decision_history
                ),
                "active_decisions": fed_state.active_decisions,
            },
            "action_queue": queue_status,
            "signal_fusion": {
                "diplomatic_signals": len(
                    self.signal_fusion.signal_history[
                        DecisionVector.DIPLOMATIC
                    ]
                ),
                "expansion_signals": len(
                    self.signal_fusion.signal_history[
                        DecisionVector.EXPANSION
                    ]
                ),
                "first_contact_signals": len(
                    self.signal_fusion.signal_history[
                        DecisionVector.FIRST_CONTACT
                    ]
                ),
            },
        }
