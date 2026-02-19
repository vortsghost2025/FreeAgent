#!/usr/bin/env python3
"""
PHASE XXIII - PARADOX HARMONIZER TESTS
Comprehensive test suite for the Paradox Harmonizer engine (15 tests)
"""

import pytest
import time
from paradox_harmonizer import (
    ParadoxHarmonizer,
    ParadoxType,
    ResolutionMethod,
    Paradox,
    ParadoxEnergyPacket,
)


class TestParadoxHarmonizerInitialization:
    """Test Paradox Harmonizer initialization"""

    def test_initialize(self):
        """Test harmonizer initializes correctly"""
        harmonizer = ParadoxHarmonizer()
        assert len(harmonizer.paradoxes) == 0
        assert len(harmonizer.energy_packets) == 0
        assert harmonizer.total_paradoxes_registered == 0
        assert harmonizer.federation_coherence == 1.0

    def test_initial_state(self):
        """Test initial state is valid"""
        harmonizer = ParadoxHarmonizer()
        assert harmonizer.optimization_gain == 1.0
        assert harmonizer.resonance_frequency == 0.5
        assert harmonizer.paradox_density == 0.0
        assert harmonizer.total_energy_extracted == 0.0


class TestParadoxRegistration:
    """Test paradox registration functionality"""

    def test_register_contradiction(self):
        """Test registering a simple contradiction"""
        harmonizer = ParadoxHarmonizer()
        paradox_id = harmonizer.register_paradox(
            name="Free Will vs Determinism",
            statement_a="Events are determined by prior causes",
            statement_b="Agents have free choice",
            paradox_type=ParadoxType.CONTRADICTION,
            severity_estimate=0.75,
        )
        assert paradox_id is not None
        assert paradox_id in harmonizer.paradoxes
        assert harmonizer.total_paradoxes_registered == 1

    def test_register_paradox_returns_valid_id(self):
        """Test that registered paradox has valid ID format"""
        harmonizer = ParadoxHarmonizer()
        paradox_id = harmonizer.register_paradox(
            name="Liar's Paradox",
            statement_a="This statement is false",
            statement_b="This statement is true",
            paradox_type=ParadoxType.PARADOX,
        )
        assert paradox_id.startswith("paradox_")

    def test_register_multiple_paradoxes(self):
        """Test registering multiple paradoxes"""
        harmonizer = ParadoxHarmonizer()
        id1 = harmonizer.register_paradox(
            name="Paradox 1",
            statement_a="A",
            statement_b="Not A",
            paradox_type=ParadoxType.CONTRADICTION,
        )
        id2 = harmonizer.register_paradox(
            name="Paradox 2",
            statement_a="B",
            statement_b="Not B",
            paradox_type=ParadoxType.PARADOX,
        )
        id3 = harmonizer.register_paradox(
            name="Paradox 3",
            statement_a="C",
            statement_b="Not C",
            paradox_type=ParadoxType.DUAL_TRUTH,
        )
        assert len(harmonizer.paradoxes) == 3
        assert id1 != id2 != id3

    def test_paradox_stores_metadata(self):
        """Test paradox stores all metadata correctly"""
        harmonizer = ParadoxHarmonizer()
        metadata = {"domain": "physics", "discovered_by": "observer"}
        paradox_id = harmonizer.register_paradox(
            name="Quantum Paradox",
            statement_a="Particle is here",
            statement_b="Particle is there",
            paradox_type=ParadoxType.CONTRADICTION,
            severity_estimate=0.8,
            metadata=metadata,
        )
        paradox = harmonizer.paradoxes[paradox_id]
        assert paradox.metadata == metadata
        assert paradox.name == "Quantum Paradox"

    def test_severity_clamped_to_valid_range(self):
        """Test severity estimate is clamped to 0.0-1.0"""
        harmonizer = ParadoxHarmonizer()
        id1 = harmonizer.register_paradox(
            name="Test 1",
            statement_a="A",
            statement_b="B",
            paradox_type=ParadoxType.CONTRADICTION,
            severity_estimate=-0.5,
        )
        id2 = harmonizer.register_paradox(
            name="Test 2",
            statement_a="C",
            statement_b="D",
            paradox_type=ParadoxType.CONTRADICTION,
            severity_estimate=1.5,
        )
        assert 0.0 <= harmonizer.paradoxes[id1].severity_score <= 1.0
        assert 0.0 <= harmonizer.paradoxes[id2].severity_score <= 1.0


class TestParadoxScoring:
    """Test paradox severity scoring"""

    def test_score_paradox_returns_valid_score(self):
        """Test scoring returns valid 0.0-1.0 score"""
        harmonizer = ParadoxHarmonizer()
        paradox_id = harmonizer.register_paradox(
            name="Test Paradox",
            statement_a="A",
            statement_b="B",
            paradox_type=ParadoxType.PARADOX,
            severity_estimate=0.6,
        )
        score = harmonizer.score_paradox(paradox_id)
        assert 0.0 <= score <= 1.0

    def test_score_paradox_type_affects_score(self):
        """Test that paradox type influences final score"""
        harmonizer = ParadoxHarmonizer()
        id_paradox = harmonizer.register_paradox(
            name="Paradox Type",
            statement_a="A",
            statement_b="B",
            paradox_type=ParadoxType.PARADOX,
            severity_estimate=0.7,
        )
        id_koan = harmonizer.register_paradox(
            name="Koan Type",
            statement_a="C",
            statement_b="D",
            paradox_type=ParadoxType.KOANS,
            severity_estimate=0.7,
        )
        score_paradox = harmonizer.score_paradox(id_paradox)
        score_koan = harmonizer.score_paradox(id_koan)
        # Paradox type should have higher score than Koan
        assert score_paradox >= score_koan

    def test_score_updates_paradox_severity(self):
        """Test that scoring updates the paradox's severity score"""
        harmonizer = ParadoxHarmonizer()
        paradox_id = harmonizer.register_paradox(
            name="Test",
            statement_a="A",
            statement_b="B",
            paradox_type=ParadoxType.CONTRADICTION,
            severity_estimate=0.5,
        )
        original_score = harmonizer.paradoxes[paradox_id].severity_score
        new_score = harmonizer.score_paradox(paradox_id)
        # Scoring may adjust the score
        assert harmonizer.paradoxes[paradox_id].severity_score == new_score

    def test_score_nonexistent_paradox_raises_error(self):
        """Test scoring nonexistent paradox raises ValueError"""
        harmonizer = ParadoxHarmonizer()
        with pytest.raises(ValueError):
            harmonizer.score_paradox("nonexistent_id")

    def test_resonance_bonus_with_multiple_same_type(self):
        """Test that similar paradoxes boost each other's scores"""
        harmonizer = ParadoxHarmonizer()
        # Create three PARADOX type paradoxes
        id1 = harmonizer.register_paradox(
            name="P1",
            statement_a="A",
            statement_b="B",
            paradox_type=ParadoxType.PARADOX,
            severity_estimate=0.5,
        )
        id2 = harmonizer.register_paradox(
            name="P2",
            statement_a="C",
            statement_b="D",
            paradox_type=ParadoxType.PARADOX,
            severity_estimate=0.5,
        )
        id3 = harmonizer.register_paradox(
            name="P3",
            statement_a="E",
            statement_b="F",
            paradox_type=ParadoxType.PARADOX,
            severity_estimate=0.5,
        )
        # Score when resonant paradoxes exist should be higher
        score = harmonizer.score_paradox(id1)
        assert score > 0.5  # Should include resonance bonus


class TestParadoxHarmonization:
    """Test paradox harmonization (activation)"""

    def test_harmonize_paradox_returns_result(self):
        """Test that harmonization returns result dict"""
        harmonizer = ParadoxHarmonizer()
        paradox_id = harmonizer.register_paradox(
            name="Test",
            statement_a="A",
            statement_b="B",
            paradox_type=ParadoxType.CONTRADICTION,
        )
        result = harmonizer.harmonize_paradox(paradox_id)
        assert isinstance(result, dict)
        assert "success" in result

    def test_harmonize_updates_paradox_state(self):
        """Test harmonization updates paradox counters"""
        harmonizer = ParadoxHarmonizer()
        paradox_id = harmonizer.register_paradox(
            name="Test",
            statement_a="A",
            statement_b="B",
            paradox_type=ParadoxType.CONTRADICTION,
        )
        assert harmonizer.paradoxes[paradox_id].harmonization_count == 0
        harmonizer.harmonize_paradox(paradox_id)
        assert harmonizer.paradoxes[paradox_id].harmonization_count == 1
        harmonizer.harmonize_paradox(paradox_id)
        assert harmonizer.paradoxes[paradox_id].harmonization_count == 2

    def test_harmonize_records_timestamp(self):
        """Test harmonization records when it occurred"""
        harmonizer = ParadoxHarmonizer()
        paradox_id = harmonizer.register_paradox(
            name="Test",
            statement_a="A",
            statement_b="B",
            paradox_type=ParadoxType.PARADOX,
        )
        assert harmonizer.paradoxes[paradox_id].last_harmonization_at is None
        harmonizer.harmonize_paradox(paradox_id)
        assert harmonizer.paradoxes[paradox_id].last_harmonization_at is not None

    def test_harmonize_updates_federation_coherence(self):
        """Test successful harmonization improves federation coherence"""
        harmonizer = ParadoxHarmonizer()
        initial_coherence = harmonizer.federation_coherence
        paradox_id = harmonizer.register_paradox(
            name="Synthesis Test",
            statement_a="A",
            statement_b="B",
            paradox_type=ParadoxType.KOANS,
        )
        harmonizer.harmonize_paradox(paradox_id)
        # Synthesis has highest stability impact
        assert harmonizer.federation_coherence >= initial_coherence

    def test_harmonize_raises_error_for_invalid_id(self):
        """Test harmonizing nonexistent paradox raises error"""
        harmonizer = ParadoxHarmonizer()
        with pytest.raises(ValueError):
            harmonizer.harmonize_paradox("invalid_id")

    def test_harmonization_adds_to_history(self):
        """Test harmonization is recorded in history"""
        harmonizer = ParadoxHarmonizer()
        paradox_id = harmonizer.register_paradox(
            name="History Test",
            statement_a="A",
            statement_b="B",
            paradox_type=ParadoxType.CONTRADICTION,
        )
        assert len(harmonizer.harmonization_history) == 0
        harmonizer.harmonize_paradox(paradox_id)
        assert len(harmonizer.harmonization_history) == 1
        assert harmonizer.harmonization_history[0]["paradox_id"] == paradox_id


class TestStabilityImpact:
    """Test stability impact calculations"""

    def test_different_methods_different_stability_impact(self):
        """Test that different harmonization methods have different impacts"""
        harmonizer = ParadoxHarmonizer()
        impacts = []
        method_paradoxes = {
            ParadoxType.CONTRADICTION: ResolutionMethod.CONTEXT_SHIFT,
            ParadoxType.PARADOX: ResolutionMethod.QUANTUM_SUPERPOSITION,
            ParadoxType.KOANS: ResolutionMethod.SYNTHESIS,
            ParadoxType.DUAL_TRUTH: ResolutionMethod.OSCILLATION,
        }

        for ptype in [ParadoxType.CONTRADICTION, ParadoxType.PARADOX, ParadoxType.KOANS]:
            paradox_id = harmonizer.register_paradox(
                name=f"Test {ptype.value}",
                statement_a="A",
                statement_b="B",
                paradox_type=ptype,
            )
            harmonizer.harmonize_paradox(paradox_id)
            impact = harmonizer.paradoxes[paradox_id].stability_impact
            impacts.append(impact)

        # Not all impacts should be identical
        assert len(set(impacts)) > 1


class TestParadoxEnergyExtraction:
    """Test energy extraction from paradoxes"""

    def test_extract_energy_returns_packet(self):
        """Test energy extraction returns valid packet"""
        harmonizer = ParadoxHarmonizer()
        paradox_id = harmonizer.register_paradox(
            name="Energy Test",
            statement_a="A",
            statement_b="B",
            paradox_type=ParadoxType.PARADOX,
            severity_estimate=0.8,
        )
        energy_packet = harmonizer.extract_paradox_energy(paradox_id)
        assert isinstance(energy_packet, ParadoxEnergyPacket)
        assert energy_packet.source_paradox_id == paradox_id

    def test_extract_energy_valid_amount(self):
        """Test extracted energy amount is in valid range"""
        harmonizer = ParadoxHarmonizer()
        paradox_id = harmonizer.register_paradox(
            name="Energy Test",
            statement_a="A",
            statement_b="B",
            paradox_type=ParadoxType.PARADOX,
            severity_estimate=0.7,
        )
        energy_packet = harmonizer.extract_paradox_energy(paradox_id)
        assert 0.0 <= energy_packet.energy_amount <= 1.0

    def test_extract_energy_registers_packet(self):
        """Test extracted energy is registered in harmonizer"""
        harmonizer = ParadoxHarmonizer()
        paradox_id = harmonizer.register_paradox(
            name="Energy Test",
            statement_a="A",
            statement_b="B",
            paradox_type=ParadoxType.CONTRADICTION,
            severity_estimate=0.6,
        )
        assert len(harmonizer.energy_packets) == 0
        harmonizer.extract_paradox_energy(paradox_id)
        assert len(harmonizer.energy_packets) == 1

    def test_extract_energy_updates_tracking(self):
        """Test energy extraction updates paradox and harmonizer tracking"""
        harmonizer = ParadoxHarmonizer()
        paradox_id = harmonizer.register_paradox(
            name="Energy Test",
            statement_a="A",
            statement_b="B",
            paradox_type=ParadoxType.DUAL_TRUTH,
        )
        initial_total = harmonizer.total_energy_extracted
        initial_paradox_energy = harmonizer.paradoxes[paradox_id].total_energy_extracted

        energy_packet = harmonizer.extract_paradox_energy(paradox_id)

        assert harmonizer.total_energy_extracted > initial_total
        assert harmonizer.paradoxes[paradox_id].total_energy_extracted > initial_paradox_energy
        assert (
            harmonizer.paradoxes[paradox_id].total_energy_extracted
            >= energy_packet.energy_amount
        )

    def test_extract_energy_determines_quality(self):
        """Test energy quality improves with harmonization history"""
        harmonizer = ParadoxHarmonizer()
        paradox_id = harmonizer.register_paradox(
            name="Quality Test",
            statement_a="A",
            statement_b="B",
            paradox_type=ParadoxType.PARADOX,
        )

        # Extract before harmonization (chaotic quality)
        packet1 = harmonizer.extract_paradox_energy(paradox_id)

        # Harmonize multiple times
        for _ in range(3):
            harmonizer.harmonize_paradox(paradox_id)

        # Extract after harmonization (better quality)
        packet2 = harmonizer.extract_paradox_energy(paradox_id)

        # Quality should improve (but chaotic -> coherent -> pure progression)
        quality_order = ["chaotic", "coherent", "pure"]
        assert quality_order.index(packet2.quality) >= quality_order.index(packet1.quality)

    def test_extract_energy_identifies_consumers(self):
        """Test energy identifies consumer systems"""
        harmonizer = ParadoxHarmonizer()
        paradox_id = harmonizer.register_paradox(
            name="Consumer Test",
            statement_a="A",
            statement_b="B",
            paradox_type=ParadoxType.PARADOX,
        )
        energy_packet = harmonizer.extract_paradox_energy(paradox_id)
        assert len(energy_packet.usable_for) > 0
        # Should be federation system names
        for consumer in energy_packet.usable_for:
            assert "_" in consumer or "brain" in consumer

    def test_extract_nonexistent_paradox_raises_error(self):
        """Test extracting energy from nonexistent paradox raises error"""
        harmonizer = ParadoxHarmonizer()
        with pytest.raises(ValueError):
            harmonizer.extract_paradox_energy("invalid_id")

    def test_multiple_extractions_from_single_paradox(self):
        """Test multiple energy extractions from one paradox"""
        harmonizer = ParadoxHarmonizer()
        paradox_id = harmonizer.register_paradox(
            name="Multi Extract",
            statement_a="A",
            statement_b="B",
            paradox_type=ParadoxType.CONTRADICTION,
        )

        packet1 = harmonizer.extract_paradox_energy(paradox_id)
        # Harmonize to increase energy
        harmonizer.harmonize_paradox(paradox_id)
        packet2 = harmonizer.extract_paradox_energy(paradox_id)

        assert len(harmonizer.energy_packets) == 2
        assert packet1.energy_id != packet2.energy_id
        # Second extraction might have more energy due to harmonization
        assert packet2.energy_amount >= packet1.energy_amount


class TestParadoxStatus:
    """Test paradox status reporting"""

    def test_get_paradox_status_returns_dict(self):
        """Test status method returns comprehensive dict"""
        harmonizer = ParadoxHarmonizer()
        status = harmonizer.get_paradox_status()
        assert isinstance(status, dict)
        assert "total_paradoxes" in status
        assert "federation_coherence" in status

    def test_status_reports_zero_state(self):
        """Test status reports zero when no paradoxes"""
        harmonizer = ParadoxHarmonizer()
        status = harmonizer.get_paradox_status()
        assert status["total_paradoxes"] == 0
        assert status["total_registered"] == 0
        assert status["harmonized_count"] == 0
        assert status["total_harmonizations"] == 0

    def test_status_reports_registered_paradoxes(self):
        """Test status correctly counts registered paradoxes"""
        harmonizer = ParadoxHarmonizer()
        harmonizer.register_paradox("P1", "A", "B", ParadoxType.CONTRADICTION)
        harmonizer.register_paradox("P2", "C", "D", ParadoxType.PARADOX)
        harmonizer.register_paradox("P3", "E", "F", ParadoxType.KOANS)

        status = harmonizer.get_paradox_status()
        assert status["total_paradoxes"] == 3
        assert status["total_registered"] == 3

    def test_status_reports_harmonization_stats(self):
        """Test status reports harmonization statistics"""
        harmonizer = ParadoxHarmonizer()
        paradox_id = harmonizer.register_paradox(
            "Test", "A", "B", ParadoxType.CONTRADICTION
        )
        harmonizer.harmonize_paradox(paradox_id)
        harmonizer.harmonize_paradox(paradox_id)

        status = harmonizer.get_paradox_status()
        assert status["harmonized_count"] == 1
        assert status["total_harmonizations"] == 2

    def test_status_includes_type_distribution(self):
        """Test status includes paradox type distribution"""
        harmonizer = ParadoxHarmonizer()
        harmonizer.register_paradox("P1", "A", "B", ParadoxType.CONTRADICTION)
        harmonizer.register_paradox("P2", "C", "D", ParadoxType.PARADOX)
        harmonizer.register_paradox("P3", "E", "F", ParadoxType.PARADOX)

        status = harmonizer.get_paradox_status()
        assert "type_distribution" in status
        assert status["type_distribution"]["contradiction"] == 1
        assert status["type_distribution"]["paradox"] == 2

    def test_status_includes_active_paradoxes_list(self):
        """Test status includes list of active paradoxes"""
        harmonizer = ParadoxHarmonizer()
        for i in range(5):
            harmonizer.register_paradox(
                f"P{i}", f"A{i}", f"B{i}", ParadoxType.CONTRADICTION
            )

        status = harmonizer.get_paradox_status()
        assert "active_paradoxes" in status
        assert len(status["active_paradoxes"]) <= 10  # Top 10
        for p in status["active_paradoxes"]:
            assert "id" in p
            assert "name" in p
            assert "type" in p

    def test_status_energy_metrics(self):
        """Test status includes energy metrics"""
        harmonizer = ParadoxHarmonizer()
        paradox_id = harmonizer.register_paradox(
            "Energy Test", "A", "B", ParadoxType.PARADOX
        )
        harmonizer.extract_paradox_energy(paradox_id)

        status = harmonizer.get_paradox_status()
        assert "total_energy_extracted" in status
        assert "available_energy_potential" in status
        assert status["total_energy_extracted"] > 0

    def test_status_coherence_and_gain(self):
        """Test status includes federation coherence and optimization gain"""
        harmonizer = ParadoxHarmonizer()
        status = harmonizer.get_paradox_status()
        assert "federation_coherence" in status
        assert "optimization_gain" in status
        assert 0.0 <= status["federation_coherence"] <= 1.0
        assert status["optimization_gain"] >= 1.0


class TestIntegration:
    """Integration tests across full workflow"""

    def test_full_paradox_workflow(self):
        """Test complete paradox registration -> scoring -> harmonization -> energy extraction"""
        harmonizer = ParadoxHarmonizer()

        # Register
        paradox_id = harmonizer.register_paradox(
            name="Wave-Particle Duality",
            statement_a="Light is a wave",
            statement_b="Light is a particle",
            paradox_type=ParadoxType.DUAL_TRUTH,
            severity_estimate=0.85,
        )
        assert paradox_id in harmonizer.paradoxes

        # Score
        score = harmonizer.score_paradox(paradox_id)
        assert 0.0 <= score <= 1.0

        # Harmonize
        result = harmonizer.harmonize_paradox(paradox_id)
        assert result["success"]
        assert harmonizer.paradoxes[paradox_id].harmonization_count == 1

        # Extract energy
        energy = harmonizer.extract_paradox_energy(paradox_id)
        assert energy.energy_amount > 0

        # Verify state
        status = harmonizer.get_paradox_status()
        assert status["total_paradoxes"] == 1
        assert status["total_harmonizations"] == 1
        assert status["energy_packets_created"] == 1

    def test_multiple_paradox_ecosystem(self):
        """Test ecosystem of multiple paradoxes interacting"""
        harmonizer = ParadoxHarmonizer()

        # Create diverse paradoxes
        ids = []
        for ptype in [
            ParadoxType.CONTRADICTION,
            ParadoxType.PARADOX,
            ParadoxType.KOANS,
            ParadoxType.DUAL_TRUTH,
        ]:
            pid = harmonizer.register_paradox(
                f"Paradox {ptype.value}",
                f"Statement A for {ptype.value}",
                f"Statement B for {ptype.value}",
                ptype,
                severity_estimate=0.6,
            )
            ids.append(pid)

        # Score all
        scores = [harmonizer.score_paradox(pid) for pid in ids]
        assert len(scores) == 4
        assert all(0.0 <= s <= 1.0 for s in scores)

        # Harmonize all
        for pid in ids:
            harmonizer.harmonize_paradox(pid)

        # Extract energy from all
        for pid in ids:
            harmonizer.extract_paradox_energy(pid)

        # Verify ecosystem state
        status = harmonizer.get_paradox_status()
        assert status["total_paradoxes"] == 4
        assert status["harmonized_count"] == 4
        assert status["total_harmonizations"] == 4
        assert status["energy_packets_created"] == 4
        assert status["federation_coherence"] > 1.0  # Improved from initial 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
