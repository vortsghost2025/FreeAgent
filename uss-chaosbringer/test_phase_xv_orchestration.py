#!/usr/bin/env python3
"""
PHASE XV - FEDERATION ORCHESTRATION BRAIN TESTS
Comprehensive test suite for orchestration engine (18+ tests)
"""

import pytest
import time
from datetime import datetime

from orchestration_engine import (
    FederationOrchestrationBrain,
    SignalFusionLayer,
    DecisionSynthesizer,
    OutcomePredictor,
    ActionQueueManager,
    FederationStateAggregator,
    Signal,
    DecisionVector,
    ActionPriority,
)
from diplomatic_engine import DiplomaticEngine, TreatyType, IdeologyType
from fleet_expansion_engine import FleetExpansionEngine, ShipArchetype
from first_contact_engine import FirstContactEngine, GovernanceType, TechnologyLevel


class TestSignalFusionLayer:
    """Test signal fusion from all three vectors"""

    @pytest.fixture
    def fusion_layer(self):
        return SignalFusionLayer()

    def test_signal_addition(self, fusion_layer):
        """Test adding signals to fusion layer"""
        signal = Signal(
            vector=DecisionVector.DIPLOMATIC,
            signal_type="test_signal",
            value=0.8,
            confidence=0.9,
            timestamp=datetime.now().timestamp(),
        )
        fusion_layer.add_signal(signal)
        assert len(fusion_layer.signal_history[DecisionVector.DIPLOMATIC]) == 1

    def test_diplomatic_expansion_fusion(self, fusion_layer):
        """Test fusing diplomatic and expansion signals"""
        dip_signal = Signal(
            vector=DecisionVector.DIPLOMATIC,
            signal_type="coalition_formed",
            value=0.9,
            confidence=0.95,
            timestamp=datetime.now().timestamp(),
        )
        exp_signal = Signal(
            vector=DecisionVector.EXPANSION,
            signal_type="expansion_ready",
            value=0.85,
            confidence=0.9,
            timestamp=datetime.now().timestamp(),
        )

        fusion_layer.add_signal(dip_signal)
        fusion_layer.add_signal(exp_signal)

        fused = fusion_layer.fuse_signals()
        assert len(fused) > 0

    def test_diplomatic_firstcontact_fusion(self, fusion_layer):
        """Test fusing diplomatic and first contact signals"""
        dip_signal = Signal(
            vector=DecisionVector.DIPLOMATIC,
            signal_type="diplomatic_stability_high",
            value=0.95,
            confidence=0.95,
            timestamp=datetime.now().timestamp(),
        )
        fc_signal = Signal(
            vector=DecisionVector.FIRST_CONTACT,
            signal_type="external_fleet_detected",
            value=0.7,
            confidence=0.9,
            timestamp=datetime.now().timestamp(),
        )

        fusion_layer.add_signal(dip_signal)
        fusion_layer.add_signal(fc_signal)

        fused = fusion_layer.fuse_signals()
        assert len(fused) > 0

    def test_expansion_firstcontact_fusion(self, fusion_layer):
        """Test fusing expansion and first contact signals"""
        exp_signal = Signal(
            vector=DecisionVector.EXPANSION,
            signal_type="fleet_size_increased",
            value=0.75,
            confidence=0.9,
            timestamp=datetime.now().timestamp(),
        )
        fc_signal = Signal(
            vector=DecisionVector.FIRST_CONTACT,
            signal_type="external_threat_detected",
            value=0.8,
            confidence=0.85,
            timestamp=datetime.now().timestamp(),
        )

        fusion_layer.add_signal(exp_signal)
        fusion_layer.add_signal(fc_signal)

        fused = fusion_layer.fuse_signals()
        assert len(fused) > 0


class TestDecisionSynthesizer:
    """Test decision synthesis from fused signals"""

    @pytest.fixture
    def synthesizer(self):
        return DecisionSynthesizer()

    def test_decision_synthesis(self, synthesizer):
        """Test synthesizing decision from fused signal"""
        fused_signal = {
            "type": "DIPLOMATIC_EXPANSION_OPPORTUNITY",
            "pattern": "Coalition enables fleet growth",
            "confidence": 0.85,
        }

        decision = synthesizer.synthesize_decision(
            "test_decision_1", fused_signal
        )
        assert decision is not None
        assert decision.action_recommended == "Initiate coalition-backed expansion"

    def test_decision_confidence_threshold(self, synthesizer):
        """Test decision synthesis respects confidence threshold"""
        fused_signal = {
            "type": "DIPLOMATIC_EXPANSION_OPPORTUNITY",
            "pattern": "Coalition enables fleet growth",
            "confidence": 0.4,  # Below default threshold
        }

        decision = synthesizer.synthesize_decision(
            "test_decision_2", fused_signal, confidence_threshold=0.6
        )
        assert decision is None  # Low confidence, rejected

    def test_decision_vectors_identified(self, synthesizer):
        """Test decision correctly identifies involved vectors"""
        fused_signal = {
            "type": "FIRST_CONTACT_READY",
            "pattern": "Diplomacy enables contact",
            "confidence": 0.85,
        }

        decision = synthesizer.synthesize_decision(
            "test_decision_3", fused_signal
        )
        assert DecisionVector.DIPLOMATIC in decision.vectors_involved
        assert DecisionVector.FIRST_CONTACT in decision.vectors_involved

    def test_decision_priority_assignment(self, synthesizer):
        """Test decision priority is correctly assigned"""
        fused_signal = {
            "type": "DEFENSIVE_EXPANSION",
            "pattern": "Fleet growth for defense",
            "confidence": 0.9,
        }

        decision = synthesizer.synthesize_decision(
            "test_decision_4", fused_signal
        )
        assert decision.priority == ActionPriority.CRITICAL


class TestOutcomePredictor:
    """Test outcome prediction"""

    @pytest.fixture
    def predictor(self):
        return OutcomePredictor()

    def test_expansion_outcome_prediction(self, predictor):
        """Test predicting expansion action outcome"""
        context = {
            "current_ships": 5,
            "expansion_readiness": 0.8,
        }
        outcome = predictor.predict_outcome(
            "expand_fleet", context
        )

        assert "predicted_success_chance" in outcome
        assert 0.0 <= outcome["predicted_success_chance"] <= 1.0
        assert "expected_outcomes" in outcome

    def test_diplomatic_outcome_prediction(self, predictor):
        """Test predicting diplomatic action outcome"""
        context = {
            "current_alliances": 2,
            "diplomatic_stability": 0.75,
        }
        outcome = predictor.predict_outcome(
            "diplomatic_negotiation", context
        )

        assert 0.0 <= outcome["predicted_success_chance"] <= 1.0
        assert "alliances_formed" in outcome["expected_outcomes"]

    def test_contact_outcome_prediction(self, predictor):
        """Test predicting first contact action outcome"""
        context = {
            "external_fleets_detected": 1,
            "threat_level": 0.6,
        }
        outcome = predictor.predict_outcome(
            "contact_protocol", context
        )

        assert 0.0 <= outcome["predicted_success_chance"] <= 1.0
        assert "peaceful_contact" in outcome["expected_outcomes"]

    def test_outcome_risk_factors(self, predictor):
        """Test risk factors are identified in predictions"""
        context = {
            "current_ships": 0,
            "expansion_readiness": 0.3,  # Low readiness
        }
        outcome = predictor.predict_outcome(
            "expand_fleet", context
        )

        assert "risk_factors" in outcome
        if outcome["predicted_success_chance"] < 0.7:
            assert len(outcome["risk_factors"]) > 0


class TestActionQueueManager:
    """Test action queue management"""

    @pytest.fixture
    def queue_manager(self):
        return ActionQueueManager()

    def test_action_queueing(self, queue_manager):
        """Test queuing actions"""
        from orchestration_engine import Decision

        decision = Decision(
            decision_id="test_1",
            vectors_involved=[DecisionVector.EXPANSION],
            action_recommended="expand_fleet",
            confidence=0.85,
            reasoning="Test reasoning",
            priority=ActionPriority.HIGH,
            affected_systems=["expansion"],
            timestamp=datetime.now().timestamp(),
        )

        queue_manager.queue_action(decision)
        assert len(queue_manager.action_queue) == 1

    def test_action_priority_ordering(self, queue_manager):
        """Test actions are ordered by priority"""
        from orchestration_engine import Decision

        # Queue in low-to-high priority order
        low_decision = Decision(
            decision_id="low",
            vectors_involved=[DecisionVector.EXPANSION],
            action_recommended="low_action",
            confidence=0.5,
            reasoning="Low priority",
            priority=ActionPriority.LOW,
            affected_systems=["expansion"],
            timestamp=datetime.now().timestamp(),
        )

        high_decision = Decision(
            decision_id="high",
            vectors_involved=[DecisionVector.EXPANSION],
            action_recommended="high_action",
            confidence=0.9,
            reasoning="High priority",
            priority=ActionPriority.CRITICAL,
            affected_systems=["expansion"],
            timestamp=datetime.now().timestamp(),
        )

        queue_manager.queue_action(low_decision)
        queue_manager.queue_action(high_decision)

        # High priority should be first
        assert queue_manager.action_queue[0].priority == ActionPriority.CRITICAL

    def test_queue_status(self, queue_manager):
        """Test queue status reporting"""
        status = queue_manager.get_queue_status()
        assert status["queued_actions"] == 0
        assert status["executed_actions"] == 0
        assert status["next_priority"] == "NONE"


class TestFederationStateAggregator:
    """Test federation state aggregation"""

    def test_state_aggregation_with_engines(self):
        """Test aggregating state from all engines"""
        diplomatic = DiplomaticEngine()
        expansion = FleetExpansionEngine()
        first_contact = FirstContactEngine()

        # Add some data
        diplomatic.propose_treaty(
            "Test", TreatyType.TRADE, ["A", "B"], ["clause"], "enforcement"
        )
        expansion.commission_ship("Ship", ShipArchetype.EXPLORER, "Bold", [])
        first_contact.detect_external_fleet(
            "Fleet", "Civ", GovernanceType.DEMOCRACY, 100000, TechnologyLevel.ADVANCED, 0.3
        )

        aggregator = FederationStateAggregator(diplomatic, expansion, first_contact)
        state = aggregator.aggregate_state()

        assert 0.0 <= state.overall_readiness <= 1.0
        assert 0.0 <= state.diplomatic_readiness <= 1.0
        assert 0.0 <= state.expansion_readiness <= 1.0
        assert 0.0 <= state.first_contact_readiness <= 1.0
        assert 0.0 <= state.vector_coherence <= 1.0

    def test_vector_coherence_calculation(self):
        """Test vector coherence is calculated correctly"""
        aggregator = FederationStateAggregator()

        # Identical readiness levels = high coherence
        coherence = aggregator._calculate_vector_coherence(0.8, 0.8, 0.8)
        assert coherence > 0.9

        # Divergent readiness levels = low coherence
        coherence = aggregator._calculate_vector_coherence(0.2, 0.8, 0.5)
        assert coherence < 0.6


class TestFederationOrchestrationBrain:
    """Test the main orchestration engine"""

    @pytest.fixture
    def brain(self):
        diplomatic = DiplomaticEngine()
        expansion = FleetExpansionEngine()
        first_contact = FirstContactEngine()

        return FederationOrchestrationBrain(
            diplomatic, expansion, first_contact
        )

    def test_orchestration_initialization(self, brain):
        """Test orchestration engine initializes correctly"""
        assert brain.diplomatic_engine is not None
        assert brain.expansion_engine is not None
        assert brain.first_contact_engine is not None
        assert brain.signal_fusion is not None
        assert brain.decision_synthesizer is not None

    def test_orchestration_start_stop(self, brain):
        """Test starting and stopping orchestration loop"""
        brain.start_orchestration()
        assert brain.orchestration_loop_active

        time.sleep(0.5)

        brain.stop_orchestration()
        assert not brain.orchestration_loop_active

    def test_federation_state_retrieval(self, brain):
        """Test retrieving federation state"""
        state = brain.get_federation_state()

        assert state is not None
        assert 0.0 <= state.overall_readiness <= 1.0
        assert 0.0 <= state.threat_level <= 1.0
        assert state.stability_score >= 0.0

    def test_orchestration_status_reporting(self, brain):
        """Test orchestration status reporting"""
        brain.start_orchestration()
        time.sleep(1.0)

        status = brain.get_orchestration_status()

        assert status["orchestration_active"]
        assert "federation_state" in status
        assert "decision_synthesis" in status
        assert "action_queue" in status
        assert "signal_fusion" in status

        brain.stop_orchestration()

    def test_decision_context_building(self, brain):
        """Test decision context is built correctly"""
        # Add some data to engines
        brain.diplomatic_engine.propose_treaty(
            "Test", TreatyType.TRADE, ["A", "B"], ["clause"], "enforcement"
        )
        brain.expansion_engine.commission_ship("Ship", ShipArchetype.EXPLORER, "Bold", [])
        brain.first_contact_engine.detect_external_fleet(
            "Fleet", "Civ", GovernanceType.DEMOCRACY, 100000, TechnologyLevel.ADVANCED, 0.3
        )

        context = brain._get_decision_context()

        assert "current_alliances" in context
        assert "current_ships" in context
        assert "external_fleets_detected" in context
        assert "diplomaticstability" in context or "expansion_readiness" in context

    def test_orchestration_loop_signal_collection(self, brain):
        """Test orchestration loop collects signals from all engines"""
        # Add data to engines
        brain.diplomatic_engine.propose_treaty(
            "Test", TreatyType.TRADE, ["A", "B"], ["clause"], "enforcement"
        )
        brain.expansion_engine.commission_ship("Ship", ShipArchetype.EXPLORER, "Bold", [])
        brain.first_contact_engine.detect_external_fleet(
            "Fleet", "Civ", GovernanceType.DEMOCRACY, 100000, TechnologyLevel.ADVANCED, 0.3
        )

        # Collect signals
        brain._collect_signals()

        # Verify signals were collected
        assert len(brain.signal_fusion.signal_history[DecisionVector.DIPLOMATIC]) > 0
        assert len(brain.signal_fusion.signal_history[DecisionVector.EXPANSION]) > 0
        assert len(brain.signal_fusion.signal_history[DecisionVector.FIRST_CONTACT]) > 0


class TestOrchestrationIntegration:
    """Integration tests for full orchestration"""

    def test_full_orchestration_cycle(self):
        """Test complete orchestration cycle: signal → fusion → decision → action"""
        diplomatic = DiplomaticEngine()
        expansion = FleetExpansionEngine()
        first_contact = FirstContactEngine()

        brain = FederationOrchestrationBrain(
            diplomatic, expansion, first_contact
        )

        # Set up scenario
        diplomatic.form_alliance(
            "Coalition", ["Ship-A", "Ship-B"], IdeologyType.PROGRESSIVE, "Test"
        )
        expansion.commission_ship("Ship-A", ShipArchetype.WARRIOR, "Brave", [])
        expansion.commission_ship("Ship-B", ShipArchetype.DIPLOMAT, "Diplomatic", [])

        first_contact.detect_external_fleet(
            "Discovery", "Explorers", GovernanceType.DEMOCRACY, 500000, TechnologyLevel.ADVANCED, 0.4
        )

        # Run orchestration
        brain.start_orchestration()
        time.sleep(3.0)
        brain.stop_orchestration()

        # Verify orchestration produced results
        status = brain.get_orchestration_status()
        assert status["orchestration_active"] == False  # Should be stopped
        assert status["federation_state"]["overall_readiness"] > 0.0

    def test_orchestration_with_high_coherence(self):
        """Test orchestration when vectors are well aligned"""
        diplomatic = DiplomaticEngine()
        expansion = FleetExpansionEngine()
        first_contact = FirstContactEngine()

        # Build well-aligned scenario
        for i in range(3):
            diplomatic.form_alliance(
                f"Alliance-{i}", [f"Ship-{i}"], IdeologyType.PROGRESSIVE, "Growth"
            )

        for i in range(5):
            expansion.commission_ship(f"Ship-{i}", ShipArchetype.EXPLORER, "Exploring", [])

        for i in range(2):
            first_contact.detect_external_fleet(
                f"Fleet-{i}", f"Civ-{i}", GovernanceType.DEMOCRACY, 100000 + i*50000, TechnologyLevel.ADVANCED, 0.3 + i*0.1
            )

        brain = FederationOrchestrationBrain(
            diplomatic, expansion, first_contact
        )

        state = brain.get_federation_state()
        # High coherence when all vectors operational
        assert state.vector_coherence > 0.5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
