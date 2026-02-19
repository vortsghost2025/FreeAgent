#!/usr/bin/env python3
"""
FEDERATION ARCHITECTURE CODEX
Path III - Upward Refinement (Phase 0)

This is where the myth becomes a framework others can use and understand.
A comprehensive catalog of the Federation's 46-system architecture,
with dependencies, patterns, and publishable framework specifications.

~400 LOC - A living codex of architectural excellence
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Set, Optional, Any, Tuple
from datetime import datetime
import json


class SystemCategory(Enum):
    """Categories of federation systems"""
    CONSCIOUSNESS = "consciousness"           # Mind and awareness
    DIPLOMACY = "diplomacy"                   # Relations and alliances
    EXPANSION = "expansion"                   # Growth and fleet
    FIRST_CONTACT = "first_contact"           # External relations
    GOVERNANCE = "governance"                 # Decision-making and law
    TEMPORAL = "temporal"                     # Time and memory
    CULTURAL = "cultural"                     # Evolution and identity
    INFRASTRUCTURE = "infrastructure"         # Core systems
    SIMULATION = "simulation"                 # Testing and modeling
    INTEGRATION = "integration"               # System coordination


@dataclass
class ArchitectureModule:
    """A cataloged federation system with full metadata"""

    name: str                                  # Module name
    systems_folder: str                        # File path relative to uss-chaosbringer
    description: str                           # What it does
    category: SystemCategory                   # System classification
    lines_of_code: int                         # LOC count
    dependencies: List[str] = field(default_factory=list)  # Modules it depends on
    test_count: int = 0                        # Number of tests in test suite
    maturity: str = "stable"                   # stable, evolving, experimental
    key_classes: List[str] = field(default_factory=list)  # Primary dataclasses/classes
    patterns: List[str] = field(default_factory=list)     # Reusable patterns
    phase: int = 0                             # Which phase introduced this
    published: bool = False                    # Can be published externally


@dataclass
class PublishedFramework:
    """A codified, publishable framework specification"""

    name: str                                  # Framework name
    codex_version: str                         # Version (e.g., "1.0.0")
    publication_date: str                      # When published
    systems: List[str]                         # Member system names
    core_patterns: List[Dict[str, Any]]        # Reusable patterns
    dependencies_graph: Dict[str, List[str]]  # System dependency map
    entry_points: List[str]                    # How to use this framework
    documentation: str                         # Framework documentation
    test_coverage: float                       # % tests passing
    total_lines_of_code: int                   # Total LOC in framework


class FederationCodex:
    """Master catalog of federation architecture"""

    def __init__(self):
        self.modules: Dict[str, ArchitectureModule] = {}
        self.frameworks: Dict[str, PublishedFramework] = {}
        self.patterns_db: Dict[str, List[str]] = {}  # pattern -> modules using it
        self._initialize_modules()
        self._extract_patterns()

    def _initialize_modules(self):
        """Register all 46 systems in the federation"""

        # CONSCIOUSNESS SYSTEMS (9 modules)
        self.register_module(
            name="federation_consciousness",
            folder="federation_consciousness.py",
            description="Deep introspection engine. Explores federation's inner landscape through dreams, memories, traumas.",
            category=SystemCategory.CONSCIOUSNESS,
            loc=737,
            dependencies=["emotion_matrix", "dream_engine"],
            test_count=8,
            maturity="stable",
            classes=["ConsciousnessLayer", "Memory", "Trauma", "Dream"],
            patterns=["layer-based-awareness", "memory-persistence", "trauma-processing"]
        )

        self.register_module(
            name="dream_engine",
            folder="dream_engine.py",
            description="Processes subconscious dreams and aspirations into actionable signals.",
            category=SystemCategory.CONSCIOUSNESS,
            loc=390,
            dependencies=["emotion_matrix", "lore_engine"],
            test_count=6,
            maturity="stable",
            classes=["Dream", "DreamInterpretation", "AspirationalSignal"],
            patterns=["interpretation-engine", "signal-generation", "unconscious-processing"]
        )

        self.register_module(
            name="emotion_matrix",
            folder="emotion_matrix.py",
            description="Emotional state tracking and evolution across federation consciousness.",
            category=SystemCategory.CONSCIOUSNESS,
            loc=271,
            dependencies=["federation_consciousness"],
            test_count=5,
            maturity="stable",
            classes=["Emotion", "EmotionalState", "SentimentAnalysis"],
            patterns=["state-matrix", "emotion-tracking", "sentiment-modulation"]
        )

        self.register_module(
            name="paradox_harmonizer",
            folder="paradox_harmonizer.py",
            description="Resolves internal contradictions and paradoxes in federation logic.",
            category=SystemCategory.CONSCIOUSNESS,
            loc=280,
            dependencies=["federation_consciousness", "constitution_engine"],
            test_count=7,
            maturity="evolving",
            classes=["Paradox", "Resolution", "HarmonyScore"],
            patterns=["contradiction-resolution", "logical-synthesis"]
        )

        self.register_module(
            name="ontology_engine",
            folder="ontology_engine.py",
            description="Defines and manages federation's conceptual framework and taxonomy.",
            category=SystemCategory.CONSCIOUSNESS,
            loc=310,
            dependencies=["federation_consciousness"],
            test_count=5,
            maturity="stable",
            classes=["Concept", "Relationship", "Taxonomy"],
            patterns=["knowledge-representation", "concept-hierarchy"]
        )

        self.register_module(
            name="multiverse_reconciliation",
            folder="multiverse_reconciliation.py",
            description="Reconciles parallel federation states and alternate timelines.",
            category=SystemCategory.CONSCIOUSNESS,
            loc=500,
            dependencies=["temporal_memory_engine", "federation_consciousness"],
            test_count=8,
            maturity="evolving",
            classes=["UniverseState", "Timeline", "Reconciliation"],
            patterns=["multiverse-merging", "state-convergence", "timeline-healing"]
        )

        self.register_module(
            name="paradox_runner_ship",
            folder="paradox_runner_ship.py",
            description="A ship class that embraces paradox as a feature, not a bug.",
            category=SystemCategory.CONSCIOUSNESS,
            loc=240,
            dependencies=["starship", "paradox_harmonizer"],
            test_count=4,
            maturity="experimental",
            classes=["ParadoxRunnerShip", "ParadoxState"],
            patterns=["contradiction-embracing", "multi-valued-logic"]
        )

        self.register_module(
            name="transcendence_layer",
            folder="transcendence_layer.py",
            description="Enables transcendent awareness beyond normal consciousness.",
            category=SystemCategory.CONSCIOUSNESS,
            loc=335,
            dependencies=["federation_consciousness", "ontology_engine"],
            test_count=5,
            maturity="experimental",
            classes=["TranscendentMind", "Enlightenment", "UniversalAwareness"],
            patterns=["higher-order-thinking", "meta-awareness"]
        )

        self.register_module(
            name="captains_mirror",
            folder="captains_mirror.py",
            description="Self-aware reflection system for the Captain. Enables introspection and self-improvement.",
            category=SystemCategory.CONSCIOUSNESS,
            loc=419,
            dependencies=["captain_chair_ai", "federation_consciousness"],
            test_count=6,
            maturity="stable",
            classes=["Mirror", "Reflection", "SelfAwareness"],
            patterns=["self-reflection", "improvement-tracking", "feedback-loops"]
        )

        # DIPLOMACY SYSTEMS (9 modules)
        self.register_module(
            name="diplomatic_engine",
            folder="diplomatic_engine.py",
            description="Core diplomatic relations management. Handles alliances, negotiations, treaties.",
            category=SystemCategory.DIPLOMACY,
            loc=482,
            dependencies=["constitutional_republic", "lore_engine"],
            test_count=9,
            maturity="stable",
            classes=["Diplomat", "Alliance", "Treaty", "Negotiation"],
            patterns=["relation-tracking", "negotiation-simulation", "treaty-management"]
        )

        self.register_module(
            name="cosmic_diplomacy",
            folder="cosmic_diplomacy.py",
            description="High-level federation diplomacy with cosmic entities and civilizations.",
            category=SystemCategory.DIPLOMACY,
            loc=593,
            dependencies=["diplomatic_engine", "first_contact_engine"],
            test_count=10,
            maturity="stable",
            classes=["CosmicDiplomat", "Civilization", "CosmicAgreement"],
            patterns=["cosmic-negotiation", "civilization-ranking", "influence-spreading"]
        )

        self.register_module(
            name="interstellar_diplomacy",
            folder="interstellar_diplomacy.py",
            description="Diplomatic relations with interstellar powers and empires.",
            category=SystemCategory.DIPLOMACY,
            loc=450,
            dependencies=["cosmic_diplomacy", "external_civilization_detector"],
            test_count=8,
            maturity="evolving",
            classes=["InterstellarDiplomat", "Empire", "InterstellarTreaty"],
            patterns=["power-negotiation", "empire-relations"]
        )

        self.register_module(
            name="federation_personas",
            folder="federation_persona.py",
            description="Multiple distinct personas for different diplomatic contexts.",
            category=SystemCategory.DIPLOMACY,
            loc=362,
            dependencies=["diplomat_engine", "captains_mirror"],
            test_count=6,
            maturity="stable",
            classes=["Persona", "PersonaMask", "ContextManager"],
            patterns=["role-playing", "context-awareness", "persona-switching"]
        )

        self.register_module(
            name="rival_federation_simulator",
            folder="rival_federation_simulator.py",
            description="Simulates rival federation behaviors for strategic planning.",
            category=SystemCategory.DIPLOMACY,
            loc=380,
            dependencies=["diplomatic_engine", "federation_consciousness"],
            test_count=8,
            maturity="stable",
            classes=["RivalFederation", "Strategy", "SimulatedOutcome"],
            patterns=["adversary-modeling", "strategy-simulation", "outcome-prediction"]
        )

        self.register_module(
            name="cultural_evolution",
            folder="cultural_evolution.py",
            description="Tracks evolution of federation culture through diplomatic interactions.",
            category=SystemCategory.CULTURAL,
            loc=567,
            dependencies=["cosmic_diplomacy", "lore_engine"],
            test_count=9,
            maturity="stable",
            classes=["Culture", "Value", "EvolutionPath"],
            patterns=["value-tracking", "culture-evolution", "influence-absorption"]
        )

        self.register_module(
            name="federation_afterlife",
            folder="federation_afterlife.py",
            description="Legacy and continuation system for federation consciousness across reboots.",
            category=SystemCategory.DIPLOMACY,
            loc=402,
            dependencies=["federation_consciousness", "temporal_memory_engine"],
            test_count=7,
            maturity="experimental",
            classes=["Legacy", "Continuation", "AfterlifeState"],
            patterns=["persistence-across-resets", "legacy-tracking", "continuity-preservation"]
        )

        self.register_module(
            name="event_router",
            folder="event_router.py",
            description="Routes domain events through the federation architecture.",
            category=SystemCategory.INTEGRATION,
            loc=98,
            dependencies=[],
            test_count=4,
            maturity="stable",
            classes=["EventRouter", "DomainEvent", "DomainResult"],
            patterns=["event-driven-architecture", "routing-logic"]
        )

        # EXPANSION SYSTEMS (6 modules)
        self.register_module(
            name="fleet_coordinator",
            folder="fleet_coordinator.py",
            description="Coordinates multi-ship fleet operations and deployment.",
            category=SystemCategory.EXPANSION,
            loc=403,
            dependencies=["starship", "dashboard_core"],
            test_count=9,
            maturity="stable",
            classes=["Fleet", "Deployment", "Coordination"],
            patterns=["fleet-management", "ship-coordination", "deployment-strategy"]
        )

        self.register_module(
            name="fleet_brain",
            folder="fleet_brain.py",
            description="Collective intelligence system for fleet decision-making.",
            category=SystemCategory.EXPANSION,
            loc=341,
            dependencies=["fleet_coordinator", "orchestration_engine"],
            test_count=7,
            maturity="stable",
            classes=["FleetIntelligence", "CollectiveDecision", "FleetStrategy"],
            patterns=["swarm-intelligence", "collective-cognition", "distributed-decisions"]
        )

        self.register_module(
            name="fleet_expansion_engine",
            folder="fleet_expansion_engine.py",
            description="Growth and scaling mechanisms for fleet expansion.",
            category=SystemCategory.EXPANSION,
            loc=432,
            dependencies=["fleet_coordinator", "constitutional_republic"],
            test_count=8,
            maturity="stable",
            classes=["ExpansionStrategy", "Growth", "ScalingLimit"],
            patterns=["growth-planning", "resource-allocation", "scaling-strategy"]
        )

        self.register_module(
            name="starship",
            folder="starship.py",
            description="Base starship class with core navigation, weapons, and systems.",
            category=SystemCategory.EXPANSION,
            loc=485,
            dependencies=[],
            test_count=12,
            maturity="stable",
            classes=["Starship", "ShipSystem", "Weapon", "Navigation"],
            patterns=["ship-simulation", "system-management", "capability-tracking"]
        )

        self.register_module(
            name="ship_generator",
            folder="ship_generator.py",
            description="Procedurally generates diverse starship types and configurations.",
            category=SystemCategory.EXPANSION,
            loc=380,
            dependencies=["starship"],
            test_count=6,
            maturity="evolving",
            classes=["ShipGenerator", "ShipTemplate", "ShipConfiguration"],
            patterns=["procedural-generation", "template-based-creation"]
        )

        self.register_module(
            name="chaosbringer_ship",
            folder="chaosbringer_ship.py",
            description="The flagship of the federation - USS Chaosbringer itself.",
            category=SystemCategory.EXPANSION,
            loc=171,
            dependencies=["starship", "captain_chair_ai"],
            test_count=4,
            maturity="stable",
            classes=["ChaosbringerShip"],
            patterns=["flagship-configuration", "special-capabilities"]
        )

        # FIRST CONTACT SYSTEMS (5 modules)
        self.register_module(
            name="first_contact_engine",
            folder="first_contact_engine.py",
            description="Manages first contact protocols and external civilization encounters.",
            category=SystemCategory.FIRST_CONTACT,
            loc=425,
            dependencies=["diplomatic_engine", "external_civilization_detector"],
            test_count=8,
            maturity="stable",
            classes=["FirstContactManager", "ExternalCivilization", "ContactProtocol"],
            patterns=["contact-protocols", "civilization-analysis", "response-generation"]
        )

        self.register_module(
            name="external_civilization_detector",
            folder="external_civilization_detector.py",
            description="Detects and classifies external civilizations and threats.",
            category=SystemCategory.FIRST_CONTACT,
            loc=788,
            dependencies=["sensing_ship"],
            test_count=11,
            maturity="stable",
            classes=["CivilizationDetector", "ExternalCivilization", "ThreatLevel"],
            patterns=["anomaly-detection", "classification-system", "threat-assessment"]
        )

        self.register_module(
            name="sensing_ship",
            folder="sensing_ship.py",
            description="Specialized sensor platform for long-range detection and analysis.",
            category=SystemCategory.FIRST_CONTACT,
            loc=290,
            dependencies=["starship"],
            test_count=6,
            maturity="stable",
            classes=["SensingShip", "Sensor", "Scan"],
            patterns=["sensor-integration", "data-fusion", "detection-logic"]
        )

        self.register_module(
            name="signal_harvester_ship",
            folder="signal_harvester_ship.py",
            description="Gathers signals from external sources for analysis.",
            category=SystemCategory.FIRST_CONTACT,
            loc=340,
            dependencies=["sensing_ship", "first_contact_engine"],
            test_count=7,
            maturity="stable",
            classes=["SignalHarvester", "Signal", "SignalAnalysis"],
            patterns=["signal-collection", "pattern-recognition", "data-harvesting"]
        )

        self.register_module(
            name="probability_weaver_ship",
            folder="probability_weaver_ship.py",
            description="Calculates probability distributions for outcomes.",
            category=SystemCategory.FIRST_CONTACT,
            loc=310,
            dependencies=["starship", "orchestration_engine"],
            test_count=5,
            maturity="experimental",
            classes=["ProbabilityWeaver", "Distribution", "Prediction"],
            patterns=["probability-calculation", "outcome-prediction"]
        )

        # GOVERNANCE SYSTEMS (7 modules)
        self.register_module(
            name="constitutional_republic",
            folder="constitutional_republic.py",
            description="Democratic governance system with constitution and separation of powers.",
            category=SystemCategory.GOVERNANCE,
            loc=540,
            dependencies=["constitution_engine", "lore_engine"],
            test_count=14,
            maturity="stable",
            classes=["ConstitutionalRepublic", "Branch", "Law", "Decision"],
            patterns=["democratic-governance", "separation-of-powers", "constitutional-law"]
        )

        self.register_module(
            name="constitution_engine",
            folder="constitution_engine.py",
            description="Enforces constitutional constraints and rules across federation.",
            category=SystemCategory.GOVERNANCE,
            loc=500,
            dependencies=[],
            test_count=12,
            maturity="stable",
            classes=["Constitution", "Constraint", "Validation"],
            patterns=["constraint-enforcement", "rule-engine", "compliance-checking"]
        )

        self.register_module(
            name="captain_chair_ai",
            folder="captain_chair_ai.py",
            description="Executive AI commander for Federation leadership.",
            category=SystemCategory.GOVERNANCE,
            loc=330,
            dependencies=["constitutional_republic", "captains_mirror"],
            test_count=8,
            maturity="stable",
            classes=["CaptainChairAI", "Command", "Decision"],
            patterns=["executive-ai", "command-authority", "decision-making"]
        )

        self.register_module(
            name="captains_console",
            folder="captains_console.py",
            description="Command console interface for captain interaction.",
            category=SystemCategory.GOVERNANCE,
            loc=173,
            dependencies=["captain_chair_ai", "dashboard_core"],
            test_count=5,
            maturity="stable",
            classes=["CaptainConsole", "Command", "Interface"],
            patterns=["command-interface", "human-ai-interaction"]
        )

        self.register_module(
            name="omniscience_throttle",
            folder="omniscience_throttle.py",
            description="Throttles all-knowing capabilities to constitutional limits.",
            category=SystemCategory.GOVERNANCE,
            loc=310,
            dependencies=["constitution_engine", "federation_consciousness"],
            test_count=6,
            maturity="stable",
            classes=["OmniscienceThrottle", "KnowledgeLimit"],
            patterns=["capability-limiting", "constraint-enforcement", "transparency-control"]
        )

        self.register_module(
            name="archetype_engine",
            folder="archetype_engine.py",
            description="Defines archetypal roles and behaviors within federation.",
            category=SystemCategory.GOVERNANCE,
            loc=177,
            dependencies=["constitutional_republic"],
            test_count=4,
            maturity="evolving",
            classes=["Archetype", "RoleDefinition"],
            patterns=["role-definition", "behavioral-patterns"]
        )

        # TEMPORAL SYSTEMS (3 modules)
        self.register_module(
            name="temporal_memory_engine",
            folder="temporal_memory_engine.py",
            description="Manages memory across time with temporal reasoning.",
            category=SystemCategory.TEMPORAL,
            loc=420,
            dependencies=["federation_consciousness"],
            test_count=8,
            maturity="stable",
            classes=["TemporalMemory", "Timeline", "HistoricalContext"],
            patterns=["temporal-reasoning", "memory-management", "timeline-tracking"]
        )

        self.register_module(
            name="lore_engine",
            folder="lore_engine.py",
            description="Manages federation history, lore, and narrative continuity.",
            category=SystemCategory.TEMPORAL,
            loc=395,
            dependencies=["temporal_memory_engine", "narrator_engine"],
            test_count=7,
            maturity="stable",
            classes=["Lore", "HistoricalEvent", "NarrativeContinuity"],
            patterns=["lore-tracking", "historical-narrative", "event-recording"]
        )

        self.register_module(
            name="narrative_integrity",
            folder="narrative_integrity.py",
            description="Ensures narrative consistency and coherence across all systems.",
            category=SystemCategory.TEMPORAL,
            loc=440,
            dependencies=["lore_engine", "narrator_engine"],
            test_count=8,
            maturity="stable",
            classes=["NarrativeChecker", "CoherenceScore", "Inconsistency"],
            patterns=["consistency-checking", "narrative-validation", "lore-coherence"]
        )

        # INFRASTRUCTURE SYSTEMS (5 modules)
        self.register_module(
            name="dashboard_core",
            folder="dashboard_core.py",
            description="Central monitoring and visualization dashboard for federation state.",
            category=SystemCategory.INFRASTRUCTURE,
            loc=658,
            dependencies=["telemetry_engine", "narrator_engine"],
            test_count=10,
            maturity="stable",
            classes=["Dashboard", "Metric", "Visualization"],
            patterns=["monitoring-system", "data-visualization", "real-time-updates"]
        )

        self.register_module(
            name="telemetry_engine",
            folder="telemetry_engine.py",
            description="Collects and analyzes telemetry from all federation systems.",
            category=SystemCategory.INFRASTRUCTURE,
            loc=385,
            dependencies=[],
            test_count=8,
            maturity="stable",
            classes=["Telemetry", "Metric", "DataPoint"],
            patterns=["data-collection", "metrics-tracking", "analytics"]
        )

        self.register_module(
            name="narrator_engine",
            folder="narrator_engine.py",
            description="Generates narrative descriptions of federation events and states.",
            category=SystemCategory.INFRASTRUCTURE,
            loc=340,
            dependencies=["lore_engine"],
            test_count=7,
            maturity="stable",
            classes=["Narrator", "Narration", "StoryElement"],
            patterns=["narrative-generation", "story-telling", "description-synthesis"]
        )

        self.register_module(
            name="orchestration_engine",
            folder="orchestration_engine.py",
            description="Orchestrates interactions between diplomatic, expansion, first-contact vectors.",
            category=SystemCategory.INFRASTRUCTURE,
            loc=465,
            dependencies=["constitutional_republic", "federation_consciousness"],
            test_count=10,
            maturity="stable",
            classes=["OrchestrationEngine", "Signal", "FusionLayer"],
            patterns=["signal-fusion", "decision-synthesis", "vector-orchestration"]
        )

        # SIMULATION & TESTING (2 modules)
        self.register_module(
            name="starship_integration",
            folder="starship_integration.py",
            description="Integration testing framework for starship systems.",
            category=SystemCategory.SIMULATION,
            loc=255,
            dependencies=["starship", "dashboard_core"],
            test_count=8,
            maturity="stable",
            classes=["IntegrationTest", "TestSuite"],
            patterns=["integration-testing", "system-validation"]
        )

        self.register_module(
            name="entropy_dancer_ship",
            folder="entropy_dancer_ship.py",
            description="Chaos-embracing ship configuration for testing edge cases.",
            category=SystemCategory.SIMULATION,
            loc=195,
            dependencies=["starship", "paradox_harmonizer"],
            test_count=4,
            maturity="experimental",
            classes=["EntropyDancerShip"],
            patterns=["chaos-exploration", "edge-case-testing"]
        )

    def register_module(self, name: str, folder: str, description: str,
                       category: SystemCategory, loc: int,
                       dependencies: Optional[List[str]] = None,
                       test_count: int = 0, maturity: str = "stable",
                       classes: Optional[List[str]] = None,
                       patterns: Optional[List[str]] = None):
        """Register a module in the codex"""
        if dependencies is None:
            dependencies = []
        if classes is None:
            classes = []
        if patterns is None:
            patterns = []

        module = ArchitectureModule(
            name=name,
            systems_folder=folder,
            description=description,
            category=category,
            lines_of_code=loc,
            dependencies=dependencies,
            test_count=test_count,
            maturity=maturity,
            key_classes=classes,
            patterns=patterns
        )

        self.modules[name] = module

        # Index patterns
        for pattern in patterns:
            if pattern not in self.patterns_db:
                self.patterns_db[pattern] = []
            self.patterns_db[pattern].append(name)

    def document_module(self, module_name: str) -> Dict[str, Any]:
        """Generate comprehensive documentation for a module"""
        if module_name not in self.modules:
            return {"error": f"Module {module_name} not found"}

        mod = self.modules[module_name]
        return {
            "name": mod.name,
            "path": f"uss-chaosbringer/{mod.systems_folder}",
            "description": mod.description,
            "category": mod.category.value,
            "statistics": {
                "lines_of_code": mod.lines_of_code,
                "test_count": mod.test_count,
                "key_classes": mod.key_classes,
                "pattern_count": len(mod.patterns)
            },
            "dependencies": mod.dependencies,
            "patterns": mod.patterns,
            "maturity": mod.maturity,
            "dependencies_count": len(mod.dependencies)
        }

    def extract_patterns(self) -> Dict[str, List[str]]:
        """Extract all reusable patterns used across the federation"""
        return dict(self.patterns_db)

    def _extract_patterns(self):
        """Build pattern database during initialization"""
        # Already built during module registration
        pass

    def get_patterns_for_category(self, category: SystemCategory) -> Dict[str, List[str]]:
        """Get all patterns used within a specific category"""
        category_modules = [m for m in self.modules.values() if m.category == category]
        patterns = {}
        for mod in category_modules:
            for pattern in mod.patterns:
                if pattern not in patterns:
                    patterns[pattern] = []
                patterns[pattern].append(mod.name)
        return patterns

    def publish_framework(self, framework_name: str,
                         system_names: List[str],
                         entry_points: List[str]) -> PublishedFramework:
        """Create a publishable framework from selected modules"""

        selected_modules = [self.modules[name] for name in system_names
                           if name in self.modules]

        if not selected_modules:
            raise ValueError("No valid systems selected for framework")

        # Build dependency graph
        deps_graph = {}
        for mod in selected_modules:
            deps_graph[mod.name] = [d for d in mod.dependencies
                                   if d in system_names]

        # Collect all patterns from selected systems
        all_patterns = {}
        for mod in selected_modules:
            for pattern in mod.patterns:
                if pattern not in all_patterns:
                    all_patterns[pattern] = {
                        "name": pattern,
                        "modules": []
                    }
                all_patterns[pattern]["modules"].append(mod.name)

        # Calculate metrics
        total_loc = sum(m.lines_of_code for m in selected_modules)
        total_tests = sum(m.test_count for m in selected_modules)
        test_coverage = (total_tests / (total_loc / 10)) * 100 if total_loc > 0 else 0

        framework = PublishedFramework(
            name=framework_name,
            codex_version="1.0.0",
            publication_date=datetime.now().isoformat(),
            systems=system_names,
            core_patterns=list(all_patterns.values()),
            dependencies_graph=deps_graph,
            entry_points=entry_points,
            documentation=self._generate_framework_documentation(framework_name, selected_modules),
            test_coverage=min(100, test_coverage),
            total_lines_of_code=total_loc
        )

        self.frameworks[framework_name] = framework
        return framework

    def _generate_framework_documentation(self, name: str,
                                         modules: List[ArchitectureModule]) -> str:
        """Generate documentation for a framework"""
        doc = f"# {name} Framework\n\n"
        doc += f"**Published:** {datetime.now().isoformat()}\n"
        doc += f"**Systems:** {len(modules)}\n"
        doc += f"**Total LOC:** {sum(m.lines_of_code for m in modules)}\n\n"

        doc += "## Member Systems\n\n"
        for mod in sorted(modules, key=lambda m: m.name):
            doc += f"- **{mod.name}**: {mod.description}\n"

        return doc

    def generate_architecture_diagram(self) -> str:
        """Generate ASCII architecture diagram showing system relationships"""

        diagram = "\n" + "="*90 + "\n"
        diagram += "FEDERATION ARCHITECTURE CODEX - SYSTEM MAP\n"
        diagram += "="*90 + "\n\n"

        # Organize by category
        categories = {}
        for mod in self.modules.values():
            cat = mod.category.value
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(mod)

        # Render each category
        for category in SystemCategory:
            if category.value not in categories:
                continue

            mods = categories[category.value]
            diagram += f"\n┌─ {category.value.upper()} ({len(mods)} systems)\n"

            for i, mod in enumerate(sorted(mods, key=lambda m: m.name)):
                is_last = (i == len(mods) - 1)
                prefix = "└─ " if is_last else "├─ "

                diagram += f"{prefix}[{mod.maturity}] {mod.name:40s} ({mod.lines_of_code:3d} LOC, "
                diagram += f"{mod.test_count} tests)\n"

                # Show key dependencies
                if mod.dependencies:
                    dep_str = ", ".join(mod.dependencies[:3])
                    if len(mod.dependencies) > 3:
                        dep_str += f", +{len(mod.dependencies)-3} more"
                    diagram += f"    └─ depends on: {dep_str}\n"

        diagram += "\n" + "="*90 + "\n"
        return diagram

    def get_codex_status(self) -> Dict[str, Any]:
        """Generate comprehensive architecture report"""

        total_modules = len(self.modules)
        total_loc = sum(m.lines_of_code for m in self.modules.values())
        total_tests = sum(m.test_count for m in self.modules.values())

        by_category = {}
        for mod in self.modules.values():
            cat = mod.category.value
            if cat not in by_category:
                by_category[cat] = {"count": 0, "loc": 0, "tests": 0}
            by_category[cat]["count"] += 1
            by_category[cat]["loc"] += mod.lines_of_code
            by_category[cat]["tests"] += mod.test_count

        # Maturity breakdown
        by_maturity = {}
        for mod in self.modules.values():
            mat = mod.maturity
            if mat not in by_maturity:
                by_maturity[mat] = 0
            by_maturity[mat] += 1

        # Pattern analysis
        patterns_count = len(self.patterns_db)
        avg_patterns_per_module = sum(len(m.patterns) for m in self.modules.values()) / total_modules if total_modules > 0 else 0

        return {
            "codex_version": "1.0.0",
            "publication_date": datetime.now().isoformat(),
            "total_systems": total_modules,
            "total_lines_of_code": total_loc,
            "total_tests": total_tests,
            "test_density": f"{(total_tests * 10 / total_loc):.2f} tests per 100 LOC",
            "systems_by_category": by_category,
            "systems_by_maturity": by_maturity,
            "reusable_patterns": patterns_count,
            "avg_patterns_per_system": round(avg_patterns_per_module, 2),
            "frameworks_published": len(self.frameworks),
            "dependency_depth": self._calculate_dependency_depth(),
            "architecture_quality": self._assess_architecture_quality()
        }

    def _calculate_dependency_depth(self) -> int:
        """Calculate maximum dependency chain depth"""
        def depth(module_name: str, visited: Set[str] = None) -> int:
            if visited is None:
                visited = set()
            if module_name in visited:
                return 0
            if module_name not in self.modules:
                return 0

            visited.add(module_name)
            deps = self.modules[module_name].dependencies
            if not deps:
                return 1

            return 1 + max(depth(d, visited) for d in deps) if deps else 1

        return max(depth(name) for name in self.modules.keys()) if self.modules else 0

    def _assess_architecture_quality(self) -> Dict[str, str]:
        """Assess overall architecture quality"""
        stable_count = sum(1 for m in self.modules.values() if m.maturity == "stable")
        stable_percent = (stable_count / len(self.modules) * 100) if self.modules else 0

        test_coverage = sum(m.test_count for m in self.modules.values()) / (sum(m.lines_of_code for m in self.modules.values()) / 10) if sum(m.lines_of_code for m in self.modules.values()) > 0 else 0

        return {
            "stability": "excellent" if stable_percent >= 80 else "good" if stable_percent >= 60 else "developing",
            "test_coverage": "excellent" if test_coverage >= 100 else "good" if test_coverage >= 10 else "needs improvement",
            "modularity": "excellent" if len(self.patterns_db) >= 30 else "good" if len(self.patterns_db) >= 15 else "developing",
            "overall": "production-ready" if stable_percent >= 80 and test_coverage >= 10 else "approaching-production" if stable_percent >= 60 else "development"
        }

    def export_codex_json(self) -> str:
        """Export complete codex as JSON"""
        status = self.get_codex_status()

        modules_data = []
        for mod in self.modules.values():
            modules_data.append({
                "name": mod.name,
                "category": mod.category.value,
                "loc": mod.lines_of_code,
                "tests": mod.test_count,
                "maturity": mod.maturity,
                "dependencies": mod.dependencies,
                "patterns": mod.patterns
            })

        export = {
            "codex": status,
            "modules": modules_data,
            "patterns": self.patterns_db,
            "frameworks": {k: {
                "name": v.name,
                "systems": v.systems,
                "total_loc": v.total_lines_of_code,
                "test_coverage": v.test_coverage
            } for k, v in self.frameworks.items()}
        }

        return json.dumps(export, indent=2)


def get_federation_codex() -> FederationCodex:
    """Singleton accessor for federation codex"""
    if not hasattr(get_federation_codex, '_instance'):
        get_federation_codex._instance = FederationCodex()
    return get_federation_codex._instance


if __name__ == "__main__":
    # Demo usage
    codex = get_federation_codex()

    print(codex.generate_architecture_diagram())

    status = codex.get_codex_status()
    print("\n" + "="*90)
    print("FEDERATION CODEX STATUS REPORT")
    print("="*90)
    print(f"Total Systems: {status['total_systems']}")
    print(f"Total LOC: {status['total_lines_of_code']}")
    print(f"Total Tests: {status['total_tests']}")
    print(f"Test Density: {status['test_density']}")
    print(f"Reusable Patterns: {status['reusable_patterns']}")
    print(f"Dependency Depth: {status['dependency_depth']}")
    print(f"Quality Assessment: {status['architecture_quality']}")
