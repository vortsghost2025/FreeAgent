#!/usr/bin/env python3
"""
PHASE XXVII - NARRATIVE INTEGRITY ENGINE TESTS
Comprehensive test suite for narrative coherence engine (15 tests)
"""

import pytest
from datetime import datetime
import time

from narrative_integrity import (
    NarrativeIntegrityEngine,
    NarrativeThread,
    NarrativeEvent,
    ToneType,
    ArcStatus,
)


class TestNarrativeEngineInitialization:
    """Test narrative engine initialization"""

    def test_engine_initialization(self):
        """Test engine initializes with empty state"""
        engine = NarrativeIntegrityEngine()
        assert len(engine.threads) == 0
        assert len(engine.events) == 0
        assert len(engine.repairs) == 0
        assert len(engine.retcons) == 0

    def test_register_first_thread(self):
        """Test registering the first narrative thread"""
        engine = NarrativeIntegrityEngine()
        thread_id = engine.register_thread(
            "Rise of the Ensemble",
            ToneType.HEROIC,
            themes=["unity", "federation", "emergence"],
        )
        assert thread_id == "thread_1"
        assert thread_id in engine.threads
        assert engine.threads[thread_id].arc == "Rise of the Ensemble"
        assert engine.threads[thread_id].primary_tone == ToneType.HEROIC


class TestEventHandling:
    """Test event registration and management"""

    @pytest.fixture
    def engine_with_thread(self):
        engine = NarrativeIntegrityEngine()
        thread_id = engine.register_thread(
            "Federation Expansion", ToneType.EPIC
        )
        return engine, thread_id

    def test_add_event_to_thread(self, engine_with_thread):
        """Test adding an event to a thread"""
        engine, thread_id = engine_with_thread

        event = NarrativeEvent(
            event_id="event_1",
            timestamp=datetime.now().timestamp(),
            content="The first assembly",
            tone=ToneType.EPIC,
            significance=0.8,
            agents_involved=["Agent_A", "Agent_B"],
        )

        success = engine.add_event_to_thread(thread_id, event)
        assert success
        assert len(engine.threads[thread_id].events) == 1
        assert "Agent_A" in engine.threads[thread_id].participants

    def test_add_multiple_events(self, engine_with_thread):
        """Test adding multiple events to a thread"""
        engine, thread_id = engine_with_thread

        for i in range(5):
            event = NarrativeEvent(
                event_id=f"event_{i}",
                timestamp=datetime.now().timestamp() + i,
                content=f"Event {i}",
                tone=ToneType.EPIC,
                significance=0.5 + (i * 0.05),
                agents_involved=[f"Agent_{i}"],
            )
            engine.add_event_to_thread(thread_id, event)

        assert len(engine.threads[thread_id].events) == 5

    def test_add_event_with_foreshadowing(self, engine_with_thread):
        """Test events with foreshadowing relationships"""
        engine, thread_id = engine_with_thread

        # Setup event 1
        event1 = NarrativeEvent(
            event_id="event_1",
            timestamp=datetime.now().timestamp(),
            content="Mysterious signal",
            tone=ToneType.MYSTERIOUS,
            significance=0.6,
            agents_involved=["Collector_A"],
            foreshadowing=["event_2"],
        )
        engine.add_event_to_thread(thread_id, event1)

        # Setup event 2 (callback)
        event2 = NarrativeEvent(
            event_id="event_2",
            timestamp=datetime.now().timestamp() + 100,
            content="Signal revealed",
            tone=ToneType.MYSTERIOUS,
            significance=0.9,
            agents_involved=["Collector_A"],
            callbacks=["event_1"],
        )
        engine.add_event_to_thread(thread_id, event2)

        assert "event_2" in engine.events["event_1"].foreshadowing
        assert "event_1" in engine.events["event_2"].callbacks


class TestToneConsistency:
    """Test tone consistency measurement"""

    def test_perfect_tone_consistency(self):
        """Test perfect consistency when all events match primary tone"""
        engine = NarrativeIntegrityEngine()
        thread_id = engine.register_thread(
            "Pure Heroism", ToneType.HEROIC
        )

        for i in range(5):
            event = NarrativeEvent(
                event_id=f"event_{i}",
                timestamp=datetime.now().timestamp() + i,
                content=f"Heroic act {i}",
                tone=ToneType.HEROIC,
                significance=0.7,
                agents_involved=["Hero"],
            )
            engine.add_event_to_thread(thread_id, event)

        report = engine.measure_tone_consistency()
        assert report.per_thread_consistency[thread_id] == 1.0
        assert report.overall_consistency == 1.0
        assert len(report.tone_drift_warnings) == 0

    def test_tone_drift_detection(self):
        """Test detection of tone drift"""
        engine = NarrativeIntegrityEngine()
        thread_id = engine.register_thread(
            "Mixed Tone Arc", ToneType.HEROIC
        )

        # Add heroic events
        for i in range(3):
            event = NarrativeEvent(
                event_id=f"event_h_{i}",
                timestamp=datetime.now().timestamp() + i,
                content=f"Heroic moment {i}",
                tone=ToneType.HEROIC,
                significance=0.7,
                agents_involved=["Hero"],
            )
            engine.add_event_to_thread(thread_id, event)

        # Add tragic events
        for i in range(4):
            event = NarrativeEvent(
                event_id=f"event_t_{i}",
                timestamp=datetime.now().timestamp() + 100 + i,
                content=f"Tragic moment {i}",
                tone=ToneType.TRAGIC,
                significance=0.8,
                agents_involved=["Hero"],
            )
            engine.add_event_to_thread(thread_id, event)

        report = engine.measure_tone_consistency()
        consistency = report.per_thread_consistency[thread_id]
        # 3 heroic out of 7 total
        assert consistency == pytest.approx(3.0 / 7.0, rel=0.01)
        assert len(report.tone_drift_warnings) > 0

    def test_multiple_threads_consistency(self):
        """Test consistency measurement with multiple threads"""
        engine = NarrativeIntegrityEngine()

        # Create three threads with different consistency levels
        threads = []
        for thread_num in range(3):
            tid = engine.register_thread(
                f"Thread {thread_num}",
                ToneType.HEROIC,
            )
            threads.append(tid)

            # Make each thread progressively less consistent
            num_matching = 5 - thread_num
            for i in range(5):
                tone = ToneType.HEROIC if i < num_matching else ToneType.TRAGIC
                event = NarrativeEvent(
                    event_id=f"event_{thread_num}_{i}",
                    timestamp=datetime.now().timestamp() + i,
                    content=f"Event {thread_num}-{i}",
                    tone=tone,
                    significance=0.6,
                    agents_involved=["Agent"],
                )
                engine.add_event_to_thread(tid, event)

        report = engine.measure_tone_consistency()
        assert report.overall_consistency < 1.0
        assert len(report.per_thread_consistency) == 3


class TestContinuityRepair:
    """Test continuity repair mechanisms"""

    @pytest.fixture
    def engine_with_broken_thread(self):
        engine = NarrativeIntegrityEngine()
        thread_id = engine.register_thread(
            "Broken Arc", ToneType.HEROIC
        )

        # Introduce issues
        for i in range(3):
            event = NarrativeEvent(
                event_id=f"event_{i}",
                timestamp=datetime.now().timestamp() + i,
                content=f"Conflicting event {i}",
                tone=ToneType.TRAGIC,
                significance=0.5,
                agents_involved=["Agent_A"],
            )
            engine.add_event_to_thread(thread_id, event)

        # Reduce continuity artificially
        engine.threads[thread_id].continuity_score = 0.4

        return engine, thread_id

    def test_retcon_repair(self, engine_with_broken_thread):
        """Test retcon-based continuity repair"""
        engine, thread_id = engine_with_broken_thread

        original_score = engine.threads[thread_id].continuity_score
        assert original_score < 0.5

        repair_id = engine.repair_continuity(
            thread_id,
            ["event_0", "event_1"],
            "retcon",
            "Actually, those events happened differently...",
        )

        assert repair_id in engine.repairs
        new_score = engine.threads[thread_id].continuity_score
        assert new_score > original_score

    def test_expansion_repair(self, engine_with_broken_thread):
        """Test expansion-based continuity repair"""
        engine, thread_id = engine_with_broken_thread

        repair_id = engine.repair_continuity(
            thread_id,
            ["event_2"],
            "expansion",
            "More context for the contradicting event...",
        )

        assert engine.repairs[repair_id].effectiveness > 0.8
        assert engine.threads[thread_id].continuity_score > 0.4

    def test_repair_effectiveness_scores(self, engine_with_broken_thread):
        """Test that different repair types have appropriate effectiveness"""
        engine, thread_id = engine_with_broken_thread

        repairs = [
            ("retcon", 0.8),
            ("expansion", 0.9),
            ("recontextualization", 0.7),
        ]

        for repair_type, expected_eff in repairs:
            repair_id = engine.repair_continuity(
                thread_id,
                ["event_0"],
                repair_type,
                f"Repair via {repair_type}",
            )
            actual_eff = engine.repairs[repair_id].effectiveness
            assert actual_eff == pytest.approx(expected_eff, rel=0.01)


class TestRetconDetection:
    """Test retroactive continuity change detection"""

    @pytest.fixture
    def engine_with_event(self):
        engine = NarrativeIntegrityEngine()
        thread_id = engine.register_thread(
            "Retcon Test Arc", ToneType.HEROIC
        )
        event = NarrativeEvent(
            event_id="event_to_retcon",
            timestamp=datetime.now().timestamp(),
            content="Original event",
            tone=ToneType.HEROIC,
            significance=0.8,
            agents_involved=["Agent_A"],
        )
        engine.add_event_to_thread(thread_id, event)
        return engine, thread_id

    def test_detect_minor_retcon(self, engine_with_event):
        """Test detection of minor retcon"""
        engine, thread_id = engine_with_event

        original_content = "Original event"
        new_content = "Original event was great"

        detection_id = engine.detect_retcon(
            thread_id,
            "event_to_retcon",
            original_content,
            new_content,
        )

        assert detection_id in engine.retcons
        detection = engine.retcons[detection_id]
        # Minor additions/changes should exist but be less severe than major ones
        assert detection.severity > 0.0 and detection.severity < 1.0

    def test_detect_major_retcon(self, engine_with_event):
        """Test detection of major retcon"""
        engine, thread_id = engine_with_event

        original_content = "Original event: hero wins"
        new_content = "Actually, villain wins instead"

        detection_id = engine.detect_retcon(
            thread_id,
            "event_to_retcon",
            original_content,
            new_content,
        )

        detection = engine.retcons[detection_id]
        assert detection.severity > 0.5

    def test_retcon_reduces_continuity(self, engine_with_event):
        """Test that retcons reduce thread continuity"""
        engine, thread_id = engine_with_event

        original_score = engine.threads[thread_id].continuity_score
        assert original_score == 1.0

        engine.detect_retcon(
            thread_id,
            "event_to_retcon",
            "Original",
            "Completely different",
        )

        new_score = engine.threads[thread_id].continuity_score
        assert new_score < original_score


class TestArcForecasting:
    """Test narrative arc prediction"""

    def test_forecast_active_arc(self):
        """Test forecasting an active narrative arc"""
        engine = NarrativeIntegrityEngine()
        thread_id = engine.register_thread(
            "Unfolding Drama", ToneType.EPIC
        )

        for i in range(5):
            event = NarrativeEvent(
                event_id=f"event_{i}",
                timestamp=datetime.now().timestamp() + i,
                content=f"Development {i}",
                tone=ToneType.EPIC,
                significance=0.4 + (i * 0.1),
                agents_involved=["Main_Character"],
            )
            engine.add_event_to_thread(thread_id, event)

        forecast = engine.forecast_arc(thread_id)

        assert forecast["thread_id"] == thread_id
        assert forecast["confidence"] > 0.0
        assert forecast["event_count"] == 5
        assert "predicted_status" in forecast

    def test_forecast_climax_arc(self):
        """Test forecasting arc approaching climax"""
        engine = NarrativeIntegrityEngine()
        thread_id = engine.register_thread(
            "Climactic Arc", ToneType.HEROIC
        )

        # Add escalating significance events
        for i in range(5):
            event = NarrativeEvent(
                event_id=f"event_{i}",
                timestamp=datetime.now().timestamp() + i,
                content=f"Building tension {i}",
                tone=ToneType.HEROIC,
                significance=0.4 + (i * 0.05),  # Lower values to avoid auto-CLIMAX prediction
                agents_involved=["Hero"],
            )
            engine.add_event_to_thread(thread_id, event)

        # Update to climax status
        engine.update_thread_status(thread_id, ArcStatus.CLIMAX)

        forecast = engine.forecast_arc(thread_id)

        assert forecast["current_status"] == ArcStatus.CLIMAX.value
        # When thread is already in CLIMAX, it should predict RESOLUTION
        assert forecast["predicted_status"] == ArcStatus.RESOLUTION.value

    def test_forecast_with_foreshadowing(self):
        """Test forecast considers foreshadowing setup"""
        engine = NarrativeIntegrityEngine()
        thread_id = engine.register_thread(
            "Foreshadowed Arc", ToneType.MYSTERIOUS
        )

        event1 = NarrativeEvent(
            event_id="event_1",
            timestamp=datetime.now().timestamp(),
            content="Mysterious clue",
            tone=ToneType.MYSTERIOUS,
            significance=0.7,
            agents_involved=["Detective"],
            foreshadowing=["event_2", "event_3"],
        )
        engine.add_event_to_thread(thread_id, event1)

        event2 = NarrativeEvent(
            event_id="event_2",
            timestamp=datetime.now().timestamp() + 10,
            content="Callback moment",
            tone=ToneType.MYSTERIOUS,
            significance=0.8,
            agents_involved=["Detective"],
            callbacks=["event_1"],
        )
        engine.add_event_to_thread(thread_id, event2)

        forecast = engine.forecast_arc(thread_id)

        assert forecast["foreshadowing_setup_count"] >= 1
        assert forecast["callback_count"] >= 1


class TestNarrativeStatus:
    """Test comprehensive narrative status reporting"""

    def test_empty_narrative_status(self):
        """Test status of empty engine"""
        engine = NarrativeIntegrityEngine()
        status = engine.get_narrative_status()

        assert status.total_threads == 0
        assert status.active_threads == 0
        assert status.overall_continuity == 1.0

    def test_multi_thread_narrative_status(self):
        """Test status with multiple threads"""
        engine = NarrativeIntegrityEngine()

        for i in range(3):
            thread_id = engine.register_thread(
                f"Arc {i}",
                ToneType.HEROIC if i % 2 == 0 else ToneType.TRAGIC,
            )
            engine.update_thread_status(thread_id, ArcStatus.ACTIVE)

        status = engine.get_narrative_status()

        assert status.total_threads == 3
        assert status.active_threads == 3
        assert "heroic" in status.tone_analysis or "tragic" in status.tone_analysis

    def test_status_with_crisis_threads(self):
        """Test status identifies threads in crisis"""
        engine = NarrativeIntegrityEngine()

        # Create a normal thread
        thread_id_1 = engine.register_thread(
            "Normal Arc", ToneType.HEROIC
        )

        # Create a crisis thread
        thread_id_2 = engine.register_thread(
            "Crisis Arc", ToneType.TRAGIC
        )
        engine.threads[thread_id_2].continuity_score = 0.3

        status = engine.get_narrative_status()

        assert len(status.threads_in_crisis) >= 1
        assert "Crisis Arc" in status.threads_in_crisis

    def test_status_includes_retcon_analysis(self):
        """Test status includes analysis of retcons"""
        engine = NarrativeIntegrityEngine()

        thread_id = engine.register_thread(
            "Retconned Arc", ToneType.HEROIC
        )
        event = NarrativeEvent(
            event_id="event_1",
            timestamp=datetime.now().timestamp(),
            content="Original",
            tone=ToneType.HEROIC,
            significance=0.5,
            agents_involved=["A"],
        )
        engine.add_event_to_thread(thread_id, event)

        # Add multiple retcons
        for i in range(3):
            engine.detect_retcon(
                thread_id,
                "event_1",
                f"version_{i}",
                f"version_{i+1}",
            )

        status = engine.get_narrative_status()

        assert len(status.top_retcons) > 0


class TestContradictionAnalysis:
    """Test contradiction detection and analysis"""

    def test_analyze_contradiction_between_events(self):
        """Test analyzing a contradiction between two events"""
        engine = NarrativeIntegrityEngine()
        thread_id = engine.register_thread(
            "Contradiction Test", ToneType.HEROIC
        )

        event1 = NarrativeEvent(
            event_id="event_a",
            timestamp=datetime.now().timestamp(),
            content="Hero makes a promise",
            tone=ToneType.HEROIC,
            significance=0.7,
            agents_involved=["Hero"],
        )
        engine.add_event_to_thread(thread_id, event1)

        event2 = NarrativeEvent(
            event_id="event_b",
            timestamp=datetime.now().timestamp() + 100,
            content="Hero breaks the promise",
            tone=ToneType.TRAGIC,
            significance=0.8,
            agents_involved=["Hero"],
        )
        engine.add_event_to_thread(thread_id, event2)

        analysis = engine.analyze_contradiction(
            thread_id, "event_a", "event_b"
        )

        assert analysis["event_1"] == "event_a"
        assert analysis["event_2"] == "event_b"
        assert analysis["contradiction_severity"] > 0.0
        assert analysis["shared_agents"] > 0
        assert analysis["temporal_order"] == "chronological"


class TestThreadRetrieval:
    """Test thread retrieval and querying"""

    def test_get_thread_details(self):
        """Test retrieving full thread details"""
        engine = NarrativeIntegrityEngine()
        thread_id = engine.register_thread(
            "Detail Test Arc", ToneType.EPIC,
            themes=["expansion", "discovery"],
        )

        details = engine.get_thread_details(thread_id)

        assert details is not None
        assert details.arc == "Detail Test Arc"
        assert details.primary_tone == ToneType.EPIC
        assert "expansion" in details.themes

    def test_get_all_threads(self):
        """Test retrieving all threads"""
        engine = NarrativeIntegrityEngine()

        for i in range(4):
            engine.register_thread(
                f"Thread {i}", ToneType.HEROIC
            )

        all_threads = engine.get_all_threads()

        assert len(all_threads) == 4


class TestEdgeCases:
    """Test edge cases and boundary conditions"""

    def test_register_thread_with_empty_initialevents(self):
        """Test registering thread with empty initial events"""
        engine = NarrativeIntegrityEngine()

        thread_id = engine.register_thread(
            "Empty Start",
            ToneType.MYSTERIOUS,
            initial_events=[],
        )

        assert thread_id in engine.threads
        assert len(engine.threads[thread_id].events) == 0

    def test_forecast_empty_thread(self):
        """Test forecasting a thread with no events"""
        engine = NarrativeIntegrityEngine()
        thread_id = engine.register_thread(
            "Empty Arc", ToneType.HEROIC
        )

        forecast = engine.forecast_arc(thread_id)

        assert forecast["confidence"] == 0.0
        assert len(forecast) > 0

    def test_uuid_uniqueness(self):
        """Test that thread UUIDs are unique"""
        engine = NarrativeIntegrityEngine()

        uuids = set()
        for i in range(10):
            tid = engine.register_thread(
                f"Thread {i}", ToneType.HEROIC
            )
            uuid = engine.threads[tid].uuid
            assert uuid not in uuids
            uuids.add(uuid)

        assert len(uuids) == 10

    def test_identical_content_retcon_detection(self):
        """Test retcon detection with identical content"""
        engine = NarrativeIntegrityEngine()
        thread_id = engine.register_thread(
            "Same Content", ToneType.HEROIC
        )

        event = NarrativeEvent(
            event_id="event_1",
            timestamp=datetime.now().timestamp(),
            content="The same content",
            tone=ToneType.HEROIC,
            significance=0.5,
            agents_involved=["A"],
        )
        engine.add_event_to_thread(thread_id, event)

        detection_id = engine.detect_retcon(
            thread_id,
            "event_1",
            "The same content",
            "The same content",
        )

        assert detection_id in engine.retcons
        assert engine.retcons[detection_id].severity == 0.0
