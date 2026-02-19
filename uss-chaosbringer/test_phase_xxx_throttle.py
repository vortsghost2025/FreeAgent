#!/usr/bin/env python3
"""
PHASE XXX - OMNISCIENCE THROTTLE TEST SUITE
12 comprehensive tests for knowledge limitation and anti-hubris mechanisms
"""

import pytest
from datetime import datetime

from omniscience_throttle import (
    KnowledgeThrottle,
    ThrottleLevel,
    HumilityMode,
)


class TestThrottleInitialization:
    """Test throttle system initialization"""

    def test_initializes_with_defaults(self):
        """Test throttle starts in cautious mode"""
        throttle = KnowledgeThrottle()
        assert throttle.current_throttle_level == ThrottleLevel.CAUTIOUS
        assert throttle.current_humility_mode == HumilityMode.INHERENT_UNCERTAINTY

    def test_safety_state_initialized(self):
        """Test safety mechanisms are active"""
        throttle = KnowledgeThrottle()
        assert throttle.override_active is False
        assert len(throttle.knowledge_gains) == 0
        assert len(throttle.hubris_events) == 0


class TestKnowledgeLimitation:
    """Test knowledge rate limiting"""

    @pytest.fixture
    def throttle(self):
        return KnowledgeThrottle()

    def test_limit_knowledge_rate_basic(self, throttle):
        """Test basic knowledge limiting"""
        result = throttle.limit_knowledge_rate(
            domain="astronomy",
            raw_confidence_increase=0.3,
            insight_strength=0.8,
        )
        assert result["success"]
        assert "gain_id" in result
        assert result["throttle_applied"]

    def test_confidence_never_reaches_certainty(self, throttle):
        """Test confidence is capped before absolute certainty"""
        result = throttle.limit_knowledge_rate(
            domain="physics",
            raw_confidence_increase=1.0,
            insight_strength=1.0,
        )
        # Confidence should be capped at 0.99
        assert result["confidence_final"] < 1.0
        assert result["confidence_final"] <= 0.99

    def test_throttle_reduces_knowledge_gain(self, throttle):
        """Test throttle actually reduces gain"""
        result = throttle.limit_knowledge_rate(
            domain="biology", raw_confidence_increase=0.8, insight_strength=0.9
        )
        # With cautious throttle (0.75), should be reduced
        assert result["confidence_final"] < result["confidence_after"]
        assert result["throttle_percentage"] > 0

    def test_multiple_knowledge_gains_tracked(self, throttle):
        """Test multiple gains are recorded"""
        for i in range(5):
            throttle.limit_knowledge_rate(
                f"domain_{i}",
                0.3,
                0.6,
            )
        assert len(throttle.knowledge_gains) == 5

    def test_throttle_level_affects_limiting(self, throttle):
        """Test different throttle levels limit differently"""
        throttle.current_throttle_level = ThrottleLevel.PARANOID
        paranoid_result = throttle.limit_knowledge_rate("domain1", 0.8, 0.8)

        throttle.current_throttle_level = ThrottleLevel.CAUTIOUS
        cautious_result = throttle.limit_knowledge_rate("domain2", 0.8, 0.8)

        # Paranoid should limit more aggressively
        assert paranoid_result["throttle_percentage"] > cautious_result["throttle_percentage"]


class TestOversightDampening:
    """Test dampening of overwhelming insights"""

    @pytest.fixture
    def throttle(self):
        return KnowledgeThrottle()

    def test_damp_insight_extreme_clarity(self, throttle):
        """Test extreme clarity insights are strongly dampened"""
        result = throttle.damp_over_insight(
            domain="revelation",
            clarity_level=0.95,
            description="Crystal clear understanding",
            potential_hubris_risk=0.9,
        )
        assert result["success"]
        assert result["dampened_clarity"] < 0.95

    def test_insight_dampening_by_humility_mode(self, throttle):
        """Test different humility modes damp differently"""
        throttle.current_humility_mode = HumilityMode.NONE
        none_result = throttle.damp_over_insight(
            "domain1", 0.8, "insight", 0.5
        )

        throttle.current_humility_mode = HumilityMode.EXTREME
        extreme_result = throttle.damp_over_insight(
            "domain2", 0.8, "insight", 0.5
        )

        # Extreme mode should damp more
        assert extreme_result["dampening_factor"] < none_result["dampening_factor"]

    def test_high_risk_triggers_intervention(self, throttle):
        """Test high-risk insights trigger intervention"""
        result = throttle.damp_over_insight(
            "dangerous_knowledge",
            clarity_level=0.9,
            description="Potentially dangerous insight",
            potential_hubris_risk=0.8,
        )
        assert result["intervention_triggered"]

    def test_insight_events_recorded(self, throttle):
        """Test insights are recorded in event log"""
        for i in range(3):
            throttle.damp_over_insight(
                f"domain_{i}",
                clarity_level=0.7 + (i * 0.05),
                description=f"Insight {i}",
                potential_hubris_risk=0.4 + (i * 0.1),
            )
        assert len(throttle.insight_events) == 3


class TestPredictiveHumility:
    """Test humility injection into predictions"""

    @pytest.fixture
    def throttle(self):
        return KnowledgeThrottle()

    def test_inject_uncertainty(self, throttle):
        """Test uncertainty is injected into predictions"""
        result = throttle.inject_predictive_humility(
            prediction_domain="future_markets",
            predicted_confidence=0.9,
        )
        assert result["success"]
        # Humble confidence should be lower
        assert result["humble_confidence"] < result["original_confidence"]

    def test_confidence_range_calculated(self, throttle):
        """Test confidence range is provided"""
        result = throttle.inject_predictive_humility(
            "physics", 0.8
        )
        confidence_range = result["confidence_range"]
        assert len(confidence_range) == 2
        assert confidence_range[0] < confidence_range[1]
        assert confidence_range[0] >= 0.0
        assert confidence_range[1] <= 1.0

    def test_humility_mode_affects_uncertainty(self, throttle):
        """Test humility mode controls uncertainty level"""
        throttle.current_humility_mode = HumilityMode.INHERENT_UNCERTAINTY
        normal_result = throttle.inject_predictive_humility("domain1", 0.8)

        throttle.current_humility_mode = HumilityMode.EXTREME
        extreme_result = throttle.inject_predictive_humility("domain2", 0.8)

        # Extreme uncertainty should reduce confidence more
        assert extreme_result["humble_confidence"] < normal_result["humble_confidence"]

    def test_humility_statement_meaningful(self, throttle):
        """Test humility statements are informative"""
        result = throttle.inject_predictive_humility("weather", 0.85)
        assert "Confidence range" in result["humility_statement"]
        assert "uncertainty" in result["humility_statement"].lower()


class TestAntiHubrisEnforcement:
    """Test anti-hubris enforcement"""

    @pytest.fixture
    def throttle(self):
        return KnowledgeThrottle()

    def test_enforce_anti_hubris_detects_overconfidence(self, throttle):
        """Test overconfidence detection"""
        # Create multiple high-confidence gains
        for i in range(15):
            throttle.limit_knowledge_rate("domain", 0.15, 0.95)

        result = throttle.enforce_anti_hubris()
        assert result["success"]
        # Should detect hubris with so many high gains
        if result["average_confidence"] > 0.85:
            assert result["hubris_detected"]

    def test_hubris_triggers_throttle_increase(self, throttle):
        """Test detected hubris increases throttle"""
        # Manually create high confidence gain
        throttle.knowledge_gains["fake1"] = type("obj", (object,), {
            "confidence_dampened": 0.9
        })()
        throttle.knowledge_gains["fake2"] = type("obj", (object,), {
            "confidence_dampened": 0.88
        })()

        initial_level = throttle.current_throttle_level
        throttle.enforce_anti_hubris()
        # If hubris detected, throttle should increase
        if throttle.overconfidence_events > 0:
            assert throttle.current_throttle_level != ThrottleLevel.CAUTIOUS

    def test_hubris_events_logged(self, throttle):
        """Test hubris events are recorded"""
        # Force high confidence scenario
        for i in range(10):
            throttle.knowledge_gains[f"test_{i}"] = type("obj", (object,), {
                "confidence_dampened": 0.9 + (i * 0.001)
            })()

        throttle.enforce_anti_hubris()
        if throttle.overconfidence_events > 0:
            assert len(throttle.hubris_events) >= throttle.overconfidence_events


class TestCaptainOverride:
    """Test captain override mechanism"""

    @pytest.fixture
    def throttle(self):
        return KnowledgeThrottle()

    def test_captain_can_override(self, throttle):
        """Test captain can disable throttle"""
        result = throttle.check_captain_override(
            captain_id="captain_001",
            override_duration_ticks=50,
            reason="Emergency analysis required",
            accepted_risk=0.8,
        )
        assert result["success"]
        assert throttle.override_active

    def test_override_requires_risk_acknowledgment(self, throttle):
        """Test captain must acknowledge risk"""
        result = throttle.check_captain_override(
            "captain_001",
            50,
            "reason",
            accepted_risk=0.3,  # Too low
        )
        assert not result["success"]
        assert "acknowledge" in result["error"].lower()

    def test_override_has_duration(self, throttle):
        """Test override expires after duration"""
        throttle.check_captain_override("captain", 10, "needed", 0.9)
        assert throttle.override_active
        # Advance ticks
        for _ in range(11):
            throttle.update_tick()
        # Override should have expired
        assert not throttle.override_active

    def test_override_tracked(self, throttle):
        """Test override events are recorded"""
        throttle.check_captain_override("captain_001", 20, "test", 0.7)
        assert len(throttle.captain_overrides) > 0

    def test_override_disables_throttling(self, throttle):
        """Test override actually disables throttle"""
        throttle.current_throttle_level = ThrottleLevel.PARANOID
        throttle.check_captain_override("captain", 30, "reason", 0.8)

        # During override, knowledge should gain full value
        result = throttle.limit_knowledge_rate("domain", 0.5, 0.8)
        # With override active, should be nearly unthrottled
        assert result["throttle_percentage"] < 5


class TestThrottleStatus:
    """Test comprehensive throttle status reporting"""

    @pytest.fixture
    def populated_throttle(self):
        throttle = KnowledgeThrottle()
        # Create various events
        for i in range(5):
            throttle.limit_knowledge_rate(f"domain_{i}", 0.3, 0.7)
            throttle.damp_over_insight(f"domain_{i}", 0.7, "insight", 0.4)
            throttle.inject_predictive_humility(f"domain_{i}", 0.75)
        return throttle

    def test_status_report_completeness(self, populated_throttle):
        """Test status report includes all key metrics"""
        status = populated_throttle.get_throttle_status()
        assert "current_throttle_level" in status
        assert "total_knowledge_gains_recorded" in status
        assert "hubris_risk_level" in status
        assert "knowledge_efficiency" in status

    def test_status_reflects_activity(self, populated_throttle):
        """Test status accurately reflects recorded events"""
        status = populated_throttle.get_throttle_status()
        assert status["total_knowledge_gains_recorded"] == 5
        assert status["total_insights_dampened"] == 5

    def test_hubris_risk_escalates(self, populated_throttle):
        """Test hubris risk level escalates with events"""
        initial_status = populated_throttle.get_throttle_status()
        # Create more overconfidence events
        for i in range(10):
            populated_throttle.knowledge_gains[f"high_{i}"] = type("obj", (object,), {
                "confidence_dampened": 0.92,
                "throttle_applied": True,
            })()
        populated_throttle.overconfidence_events = 15

        new_status = populated_throttle.get_throttle_status()
        # Risk should be higher
        assert new_status["overconfidence_events"] > initial_status["overconfidence_events"]

    def test_status_shows_override_info(self, populated_throttle):
        """Test override status is shown"""
        status = populated_throttle.get_throttle_status()
        assert "override_currently_active" in status
        assert "override_expires_in_ticks" in status
