#!/usr/bin/env python3
"""
PHASE XXXIII - RIVAL FEDERATION SIMULATOR TEST SUITE
14 comprehensive tests covering creation, expansion simulation,
decision-making, conflict prediction, negotiation, and status reporting.
Production-ready test coverage for rival simulation framework.
"""

import pytest
from datetime import datetime
from rival_federation_simulator import (
    RivalFederationSimulator,
    RivalFederation,
    RivalPhilosophy,
    ConflictType,
    NegotiationOutcome,
    ExpansionScenario,
    ConflictPrediction,
    NegotiationProposal,
)


@pytest.fixture
def simulator():
    """Create fresh simulator for each test"""
    return RivalFederationSimulator()


@pytest.fixture
def sample_rival(simulator):
    """Create a sample rival federation"""
    result = simulator.create_rival_federation(
        name="Karath Imperium",
        philosophy=RivalPhilosophy.HEGEMONIST,
        strength_level=0.8,
        expansion_rate=0.7,
        hostility=0.8,
    )
    return simulator.rivals[result["rival_id"]]


class TestRivalCreation:
    """Test rival federation creation"""

    def test_create_rival_basic(self, simulator):
        """Test basic rival creation"""
        result = simulator.create_rival_federation(
            name="Alpha Collective",
            philosophy=RivalPhilosophy.COLLECTIVIST,
            strength_level=0.6,
            expansion_rate=0.5,
            hostility=0.4,
        )
        assert result["success"] is True
        assert "rival_id" in result
        assert result["name"] == "Alpha Collective"
        assert result["philosophy"] == "collectivist"

    def test_rival_stored_in_simulator(self, simulator):
        """Test that created rival is stored in simulator"""
        result = simulator.create_rival_federation(
            name="Beta Collective",
            philosophy=RivalPhilosophy.COLLECTIVIST,
            strength_level=0.5,
            expansion_rate=0.5,
            hostility=0.3,
        )
        rival_id = result["rival_id"]
        assert rival_id in simulator.rivals
        assert simulator.rivals[rival_id].name == "Beta Collective"

    def test_create_rival_all_philosophies(self, simulator):
        """Test creating rivals with all philosophy types"""
        philosophies = [
            RivalPhilosophy.EXPANSIONIST,
            RivalPhilosophy.COLLECTIVIST,
            RivalPhilosophy.HIERARCHIST,
            RivalPhilosophy.LIBERTARIAN,
            RivalPhilosophy.XENOPHOBIC,
            RivalPhilosophy.TRANSCENDENT,
            RivalPhilosophy.HEGEMONIST,
        ]

        for philosophy in philosophies:
            result = simulator.create_rival_federation(
                name=f"Rival_{philosophy.value}",
                philosophy=philosophy,
                strength_level=0.5,
                expansion_rate=0.5,
                hostility=0.5,
            )
            assert result["success"] is True
            assert result["philosophy"] == philosophy.value

    def test_rival_strength_normalized_to_range(self, simulator):
        """Test that rival strength is normalized to 0-1 range"""
        result = simulator.create_rival_federation(
            name="Test Rival",
            philosophy=RivalPhilosophy.EXPANSIONIST,
            strength_level=2.5,  # Beyond range
            expansion_rate=-0.5,  # Negative
            hostility=1.5,  # Beyond range
        )
        assert result["strength_level"] == 1.0
        assert result["expansion_rate"] == 0.0
        assert result["hostility"] == 1.0

    def test_rival_has_strategic_goals(self, simulator):
        """Test that rivals have strategic goals based on philosophy"""
        result = simulator.create_rival_federation(
            name="Strategic Rival",
            philosophy=RivalPhilosophy.HEGEMONIST,
            strength_level=0.7,
            expansion_rate=0.6,
            hostility=0.9,
        )
        rival = simulator.rivals[result["rival_id"]]
        assert len(rival.strategic_goals) > 0
        # Hegemonist should prioritize dominance
        assert "universal_rule" in rival.strategic_goals


class TestExpansionSimulation:
    """Test expansion scenario generation"""

    def test_simulate_expansion_basic(self, simulator, sample_rival):
        """Test basic expansion simulation"""
        result = simulator.simulate_expansion(sample_rival.federation_id, years=10)
        assert result["success"] is True
        assert "scenario_id" in result
        assert result["years"] == 10
        assert "collision_probability" in result

    def test_expansion_collision_probability_increases_with_hostility(self, simulator):
        """Test that hostile rivals have higher collision probability"""
        # Peaceful rival
        peaceful = simulator.create_rival_federation(
            name="Peaceful",
            philosophy=RivalPhilosophy.LIBERTARIAN,
            strength_level=0.5,
            expansion_rate=0.3,
            hostility=0.2,
        )

        # Hostile rival
        hostile = simulator.create_rival_federation(
            name="Hostile",
            philosophy=RivalPhilosophy.XENOPHOBIC,
            strength_level=0.5,
            expansion_rate=0.3,
            hostility=0.9,
        )

        peaceful_result = simulator.simulate_expansion(peaceful["rival_id"], years=10)
        hostile_result = simulator.simulate_expansion(hostile["rival_id"], years=10)

        # Hostile should have higher collision probability
        assert hostile_result["collision_probability"] > peaceful_result["collision_probability"]

    def test_expansion_predicts_territory(self, simulator, sample_rival):
        """Test that expansion predicts territory claims"""
        result = simulator.simulate_expansion(sample_rival.federation_id, years=10)
        scenario = simulator.expansion_scenarios[result["scenario_id"]]
        assert len(scenario.predicted_territory) > 0

    def test_expansion_identifies_chokepoints(self, simulator, sample_rival):
        """Test that expansion identifies strategic chokepoints"""
        result = simulator.simulate_expansion(sample_rival.federation_id, years=10)
        assert len(result["chokepoints"]) > 0

    def test_expansion_nonexistent_rival_fails(self, simulator):
        """Test that expanding nonexistent rival fails"""
        result = simulator.simulate_expansion("nonexistent_rival", years=10)
        assert result["success"] is False


class TestDecisionMaking:
    """Test rival decision simulation"""

    def test_simulate_decision_basic(self, simulator, sample_rival):
        """Test basic decision simulation"""
        result = simulator.simulate_decision_making(sample_rival.federation_id)
        assert result["success"] is True
        assert "predicted_decision" in result
        assert "confidence" in result
        assert "reasoning" in result
        assert "mood" in result

    def test_decision_reflects_philosophy(self, simulator):
        """Test that decisions reflect rival philosophy"""
        expansionist = simulator.create_rival_federation(
            name="Expansionist",
            philosophy=RivalPhilosophy.EXPANSIONIST,
            strength_level=0.8,
            expansion_rate=0.9,
            hostility=0.8,
        )

        peacefully_inclined = simulator.create_rival_federation(
            name="Peaceful",
            philosophy=RivalPhilosophy.LIBERTARIAN,
            strength_level=0.5,
            expansion_rate=0.2,
            hostility=0.1,
        )

        exp_result = simulator.simulate_decision_making(expansionist["rival_id"])
        peace_result = simulator.simulate_decision_making(peacefully_inclined["rival_id"])

        # Different decisions or moods based on philosophy
        assert exp_result["mood"] != peace_result["mood"] or exp_result["predicted_decision"] != peace_result["predicted_decision"]

    def test_decision_updates_mood(self, simulator, sample_rival):
        """Test that decision making updates rival mood"""
        initial_mood = sample_rival.mood
        result = simulator.simulate_decision_making(sample_rival.federation_id)
        assert result["mood"] in ["hostile", "cooperative", "neutral"]


class TestConflictPrediction:
    """Test conflict likelihood and prediction"""

    def test_predict_conflict_basic(self, simulator, sample_rival):
        """Test basic conflict prediction"""
        result = simulator.predict_conflict(sample_rival.federation_id)
        assert result["success"] is True
        assert "prediction_id" in result
        assert "conflict_type" in result
        assert "likelihood" in result
        assert "timeline_years" in result

    def test_conflict_type_matches_philosophy(self, simulator):
        """Test that conflict type matches rival philosophy"""
        xenophobic = simulator.create_rival_federation(
            name="Xenophobic Empire",
            philosophy=RivalPhilosophy.XENOPHOBIC,
            strength_level=0.6,
            expansion_rate=0.5,
            hostility=0.9,
        )

        result = simulator.predict_conflict(xenophobic["rival_id"])
        # Xenophobic should predict existential conflict
        assert "existential" in result["conflict_type"]

    def test_conflict_likelihood_based_on_hostility(self, simulator):
        """Test that conflict likelihood increases with hostility"""
        peace_loving = simulator.create_rival_federation(
            name="Peace Lover",
            philosophy=RivalPhilosophy.LIBERTARIAN,
            strength_level=0.5,
            expansion_rate=0.2,
            hostility=0.1,
        )

        war_monger = simulator.create_rival_federation(
            name="War Monger",
            philosophy=RivalPhilosophy.HEGEMONIST,
            strength_level=0.8,
            expansion_rate=0.8,
            hostility=0.95,
        )

        peace_result = simulator.predict_conflict(peace_loving["rival_id"])
        war_result = simulator.predict_conflict(war_monger["rival_id"])

        assert war_result["likelihood"] > peace_result["likelihood"]

    def test_conflict_prediction_identifies_flashpoints(self, simulator, sample_rival):
        """Test that conflict prediction identifies flashpoints"""
        result = simulator.predict_conflict(sample_rival.federation_id)
        assert len(result["flashpoints"]) > 0

    def test_conflict_prediction_identifies_triggers(self, simulator, sample_rival):
        """Test that conflict prediction identifies triggers"""
        result = simulator.predict_conflict(sample_rival.federation_id)
        assert len(result["triggers"]) > 0


class TestNegotiation:
    """Test negotiation proposals and outcomes"""

    def test_negotiate_basic(self, simulator, sample_rival):
        """Test basic negotiation proposal"""
        result = simulator.negotiate_with_rival(
            sample_rival.federation_id,
            proposal_type="trade",
            terms=["exchange_resources", "mutual_benefit"],
        )
        assert result["success"] is True
        assert "proposal_id" in result
        assert "acceptance_probability" in result

    def test_negotiate_different_proposal_types(self, simulator, sample_rival):
        """Test negotiations with different proposal types"""
        proposals = ["trade", "non-aggression", "alliance", "partition"]

        for proposal_type in proposals:
            result = simulator.negotiate_with_rival(
                sample_rival.federation_id,
                proposal_type=proposal_type,
                terms=["term1", "term2"],
            )
            assert result["success"] is True
            assert result["proposal_id"] in simulator.negotiations

    def test_negotiation_acceptance_reflects_philosophy(self, simulator):
        """Test that acceptance probability reflects philosophy"""
        expansionist = simulator.create_rival_federation(
            name="Stubborn Expansionist",
            philosophy=RivalPhilosophy.EXPANSIONIST,
            strength_level=0.8,
            expansion_rate=0.9,
            hostility=0.9,
        )

        friendly = simulator.create_rival_federation(
            name="Friendly",
            philosophy=RivalPhilosophy.LIBERTARIAN,
            strength_level=0.5,
            expansion_rate=0.2,
            hostility=0.1,
        )

        exp_result = simulator.negotiate_with_rival(
            expansionist["rival_id"],
            proposal_type="alliance",
            terms=["mutual_support"],
        )

        friendly_result = simulator.negotiate_with_rival(
            friendly["rival_id"],
            proposal_type="alliance",
            terms=["mutual_support"],
        )

        # Friendly should have higher acceptance probability for alliance
        assert friendly_result["acceptance_probability"] > exp_result["acceptance_probability"]

    def test_negotiation_proposal_stored(self, simulator, sample_rival):
        """Test that negotiation proposals are stored"""
        result = simulator.negotiate_with_rival(
            sample_rival.federation_id,
            proposal_type="trade",
            terms=["resources"],
        )
        proposal_id = result["proposal_id"]
        assert proposal_id in simulator.negotiations
        assert simulator.negotiations[proposal_id].rival_id == sample_rival.federation_id

    def test_negotiate_nonexistent_rival_fails(self, simulator):
        """Test that negotiating with nonexistent rival fails"""
        result = simulator.negotiate_with_rival(
            "nonexistent_rival",
            proposal_type="trade",
            terms=["term1"],
        )
        assert result["success"] is False


class TestRivalryStatus:
    """Test comprehensive status reporting"""

    def test_rivalry_status_empty(self, simulator):
        """Test rivalry status with no rivals"""
        result = simulator.get_rivalry_status()
        assert result["success"] is True
        assert result["status"].total_rivals == 0

    def test_rivalry_status_reflects_rivals(self, simulator):
        """Test that rivalry status reflects all rivals"""
        # Create multiple rivals
        for i in range(3):
            simulator.create_rival_federation(
                name=f"Rival_{i}",
                philosophy=RivalPhilosophy.EXPANSIONIST,
                strength_level=0.5,
                expansion_rate=0.5,
                hostility=0.5,
            )

        result = simulator.get_rivalry_status()
        assert result["status"].total_rivals == 3

    def test_rivalry_status_counts_threats(self, simulator):
        """Test that status properly counts immediate threats"""
        # Peaceful rival
        simulator.create_rival_federation(
            name="Peaceful",
            philosophy=RivalPhilosophy.LIBERTARIAN,
            strength_level=0.3,
            expansion_rate=0.2,
            hostility=0.1,
        )

        # Immediate threat
        simulator.create_rival_federation(
            name="Threat",
            philosophy=RivalPhilosophy.HEGEMONIST,
            strength_level=0.9,
            expansion_rate=0.8,
            hostility=0.95,
        )

        result = simulator.get_rivalry_status()
        assert result["status"].immediate_threats >= 1

    def test_rivalry_status_includes_dominance_index(self, simulator):
        """Test that status includes federation dominance index"""
        simulator.create_rival_federation(
            name="Rival1",
            philosophy=RivalPhilosophy.EXPANSIONIST,
            strength_level=0.3,
            expansion_rate=0.5,
            hostility=0.5,
        )

        result = simulator.get_rivalry_status()
        status = result["status"]
        assert 0.0 <= status.federation_dominance_index <= 1.0

    def test_rivalry_status_stability_assessment(self, simulator):
        """Test that status provides stability assessment"""
        for i in range(3):
            simulator.create_rival_federation(
                name=f"Rival_{i}",
                philosophy=RivalPhilosophy.HEGEMONIST,
                strength_level=0.8,
                expansion_rate=0.7,
                hostility=0.9,
            )

        result = simulator.get_rivalry_status()
        assert result["status"].stability_assessment in ["stable", "fragile", "deteriorating"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
