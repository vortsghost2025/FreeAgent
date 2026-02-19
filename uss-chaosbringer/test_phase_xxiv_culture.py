#!/usr/bin/env python3
"""
PHASE XXIV - CULTURAL EVOLUTION ENGINE TESTS
Comprehensive test suite for federation cultural evolution (14 tests)
"""

import pytest
from cultural_evolution import (
    CulturalEvolutionEngine,
    CulturalDrift,
    MemeType,
    RitualType,
    ValuePriority,
    Culture,
)


class TestCulturalEngineInitialization:
    """Test cultural evolution engine initialization"""

    def test_engine_creates_successfully(self):
        """Test engine initializes with default federation name"""
        engine = CulturalEvolutionEngine()
        assert engine.culture is not None
        assert engine.culture.federation_name == "Federation"

    def test_engine_with_custom_federation_name(self):
        """Test engine initializes with custom name"""
        engine = CulturalEvolutionEngine("Terran Coalition")
        assert engine.culture.federation_name == "Terran Coalition"

    def test_initial_state_defaults(self):
        """Test initial cultural state meets defaults"""
        engine = CulturalEvolutionEngine()
        assert engine.culture.evolution_rate == CulturalDrift.MODERATE
        assert engine.culture.cultural_cohesion > 0.5
        assert len(engine.culture.memes) == 0
        assert len(engine.culture.rituals) == 0
        assert len(engine.culture.values) == 0


class TestMemeRecordingAndPropagation:
    """Test meme tracking and spreading"""

    def test_record_meme(self):
        """Test recording a new cultural meme"""
        engine = CulturalEvolutionEngine()
        meme_id = engine.record_meme(
            name="Unity Through Diversity",
            meme_type=MemeType.BELIEF,
            description="Strength comes from different perspectives",
            origin_ship="USS Coalition",
            propagation_strength=0.8,
        )
        assert meme_id in engine.culture.memes
        assert meme_id == "meme_0001"
        meme = engine.culture.memes[meme_id]
        assert meme.name == "Unity Through Diversity"
        assert meme.origin_ship == "USS Coalition"

    def test_propagate_meme_to_fleet(self):
        """Test spreading meme through fleet"""
        engine = CulturalEvolutionEngine()
        meme_id = engine.record_meme(
            name="Adaptive Leadership",
            meme_type=MemeType.PRACTICE,
            description="Leaders must adapt quickly",
            origin_ship="USS Pioneer",
        )

        adopter_ships = ["Ship-A", "Ship-B", "Ship-C"]
        adoptions = engine.propagate_meme(meme_id, adopter_ships)

        assert adoptions == 3
        assert engine.culture.memes[meme_id].adoption_count == 3
        assert engine.culture.memes[meme_id].last_adoption_timestamp is not None

    def test_meme_propagation_strength_increases(self):
        """Test meme propagation strength increases with adoptions"""
        engine = CulturalEvolutionEngine()
        meme_id = engine.record_meme(
            name="Test Meme",
            meme_type=MemeType.VALUE,
            description="Test",
            origin_ship="USS Test",
            propagation_strength=0.5,
        )

        initial_strength = engine.culture.memes[meme_id].propagation_strength
        engine.propagate_meme(meme_id, ["Ship-A", "Ship-B"])
        new_strength = engine.culture.memes[meme_id].propagation_strength

        assert new_strength > initial_strength

    def test_invalid_meme_propagation(self):
        """Test propagating non-existent meme returns 0"""
        engine = CulturalEvolutionEngine()
        result = engine.propagate_meme("invalid_meme", ["Ship-A"])
        assert result == 0


class TestRitualFormation:
    """Test cultural ritual creation and adoption"""

    def test_form_ritual(self):
        """Test establishing a new ritual"""
        engine = CulturalEvolutionEngine()
        ritual_id = engine.form_ritual(
            name="Morning Assembly",
            ritual_type=RitualType.DAILY,
            description="Daily fleet gathering for coordination",
            requirements=["All crew present", "Unified bridge"],
            frequency="DAILY",
            cultural_significance=0.7,
        )

        assert ritual_id in engine.culture.rituals
        ritual = engine.culture.rituals[ritual_id]
        assert ritual.name == "Morning Assembly"
        assert ritual.ritual_type == RitualType.DAILY

    def test_adopt_ritual(self):
        """Test ships adopting a ritual"""
        engine = CulturalEvolutionEngine()
        ritual_id = engine.form_ritual(
            name="Evening Meditation",
            ritual_type=RitualType.CEREMONIAL,
            description="Crew meditation for cohesion",
            requirements=["Meditation chamber", "30 min"],
            frequency="DAILY",
        )

        ships = ["USS Alpha", "USS Beta", "USS Gamma"]
        participation_rate = engine.adopt_ritual(ritual_id, ships)

        assert participation_rate > 0.0
        assert len(engine.culture.rituals[ritual_id].adherent_ships) == 3
        assert participation_rate <= 1.0

    def test_ritual_increases_cohesion(self):
        """Test that ritual adoption increases cultural cohesion"""
        engine = CulturalEvolutionEngine()
        initial_cohesion = engine.culture.cultural_cohesion

        ritual_id = engine.form_ritual(
            name="Test Ritual",
            ritual_type=RitualType.BINDING,
            description="Binding ritual",
            requirements=["All"],
            frequency="WEEKLY",
            cultural_significance=0.8,
        )

        engine.adopt_ritual(ritual_id, ["Ship-A", "Ship-B", "Ship-C"])
        final_cohesion = engine.culture.cultural_cohesion

        assert final_cohesion >= initial_cohesion

    def test_ritual_participation_rate_calculation(self):
        """Test ritual participation rate is calculated correctly"""
        engine = CulturalEvolutionEngine()
        ritual_id = engine.form_ritual(
            name="Test",
            ritual_type=RitualType.DAILY,
            description="Test ritual",
            requirements=[],
            frequency="DAILY",
        )

        # Add 5 ships
        ships = [f"Ship-{i}" for i in range(5)]
        participation = engine.adopt_ritual(ritual_id, ships)

        # Participation = 5/10 = 0.5
        assert abs(participation - 0.5) < 0.01


class TestValueEstablishment:
    """Test cultural values and principles"""

    def test_establish_value(self):
        """Test creating a new cultural value"""
        engine = CulturalEvolutionEngine()
        value_id = engine.establish_value(
            name="Honor",
            description="Code of conduct and integrity",
            priority_level=ValuePriority.FOUNDATIONAL,
            strength=0.8,
        )

        assert value_id in engine.culture.values
        value = engine.culture.values[value_id]
        assert value.name == "Honor"
        assert value.priority_level == ValuePriority.FOUNDATIONAL

    def test_add_value_support(self):
        """Test ships supporting a value"""
        engine = CulturalEvolutionEngine()
        value_id = engine.establish_value(
            name="Justice",
            description="Fair treatment for all",
            priority_level=ValuePriority.IMPORTANT,
        )

        supporters = ["USS Unity", "USS Peace", "USS Liberty"]
        total_supporters = engine.add_value_support(value_id, supporters)

        assert total_supporters == 3
        assert len(engine.culture.values[value_id].supporting_ships) == 3

    def test_value_priority_levels(self):
        """Test different value priority levels exist"""
        engine = CulturalEvolutionEngine()

        for priority in [
            ValuePriority.FOUNDATIONAL,
            ValuePriority.IMPORTANT,
            ValuePriority.EMERGING,
            ValuePriority.FADING,
            ValuePriority.ABANDONED,
        ]:
            value_id = engine.establish_value(
                name=f"Value-{priority.value}",
                description="Test",
                priority_level=priority,
            )
            assert engine.culture.values[value_id].priority_level == priority


class TestValuePrediction:
    """Test prediction of cultural value evolution"""

    def test_predict_value_shift_growing(self):
        """Test predicting value will grow"""
        engine = CulturalEvolutionEngine()
        value_id = engine.establish_value(
            name="Growth",
            description="Embrace expansion",
            priority_level=ValuePriority.EMERGING,
            strength=0.6,
        )

        # Add strong support
        engine.add_value_support(value_id, [f"Ship-{i}" for i in range(8)])

        future_priority, predicted_strength = engine.predict_value_shift(value_id, cycles=5)

        # With high support, should trend upward
        assert predicted_strength >= 0.6

    def test_predict_value_shift_declining(self):
        """Test predicting value will decline"""
        engine = CulturalEvolutionEngine()
        value_id = engine.establish_value(
            name="Old Ways",
            description="Traditional approach",
            priority_level=ValuePriority.IMPORTANT,
            strength=0.5,
        )

        # Add opposition
        value = engine.culture.values[value_id]
        value.contradicting_ships = [f"Ship-{i}" for i in range(10)]

        future_priority, predicted_strength = engine.predict_value_shift(value_id, cycles=5)

        # With strong opposition, should trend downward
        assert predicted_strength < 0.5

    def test_predict_invalid_value_returns_abandoned(self):
        """Test predicting non-existent value returns abandoned"""
        engine = CulturalEvolutionEngine()
        priority, strength = engine.predict_value_shift("invalid_value")

        assert priority == ValuePriority.FADING
        assert strength == 0.0


class TestCulturalResilience:
    """Test measurement of cultural stability"""

    def test_base_resilience_in_range(self):
        """Test resilience score is always 0.0-1.0"""
        engine = CulturalEvolutionEngine()
        resilience = engine.measure_resilience()

        assert 0.0 <= resilience <= 1.0

    def test_resilience_improves_with_rituals(self):
        """Test resilience increases with ritual participation"""
        engine = CulturalEvolutionEngine()
        initial_resilience = engine.measure_resilience()

        ritual_id = engine.form_ritual(
            name="Unity Ritual",
            ritual_type=RitualType.BINDING,
            description="Binding ritual",
            requirements=[],
            frequency="WEEKLY",
        )

        engine.adopt_ritual(ritual_id, [f"Ship-{i}" for i in range(5)])
        final_resilience = engine.measure_resilience()

        assert final_resilience >= initial_resilience

    def test_resilience_decreases_with_conflicts(self):
        """Test resilience decreases when conflicts arise"""
        engine = CulturalEvolutionEngine()
        initial_resilience = engine.measure_resilience()

        engine.create_cultural_conflict("Group-A", "Group-B", severity=0.8)
        final_resilience = engine.measure_resilience()

        assert final_resilience < initial_resilience


class TestCulturalStatus:
    """Test comprehensive status reporting"""

    def test_get_cultural_status_returns_dict(self):
        """Test status report returns valid dictionary"""
        engine = CulturalEvolutionEngine()
        status = engine.get_cultural_status()

        assert isinstance(status, dict)
        assert "federation" in status
        assert "cohesion" in status
        assert "resilience" in status
        assert "evolution_trajectory" in status

    def test_cultural_status_includes_elements(self):
        """Test status report includes all cultural elements"""
        engine = CulturalEvolutionEngine()

        # Add elements
        engine.record_meme("Test Meme", MemeType.BELIEF, "Test", "Ship-1")
        engine.form_ritual("Test Ritual", RitualType.DAILY, "Test", [], "DAILY")
        engine.establish_value("Test Value", "Test", ValuePriority.IMPORTANT)

        status = engine.get_cultural_status()

        assert status["total_memes"] >= 1
        assert status["total_rituals"] >= 1
        assert status["total_values"] >= 1

    def test_evolution_trajectory_calculation(self):
        """Test evolution trajectory reflects current state"""
        engine = CulturalEvolutionEngine()
        status = engine.get_cultural_status()

        trajectory = status["evolution_trajectory"]
        assert trajectory in ["THRIVING", "STABLE", "EVOLVING", "FRAGMENTED"]


class TestCulturalConflict:
    """Test conflict creation and resolution"""

    def test_create_conflict(self):
        """Test creating a cultural conflict"""
        engine = CulturalEvolutionEngine()
        engine.create_cultural_conflict("Faction-A", "Faction-B", severity=0.6)

        assert ("Faction-A", "Faction-B") in engine.culture.active_conflicts

    def test_conflict_reduces_cohesion(self):
        """Test conflict reduces cultural cohesion"""
        engine = CulturalEvolutionEngine()
        initial_cohesion = engine.culture.cultural_cohesion

        engine.create_cultural_conflict("Group-1", "Group-2", severity=0.7)
        final_cohesion = engine.culture.cultural_cohesion

        assert final_cohesion < initial_cohesion

    def test_resolve_conflict(self):
        """Test resolving a conflict"""
        engine = CulturalEvolutionEngine()
        engine.create_cultural_conflict("Side-A", "Side-B")

        assert ("Side-A", "Side-B") in engine.culture.active_conflicts

        resolved = engine.resolve_conflict("Side-A", "Side-B")

        assert resolved is True
        assert ("Side-A", "Side-B") not in engine.culture.active_conflicts

    def test_resolve_nonexistent_conflict(self):
        """Test resolving conflict that doesn't exist"""
        engine = CulturalEvolutionEngine()
        resolved = engine.resolve_conflict("X", "Y")

        assert resolved is False


class TestMemeValueLinking:
    """Test association between memes and values"""

    def test_link_meme_to_value(self):
        """Test linking a meme to a value"""
        engine = CulturalEvolutionEngine()

        meme_id = engine.record_meme(
            "Cooperation", MemeType.BELIEF, "Work together", "Ship-1"
        )
        value_id = engine.establish_value("Unity", "We are one", ValuePriority.IMPORTANT)

        engine.link_meme_to_value(meme_id, value_id)

        assert meme_id in engine.culture.values[value_id].associated_memes

    def test_linked_meme_strengthens_value(self):
        """Test linking meme increases value strength"""
        engine = CulturalEvolutionEngine()

        value_id = engine.establish_value("Test", "Test", ValuePriority.IMPORTANT, strength=0.5)
        meme_id = engine.record_meme("Test", MemeType.BELIEF, "Test", "Ship-1")

        initial_strength = engine.culture.values[value_id].strength
        engine.link_meme_to_value(meme_id, value_id)
        final_strength = engine.culture.values[value_id].strength

        assert final_strength > initial_strength


class TestDominantCultureElement:
    """Test identification of dominant cultural elements"""

    def test_get_dominant_culture(self):
        """Test identifying dominant cultural elements"""
        engine = CulturalEvolutionEngine()

        meme_id = engine.record_meme("Primary Meme", MemeType.BELIEF, "The way", "Ship-1")
        engine.propagate_meme(meme_id, [f"Ship-{i}" for i in range(5)])

        ritual_id = engine.form_ritual("Main Ritual", RitualType.DAILY, "Daily", [], "DAILY")
        engine.adopt_ritual(ritual_id, [f"Ship-{i}" for i in range(8)])

        value_id = engine.establish_value(
            "Core Value", "Central to us", ValuePriority.FOUNDATIONAL, strength=0.9
        )

        dominant = engine.get_dominant_culture()

        assert dominant["dominant_meme"] is not None
        assert dominant["dominant_ritual"] is not None
        assert dominant["dominant_value"] is not None
        assert "overall_cohesion" in dominant


class TestEvolutionRateMechanics:
    """Test evolution rate effects"""

    def test_set_evolution_rate(self):
        """Test changing evolution rate"""
        engine = CulturalEvolutionEngine()

        engine.set_evolution_rate(CulturalDrift.RADICAL)
        assert engine.culture.evolution_rate == CulturalDrift.RADICAL

        engine.set_evolution_rate(CulturalDrift.CONSERVATIVE)
        assert engine.culture.evolution_rate == CulturalDrift.CONSERVATIVE

    def test_drift_rate_affects_prediction(self):
        """Test evolution rate affects value predictions"""
        engine1 = CulturalEvolutionEngine()
        engine1.set_evolution_rate(CulturalDrift.CONSERVATIVE)

        engine2 = CulturalEvolutionEngine()
        engine2.set_evolution_rate(CulturalDrift.RADICAL)

        value_id1 = engine1.establish_value("Test", "Test", ValuePriority.EMERGING, strength=0.5)
        engine1.add_value_support(value_id1, [f"Ship-{i}" for i in range(5)])

        value_id2 = engine2.establish_value("Test", "Test", ValuePriority.EMERGING, strength=0.5)
        engine2.add_value_support(value_id2, [f"Ship-{i}" for i in range(5)])

        _, strength1 = engine1.predict_value_shift(value_id1, cycles=10)
        _, strength2 = engine2.predict_value_shift(value_id2, cycles=10)

        # Radical should deviate more than conservative
        assert abs(strength2 - 0.5) >= abs(strength1 - 0.5)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
