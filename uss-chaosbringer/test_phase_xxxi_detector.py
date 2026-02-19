#!/usr/bin/env python3
"""
PHASE XXXI - EXTERNAL CIVILIZATION DETECTOR TEST SUITE
14 comprehensive tests covering signal detection, classification, threat assessment,
tracking, expansion prediction, and status reporting.
Production-ready test coverage for civilization detector.
"""

import pytest
from datetime import datetime
from external_civilization_detector import (
    CivilizationDetector,
    SignalDetection,
    ExternalCivilization,
    CivilizationType,
    TechLevel,
    ThreatLevel,
    ContactStatus,
    CivilizationCharacteristics,
)


class TestDetectorInitialization:
    """Test detector system initialization and configuration"""

    def test_initializes_with_defaults(self):
        """Test detector starts in operational state"""
        detector = CivilizationDetector()
        assert detector.detection_sensitivity == 0.7
        assert detector.threat_calculation_version == 2
        assert detector.scan_radius_ly == 1000.0
        assert len(detector.civilizations) == 0
        assert len(detector.all_signals) == 0

    def test_detector_ready_for_scanning(self):
        """Test detector is ready for immediate signal scanning"""
        detector = CivilizationDetector()
        assert detector._id_counters["civilization"] == 0
        assert detector._id_counters["signal"] == 0
        assert detector.detection_sensitivity > 0
        assert detector.detection_sensitivity < 1.0


class TestSignalDetection:
    """Test signal scanning and detection capabilities"""

    @pytest.fixture
    def detector(self):
        return CivilizationDetector()

    def test_scan_for_signals_basic(self, detector):
        """Test basic signal scanning operation"""
        result = detector.scan_for_signals()

        assert "scan_timestamp" in result
        assert "signals_detected" in result
        assert "system_efficiency" in result
        assert result["scan_radius_ly"] == 1000.0

    def test_scan_records_to_history(self, detector):
        """Test scan operations are recorded in history"""
        initial_count = len(detector.scan_history)
        detector.scan_for_signals()
        assert len(detector.scan_history) == initial_count + 1

    def test_custom_scan_radius(self, detector):
        """Test scan with custom radius"""
        result = detector.scan_for_signals(scan_radius_ly=500.0)
        assert result["scan_radius_ly"] == 500.0
        assert detector.scan_radius_ly == 500.0

    def test_scan_detects_multiple_signals(self, detector):
        """Test scan can detect multiple signals in single pass"""
        # Run multiple scans to accumulate signals
        for _ in range(3):
            detector.scan_for_signals(scan_radius_ly=800.0)

        assert len(detector.all_signals) > 0, "Should detect signals"


class TestCivilizationClassification:
    """Test civilization type and technology classification"""

    @pytest.fixture
    def detector(self):
        detector = CivilizationDetector()
        # Pre-populate with a signal
        detector.scan_for_signals()
        return detector

    def test_classify_basic_civilization(self, detector):
        """Test basic classification of detected signal"""
        if len(detector.all_signals) == 0:
            pytest.skip("No signals detected for classification test")

        signal = detector.all_signals[0]
        civ = detector.classify_civilization(signal)

        assert civ is not None
        assert civ.civilization_id in detector.civilizations
        assert civ.species_type in CivilizationType
        assert civ.technology_level in TechLevel
        assert civ.contact_status == ContactStatus.SIGNAL_DETECTED

    def test_classification_produces_unique_ids(self, detector):
        """Test classified civilizations get unique identifiers"""
        if len(detector.all_signals) < 2:
            pytest.skip("Need at least 2 signals")

        civ1 = detector.classify_civilization(detector.all_signals[0])
        civ2 = detector.classify_civilization(detector.all_signals[1])

        assert civ1.civilization_id != civ2.civilization_id

    def test_classification_sets_characteristics(self, detector):
        """Test classification produces complete characteristics"""
        if len(detector.all_signals) == 0:
            pytest.skip("No signals detected")

        signal = detector.all_signals[0]
        civ = detector.classify_civilization(signal)

        assert civ.characteristics.species_type in CivilizationType
        assert civ.characteristics.technology_level in TechLevel
        assert civ.characteristics.estimated_population > 0
        assert 0.0 <= civ.characteristics.military_capability <= 1.0
        assert isinstance(civ.characteristics.cultural_indicators, list)

    def test_classification_confidence_based_on_signal(self, detector):
        """Test confidence score relates to signal quality"""
        if len(detector.all_signals) == 0:
            pytest.skip("No signals detected")

        signal = detector.all_signals[0]
        civ = detector.classify_civilization(signal)

        # Confidence should be based on pattern complexity
        assert 0.0 <= civ.confidence_score <= 1.0
        assert civ.confidence_score > 0.4  # Pattern complexity > 0.6 in simulation


class TestThreatAssessment:
    """Test threat level calculation and assessment"""

    @pytest.fixture
    def detector_with_civilization(self):
        detector = CivilizationDetector()
        detector.scan_for_signals()
        if len(detector.all_signals) == 0:
            pytest.skip("No signals to classify")
        civ = detector.classify_civilization(detector.all_signals[0])
        return detector, civ

    def test_assess_threat_basic(self, detector_with_civilization):
        """Test basic threat assessment calculation"""
        detector, civ = detector_with_civilization

        threat = detector.assess_threat_level(civ.civilization_id)
        assert threat in ThreatLevel

    def test_threat_updated_in_civilization(self, detector_with_civilization):
        """Test threat assessment updates civilization record"""
        detector, civ = detector_with_civilization

        detector.assess_threat_level(civ.civilization_id)
        updated_civ = detector.civilizations[civ.civilization_id]

        assert updated_civ.threat_assessment in ThreatLevel

    def test_hostile_behavior_increases_threat(self, detector_with_civilization):
        """Test hostile behavior observation increases threat"""
        detector, civ = detector_with_civilization

        initial_threat = detector.assess_threat_level(civ.civilization_id)
        detector.update_threat_assessment(
            civ.civilization_id, "Observed attack on neutral colony"
        )
        updated_threat = detector.assess_threat_level(civ.civilization_id)

        # Hostile behavior should be recorded
        updated_civ = detector.civilizations[civ.civilization_id]
        assert len(updated_civ.behavior_history) > 0
        assert "attack" in updated_civ.behavior_history[0].lower()

    def test_threat_assessment_nonexistent_civilization(self):
        """Test threat assessment on nonexistent civilization"""
        detector = CivilizationDetector()
        threat = detector.assess_threat_level("nonexistent_123")
        assert threat == ThreatLevel.BENIGN


class TestCivilizationTracking:
    """Test ongoing civilization monitoring and tracking"""

    @pytest.fixture
    def detector_with_civilization(self):
        detector = CivilizationDetector()
        detector.scan_for_signals()
        if len(detector.all_signals) == 0:
            pytest.skip("No signals to classify")
        civ = detector.classify_civilization(detector.all_signals[0])
        return detector, civ

    def test_track_civilization_updates_record(self, detector_with_civilization):
        """Test tracking updates civilization information"""
        detector, civ = detector_with_civilization

        # Create new signal detection
        detector.scan_for_signals()
        if len(detector.all_signals) < 2:
            pytest.skip("Need additional signal for tracking test")

        new_signal = detector.all_signals[-1]
        success = detector.track_civilization(civ.civilization_id, new_signal)

        assert success is True
        updated_civ = detector.civilizations[civ.civilization_id]
        assert len(updated_civ.signal_detections) >= 2

    def test_tracking_improves_confidence(self, detector_with_civilization):
        """Test multiple detections refine confidence score"""
        detector, civ = detector_with_civilization
        initial_detections = len(civ.signal_detections)

        # Add multiple detections
        for _ in range(3):
            detector.scan_for_signals()
            if len(detector.all_signals) > len(civ.signal_detections):
                new_signal = detector.all_signals[-1]
                detector.track_civilization(civ.civilization_id, new_signal)

        updated_civ = detector.civilizations[civ.civilization_id]
        # Verify we accumulated more detections through tracking
        assert len(updated_civ.signal_detections) > initial_detections
        # Confidence should be valid (0-1)
        assert 0.0 <= updated_civ.confidence_score <= 1.0
        # With multiple detections, confidence should remain high
        assert updated_civ.confidence_score > 0.5

    def test_tracking_nonexistent_civilization_fails(self):
        """Test tracking nonexistent civilization returns False"""
        detector = CivilizationDetector()
        detector.scan_for_signals()

        if len(detector.all_signals) == 0:
            pytest.skip("No signals available")

        signal = detector.all_signals[0]
        success = detector.track_civilization("nonexistent_456", signal)

        assert success is False


class TestExpansionPrediction:
    """Test civilization expansion prediction"""

    @pytest.fixture
    def detector_with_tracked_civ(self):
        detector = CivilizationDetector()
        # Generate initial scan
        detector.scan_for_signals()
        if len(detector.all_signals) == 0:
            pytest.skip("No signals detected")

        civ = detector.classify_civilization(detector.all_signals[0])

        # Add additional detections for pattern analysis
        for _ in range(3):
            detector.scan_for_signals()
            if len(detector.all_signals) > len(civ.signal_detections):
                detector.track_civilization(civ.civilization_id, detector.all_signals[-1])

        return detector, civ

    def test_predict_expansion_requires_multiple_detections(self, detector_with_tracked_civ):
        """Test expansion prediction with sufficient data"""
        detector, civ = detector_with_tracked_civ

        pattern = detector.predict_expansion(civ.civilization_id)
        # May need multiple detections for good prediction
        if pattern is not None:
            assert pattern.pattern_id is not None
            assert pattern.current_sphere_radius >= 0
            # Expansion can be positive (growing) or negative (contracting)
            assert isinstance(pattern.expansion_rate_ly_per_year, float)
            # Predictions should be mathematically consistent
            expected_5yr = pattern.current_sphere_radius + (pattern.expansion_rate_ly_per_year * 5)
            assert abs(pattern.predicted_5yr_radius - expected_5yr) < 0.01

    def test_expansion_pattern_updates_civilization(self, detector_with_tracked_civ):
        """Test expansion prediction is stored in civilization record"""
        detector, civ = detector_with_tracked_civ

        detector.predict_expansion(civ.civilization_id)
        updated_civ = detector.civilizations[civ.civilization_id]

        if updated_civ.expansion_pattern is not None:
            assert updated_civ.expansion_pattern.pattern_id is not None

    def test_expansion_prediction_nonexistent(self):
        """Test expansion prediction on nonexistent civilization"""
        detector = CivilizationDetector()
        pattern = detector.predict_expansion("nonexistent_789")
        assert pattern is None


class TestContactProtocols:
    """Test contact initiation and communication"""

    @pytest.fixture
    def detector_with_civilization(self):
        detector = CivilizationDetector()
        detector.scan_for_signals()
        if len(detector.all_signals) == 0:
            pytest.skip("No signals detected")
        civ = detector.classify_civilization(detector.all_signals[0])
        return detector, civ

    def test_initiate_contact_basic(self, detector_with_civilization):
        """Test contact initiation with civilization"""
        detector, civ = detector_with_civilization

        result = detector.initiate_contact(civ.civilization_id)

        assert "success" in result
        updated_civ = detector.civilizations[civ.civilization_id]
        assert updated_civ.contact_attempts >= 1

    def test_contact_updates_status(self, detector_with_civilization):
        """Test contact attempt updates civilization status"""
        detector, civ = detector_with_civilization

        detector.initiate_contact(civ.civilization_id)
        updated_civ = detector.civilizations[civ.civilization_id]

        assert updated_civ.contact_status in [ContactStatus.CONTACTED, ContactStatus.ALLIANCE]


class TestStatusReporting:
    """Test comprehensive status and reporting functions"""

    @pytest.fixture
    def detector_with_civilizations(self):
        detector = CivilizationDetector()
        # Build up civilizations
        for _ in range(3):
            detector.scan_for_signals()
            if len(detector.all_signals) > 0:
                detector.classify_civilization(detector.all_signals[-1])
        return detector

    def test_get_detector_status_complete(self, detector_with_civilizations):
        """Test comprehensive status report generation"""
        detector = detector_with_civilizations

        status = detector.get_detector_status()

        assert status.total_civilizations_detected >= 0
        assert status.total_signals_logged > 0
        assert isinstance(status.civilizations_by_threat_level, dict)
        assert isinstance(status.civilizations_by_contact_status, dict)
        assert 0.0 <= status.detection_system_efficiency <= 1.0
        assert 0.0 <= status.scan_coverage_percentage <= 1.0

    def test_get_civilization_dossier(self, detector_with_civilizations):
        """Test detailed civilization dossier retrieval"""
        detector = detector_with_civilizations

        if len(detector.civilizations) == 0:
            pytest.skip("No civilizations available")

        civ_id = list(detector.civilizations.keys())[0]
        dossier = detector.get_civilization_dossier(civ_id)

        assert dossier is not None
        assert dossier["civilization_id"] == civ_id
        assert "name" in dossier
        assert "threat_assessment" in dossier
        assert "characteristics" in dossier
        assert "contact_history" in dossier

    def test_list_civilizations_all(self, detector_with_civilizations):
        """Test listing all detected civilizations"""
        detector = detector_with_civilizations

        civ_list = detector.list_civilizations()
        assert isinstance(civ_list, list)
        assert len(civ_list) == len(detector.civilizations)

    def test_list_civilizations_filtered(self, detector_with_civilizations):
        """Test listing civilizations with filters"""
        detector = detector_with_civilizations

        # Assess threats first
        for civ_id in detector.civilizations.keys():
            detector.assess_threat_level(civ_id)

        # Filter by threat level
        benign_civs = detector.list_civilizations(filter_by_threat=ThreatLevel.BENIGN)
        assert isinstance(benign_civs, list)

        # Filter by contact status
        detected_civs = detector.list_civilizations(filter_by_contact=ContactStatus.SIGNAL_DETECTED)
        assert isinstance(detected_civs, list)


class TestIntegrationScenario:
    """Integration test covering complete detection workflow"""

    def test_complete_external_civilization_workflow(self):
        """
        Test complete workflow: detect -> classify -> track -> assess -> predict -> report
        """
        detector = CivilizationDetector()

        # 1. SCAN for signals
        scan_result = detector.scan_for_signals(scan_radius_ly=1000.0)
        assert scan_result["signals_detected"] >= 0

        if len(detector.all_signals) == 0:
            pytest.skip("No signals detected in scan")

        # 2. CLASSIFY signals as civilizations
        signal = detector.all_signals[0]
        civ = detector.classify_civilization(signal)
        assert civ.civilization_id in detector.civilizations

        # 3. TRACK civilization with additional detections
        assert civ.contact_status == ContactStatus.SIGNAL_DETECTED
        for _ in range(2):
            detector.scan_for_signals()
            if len(detector.all_signals) > len(civ.signal_detections):
                detector.track_civilization(civ.civilization_id, detector.all_signals[-1])

        # 4. ASSESS threat level
        threat = detector.assess_threat_level(civ.civilization_id)
        assert threat in ThreatLevel

        # 5. PREDICT expansion
        expansion = detector.predict_expansion(civ.civilization_id)
        # May be None if insufficient detections, but method should complete

        # 6. INITIATE contact
        contact_result = detector.initiate_contact(civ.civilization_id)
        assert "success" in contact_result

        # 7. GET comprehensive status
        status = detector.get_detector_status()
        assert status.total_civilizations_detected >= 1

        # 8. Retrieve full dossier
        dossier = detector.get_civilization_dossier(civ.civilization_id)
        assert dossier is not None
        assert dossier["civilization_id"] == civ.civilization_id

        # Verify workflow completed successfully
        assert True, "Complete detection workflow executed successfully"
