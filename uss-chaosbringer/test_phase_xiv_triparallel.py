#!/usr/bin/env python3
"""
PHASE XIV - TRIPARALLEL EXPANSION TESTS
Comprehensive test suite for Diplomatic, Fleet Expansion, and First Contact engines.
"""

import pytest
from datetime import datetime

from diplomatic_engine import (
    DiplomaticEngine,
    TreatyStatus,
    TreatyType,
    IdeologyType,
    DiplomaticStance,
)
from fleet_expansion_engine import (
    FleetExpansionEngine,
    ShipArchetype,
    OperationalState,
)
from first_contact_engine import (
    FirstContactEngine,
    GovernanceType,
    TechnologyLevel,
    ContactStatus,
    StressScenario,
)


# ===== DIPLOMATIC ENGINE TESTS (6 tests) =====


class TestDiplomaticEngine:
    @pytest.fixture
    def engine(self):
        return DiplomaticEngine()

    def test_treaty_proposal_and_ratification(self, engine):
        """Test treaty proposal and ratification flow"""
        treaty = engine.propose_treaty(
            name="Trade Agreement",
            treaty_type=TreatyType.TRADE,
            parties=["Ship-A", "Ship-B"],
            clauses=["5% tariff reduction", "Free movement of goods"],
            enforcement="Mutual benefit",
        )

        assert treaty.status == TreatyStatus.PROPOSED
        assert len(engine.treaties) == 1

        success, ratified = engine.ratify_treaty(treaty.treaty_id)
        assert success
        assert ratified.status == TreatyStatus.RATIFIED

    def test_alliance_formation(self, engine):
        """Test alliance creation and member management"""
        alliance = engine.form_alliance(
            name="Progressive Coalition",
            members=["Ship-A", "Ship-B", "Ship-C"],
            ideology=IdeologyType.PROGRESSIVE,
            purpose="Advance shared cultural values",
        )

        assert alliance.name == "Progressive Coalition"
        assert len(alliance.members) == 3

        # Add new member
        success = engine.add_to_alliance(alliance.alliance_id, "Ship-D")
        assert success
        assert "Ship-D" in alliance.members

    def test_ideological_bloc_recruitment(self, engine):
        """Test ideological bloc creation and recruitment"""
        bloc = engine.create_ideological_bloc(
            name="Conservative Vanguard",
            ideology=IdeologyType.CONSERVATIVE,
            core_beliefs=["Stability first", "Tradition matters", "Proven methods"],
        )

        engine.recruit_to_bloc(bloc.bloc_id, "Ship-X")
        engine.recruit_to_bloc(bloc.bloc_id, "Ship-Y")

        assert len(bloc.members) == 2
        assert engine.get_ship_ideology("Ship-X") == IdeologyType.CONSERVATIVE

    def test_bilateral_relations_and_incidents(self, engine):
        """Test bilateral relations with incident tracking"""
        relation = engine.establish_relation(
            "Federation-A", "Federation-B", DiplomaticStance.NEUTRAL
        )

        assert relation.stance == DiplomaticStance.NEUTRAL

        success = engine.record_incident(
            relation.relation_id, "Trade dispute over sector 7"
        )
        assert success
        assert len(relation.incidents) == 1

    def test_negotiation_flow(self, engine):
        """Test negotiation initiation and conclusion"""
        negotiation = engine.initiate_negotiation(
            initiator="Ship-M", target="Ship-N", proposal_type="ALLIANCE"
        )

        assert negotiation.status == "INITIATED"

        success = engine.submit_offer(
            negotiation.negotiation_id,
            {"alliance_strength": 0.8, "duration": 100},
        )
        assert success
        assert negotiation.status == "COUNTERED"

        success = engine.conclude_negotiation(
            negotiation.negotiation_id, accepted=True
        )
        assert success
        assert negotiation.status == "ACCEPTED"

    def test_diplomatic_status_reporting(self, engine):
        """Test diplomatic status aggregation"""
        # Create multiple treaties and alliances
        treaty = engine.propose_treaty(
            "Treaty 1",
            TreatyType.TRADE,
            ["A", "B"],
            ["clause1"],
            "enforcement",
        )
        engine.ratify_treaty(treaty.treaty_id)

        alliance = engine.form_alliance(
            "Alliance 1", ["X", "Y"], IdeologyType.MODERATE, "purpose"
        )

        status = engine.get_diplomatic_status()
        assert status.active_treaties == 1
        assert status.active_alliances == 1
        assert status.overall_stability >= 0.0


# ===== FLEET EXPANSION ENGINE TESTS (5 tests) =====


class TestFleetExpansionEngine:
    @pytest.fixture
    def engine(self):
        return FleetExpansionEngine()

    def test_archetype_definition_and_listing(self, engine):
        """Test archetype definition and retrieval"""
        archetype = engine.define_archetype(
            ShipArchetype.EXPLORER,
            "Scout Class",
            "Curious",
            ["long_range_sensors", "stealth"],
            ["rapid_deployment"],
        )

        assert archetype.archetype_type == ShipArchetype.EXPLORER
        retrieved = engine.get_archetype(archetype.archetype_id)
        assert retrieved.name == "Scout Class"

    def test_ship_commissioning(self, engine):
        """Test commissioning ships into fleet"""
        ship = engine.commission_ship(
            "USS Explorer",
            ShipArchetype.EXPLORER,
            "Adventurous",
            ["exploration", "mapping"],
        )

        assert ship.name == "USS Explorer"
        assert ship.operational_state == OperationalState.ACTIVE

        active = engine.get_active_ships()
        assert len(active) == 1

    def test_mythology_creation_and_artifacts(self, engine):
        """Test mythology creation and artifact management"""
        myth = engine.create_mythology(
            "USS Voyager",
            "The Lost Wanderer",
            "A ship seeking home",
            "Once upon a time, a ship left port...",
            ["discovery", "perseverance"],
        )

        assert myth.name == "The Lost Wanderer"

        success = engine.add_legendary_artifact(myth.myth_id, "Crystal of Navigation")
        assert success
        assert "Crystal of Navigation" in myth.legendary_artifacts

    def test_emergent_behavior_observation(self, engine):
        """Test observing and managing emergent behaviors"""
        behavior = engine.observe_emergent_behavior(
            "Fleet Synchronization",
            ["Ship-1", "Ship-2", "Ship-3"],
            "Ships moving in coordination",
            ["improved_efficiency", "better_resource_sharing"],
            ["reduced_autonomy"],
            0.85,
        )

        assert behavior.stability_rating == 0.85

        success = engine.stabilize_behavior(behavior.behavior_id, 0.92)
        assert success

        behaviors = engine.list_emergent_behaviors()
        assert len(behaviors) == 1

    def test_expansion_status_reporting(self, engine):
        """Test fleet expansion status aggregation"""
        # Create multiple ships and behaviors
        engine.commission_ship("Ship-A", ShipArchetype.WARRIOR, "Brave", [])
        engine.commission_ship("Ship-B", ShipArchetype.SCHOLAR, "Curious", [])

        engine.observe_emergent_behavior(
            "Behavior-1", ["Ship-A"], "Something", [], [], 0.75
        )

        status = engine.get_expansion_status()
        assert status.total_ships == 2
        assert status.active_ships == 2
        assert status.emergent_behaviors_observed == 1
        assert 0.0 <= status.fleet_complexity <= 1.0


# ===== FIRST CONTACT ENGINE TESTS (7 tests) =====


class TestFirstContactEngine:
    @pytest.fixture
    def engine(self):
        return FirstContactEngine()

    def test_external_fleet_detection(self, engine):
        """Test detection of external fleet"""
        fleet = engine.detect_external_fleet(
            "The Collective",
            "Hive Civilization",
            GovernanceType.COLLECTIVE,
            500000,
            TechnologyLevel.ADVANCED,
            0.6,
        )

        assert fleet.contact_status == ContactStatus.DETECTED
        assert fleet.civilization_name == "Hive Civilization"
        assert 0.0 <= fleet.threat_assessment <= 1.0
        assert 0.0 <= fleet.cultural_compatibility <= 1.0

    def test_contact_initiation_and_protocol(self, engine):
        """Test contact initiation and event recording"""
        fleet = engine.detect_external_fleet(
            "Traders Guild",
            "Merchant Collective",
            GovernanceType.DEMOCRACY,
            300000,
            TechnologyLevel.ADVANCED,
            0.3,
        )

        success = engine.initiate_contact(
            fleet.fleet_id,
            ["establish_trade", "cultural_exchange"],
        )
        assert success

        event = engine.record_contact_outcome(
            fleet.fleet_id,
            "FIRST_TRANSMISSION",
            "Received standard greeting",
            "positive",
            "Extended welcome protocol",
            ["USS Ambassador"],
        )

        assert event.contact_type == "FIRST_TRANSMISSION"
        assert len(engine.contact_events) == 1

    def test_alien_governance_analysis(self, engine):
        """Test analysis of alien governance systems"""
        fleet = engine.detect_external_fleet(
            "Democratic Republic",
            "Enlightened Governance",
            GovernanceType.DEMOCRACY,
            2000000,
            TechnologyLevel.HIGHLY_ADVANCED,
            0.4,
        )

        governance = engine.analyze_governance(
            fleet.fleet_id,
            "Democratic Parliament",
            "Constitution with 8 core rights",
            rights_protections=8,
            enforcement_mechanism="Judicial review and civilian courts",
        )

        assert governance.governance_type == GovernanceType.DEMOCRACY
        assert governance.rights_protections == 8
        assert 0.0 <= governance.compatibility_with_federation <= 1.0

    def test_cultural_shock_resolution(self, engine):
        """Test cultural shock recording and resolution"""
        fleet = engine.detect_external_fleet(
            "Alien Alliance",
            "Unknown",
            GovernanceType.UNKNOWN,
            100000,
            TechnologyLevel.PRIMITIVE,
            0.2,
        )

        shock = engine.record_cultural_shock(
            fleet.fleet_id,
            "Communication",
            "Unable to decode transmission format",
            "HIGH",
            ["USS Translator"],
        )

        assert shock.severity == "HIGH"
        assert not shock.resolved

        # Attempt resolution multiple times
        for i in range(3):
            resolved = engine.attempt_cultural_resolution(shock.shock_id, f"Method-{i}")
            if resolved:
                break

        if shock.resolved:
            assert shock.severity == "HIGH"  # Severity unchanged, only resolution status

    def test_federation_stress_scenarios(self, engine):
        """Test federation stability under various stress scenarios"""
        scenarios = [
            StressScenario.HOSTILE_ENCOUNTER,
            StressScenario.CULTURAL_CLASH,
            StressScenario.REFUGEE_CRISIS,
            StressScenario.RESOURCE_COMPETITION,
        ]

        for scenario in scenarios:
            survives, message = engine.test_federation_stability(scenario)
            assert isinstance(survives, bool)
            assert scenario.value in message

    def test_confederation_analysis_and_recommendation(self, engine):
        """Test analysis for confederation option"""
        # Define a favorable candidate
        fleet_a = engine.detect_external_fleet(
            "Perfect Candidate",
            "Enlightened Democracy",
            GovernanceType.DEMOCRACY,
            1000000,
            TechnologyLevel.HIGHLY_ADVANCED,
            0.3,
        )

        # Analyze and establish relations
        engine.establish_formal_relations(fleet_a.fleet_id)

        can_join, recommendation = engine.analyze_confederation_option(
            fleet_a.fleet_id
        )

        assert isinstance(can_join, bool)
        assert "RECOMMEND" in recommendation or "NOT RECOMMENDED" in recommendation

    def test_first_contact_status_reporting(self, engine):
        """Test comprehensive first contact status"""
        # Create various contact scenarios
        fleet1 = engine.detect_external_fleet(
            "Fleet1",
            "Civ1",
            GovernanceType.DEMOCRACY,
            500000,
            TechnologyLevel.ADVANCED,
            0.3,
        )
        engine.establish_formal_relations(fleet1.fleet_id)

        fleet2 = engine.detect_external_fleet(
            "Fleet2",
            "Civ2",
            GovernanceType.AUTOCRACY,
            1000000,
            TechnologyLevel.ADVANCED,
            0.8,
        )

        status = engine.get_first_contact_status()
        assert status.external_fleets_detected == 2
        assert status.formal_contact_established >= 1
        assert 0.0 <= status.total_threat_assessment <= 1.0
        assert 0.0 <= status.federation_stability_under_contact <= 1.0


# ===== INTEGRATION TESTS (Multiple Engines) =====


class TestTriparalllelIntegration:
    """Tests combining multiple engine operations"""

    def test_diplomatic_solution_to_first_contact_crisis(self):
        """Test using diplomacy to resolve first contact crisis"""
        diplomatic = DiplomaticEngine()
        first_contact = FirstContactEngine()

        # Detect threatening fleet
        threat_fleet = first_contact.detect_external_fleet(
            "Aggressive Empire",
            "Warrior Caste",
            GovernanceType.AUTOCRACY,
            2000000,
            TechnologyLevel.HIGHLY_ADVANCED,
            0.85,
        )

        # Propose treaty to reduce escalation
        treaty = diplomatic.propose_treaty(
            "Non-Aggression Accord",
            TreatyType.NON_AGGRESSION,
            ["Federation", "Warrior Caste"],
            ["No military action", "Respect borders"],
            "Mutual enforcement",
        )

        # Ratify and establish formal relations
        diplomatic.ratify_treaty(treaty.treaty_id)
        first_contact.establish_formal_relations(threat_fleet.fleet_id)

        # Verify risk mitigation
        status = first_contact.get_first_contact_status()
        assert status.formal_contact_established >= 1

    def test_fleet_expansion_supports_diplomatic_objectives(self):
        """Test using fleet expansion to support diplomacy"""
        expansion = FleetExpansionEngine()
        diplomatic = DiplomaticEngine()

        # Define exploration archetype
        archetype = expansion.define_archetype(
            ShipArchetype.DIPLOMAT,
            "Negotiation Vessel",
            "Diplomatic",
            ["communication", "treaty_negotiation"],
            ["cultural_mediation"],
        )

        # Commission diplomatic ships
        for i in range(3):
            expansion.commission_ship(
                f"Envoy-{i}",
                ShipArchetype.DIPLOMAT,
                "Diplomatic",
                ["treaty_enforcement"],
            )

        # Create alliance to project diplomatic strength
        alliance = diplomatic.form_alliance(
            "Diplomatic Collective",
            ["Envoy-0", "Envoy-1", "Envoy-2"],
            IdeologyType.PROGRESSIVE,
            "Promote peaceful dialogue",
        )

        fleet_status = expansion.get_expansion_status()
        assert fleet_status.active_ships == 3

        diplo_status = diplomatic.get_diplomatic_status()
        assert diplo_status.active_alliances == 1

    def test_three_vector_federation_stabilization(self):
        """Test all three vectors working together for federation stability"""
        diplomatic = DiplomaticEngine()
        expansion = FleetExpansionEngine()
        first_contact = FirstContactEngine()

        # 1. Fleet Expansion: Build diverse fleet
        for arch_type in [ShipArchetype.WARRIOR, ShipArchetype.SCHOLAR, ShipArchetype.DIPLOMAT]:
            expansion.commission_ship(
                f"{arch_type.value}_lead",
                arch_type,
                arch_type.value.capitalize(),
                [],
            )

        # 2. Diplomacy: Create internal alliances
        treaty = diplomatic.propose_treaty(
            "Internal Cooperation",
            TreatyType.ALLIANCE,
            ["warrior_lead", "scholar_lead", "diplomat_lead"],
            ["coordinate_efforts"],
            "Mandatory cooperation",
        )
        diplomatic.ratify_treaty(treaty.treaty_id)

        # 3. First Contact: Handle external threat
        threat = first_contact.detect_external_fleet(
            "External Threat",
            "Unknown",
            GovernanceType.AUTOCRACY,
            5000000,
            TechnologyLevel.TRANSCENDENT,
            0.9,
        )

        first_contact.establish_formal_relations(threat.fleet_id)

        # Verify all systems stable under coordination
        exp_status = expansion.get_expansion_status()
        dip_status = diplomatic.get_diplomatic_status()
        fc_status = first_contact.get_first_contact_status()

        assert exp_status.active_ships == 3
        assert dip_status.active_treaties == 1
        assert fc_status.external_fleets_detected == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
