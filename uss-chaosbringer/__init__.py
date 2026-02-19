#!/usr/bin/env python3
"""
USS Chaosbringer Fleet Package
Complete autonomous + metaphysical universe framework
"""

__version__ = "5.0"
__author__ = "USS Chaosbringer Development"

# Import all public APIs
from starship import Starship, ShipEvent, ShipEventResult
from event_router import DomainResult

# Phase V Ships
from chaosbringer_ship import ChaosbringingerShip
from sensing_ship import SensingShip
from signal_harvester_ship import SignalHarvesterShip
from probability_weaver_ship import ProbabilityWeaverShip
from paradox_runner_ship import ParadoxRunnerShip

# Phase V Autonomy
from fleet_brain import FleetBrain, StrategicDecision
from ship_generator import ShipGenerator, ShipBlueprint
from fleet_coordinator import FleetCoordinator, FleetTelemetry

# Phase VI Metaphysics
from ontology_engine import OntologyEngine, ArchetypeDefinition, OntologicalRule, IdentitySeed, ArchetypeCategory
from transcendence_layer import TranscendenceLayer, UniversalInterpreter, MythosGenerator

# Observability
from telemetry_engine import TelemetryEngine, ShipMetrics, FleetMetrics
from lore_engine import LoreEngine, LoreEntry, LoreEntryType

# Narrative
from narrator_engine import NarratorEngine

__all__ = [
    # Core
    'Starship', 'ShipEvent', 'ShipEventResult', 'DomainResult',

    # Phase V Ships
    'ChaosbringingerShip', 'SensingShip', 'SignalHarvesterShip',
    'ProbabilityWeaverShip', 'ParadoxRunnerShip',

    # Phase V Autonomy
    'FleetBrain', 'StrategicDecision', 'ShipGenerator', 'ShipBlueprint',
    'FleetCoordinator', 'FleetTelemetry',

    # Phase VI Metaphysics
    'OntologyEngine', 'ArchetypeDefinition', 'OntologicalRule', 'IdentitySeed',
    'ArchetypeCategory', 'TranscendenceLayer', 'UniversalInterpreter',
    'MythosGenerator',

    # Observability
    'TelemetryEngine', 'ShipMetrics', 'FleetMetrics',
    'LoreEngine', 'LoreEntry', 'LoreEntryType',

    # Narrative
    'NarratorEngine',
]
