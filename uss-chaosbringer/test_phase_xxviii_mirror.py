#!/usr/bin/env python3
"""
PHASE XXVIII - CAPTAIN'S MIRROR TEST SUITE
12 comprehensive tests for captain decision tracking and influence analysis
"""

import pytest
from datetime import datetime

from captains_mirror import (
    CaptainMirror,
    DecisionType,
    ImpactCategory,
    CaptainInfluence,
)


class TestCaptainMirrorInitialization:
    """Test Captain's Mirror initialization"""

    def test_initialization(self):
        """Test mirror initializes with empty state"""
        mirror = CaptainMirror()
        assert len(mirror.actions) == 0
        assert len(mirror.echo_paths) == 0
        assert len(mirror.resonance_analyses) == 0
        assert len(mirror.drift_events) == 0

    def test_federation_values_established(self):
        """Test core federation values are set up"""
        mirror = CaptainMirror()
        assert "democracy" in mirror.federation_values
        assert "transparency" in mirror.federation_values
        assert "collective_wisdom" in mirror.federation_values
        assert "individual_rights" in mirror.federation_values
        assert len(mirror.federation_values) == 6


class TestRecordingCaptainActions:
    """Test recording captain decisions"""

    @pytest.fixture
    def mirror(self):
        return CaptainMirror()

    def test_record_single_action(self, mirror):
        """Test recording a single captain action"""
        action_id = mirror.record_captain_action(
            captain_id="captain_001",
            decision_type=DecisionType.STRATEGIC,
            description="Deploy federation fleet",
            systems_affected=["military", "logistics"],
            impact_categories=[ImpactCategory.SYSTEMIC, ImpactCategory.OPERATIONAL],
            impact_strength=0.8,
        )
        assert action_id in mirror.actions
        assert mirror.actions[action_id].captain_id == "captain_001"
        assert mirror.actions[action_id].description == "Deploy federation fleet"

    def test_action_numbering(self, mirror):
        """Test actions are numbered sequentially"""
        id1 = mirror.record_captain_action(
            "captain_001", DecisionType.STRATEGIC, "Action 1", [], []
        )
        id2 = mirror.record_captain_action(
            "captain_001", DecisionType.DIPLOMATIC, "Action 2", [], []
        )
        assert "000001" in id1
        assert "000002" in id2

    def test_action_chronicle(self, mirror):
        """Test captain action history is maintained"""
        for i in range(5):
            action_id = mirror.record_captain_action(
                f"captain_{i}",
                DecisionType.STRATEGIC,
                f"Action {i}",
                ["system_A"],
                [ImpactCategory.SYSTEMIC],
            )
        assert len(mirror.captain_decision_history) == 5
        assert mirror.captain_decision_history[0] != mirror.captain_decision_history[4]


class TestImpactCalculation:
    """Test impact calculation"""

    @pytest.fixture
    def mirror_with_action(self):
        mirror = CaptainMirror()
        action_id = mirror.record_captain_action(
            "captain_001",
            DecisionType.STRATEGIC,
            "Test decision",
            ["system_A", "system_B", "system_C"],
            [
                ImpactCategory.SYSTEMIC,
                ImpactCategory.POLITICAL,
                ImpactCategory.CULTURAL,
            ],
            impact_strength=0.7,
        )
        return mirror, action_id

    def test_calculate_impact(self, mirror_with_action):
        """Test impact calculation returns valid data"""
        mirror, action_id = mirror_with_action
        impact = mirror.calculate_impact(action_id)
        assert impact["success"]
        assert "total_impact_magnitude" in impact
        assert "category_impacts" in impact
        assert "system_impacts" in impact
        assert len(impact["system_impacts"]) == 3

    def test_impact_magnitude_in_range(self, mirror_with_action):
        """Test impact magnitude is within valid range"""
        mirror, action_id = mirror_with_action
        impact = mirror.calculate_impact(action_id)
        magnitude = impact["total_impact_magnitude"]
        assert 0.0 <= magnitude <= 1.0

    def test_system_impact_counts(self, mirror_with_action):
        """Test system impact count matches affected systems"""
        mirror, action_id = mirror_with_action
        impact = mirror.calculate_impact(action_id)
        assert impact["affected_system_count"] == 3


class TestInfluenceHeatmap:
    """Test captain influence heatmap generation"""

    @pytest.fixture
    def mirror_with_multiple_actions(self):
        mirror = CaptainMirror()
        # Create actions affecting different systems
        systems_list = [
            ["diplomatic", "political"],
            ["military", "logistics"],
            ["diplomatic", "cultural"],
            ["research", "technological"],
        ]
        for i, systems in enumerate(systems_list):
            mirror.record_captain_action(
                f"captain_{i % 2}",
                DecisionType.STRATEGIC,
                f"Action {i}",
                systems,
                [ImpactCategory.SYSTEMIC],
                impact_strength=0.6 + (i * 0.1),
            )
        return mirror

    def test_heatmap_generation(self, mirror_with_multiple_actions):
        """Test heatmap is generated correctly"""
        heatmap = mirror_with_multiple_actions.generate_influence_heatmap()
        assert heatmap["total_actions"] == 4
        assert heatmap["systems_influenced"] > 0
        assert "heatmap" in heatmap

    def test_heatmap_coverage(self, mirror_with_multiple_actions):
        """Test heatmap shows reach across systems"""
        heatmap = mirror_with_multiple_actions.generate_influence_heatmap()
        assert heatmap["systems_influenced"] >= 4
        assert heatmap["highest_impact_system"] is not None
        assert heatmap["reach_percentage"] > 0


class TestEchoPropagation:
    """Test decision echo and propagation analysis"""

    @pytest.fixture
    def mirror_ready(self):
        mirror = CaptainMirror()
        action_id = mirror.record_captain_action(
            "captain_001",
            DecisionType.DIPLOMATIC,
            "Trade agreement",
            ["diplomacy", "commerce"],
            [ImpactCategory.POLITICAL, ImpactCategory.OPERATIONAL],
            impact_strength=0.75,
        )
        return mirror, action_id

    def test_analyze_echo(self, mirror_ready):
        """Test echo analysis creates propagation paths"""
        mirror, action_id = mirror_ready
        echo_result = mirror.analyze_echo(action_id, propagation_stages=3)
        assert echo_result["success"]
        assert echo_result["echo_paths_created"] > 0
        assert echo_result["propagation_stages"] == 3

    def test_echo_decay(self, mirror_ready):
        """Test echo strength decays with propagation"""
        mirror, action_id = mirror_ready
        echo_result = mirror.analyze_echo(action_id, propagation_stages=3)
        # Each stage should produce some echo paths
        assert echo_result["average_echo_strength"] < 0.75  # Less than original


class TestResonanceScoring:
    """Test captain-federation value alignment"""

    @pytest.fixture
    def mirror(self):
        return CaptainMirror()

    def test_democratic_decision_resonance(self, mirror):
        """Test constitutional decision aligns with democracy"""
        action_id = mirror.record_captain_action(
            "captain_001",
            DecisionType.CONSTITUTIONAL,
            "Constitutional amendment",
            ["governance"],
            [ImpactCategory.POLITICAL],
        )
        resonance = mirror.score_resonance(action_id)
        assert resonance["success"]
        assert resonance["overall_resonance"] is not None
        # Constitutional decisions should have high democracy alignment
        assert resonance["resonance_by_value"]["democracy"] > 0.5

    def test_emergency_decision_tradeoffs(self, mirror):
        """Test emergency decisions may conflict with democracy"""
        action_id = mirror.record_captain_action(
            "captain_001",
            DecisionType.EMERGENCY,
            "Emergency lockdown",
            ["all"],
            [ImpactCategory.SYSTEMIC, ImpactCategory.EXISTENTIAL],
        )
        resonance = mirror.score_resonance(action_id)
        assert resonance["success"]
        # Emergency decisions might have negative democracy score
        assert resonance["resonance_by_value"]["democracy"] < 0.0

    def test_resonance_affects_action(self, mirror):
        """Test that resonance score updates action"""
        action_id = mirror.record_captain_action(
            "captain_001",
            DecisionType.STRATEGIC,
            "Strategic move",
            ["systems"],
            [ImpactCategory.SYSTEMIC],
        )
        mirror.score_resonance(action_id)
        action = mirror.actions[action_id]
        assert action.resonance_score != 0.0


class TestDriftDetection:
    """Test drift detection from federation values"""

    @pytest.fixture
    def mirror(self):
        return CaptainMirror()

    def test_detect_drift_on_misaligned_decision(self, mirror):
        """Test drift is detected on misaligned decisions"""
        action_id = mirror.record_captain_action(
            "captain_001",
            DecisionType.EMERGENCY,
            "Absolute lockdown",
            ["all"],
            [ImpactCategory.SYSTEMIC],
            impact_strength=0.95,  # High impact emergency
        )
        mirror.score_resonance(action_id)  # This will create low resonance
        drift = mirror.detect_drift(action_id)
        assert drift["success"]
        # Should detect drift on emergency with high impact
        assert drift["drift_detected"]

    def test_drift_event_creation(self, mirror):
        """Test drift events are recorded"""
        action_id = mirror.record_captain_action(
            "captain_001",
            DecisionType.EMERGENCY,
            "Emergency action",
            ["system"],
            [ImpactCategory.EXISTENTIAL],
            impact_strength=0.95,
        )
        mirror.score_resonance(action_id)
        drift = mirror.detect_drift(action_id)
        if drift["drift_detected"]:
            assert len(drift["drift_events"]) > 0

    def test_no_drift_on_aligned_decision(self, mirror):
        """Test no drift on well-aligned decisions"""
        action_id = mirror.record_captain_action(
            "captain_001",
            DecisionType.CONSTITUTIONAL,
            "Democratic amendment",
            ["governance"],
            [ImpactCategory.POLITICAL],
        )
        mirror.score_resonance(action_id)
        drift = mirror.detect_drift(action_id)
        assert drift["success"]
        assert not drift["drift_detected"]


class TestMirrorStatus:
    """Test comprehensive mirror status reporting"""

    @pytest.fixture
    def populated_mirror(self):
        mirror = CaptainMirror()
        decision_types = [
            DecisionType.STRATEGIC,
            DecisionType.DIPLOMATIC,
            DecisionType.EMERGENCY,
            DecisionType.CONSTITUTIONAL,
            DecisionType.RESOURCE_ALLOCATION,
        ]
        for i, dtype in enumerate(decision_types):
            mirror.record_captain_action(
                f"captain_{i % 2}",
                dtype,
                f"Decision {i}",
                ["system_A", "system_B"],
                [ImpactCategory.SYSTEMIC],
                impact_strength=0.5 + (i * 0.1),
            )
        return mirror

    def test_mirror_status_completeness(self, populated_mirror):
        """Test status report includes all key metrics"""
        status = populated_mirror.get_mirror_status()
        assert "total_actions_recorded" in status
        assert "actions_by_type" in status
        assert "average_resonance_score" in status
        assert "systems_influenced" in status
        assert "drift_events_detected" in status
        assert "federation_health_indicator" in status

    def test_status_reflects_actions(self, populated_mirror):
        """Test status accurately reflects recorded actions"""
        status = populated_mirror.get_mirror_status()
        assert status["total_actions_recorded"] == 5
        assert sum(status["actions_by_type"].values()) == 5

    def test_health_indicator_calculation(self, populated_mirror):
        """Test federation health indicator is calculated"""
        status = populated_mirror.get_mirror_status()
        health = status["federation_health_indicator"]
        assert isinstance(health, float)
        # Health should decrease with drift events
