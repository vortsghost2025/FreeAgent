#!/usr/bin/env python3
"""
ANOMALY ENGINE — Phase VII
Persistent memory, anomaly detection, and narrative coherence validation

Core classes:
- AnomalyDetector: Identifies contradictions, outliers, state jumps, metaphysical mismatches
- MemoryGraph: Persistent graph of causally-linked events with query interface
- ContinuityEngine: Enforces narrative coherence and metaphysical law consistency
- PersistentNarrativeOrganism: Integration layer tying anomaly detection to fleet operations
"""

from .anomaly_detector import AnomalyDetector, AnomalyReport, AnomalyType
from .memory_graph import MemoryGraph, MemoryNode, MemoryEdge
from .continuity_engine import ContinuityEngine, ContinuityViolation
from .persistent_organism import PersistentNarrativeOrganism

__all__ = [
    "AnomalyDetector",
    "AnomalyReport",
    "AnomalyType",
    "MemoryGraph",
    "MemoryNode",
    "MemoryEdge",
    "ContinuityEngine",
    "ContinuityViolation",
    "PersistentNarrativeOrganism",
]
