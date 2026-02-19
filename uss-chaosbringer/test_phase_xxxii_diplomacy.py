#!/usr/bin/env python3
"""
PHASE XXXII - INTERSTELLAR DIPLOMACY FRAMEWORK TEST SUITE
14 comprehensive tests covering channel management, treaty negotiation,
term negotiation, ratification, incident handling, and status reporting.
Production-ready test coverage for diplomacy framework.
"""

import pytest
from datetime import datetime
from interstellar_diplomacy import (
    InterstellarDiplomacyFramework,
    DiplomaticParty,
    InterstellarTreaty,
    TreatyTerm,
    DiplomaticChannel,
    DiplomaticIncident,
    TreatyType,
    DiplomaticChannelType,
    IncidentSeverity,
)


@pytest.fixture
def framework():
    """Create fresh framework for each test"""
    return InterstellarDiplomacyFramework()


@pytest.fixture
def parties():
    """Create test diplomatic parties"""
    party_a = DiplomaticParty(
        party_id="fed_001",
        civilization_name="UnitedFederation",
        representative="Ambassador Nova",
        tech_level="Type II",
        military_strength=0.7,
        cultural_alignment=0.8,
    )
    party_b = DiplomaticParty(
        party_id="alliance_001",
        civilization_name="AlphaAlliance",
        representative="Envoy Vex",
        tech_level="Type II",
        military_strength=0.6,
        cultural_alignment=0.6,
    )
    return party_a, party_b


class TestDiplomaticChannels:
    """Test diplomatic channel operations"""

    def test_initiate_channel_basic(self, framework):
        """Test basic channel initiation"""
        result = framework.initiate_diplomatic_channel("UnitedFed", "AlphaAlliance")
        assert result["success"] is True
        assert "channel_id" in result
        assert result["party_a"] == "UnitedFed"
        assert result["party_b"] == "AlphaAlliance"

    def test_cannot_create_self_channel(self, framework):
        """Test that channel cannot be created between same civilization"""
        result = framework.initiate_diplomatic_channel("UnitedFed", "UnitedFed")
        assert result["success"] is False
        assert "self" in result["error"].lower()

    def test_multiple_channels_independent(self, framework):
        """Test multiple channels can exist independently"""
        result1 = framework.initiate_diplomatic_channel("UnitedFed", "AlphaAlliance")
        result2 = framework.initiate_diplomatic_channel("UnitedFed", "BetaCorporation")
        assert result1["channel_id"] != result2["channel_id"]
        assert len(framework.channels) == 2


class TestTreatyProposal:
    """Test treaty proposal mechanisms"""

    def test_propose_treaty_basic(self, framework, parties):
        """Test basic treaty proposal"""
        party_a, party_b = parties
        result = framework.propose_treaty(party_a, party_b, TreatyType.NON_AGGRESSION)
        assert result["success"] is True
        assert "treaty_id" in result
        assert result["treaty_type"] == "non_aggression"
        assert result["status"] == "proposed"

    def test_propose_with_initial_terms(self, framework, parties):
        """Test treaty proposal with initial terms"""
        party_a, party_b = parties
        term = TreatyTerm(
            term_id="term_001",
            description="Mutual defense pact",
            type="defense",
            priority=1,
        )
        result = framework.propose_treaty(
            party_a, party_b, TreatyType.MILITARY_ALLIANCE, [term]
        )
        assert result["success"] is True
        assert result["initial_terms"] == 1


class TestTreatyNegotiation:
    """Test treaty negotiation and term management"""

    def test_negotiate_terms_adds_to_treaty(self, framework, parties):
        """Test negotiating terms adds them to treaty"""
        party_a, party_b = parties
        result = framework.propose_treaty(party_a, party_b, TreatyType.TRADE)
        treaty_id = result["treaty_id"]

        term = TreatyTerm(
            term_id="term_new",
            description="Trade in tech components",
            type="trade",
            priority=2,
        )
        result = framework.negotiate_terms(treaty_id, [term], "party_a")
        assert result["success"] is True
        assert result["total_terms"] == 1

    def test_negotiate_updates_satisfaction(self, framework, parties):
        """Test negotiation affects party satisfaction"""
        party_a, party_b = parties
        result = framework.propose_treaty(party_a, party_b, TreatyType.TRADE)
        treaty_id = result["treaty_id"]

        term = TreatyTerm(
            term_id="term_001",
            description="Initial offer",
            type="trade",
            priority=1,
        )
        framework.negotiate_terms(treaty_id, [term], "party_a")
        treaty = framework.treaties[treaty_id]
        # Party A proposes, so A satisfaction increases
        assert treaty.party_a_satisfaction > 0.5


class TestTreatyRatification:
    """Test treaty ratification and activation"""

    def test_ratify_treaty_success(self, framework, parties):
        """Test successful treaty ratification"""
        party_a, party_b = parties
        result = framework.propose_treaty(party_a, party_b, TreatyType.TRADE)
        treaty_id = result["treaty_id"]

        # Add terms
        term1 = TreatyTerm(
            term_id="term_001",
            description="Trade agreement",
            type="trade",
            priority=1,
        )
        framework.negotiate_terms(treaty_id, [term1], "party_a")

        # Boost satisfaction for ratification
        framework.treaties[treaty_id].party_a_satisfaction = 0.7
        framework.treaties[treaty_id].party_b_satisfaction = 0.7

        result = framework.ratify_treaty(treaty_id)
        assert result["success"] is True
        assert result["status"] == "ratified"

    def test_cannot_ratify_without_terms(self, framework, parties):
        """Test cannot ratify treaty with no terms"""
        party_a, party_b = parties
        result = framework.propose_treaty(party_a, party_b, TreatyType.TRADE)
        treaty_id = result["treaty_id"]

        # Try to ratify without terms
        result = framework.ratify_treaty(treaty_id)
        assert result["success"] is False


class TestDiplomaticIncidents:
    """Test incident handling and resolution"""

    def test_handle_minor_incident(self, framework, parties):
        """Test handling minor diplomatic incident"""
        party_a, party_b = parties
        result = framework.propose_treaty(party_a, party_b, TreatyType.TRADE)
        treaty_id = result["treaty_id"]

        result = framework.handle_diplomatic_incident(
            treaty_id,
            IncidentSeverity.MINOR,
            "fed_001",
            "Trade shipment arrived late",
        )
        assert result["success"] is True
        assert "incident_id" in result

    def test_incident_affects_treaty_violations(self, framework, parties):
        """Test incident increases treaty violation count"""
        party_a, party_b = parties
        result = framework.propose_treaty(party_a, party_b, TreatyType.TRADE)
        treaty_id = result["treaty_id"]

        initial_violations = framework.treaties[treaty_id].violation_count
        framework.handle_diplomatic_incident(
            treaty_id,
            IncidentSeverity.SEVERE,
            "fed_001",
            "Mining operation in disputed zone",
        )
        assert framework.treaties[treaty_id].violation_count > initial_violations

    def test_resolve_incident_marks_resolved(self, framework, parties):
        """Test marking incident as resolved"""
        party_a, party_b = parties
        result = framework.propose_treaty(party_a, party_b, TreatyType.TRADE)
        treaty_id = result["treaty_id"]

        result = framework.handle_diplomatic_incident(
            treaty_id,
            IncidentSeverity.CRITICAL,
            "alliance_001",
            "Military fleet mobilization detected",
        )
        incident_id = result["incident_id"]

        resolve_result = framework.resolve_incident(
            incident_id, "Both parties agree to de-escalation protocol"
        )
        assert resolve_result["success"] is True
        assert framework.incidents[incident_id].resolved is True


class TestDiplomacyStatus:
    """Test status reporting and framework health"""

    def test_status_report_reflects_treaties(self, framework, parties):
        """Test status report reflects active treaties"""
        party_a, party_b = parties

        result = framework.propose_treaty(party_a, party_b, TreatyType.TRADE)
        treaty_id = result["treaty_id"]

        # Ratify to make it active
        term = TreatyTerm(
            term_id="term_001", description="Trade agreement", type="trade",
            priority=1
        )
        framework.negotiate_terms(treaty_id, [term], "party_a")
        framework.treaties[treaty_id].party_a_satisfaction = 0.7
        framework.treaties[treaty_id].party_b_satisfaction = 0.7
        framework.ratify_treaty(treaty_id)

        status = framework.get_diplomacy_status()
        assert status.total_treaties == 1
        assert status.active_treaties == 1

    def test_status_reflects_incidents_and_health(self, framework):
        """Test status report includes incident and health information"""
        framework.handle_diplomatic_incident(
            None,
            IncidentSeverity.CRITICAL,
            "fed_001",
            "Unknown attack on border",
        )

        status = framework.get_diplomacy_status()
        assert status.total_incidents == 1
        assert status.critical_incidents == 1
        assert status.framework_status == "stressed"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
