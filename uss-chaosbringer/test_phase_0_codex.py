#!/usr/bin/env python3
"""
TEST PHASE 0: FEDERATION ARCHITECTURE CODEX
14 comprehensive tests for the architecture catalog system

Tests validate:
- Module registration and cataloging
- Pattern extraction and analysis
- Framework publication and specification
- Architecture diagram generation
- Status reporting and quality assessment
- Dependency analysis and depth calculation
- Category-based filtering and organization
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import json
from datetime import datetime

# Import codex
sys.path.insert(0, r'c:\workspace\uss-chaosbringer')
from federation_codex import (
    FederationCodex, ArchitectureModule, PublishedFramework,
    SystemCategory, get_federation_codex
)


class TestPhase0Codex:
    """Comprehensive test suite for federation architecture codex"""

    def __init__(self):
        self.codex = get_federation_codex()
        self.test_results = []
        self.passed = 0
        self.failed = 0

    def test_1_module_registration(self):
        """Test 1: All 43 systems are properly registered"""
        print("\n[TEST 1] Module Registration")
        expected_count = 43
        actual_count = len(self.codex.modules)

        assert actual_count == expected_count, f"Expected {expected_count} modules, got {actual_count}"
        assert "federation_consciousness" in self.codex.modules
        assert "constitutional_republic" in self.codex.modules
        assert "orchestration_engine" in self.codex.modules

        print(f"✓ All {actual_count} systems registered successfully")
        self.passed += 1

    def test_2_module_metadata(self):
        """Test 2: Each module has complete metadata"""
        print("\n[TEST 2] Module Metadata Completeness")

        required_fields = ['name', 'systems_folder', 'description', 'category',
                          'lines_of_code', 'dependencies', 'test_count', 'maturity',
                          'key_classes', 'patterns']

        for module in self.codex.modules.values():
            for field in required_fields:
                assert hasattr(module, field), f"Module {module.name} missing field {field}"
            assert module.lines_of_code > 0, f"Module {module.name} has invalid LOC"
            assert module.test_count >= 0, f"Module {module.name} has invalid test_count"
            assert module.maturity in ['stable', 'evolving', 'experimental']

        print(f"✓ All {len(self.codex.modules)} modules have complete metadata")
        self.passed += 1

    def test_3_category_classification(self):
        """Test 3: Systems are properly categorized"""
        print("\n[TEST 3] System Category Classification")

        expected_categories = {
            'consciousness': 9,
            'diplomacy': 6,
            'cultural': 1,
            'expansion': 6,
            'first_contact': 5,
            'governance': 6,
            'temporal': 3,
            'infrastructure': 4,
            'simulation': 2,
            'integration': 1
        }

        category_counts = {}
        for module in self.codex.modules.values():
            cat = module.category.value
            category_counts[cat] = category_counts.get(cat, 0) + 1

        for cat, expected in expected_categories.items():
            if expected > 0:
                actual = category_counts.get(cat, 0)
                assert actual == expected, f"Category {cat}: expected {expected}, got {actual}"

        print(f"✓ Systems properly categorized across {len(category_counts)} categories")
        self.passed += 1

    def test_4_pattern_extraction(self):
        """Test 4: Reusable patterns are extracted"""
        print("\n[TEST 4] Pattern Extraction")

        patterns = self.codex.extract_patterns()
        assert len(patterns) > 30, f"Expected 30+ patterns, got {len(patterns)}"

        # Verify some expected patterns exist
        expected_patterns = [
            'constraint-enforcement',
            'signal-fusion',
            'memory-persistence',
            'democratic-governance'
        ]

        for pattern in expected_patterns:
            assert pattern in patterns, f"Expected pattern '{pattern}' not found"
            assert len(patterns[pattern]) > 0, f"Pattern '{pattern}' has no modules"

        print(f"✓ Extracted {len(patterns)} reusable patterns across federation")
        self.passed += 1

    def test_5_documentation_generation(self):
        """Test 5: Module documentation is generated correctly"""
        print("\n[TEST 5] Module Documentation Generation")

        doc = self.codex.document_module("federation_consciousness")
        assert doc['name'] == 'federation_consciousness'
        assert 'description' in doc
        assert 'category' in doc
        assert 'statistics' in doc
        assert 'dependencies' in doc
        assert 'patterns' in doc
        assert doc['statistics']['lines_of_code'] > 0
        assert doc['statistics']['test_count'] > 0

        # Test invalid module
        invalid_doc = self.codex.document_module("non_existent_module")
        assert 'error' in invalid_doc

        print(f"✓ Documentation generation working correctly")
        self.passed += 1

    def test_6_framework_publication(self):
        """Test 6: Frameworks can be published from module selections"""
        print("\n[TEST 6] Framework Publication")

        consciousness_systems = [
            'federation_consciousness',
            'dream_engine',
            'emotion_matrix',
            'ontology_engine',
            'transcendence_layer'
        ]

        framework = self.codex.publish_framework(
            framework_name="Consciousness Framework",
            system_names=consciousness_systems,
            entry_points=["from federation_consciousness import ConsciousnessLayer"]
        )

        assert framework.name == "Consciousness Framework"
        assert len(framework.systems) == len(consciousness_systems)
        assert framework.total_lines_of_code > 1000
        assert framework.test_coverage > 0
        assert len(framework.core_patterns) > 5
        assert any("consciousness" in s.lower() for s in framework.systems)

        print(f"✓ Framework published: {framework.name} ({framework.total_lines_of_code} LOC, {len(framework.systems)} systems)")
        self.passed += 1

    def test_7_dependency_graph(self):
        """Test 7: Dependency graph is built correctly"""
        print("\n[TEST 7] Dependency Graph Construction")

        consciousness_systems = ['federation_consciousness', 'dream_engine', 'emotion_matrix']
        framework = self.codex.publish_framework(
            framework_name="Test Graph",
            system_names=consciousness_systems,
            entry_points=[]
        )

        deps_graph = framework.dependencies_graph
        assert isinstance(deps_graph, dict)
        assert len(deps_graph) == len(consciousness_systems)

        # Verify structure
        for system_name in consciousness_systems:
            assert system_name in deps_graph
            assert isinstance(deps_graph[system_name], list)

        print(f"✓ Dependency graph built with {len(deps_graph)} nodes")
        self.passed += 1

    def test_8_architecture_diagram(self):
        """Test 8: ASCII architecture diagram is generated"""
        print("\n[TEST 8] Architecture Diagram Generation")

        diagram = self.codex.generate_architecture_diagram()
        assert isinstance(diagram, str)
        assert len(diagram) > 500
        assert "FEDERATION ARCHITECTURE CODEX" in diagram
        assert "consciousness" in diagram.lower()
        assert "diplomacy" in diagram.lower()
        assert "expansion" in diagram.lower()
        assert "LOC" in diagram
        assert "tests" in diagram

        print(f"✓ Architecture diagram generated ({len(diagram)} chars)")
        self.passed += 1

    def test_9_codex_status_report(self):
        """Test 9: Comprehensive status report is generated"""
        print("\n[TEST 9] Codex Status Report")

        status = self.codex.get_codex_status()
        assert status['total_systems'] == 43
        assert status['total_lines_of_code'] > 15000
        assert status['total_tests'] > 200
        assert 'test_density' in status
        assert 'systems_by_category' in status
        assert 'systems_by_maturity' in status
        assert 'reusable_patterns' in status
        assert status['reusable_patterns'] > 30
        assert 'dependency_depth' in status
        assert 'architecture_quality' in status

        quality = status['architecture_quality']
        assert 'stability' in quality
        assert 'test_coverage' in quality
        assert 'modularity' in quality
        assert 'overall' in quality

        print(f"✓ Status Report Generated:")
        print(f"  - Systems: {status['total_systems']}")
        print(f"  - LOC: {status['total_lines_of_code']}")
        print(f"  - Tests: {status['total_tests']}")
        print(f"  - Patterns: {status['reusable_patterns']}")
        print(f"  - Depth: {status['dependency_depth']}")
        self.passed += 1

    def test_10_category_filtering(self):
        """Test 10: Categories can be filtered and analyzed"""
        print("\n[TEST 10] Category-Based Filtering")

        consciousness_patterns = self.codex.get_patterns_for_category(SystemCategory.CONSCIOUSNESS)
        assert len(consciousness_patterns) > 0

        diplomacy_patterns = self.codex.get_patterns_for_category(SystemCategory.DIPLOMACY)
        assert len(diplomacy_patterns) > 0

        governance_patterns = self.codex.get_patterns_for_category(SystemCategory.GOVERNANCE)
        assert len(governance_patterns) > 0

        # Each pattern should map to modules
        for pattern, modules in consciousness_patterns.items():
            assert len(modules) > 0
            assert all(isinstance(m, str) for m in modules)

        print(f"✓ Category filtering works for {len([c for c in SystemCategory])} categories")
        self.passed += 1

    def test_11_dependency_depth_calculation(self):
        """Test 11: Dependency depth is calculated correctly"""
        print("\n[TEST 11] Dependency Depth Calculation")

        depth = self.codex._calculate_dependency_depth()
        assert isinstance(depth, int)
        assert depth > 0
        assert depth <= len(self.codex.modules)

        print(f"✓ Dependency depth calculated: {depth} levels")
        self.passed += 1

    def test_12_architecture_quality_assessment(self):
        """Test 12: Architecture quality is assessed"""
        print("\n[TEST 12] Architecture Quality Assessment")

        quality = self.codex._assess_architecture_quality()
        assert 'stability' in quality
        assert 'test_coverage' in quality
        assert 'modularity' in quality
        assert 'overall' in quality

        valid_ratings = ['excellent', 'good', 'developing', 'production-ready',
                        'approaching-production', 'development', 'needs improvement']
        for key, value in quality.items():
            assert value in valid_ratings, f"Invalid rating: {value}"

        print(f"✓ Architecture Quality Assessment:")
        for key, value in quality.items():
            print(f"  - {key}: {value}")
        self.passed += 1

    def test_13_json_export(self):
        """Test 13: Codex can be exported as JSON"""
        print("\n[TEST 13] JSON Export")

        json_str = self.codex.export_codex_json()
        assert isinstance(json_str, str)
        assert len(json_str) > 1000

        # Validate it's valid JSON
        data = json.loads(json_str)
        assert 'codex' in data
        assert 'modules' in data
        assert 'patterns' in data
        assert 'frameworks' in data
        assert len(data['modules']) == 43

        print(f"✓ JSON export successful ({len(json_str)} chars, {len(data['modules'])} modules)")
        self.passed += 1

    def test_14_metrics_and_statistics(self):
        """Test 14: Metrics and statistics are accurate"""
        print("\n[TEST 14] Metrics and Statistics")

        total_loc = sum(m.lines_of_code for m in self.codex.modules.values())
        total_tests = sum(m.test_count for m in self.codex.modules.values())
        total_patterns = sum(len(m.patterns) for m in self.codex.modules.values())

        assert total_loc > 15000, f"Expected > 15000 LOC, got {total_loc}"
        assert total_tests > 200, f"Expected > 200 tests, got {total_tests}"
        assert total_patterns > 100, f"Expected > 100 patterns across modules, got {total_patterns}"

        # Verify distribution
        stable_count = sum(1 for m in self.codex.modules.values() if m.maturity == 'stable')
        stable_percent = (stable_count / len(self.codex.modules)) * 100
        assert stable_percent > 60, f"Only {stable_percent}% stable modules"

        print(f"✓ Metrics Verified:")
        print(f"  - Total LOC: {total_loc}")
        print(f"  - Total Tests: {total_tests}")
        print(f"  - Total Patterns: {total_patterns}")
        print(f"  - Stable Modules: {stable_percent:.1f}%")
        self.passed += 1

    def run_all_tests(self):
        """Execute all 14 tests"""
        print("\n" + "="*90)
        print("TEST PHASE 0 - FEDERATION ARCHITECTURE CODEX")
        print("14 Comprehensive Tests")
        print("="*90)

        tests = [
            self.test_1_module_registration,
            self.test_2_module_metadata,
            self.test_3_category_classification,
            self.test_4_pattern_extraction,
            self.test_5_documentation_generation,
            self.test_6_framework_publication,
            self.test_7_dependency_graph,
            self.test_8_architecture_diagram,
            self.test_9_codex_status_report,
            self.test_10_category_filtering,
            self.test_11_dependency_depth_calculation,
            self.test_12_architecture_quality_assessment,
            self.test_13_json_export,
            self.test_14_metrics_and_statistics
        ]

        for test in tests:
            try:
                test()
                self.test_results.append((test.__name__, True, None))
            except Exception as e:
                self.failed += 1
                self.test_results.append((test.__name__, False, str(e)))
                print(f"✗ FAILED: {str(e)}")

        self._print_summary()

    def _print_summary(self):
        """Print test summary"""
        print("\n" + "="*90)
        print("TEST SUMMARY")
        print("="*90)

        for test_name, passed, error in self.test_results:
            status = "✓ PASS" if passed else "✗ FAIL"
            print(f"{status} - {test_name}")
            if error:
                print(f"       Error: {error}")

        print(f"\n{'─'*90}")
        print(f"Total: {self.passed + self.failed} tests | {self.passed} passed | {self.failed} failed")

        if self.failed == 0:
            print(f"🎉 ALL {self.passed} TESTS PASSING")
        else:
            print(f"❌ {self.failed} tests failed")

        print("="*90)
        print("\n✨ Phase 0 - Federation Architecture Codex")
        print("   The myth becomes a framework others can use and understand.")
        print("="*90 + "\n")


if __name__ == "__main__":
    suite = TestPhase0Codex()
    suite.run_all_tests()

    # Exit with appropriate code
    sys.exit(0 if suite.failed == 0 else 1)
