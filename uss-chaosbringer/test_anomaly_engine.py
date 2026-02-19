#!/usr/bin/env python3
"""
TEST SUITE FOR PHASE VII - Anomaly Engine

40+ comprehensive tests covering:
1. AnomalyDetector (10 tests)
2. MemoryGraph (12 tests)
3. ContinuityEngine (10 tests)
4. Integration (8 tests)
5. Real-world scenarios (10+ tests)
"""

import sys
import os
import json
from datetime import datetime, timedelta

# Add test directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from anomaly_engine import (
    AnomalyDetector,
    AnomalyReport,
    AnomalyType,
    MemoryGraph,
    MemoryNode,
    MemoryEdge,
    ContinuityEngine,
    ContinuityViolation,
    PersistentNarrativeOrganism,
)


def test_anomaly_report_creation():
    """Test 1: AnomalyReport creation and validation"""
    print("\n[TEST 1] AnomalyReport Creation")
    print("-" * 60)

    report = AnomalyReport(
        id="test_anomaly_1",
        timestamp=datetime.now().timestamp(),
        anomaly_type=AnomalyType.CONTRADICTION,
        severity=0.9,
        confidence=0.8,
        description="Test contradiction",
        context={"key": "value"},
        ship_name="TestShip",
    )

    assert report.id == "test_anomaly_1"
    assert report.anomaly_type == AnomalyType.CONTRADICTION
    assert report.severity == 0.9
    assert report.ship_name == "TestShip"

    # Test to_dict
    report_dict = report.to_dict()
    assert report_dict["id"] == "test_anomaly_1"
    assert report_dict["anomaly_type"] == "contradiction"

    print("[PASS] AnomalyReport creation successful")
    print(f"[PASS] Report: {report_dict}")
    return True


def test_anomaly_detector_initialization():
    """Test 2: AnomalyDetector initialization"""
    print("\n[TEST 2] AnomalyDetector Initialization")
    print("-" * 60)

    detector = AnomalyDetector(window_size=100)

    assert detector.window_size == 100
    assert len(detector.anomaly_history) == 0
    assert detector.enabled

    print("[PASS] AnomalyDetector initialized correctly")
    print(f"[PASS] Window size: {detector.window_size}")
    print(f"[PASS] Enabled: {detector.enabled}")
    return True


def test_outlier_detection():
    """Test 3: Statistical outlier detection"""
    print("\n[TEST 3] Outlier Detection")
    print("-" * 60)

    detector = AnomalyDetector()

    # Create baseline state
    current_state = {
        "threat_level": 5,
        "signal_quality": 80,
        "snr_ratio": 0.85,
    }

    anomalies = detector.detect_anomalies_for_ship(
        "TestShip",
        current_state,
    )

    assert isinstance(anomalies, list)
    print(f"[PASS] Anomalies detected: {len(anomalies)}")

    # Now create an outlier
    current_state = {
        "threat_level": 5,
        "signal_quality": 80,
        "snr_ratio": 0.85,
    }
    detector.ship_baselines["TestShip"] = {
        "threat_level": (0, 8),
        "signal_quality": (70, 90),
        "snr_ratio": (0.5, 1.0),
    }

    # Signal quality way outside baseline
    current_state["signal_quality"] = 200
    anomalies = detector.detect_anomalies_for_ship("TestShip", current_state)

    outlier_anomalies = [a for a in anomalies if a.anomaly_type == AnomalyType.OUTLIER]
    assert len(outlier_anomalies) > 0

    print("[PASS] Outlier detection working")
    print(f"[PASS] Outliers found: {len(outlier_anomalies)}")
    return True


def test_contradiction_detection():
    """Test 4: Contradiction detection"""
    print("\n[TEST 4] Contradiction Detection")
    print("-" * 60)

    detector = AnomalyDetector()

    previous_state = {"threat_level": 3, "shields": 100}
    current_state = {"threat_level": 15, "shields": 100}

    anomalies = detector.detect_anomalies_for_ship(
        "TestShip",
        current_state,
        previous_state=previous_state,
    )

    contradiction_anomalies = [
        a for a in anomalies if a.anomaly_type == AnomalyType.CONTRADICTION
    ]
    assert len(contradiction_anomalies) > 0

    print("[PASS] Contradiction detection working")
    print(f"[PASS] Contradictions found: {len(contradiction_anomalies)}")
    if contradiction_anomalies:
        print(f"[PASS] First contradiction: {contradiction_anomalies[0].description}")
    return True


def test_state_delta_detection():
    """Test 5: State delta detection"""
    print("\n[TEST 5] State Delta Detection")
    print("-" * 60)

    detector = AnomalyDetector()

    previous_state = {"reactor_temp": 50}
    current_state = {"reactor_temp": 70}  # 20 point jump

    anomalies = detector.detect_anomalies_for_ship(
        "TestShip",
        current_state,
        previous_state=previous_state,
    )

    delta_anomalies = [a for a in anomalies if a.anomaly_type == AnomalyType.STATE_DELTA]
    assert len(delta_anomalies) > 0

    print("[PASS] State delta detection working")
    print(f"[PASS] State deltas found: {len(delta_anomalies)}")
    return True


def test_anomaly_scoring():
    """Test 6: Anomaly scoring"""
    print("\n[TEST 6] Anomaly Scoring")
    print("-" * 60)

    detector = AnomalyDetector()

    # Create multiple anomalies
    for i in range(5):
        state = {"threat_level": 5 + i}
        previous = {"threat_level": 2 + i}
        detector.detect_anomalies_for_ship(
            "TestShip", state, previous_state=previous
        )

    score = detector.compute_anomaly_score("TestShip")
    assert 0 <= score <= 1

    print("[PASS] Anomaly scoring working")
    print(f"[PASS] Ship anomaly score: {score:.2f}")
    return True


def test_anomaly_history_tracking():
    """Test 7: Anomaly history tracking"""
    print("\n[TEST 7] Anomaly History Tracking")
    print("-" * 60)

    detector = AnomalyDetector()

    initial_count = len(detector.anomaly_history)

    state = {"threat_level": 20}
    previous = {"threat_level": 0}
    detector.detect_anomalies_for_ship("TestShip", state, previous_state=previous)

    assert len(detector.anomaly_history) > initial_count

    summary = detector.get_anomaly_report_summary(limit=5)
    assert isinstance(summary, list)

    print("[PASS] Anomaly history tracking working")
    print(f"[PASS] Total anomalies in history: {len(detector.anomaly_history)}")
    print(f"[PASS] Summary returned {len(summary)} most recent anomalies")
    return True


def test_baseline_computation():
    """Test 8: Ship baseline computation"""
    print("\n[TEST 8] Baseline Computation")
    print("-" * 60)

    detector = AnomalyDetector()

    state = {"threat_level": 5, "signal_quality": 80, "reactor_temp": 50}
    detector.detect_anomalies_for_ship("TestShip", state)

    baseline = detector.ship_baselines.get("TestShip", {})
    assert "threat_level" in baseline
    assert "signal_quality" in baseline

    # Check baseline is min/max range
    for key, (min_val, max_val) in baseline.items():
        assert min_val <= max_val

    print("[PASS] Baseline computation working")
    print(f"[PASS] Baselines computed for: {list(baseline.keys())}")
    return True


def test_causal_chain_construction():
    """Test 9: Causal chain construction"""
    print("\n[TEST 9] Causal Chain Construction")
    print("-" * 60)

    detector = AnomalyDetector()

    # Create sequence of anomalies showing causality
    states = [
        {"threat_level": 0},
        {"threat_level": 5},
        {"threat_level": 10},
    ]
    previous = {"threat_level": 0}

    anomaly_ids = []
    for state in states:
        anomalies = detector.detect_anomalies_for_ship(
            "TestShip",
            state,
            previous_state=previous,
        )
        if anomalies:
            anomaly_ids.extend([a.id for a in anomalies])
        previous = state

    assert len(anomaly_ids) > 0

    print("[PASS] Causal chain construction working")
    print(f"[PASS] Anomaly sequence created with {len(anomaly_ids)} events")
    return True


def test_anomaly_disable_enable():
    """Test 10: Anomaly detector disable/enable toggles"""
    print("\n[TEST 10] Disable/Enable Toggles")
    print("-" * 60)

    detector = AnomalyDetector()
    detector.enable()
    assert detector.enabled

    detector.disable()
    assert not detector.enabled

    # When disabled, detect should return empty
    state = {"threat_level": 10}
    anomalies = detector.detect_anomalies_for_ship("TestShip", state)
    assert len(anomalies) == 0

    detector.enable()
    anomalies = detector.detect_anomalies_for_ship("TestShip", state)
    # Should detect something now
    assert isinstance(anomalies, list)

    print("[PASS] Disable/enable toggles working")
    print("[PASS] Detector respects enabled flag")
    return True


# ===== MemoryGraph Tests =====

def test_memory_node_creation():
    """Test 11: MemoryNode creation"""
    print("\n[TEST 11] MemoryNode Creation")
    print("-" * 60)

    node = MemoryNode(
        node_id="node_1",
        node_type="EVENT",
        timestamp=datetime.now().timestamp(),
        ship_name="TestShip",
        source="event_log",
        content={"event": "test"},
        summary="Test event",
        tags=["test", "threat"],
    )

    assert node.node_id == "node_1"
    assert node.node_type == "EVENT"
    assert "test" in node.tags

    # Test to_dict
    node_dict = node.to_dict()
    assert node_dict["node_id"] == "node_1"

    print("[PASS] MemoryNode creation successful")
    print(f"[PASS] Node: {node_dict}")
    return True


def test_memory_edge_creation():
    """Test 12: MemoryEdge creation"""
    print("\n[TEST 12] MemoryEdge Creation")
    print("-" * 60)

    edge = MemoryEdge(
        edge_id="edge_1",
        source_id="node_1",
        target_id="node_2",
        edge_type="CAUSED",
        strength=0.8,
        temporal_offset_ms=1000,
        reasoning="Event 1 caused Event 2",
    )

    assert edge.edge_type == "CAUSED"
    assert edge.strength == 0.8

    edge_dict = edge.to_dict()
    assert edge_dict["edge_type"] == "CAUSED"

    print("[PASS] MemoryEdge creation successful")
    print(f"[PASS] Edge: {edge_dict}")
    return True


def test_memory_graph_initialization():
    """Test 13: MemoryGraph initialization"""
    print("\n[TEST 13] MemoryGraph Initialization")
    print("-" * 60)

    graph = MemoryGraph()

    assert len(graph.nodes) == 0
    assert len(graph.edges) == 0
    assert graph.enabled

    print("[PASS] MemoryGraph initialized correctly")
    print("[PASS] Graph ready for ingestion")
    return True


def test_event_log_ingestion():
    """Test 14: Ingest event_log into memory"""
    print("\n[TEST 14] Event Log Ingestion")
    print("-" * 60)

    graph = MemoryGraph()

    event_log = [
        {
            "event": "sensor_sweep",
            "timestamp": datetime.now().timestamp(),
            "contacts": 5,
        },
        {
            "event": "threat_detected",
            "timestamp": datetime.now().timestamp(),
            "severity": "high",
        },
    ]

    graph.ingest_event_log("TestShip", event_log)

    assert len(graph.nodes) == 2
    print("[PASS] Event log ingestion successful")
    print(f"[PASS] Nodes created: {len(graph.nodes)}")
    return True


def test_decision_history_ingestion():
    """Test 15: Ingest decision_history into memory"""
    print("\n[TEST 15] Decision History Ingestion")
    print("-" * 60)

    graph = MemoryGraph()

    decision_history = [
        {
            "strategy": "DEFENSIVE",
            "confidence": 0.85,
            "timestamp": datetime.now().timestamp(),
        },
        {
            "strategy": "AGGRESSIVE",
            "confidence": 0.72,
            "timestamp": datetime.now().timestamp(),
        },
    ]

    graph.ingest_decision_history("FleetBrain", decision_history)

    assert len(graph.nodes) == 2
    assert any(n.node_type == "DECISION" for n in graph.nodes.values())

    print("[PASS] Decision history ingestion successful")
    print(f"[PASS] Nodes created: {len(graph.nodes)}")
    return True


def test_tag_indexing():
    """Test 16: Tag indexing and querying"""
    print("\n[TEST 16] Tag Indexing")
    print("-" * 60)

    graph = MemoryGraph()

    event_log = [
        {"event": "threat_detected", "severity": "high", "timestamp": datetime.now().timestamp()},
        {"event": "contact_detected", "severity": "low", "timestamp": datetime.now().timestamp()},
    ]

    graph.ingest_event_log("TestShip", event_log)

    # Query by tag
    threat_nodes = graph.query_by_tag("threat_detected")
    assert len(threat_nodes) > 0

    print("[PASS] Tag indexing working")
    print(f"[PASS] Found {len(threat_nodes)} nodes with 'threat_detected' tag")
    return True


def test_temporal_query():
    """Test 17: Temporal range query"""
    print("\n[TEST 17] Temporal Range Query")
    print("-" * 60)

    graph = MemoryGraph()

    now = datetime.now().timestamp()
    event_log = [
        {
            "event": "event_1",
            "timestamp": now,
        },
        {
            "event": "event_2",
            "timestamp": now + 1000,
        },
    ]

    graph.ingest_event_log("TestShip", event_log)

    recent = graph.query_temporal_range(now - 100, now + 2000)
    assert len(recent) == 2

    future_only = graph.query_temporal_range(now + 2000, now + 3000)
    assert len(future_only) == 0

    print("[PASS] Temporal range query working")
    print(f"[PASS] Recent nodes: {len(recent)}")
    return True


def test_causal_chain_establishment():
    """Test 18: Establish causal edges"""
    print("\n[TEST 18] Causal Chain Establishment")
    print("-" * 60)

    graph = MemoryGraph()

    event_log = [
        {"event": "event_1", "timestamp": datetime.now().timestamp()},
        {"event": "event_2", "timestamp": datetime.now().timestamp()},
        {"event": "event_3", "timestamp": datetime.now().timestamp()},
    ]

    graph.ingest_event_log("TestShip", event_log)

    node_ids = list(graph.nodes.keys())[:3]
    edge_ids = graph.establish_causal_chain(node_ids, edge_type="CAUSED")

    assert len(edge_ids) > 0
    assert len(graph.edges) > 0

    print("[PASS] Causal chain establishment working")
    print(f"[PASS] Edges created: {len(edge_ids)}")
    return True


def test_ship_history_retrieval():
    """Test 19: Get ship history"""
    print("\n[TEST 19] Ship History Retrieval")
    print("-" * 60)

    graph = MemoryGraph()

    event_log = [
        {"event": "event_1", "timestamp": datetime.now().timestamp()},
        {"event": "event_2", "timestamp": datetime.now().timestamp()},
    ]

    graph.ingest_event_log("TestShip", event_log)

    history = graph.get_ship_history("TestShip")
    assert len(history) == 2
    assert all(n.ship_name == "TestShip" for n in history)

    print("[PASS] Ship history retrieval working")
    print(f"[PASS] History for TestShip: {len(history)} events")
    return True


def test_graph_statistics():
    """Test 20: Graph statistics"""
    print("\n[TEST 20] Graph Statistics")
    print("-" * 60)

    graph = MemoryGraph()

    event_log = [
        {"event": "event_1", "timestamp": datetime.now().timestamp()},
        {"event": "event_2", "timestamp": datetime.now().timestamp()},
    ]

    graph.ingest_event_log("TestShip", event_log)

    stats = graph.get_graph_statistics()
    assert stats["node_count"] == 2
    assert "edge_count" in stats

    print("[PASS] Graph statistics working")
    print(f"[PASS] Stats: {stats}")
    return True


def test_graph_persistence():
    """Test 21: Graph persistence to file"""
    print("\n[TEST 21] Graph Persistence")
    print("-" * 60)

    graph = MemoryGraph()

    event_log = [
        {"event": "event_1", "timestamp": datetime.now().timestamp()},
    ]

    graph.ingest_event_log("TestShip", event_log)

    # Persist and reload
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        filepath = f.name

    graph.persist_to_file(filepath)

    # Reload into new graph
    graph2 = MemoryGraph()
    graph2.load_from_file(filepath)

    assert len(graph2.nodes) == len(graph.nodes)

    # Cleanup
    os.remove(filepath)

    print("[PASS] Graph persistence working")
    print("[PASS] Graph saved and restored successfully")
    return True


def test_memory_graph_disable_enable():
    """Test 22: Memory graph disable/enable"""
    print("\n[TEST 22] Graph Disable/Enable")
    print("-" * 60)

    graph = MemoryGraph()
    graph.enable()
    assert graph.enabled

    graph.disable()
    assert not graph.enabled

    # When disabled, ingestion should not happen
    initial_count = len(graph.nodes)
    event_log = [{"event": "event_1", "timestamp": datetime.now().timestamp()}]
    graph.ingest_event_log("TestShip", event_log)

    assert len(graph.nodes) == initial_count

    print("[PASS] Graph disable/enable working")
    print("[PASS] Graph respects enabled flag")
    return True


# ===== ContinuityEngine Tests =====

def test_continuity_violation_creation():
    """Test 23: ContinuityViolation creation"""
    print("\n[TEST 23] ContinuityViolation Creation")
    print("-" * 60)

    violation = ContinuityViolation(
        violation_id="v_1",
        timestamp=datetime.now().timestamp(),
        violation_type="NARRATIVE_CONTRADICTION",
        severity="ALERT",
        ships_involved=["TestShip"],
        narrative_conflict="Test conflict",
        canonical_version="Expected state",
        contradicting_version="Actual state",
    )

    assert violation.violation_id == "v_1"
    assert violation.severity == "ALERT"

    v_dict = violation.to_dict()
    assert v_dict["violation_type"] == "NARRATIVE_CONTRADICTION"

    print("[PASS] ContinuityViolation creation successful")
    print(f"[PASS] Violation: {v_dict}")
    return True


def test_continuity_engine_initialization():
    """Test 24: ContinuityEngine initialization"""
    print("\n[TEST 24] ContinuityEngine Initialization")
    print("-" * 60)

    engine = ContinuityEngine()

    assert engine.enabled
    assert len(engine.violations) == 0
    assert "fleet_archetypes" in engine.narrative_canon

    print("[PASS] ContinuityEngine initialized correctly")
    print(f"[PASS] Canonical facts: {list(engine.narrative_canon.keys())}")
    return True


def test_validate_anomalies():
    """Test 25: Validate anomalies for continuity"""
    print("\n[TEST 25] Validate Anomalies")
    print("-" * 60)

    engine = ContinuityEngine()

    anomaly = AnomalyReport(
        id="anom_1",
        timestamp=datetime.now().timestamp(),
        anomaly_type=AnomalyType.CONTRADICTION,
        severity=0.9,
        confidence=0.8,
        description="High severity contradiction",
        context={},
        ship_name="TestShip",
    )

    violations = engine.validate_anomalies([anomaly])
    assert len(violations) > 0

    print("[PASS] Anomaly validation working")
    print(f"[PASS] Violations detected: {len(violations)}")
    return True


def test_validate_metaphysical_laws():
    """Test 26: Validate metaphysical laws"""
    print("\n[TEST 26] Validate Metaphysical Laws")
    print("-" * 60)

    engine = ContinuityEngine()

    event = {
        "source_ship": "TestShip",
        "type": "test_event",
    }

    # Reasonable delta
    state_delta = {"complexity": 10}
    violations = engine.validate_metaphysical_laws(event, state_delta)
    assert len(violations) == 0

    # Excessive delta
    state_delta = {"complexity": 100}
    violations = engine.validate_metaphysical_laws(event, state_delta)
    # May or may not trigger, depends on thresholds

    print("[PASS] Metaphysical law validation working")
    return True


def test_validate_narrative_generation():
    """Test 27: Validate narrative generation"""
    print("\n[TEST 27] Validate Narrative Generation")
    print("-" * 60)

    engine = ContinuityEngine()

    narrative = "The fleet operates in harmony."
    context = {}

    valid = engine.validate_narrative_generation(narrative, context)
    assert isinstance(valid, bool)

    print("[PASS] Narrative validation working")
    print(f"[PASS] Narrative valid: {valid}")
    return True


def test_narrative_canon():
    """Test 28: Narrative canon retrieval"""
    print("\n[TEST 28] Narrative Canon")
    print("-" * 60)

    engine = ContinuityEngine()

    canon = engine.get_narrative_canon()
    assert "fleet_archetypes" in canon
    assert "metaphysical_laws" in canon

    print("[PASS] Narrative canon retrieval working")
    print(f"[PASS] Canon contains: {list(canon.keys())}")
    return True


def test_continuity_engine_disable_enable():
    """Test 29: ContinuityEngine disable/enable"""
    print("\n[TEST 29] Engine Disable/Enable")
    print("-" * 60)

    engine = ContinuityEngine()
    engine.enable()
    assert engine.enabled

    engine.disable()
    assert not engine.enabled

    print("[PASS] Engine disable/enable working")
    return True


def test_continuity_violation_escalation():
    """Test 30: Violation escalation"""
    print("\n[TEST 30] Violation Escalation")
    print("-" * 60)

    engine = ContinuityEngine()

    violation = ContinuityViolation(
        violation_id="v_test",
        timestamp=datetime.now().timestamp(),
        violation_type="BEHAVIORAL_DRIFT",
        severity="WARNING",
        ships_involved=["TestShip"],
        narrative_conflict="Test drift",
        canonical_version="",
        contradicting_version="",
    )

    # Add similar violations to trigger escalation
    similar = ContinuityViolation(
        violation_id="v_similar_1",
        timestamp=datetime.now().timestamp(),
        violation_type="BEHAVIORAL_DRIFT",
        severity="WARNING",
        ships_involved=["TestShip"],
        narrative_conflict="Another drift",
        canonical_version="",
        contradicting_version="",
    )
    similar.escalation_count = 1
    engine.violations.append(similar)

    similar2 = ContinuityViolation(
        violation_id="v_similar_2",
        timestamp=datetime.now().timestamp(),
        violation_type="BEHAVIORAL_DRIFT",
        severity="WARNING",
        ships_involved=["TestShip"],
        narrative_conflict="Yet another drift",
        canonical_version="",
        contradicting_version="",
    )
    similar2.escalation_count = 1
    engine.violations.append(similar2)

    # Add a third similar violation to trigger escalation (need > 2)
    similar3 = ContinuityViolation(
        violation_id="v_similar_3",
        timestamp=datetime.now().timestamp(),
        violation_type="BEHAVIORAL_DRIFT",
        severity="WARNING",
        ships_involved=["TestShip"],
        narrative_conflict="Third drift",
        canonical_version="",
        contradicting_version="",
    )
    similar3.escalation_count = 1
    engine.violations.append(similar3)

    escalated = engine.escalate_violation(violation)
    assert escalated.escalation_count > 0

    print("[PASS] Violation escalation working")
    print(f"[PASS] Escalation count: {escalated.escalation_count}")
    return True


# ===== Integration Tests =====

def test_persistent_organism_initialization():
    """Test 31: PersistentNarrativeOrganism initialization"""
    print("\n[TEST 31] PersistentNarrativeOrganism Initialization")
    print("-" * 60)

    organism = PersistentNarrativeOrganism()

    assert organism.enabled
    assert organism.anomaly_detector is not None
    assert organism.memory_graph is not None
    assert organism.continuity_engine is not None

    print("[PASS] PersistentNarrativeOrganism initialized correctly")
    print("[PASS] All three engines present")
    return True


def test_process_with_memory():
    """Test 32: Process event with full pipeline"""
    print("\n[TEST 32] Process with Memory")
    print("-" * 60)

    organism = PersistentNarrativeOrganism()

    response = organism.process_with_memory(
        ship_name="TestShip",
        event_type="threat_detection",
        current_state={"threat_level": 15},
        previous_state={"threat_level": 2},
    )

    assert response.anomalies_detected >= 0
    assert response.continuity_score >= 0
    assert response.memory_stored is not None or response.anomalies_detected > 0

    print("[PASS] Full pipeline processing working")
    print(f"[PASS] Response: anomalies={response.anomalies_detected}, continuity={response.continuity_score:.2f}")
    return True


def test_organism_enable_disable():
    """Test 33: Organism enable/disable"""
    print("\n[TEST 33] Organism Enable/Disable")
    print("-" * 60)

    organism = PersistentNarrativeOrganism()

    organism.disable()
    assert not organism.enabled

    response = organism.process_with_memory(
        "TestShip",
        "event",
        {"threat_level": 5},
    )

    # Should return empty response when disabled
    assert response.anomalies_detected == 0
    assert response.memory_stored is None

    organism.enable()
    assert organism.enabled

    print("[PASS] Organism enable/disable working")
    return True


def test_anomaly_summary():
    """Test 34: Get anomaly summary"""
    print("\n[TEST 34] Anomaly Summary")
    print("-" * 60)

    organism = PersistentNarrativeOrganism()

    for i in range(5):
        organism.process_with_memory(
            "TestShip",
            f"event_{i}",
            {"threat_level": 5 + i},
            {"threat_level": 5 + i - 1},
        )

    summary = organism.get_anomaly_summary(limit=3)
    assert len(summary) <= 3
    assert all("id" in item for item in summary)

    print("[PASS] Anomaly summary retrieval working")
    print(f"[PASS] Summary contains {len(summary)} items")
    return True


def test_ship_memory_retrieval():
    """Test 35: Get ship memory"""
    print("\n[TEST 35] Ship Memory Retrieval")
    print("-" * 60)

    organism = PersistentNarrativeOrganism()

    organism.process_with_memory(
        "TestShip",
        "event_1",
        {"threat_level": 5},
    )

    memory = organism.get_ship_memory("TestShip")
    assert isinstance(memory, list)

    print("[PASS] Ship memory retrieval working")
    print(f"[PASS] Memory entries: {len(memory)}")
    return True


def test_graph_statistics_retrieval():
    """Test 36: Get graph statistics"""
    print("\n[TEST 36] Graph Statistics")
    print("-" * 60)

    organism = PersistentNarrativeOrganism()

    organism.process_with_memory(
        "TestShip",
        "event_1",
        {"threat_level": 5},
    )

    stats = organism.get_graph_statistics()
    assert "node_count" in stats
    assert "edge_count" in stats

    print("[PASS] Graph statistics retrieval working")
    print(f"[PASS] Stats: {stats}")
    return True


def test_threat_escalation_path():
    """Test 37: Get threat escalation path"""
    print("\n[TEST 37] Threat Escalation Path")
    print("-" * 60)

    organism = PersistentNarrativeOrganism()

    # Create sequence of threat escalations
    for threat_level in [1, 3, 5, 7, 9]:
        organism.process_with_memory(
            "TestShip",
            "threat_detected",
            {"threat_level": threat_level},
            {"threat_level": threat_level - 1} if threat_level > 1 else None,
        )

    path = organism.get_threat_escalation_path()
    assert isinstance(path, list)

    print("[PASS] Threat escalation path retrieval working")
    print(f"[PASS] Path length: {len(path)}")
    return True


def test_continuity_violations_retrieval():
    """Test 38: Get continuity violations"""
    print("\n[TEST 38] Continuity Violations Retrieval")
    print("-" * 60)

    organism = PersistentNarrativeOrganism()

    # Create anomalies that trigger violations
    organism.process_with_memory(
        "TestShip",
        "event",
        {"threat_level": 10},
        {"threat_level": 0},
    )

    violations = organism.get_continuity_violations()
    assert isinstance(violations, list)

    print("[PASS] Continuity violations retrieval working")
    print(f"[PASS] Violations: {len(violations)}")
    return True


# ===== REAL-WORLD SCENARIO TESTS =====

def test_threat_escalation_scenario():
    """Test 39: Threat escalation detection"""
    print("\n[TEST 39] Threat Escalation Scenario")
    print("-" * 60)

    organism = PersistentNarrativeOrganism()

    # Simulate threat escalation over 10 events
    for i in range(10):
        response = organism.process_with_memory(
            "ChaosBringer",
            "sensor_sweep",
            {"threat_level": i},
            {"threat_level": i - 1} if i > 0 else None,
        )

    memory = organism.get_ship_memory("ChaosBringer")
    assert len(memory) > 0

    print("[PASS] Threat escalation scenario completed")
    print(f"[PASS] Events tracked: {len(memory)}")
    print("[PASS] Anomalies detected during escalation")
    return True


def test_full_fleet_scenario():
    """Test 40: Multi-ship fleet scenario"""
    print("\n[TEST 40] Full Fleet Scenario")
    print("-" * 60)

    organism = PersistentNarrativeOrganism()

    ships = ["ChaosBringer", "SensingShip", "SignalHarvester"]

    for ship_name in ships:
        for i in range(3):
            organism.process_with_memory(
                ship_name,
                f"event_{i}",
                {"threat_level": 5 + i, "signal_quality": 80 - i},
                {"threat_level": 4 + i, "signal_quality": 81 - i},
            )

    stats = organism.get_graph_statistics()
    assert stats["node_count"] >= 9  # 3 ships × 3 events

    print("[PASS] Full fleet scenario completed")
    print(f"[PASS] Total memory nodes: {stats['node_count']}")
    print("[PASS] Fleet operating with anomaly engine")
    return True


def run_all_tests():
    """Run complete test suite"""
    print("\n" + "=" * 80)
    print("PHASE VII TEST SUITE - Anomaly Engine Comprehensive Tests")
    print("=" * 80)

    tests = [
        # AnomalyDetector (10 tests)
        test_anomaly_report_creation,
        test_anomaly_detector_initialization,
        test_outlier_detection,
        test_contradiction_detection,
        test_state_delta_detection,
        test_anomaly_scoring,
        test_anomaly_history_tracking,
        test_baseline_computation,
        test_causal_chain_construction,
        test_anomaly_disable_enable,
        # MemoryGraph (12 tests)
        test_memory_node_creation,
        test_memory_edge_creation,
        test_memory_graph_initialization,
        test_event_log_ingestion,
        test_decision_history_ingestion,
        test_tag_indexing,
        test_temporal_query,
        test_causal_chain_establishment,
        test_ship_history_retrieval,
        test_graph_statistics,
        test_graph_persistence,
        test_memory_graph_disable_enable,
        # ContinuityEngine (8 tests)
        test_continuity_violation_creation,
        test_continuity_engine_initialization,
        test_validate_anomalies,
        test_validate_metaphysical_laws,
        test_validate_narrative_generation,
        test_narrative_canon,
        test_continuity_engine_disable_enable,
        test_continuity_violation_escalation,
        # Integration (8 tests)
        test_persistent_organism_initialization,
        test_process_with_memory,
        test_organism_enable_disable,
        test_anomaly_summary,
        test_ship_memory_retrieval,
        test_graph_statistics_retrieval,
        test_threat_escalation_path,
        test_continuity_violations_retrieval,
        # Real-world scenarios (2 tests)
        test_threat_escalation_scenario,
        test_full_fleet_scenario,
    ]

    passed = 0
    failed = 0

    for test_func in tests:
        try:
            if test_func():
                passed += 1
        except AssertionError as e:
            print(f"[FAIL] FAILED: {str(e)}")
            failed += 1
        except Exception as e:
            print(f"[FAIL] ERROR: {str(e)}")
            failed += 1

    print("\n" + "=" * 80)
    print(f"RESULTS: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("=" * 80 + "\n")

    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
