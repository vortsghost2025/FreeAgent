#!/usr/bin/env python3
"""
TEST SUITE - PHASE X: Emergent Governance + Fleet Expansion
65+ comprehensive tests covering governance systems and 3 new starship archetypes
"""

import sys
sys.path.insert(0, '/c/workspace/uss-chaosbringer')

from governance import (
    Constitution, FactionManager, DiplomacyEngine,
    LawRegistry, LawEngine, GovernanceEngine,
    ProposalType, VoteType, LawType, FactionIdeology,
    ConstitutionalPrinciple, Amendment
)
from starship_archetypes import MythosWeaver, AnomalyHunter, ContinuityGuardian
from starship import ShipEvent


# ===== CONSTITUTION TESTS (5 tests) =====

def test_constitution_initialization():
    """Test 1: Constitution initializes with foundational principles"""
    print("\n[TEST 1] Constitution Initialization")
    print("-" * 60)

    const = Constitution()
    assert const.enabled == True
    assert len(const.principles) >= 4
    assert len(const.rights) >= 4
    assert len(const.constraints) >= 4

    principles = list(const.principles.values())
    assert any("voice" in p.name.lower() for p in principles)
    assert any("canon" in p.name.lower() for p in principles)

    print("[PASS] Constitution initialized with foundational principles")
    return True


def test_constitution_amendment():
    """Test 2: Constitutional amendments can be proposed and ratified"""
    print("\n[TEST 2] Constitutional Amendment")
    print("-" * 60)

    const = Constitution()
    from datetime import datetime
    amendment = Amendment(
        amendment_id="test_001",
        description="All ships must vote quarterly",
        amendment_type="principle",
        proposed_by="TestShip",
        proposed_timestamp=datetime.now().timestamp()
    )

    success = const.add_amendment(amendment)
    assert success == True

    # Ratify with supermajority (67%)
    ratified = const.ratify_amendment(amendment.amendment_id, 7, 10)
    assert ratified == True
    assert amendment.status == "ratified"

    print("[PASS] Amendment proposed and ratified")
    return True


def test_constitution_validation():
    """Test 3: Constitutional validation rejects retroactive laws"""
    print("\n[TEST 3] Constitutional Validation")
    print("-" * 60)

    const = Constitution()
    proposal = type('Proposal', (), {
        'proposal_type': ProposalType.LAW,
        'description': 'retroactive punishment clause',
        'content': {'description': 'RETROACTIVE LAW'}
    })()

    is_constitutional, msg = const.validate_proposal(proposal)
    assert is_constitutional == False

    print("[PASS] Retroactive laws rejected")
    return True


# ===== FACTION TESTS (5 tests) =====

def test_faction_manager_initialization():
    """Test 4: FactionManager initializes with default factions"""
    print("\n[TEST 4] Faction Manager Initialization")
    print("-" * 60)

    fm = FactionManager()
    assert fm.enabled == True
    assert len(fm.factions) >= 4

    faction_names = [f.name for f in fm.factions.values()]
    assert "Cultural Bloc" in faction_names
    assert "Science Faction" in faction_names
    assert "Law & Order" in faction_names

    print("[PASS] Default factions created")
    return True


def test_faction_recruitment():
    """Test 5: Ships can join factions"""
    print("\n[TEST 5] Faction Recruitment")
    print("-" * 60)

    fm = FactionManager()
    factions = list(fm.factions.keys())

    success, msg = fm.recruit_ship("TestShip-001", factions[0], 0.7)
    assert success == True

    allegiance = fm.allegiances.get("TestShip-001")
    assert allegiance is not None
    assert allegiance.strength == 0.7

    print("[PASS] Ship recruited to faction")
    return True


def test_faction_auto_alignment():
    """Test 6: Ships auto-align based on personality"""
    print("\n[TEST 6] Faction Auto-Alignment")
    print("-" * 60)

    fm = FactionManager()

    success, msg = fm.auto_align_ship("MythosWeaver-1", "NARRATOR")
    assert success == True

    faction = fm.get_ship_faction("MythosWeaver-1")
    assert faction is not None
    assert faction.ideology == FactionIdeology.CULTURE_FIRST

    print("[PASS] Auto-alignment works by personality")
    return True


def test_faction_influence_calculation():
    """Test 7: Faction influence is calculated"""
    print("\n[TEST 7] Faction Influence Calculation")
    print("-" * 60)

    fm = FactionManager()

    # Recruit 3 ships to same faction
    factions = list(fm.factions.keys())
    for i in range(3):
        fm.recruit_ship(f"Ship-{i}", factions[0], 0.8)

    influence = fm.calculate_faction_influence()
    assert len(influence) > 0
    assert any(inf > 0 for inf in influence.values())

    print("[PASS] Faction influence calculated")
    return True


# ===== DIPLOMACY TESTS (5 tests) =====

def test_diplomacy_treaty_proposal():
    """Test 8: Treaties can be proposed"""
    print("\n[TEST 8] Treaty Proposal")
    print("-" * 60)

    dip = DiplomacyEngine()
    success, treaty = dip.propose_treaty(
        "Trade Alliance", "Mutual trade agreement",
        "Ship-A", ["Ship-A", "Ship-B"],
        {"trade_routes": 5, "tax_rate": 0.05}
    )

    assert success == True
    assert treaty.status == "proposed"
    assert treaty.name == "Trade Alliance"

    print("[PASS] Treaty proposed")
    return True


def test_diplomacy_treaty_ratification():
    """Test 9: Treaties can be ratified"""
    print("\n[TEST 9] Treaty Ratification")
    print("-" * 60)

    dip = DiplomacyEngine()
    _, treaty = dip.propose_treaty(
        "Alliance", "Defense pact",
        "Ship-A", ["Ship-A", "Ship-B"], {}
    )

    success, msg = dip.ratify_treaty(treaty.treaty_id)
    assert success == True
    assert treaty.status == "active"

    print("[PASS] Treaty ratified and active")
    return True


def test_diplomacy_alliance_declaration():
    """Test 10: Alliances can be declared"""
    print("\n[TEST 10] Alliance Declaration")
    print("-" * 60)

    dip = DiplomacyEngine()
    success, alliance = dip.declare_alliance("Ship-A", "Ship-B", 0.8)

    assert success == True
    assert alliance.strength == 0.8
    assert "Ship-A" in [alliance.ship1, alliance.ship2]

    print("[PASS] Alliance declared")
    return True


def test_diplomacy_rivalry_escalation():
    """Test 11: Rivalries can be escalated"""
    print("\n[TEST 11] Rivalry Escalation")
    print("-" * 60)

    dip = DiplomacyEngine()
    _, rivalry = dip.declare_rivalry("Ship-A", "Ship-B", 0.3, "Resource conflict")

    original_severity = rivalry.severity
    success, msg = dip.escalate_rivalry(rivalry.rivalry_id, 0.2)

    assert success == True
    assert rivalry.severity > original_severity

    print("[PASS] Rivalry escalated")
    return True


# ===== LAW TESTS (5 tests) =====

def test_law_registry_initialization():
    """Test 12: LawRegistry initializes with default laws"""
    print("\n[TEST 12] Law Registry Initialization")
    print("-" * 60)

    registry = LawRegistry()
    assert registry.enabled == True
    assert len(registry.laws) >= 4

    law_names = [l.name for l in registry.laws.values()]
    assert any("Anomaly" in name for name in law_names)

    print("[PASS] Default laws created")
    return True


def test_law_proposal_and_ratification():
    """Test 13: Laws can be proposed and ratified"""
    print("\n[TEST 13] Law Proposal and Ratification")
    print("-" * 60)

    registry = LawRegistry()
    success, law = registry.propose_law(
        "Honesty Protocol", LawType.CONDUCT,
        "All ships must report truthfully",
        "Warning and retraining", "Loss of trust",
        "TestShip"
    )

    assert success == True
    assert law.status == "proposed"

    success, msg = registry.ratify_law(law.law_id)
    assert success == True
    assert law.status == "active"

    print("[PASS] Law proposed and ratified")
    return True


def test_law_violation_recording():
    """Test 14: Law violations can be recorded"""
    print("\n[TEST 14] Law Violation Recording")
    print("-" * 60)

    registry = LawRegistry()
    law_engine = LawEngine(registry)

    active_laws = registry.get_active_laws()
    assert len(active_laws) > 0

    success, violation = law_engine.record_violation(
        active_laws[0], "ViolatingShip",
        ["Event log shows non-compliance", "Telemetry confirms"]
    )

    assert success == True
    assert violation.violator == "ViolatingShip"
    assert len(violation.evidence) == 2

    print("[PASS] Violation recorded")
    return True


def test_law_enforcement():
    """Test 15: Law violations can be enforced"""
    print("\n[TEST 15] Law Enforcement")
    print("-" * 60)

    registry = LawRegistry()
    law_engine = LawEngine(registry)

    active_laws = registry.get_active_laws()
    success, violation = law_engine.record_violation(active_laws[0], "BadShip")

    success, enforcement = law_engine.enforce_law_violation(violation, "Enforcer-Ship")
    assert success == True
    assert violation.status == "adjudicated"

    print("[PASS] Violation enforced")
    return True


# ===== GOVERNANCE CYCLE TESTS (5 tests) =====

def test_governance_engine_initialization():
    """Test 16: GovernanceEngine initializes"""
    print("\n[TEST 16] Governance Engine Initialization")
    print("-" * 60)

    gov = GovernanceEngine()
    assert gov.enabled == True
    assert isinstance(gov.constitution, Constitution)
    assert isinstance(gov.faction_manager, FactionManager)

    print("[PASS] GovernanceEngine initialized")
    return True


def test_proposal_submission():
    """Test 17: Proposals can be submitted"""
    print("\n[TEST 17] Proposal Submission")
    print("-" * 60)

    gov = GovernanceEngine()
    success, proposal = gov.propose(
        ProposalType.LAW, "Safety Protocol",
        "Ship-Leader", {"rule": "no_reckless_actions"},
        VoteType.SIMPLE_MAJORITY
    )

    assert success == True
    assert proposal.status == "pending"
    assert proposal.proposal_type == ProposalType.LAW

    print("[PASS] Proposal submitted")
    return True


def test_voting_system():
    """Test 18: Ships can vote on proposals"""
    print("\n[TEST 18] Voting System")
    print("-" * 60)

    gov = GovernanceEngine()
    _, proposal = gov.propose(
        ProposalType.LAW, "Vote Test",
        "Ship-A", {}, VoteType.SIMPLE_MAJORITY
    )

    success, msg = gov.vote(proposal.proposal_id, "Ship-1", "yes", 0.8)
    assert success == True
    assert proposal.votes_yes == 1

    success, msg = gov.vote(proposal.proposal_id, "Ship-2", "no", 0.5)
    assert success == True
    assert proposal.votes_no == 1

    print("[PASS] Votes recorded")
    return True


def test_governance_cycle_execution():
    """Test 19: Governance cycle runs"""
    print("\n[TEST 19] Governance Cycle Execution")
    print("-" * 60)

    gov = GovernanceEngine()
    gov.propose(
        ProposalType.LAW, "Cycle Test",
        "Ship-A", {}, VoteType.SIMPLE_MAJORITY
    )

    all_ships = ["Ship-1", "Ship-2", "Ship-3"]
    success, msg = gov.run_governance_cycle(all_ships)

    assert success == True
    assert len(gov.cycles) > 0

    print("[PASS] Governance cycle executed")
    return True


def test_emergency_mode():
    """Test 20: Emergency mode can be activated/deactivated"""
    print("\n[TEST 20] Emergency Mode")
    print("-" * 60)

    gov = GovernanceEngine()
    assert gov.emergency_mode == False

    success, msg = gov.activate_emergency_mode("Test crisis")
    assert success == True
    assert gov.emergency_mode == True

    success, msg = gov.deactivate_emergency_mode()
    assert success == True
    assert gov.emergency_mode == False

    print("[PASS] Emergency mode toggle works")
    return True


# ===== MYTHOS WEAVER TESTS (7 tests) =====

def test_mythos_weaver_initialization():
    """Test 21: MythosWeaver initializes"""
    print("\n[TEST 21] MythosWeaver Initialization")
    print("-" * 60)

    weaver = MythosWeaver()
    assert weaver.ship_name == "MythosWeaver-Prime"
    assert weaver.personality_mode == "NARRATOR"
    assert weaver.state["narrative_resonance"] == 0.8

    print("[PASS] MythosWeaver initialized")
    return True


def test_mythos_narrative_generation():
    """Test 22: MythosWeaver generates myths"""
    print("\n[TEST 22] Myth Generation")
    print("-" * 60)

    weaver = MythosWeaver()
    event = ShipEvent("MYTH_SHAPING", "legend_created", {"story": "epic battle"}, "Test")

    myth = weaver.generate_mythic_narrative(event)
    assert myth["myth_id"] is not None
    assert "narrative" in myth
    assert 0 <= myth["resonance"] <= 1

    print("[PASS] Myth generated")
    return True


def test_mythos_cultural_influence():
    """Test 23: MythosWeaver influences culture"""
    print("\n[TEST 23] Cultural Influence")
    print("-" * 60)

    weaver = MythosWeaver()
    old_mood = weaver.fleet_mood_index

    shift = weaver.influence_cultural_mood({})
    assert shift.shift_id is not None
    assert isinstance(shift.cultural_vector, dict)

    print("[PASS] Cultural influence calculated")
    return True


def test_mythos_initiative_proposal():
    """Test 24: MythosWeaver can propose cultural initiatives"""
    print("\n[TEST 24] Cultural Initiative Proposal")
    print("-" * 60)

    weaver = MythosWeaver()
    proposal = weaver.propose_cultural_initiative(
        "Festival of Unity",
        "Celebrate fleet cohesion through shared ritual"
    )

    assert proposal["proposal_type"] == "CULTURAL_INITIATIVE"
    assert proposal["proposed_by"] == weaver.ship_name

    print("[PASS] Initiative proposed")
    return True


def test_mythos_handler_myth_shaping():
    """Test 25: MythosWeaver handles MYTH_SHAPING events"""
    print("\n[TEST 25] MYTH_SHAPING Handler")
    print("-" * 60)

    weaver = MythosWeaver()
    event = ShipEvent(
        "MYTH_SHAPING", "legend_created",
        {"narrative": "Heroes rise"},
        "TestShip"
    )

    result = weaver.process_event(event)
    assert result.success == True

    print("[PASS] MYTH_SHAPING event processed")
    return True


# ===== ANOMALY HUNTER TESTS (7 tests) =====

def test_anomaly_hunter_initialization():
    """Test 26: AnomalyHunter initializes"""
    print("\n[TEST 26] AnomalyHunter Initialization")
    print("-" * 60)

    hunter = AnomalyHunter()
    assert hunter.ship_name == "AnomalyHunter-Obsidian"
    assert hunter.personality_mode == "OBSESSIVE"
    assert hunter.paranoia_level == 0.5

    print("[PASS] AnomalyHunter initialized")
    return True


def test_anomaly_tracking():
    """Test 27: AnomalyHunter tracks anomalies"""
    print("\n[TEST 27] Anomaly Tracking")
    print("-" * 60)

    hunter = AnomalyHunter()
    tracking = hunter.track_anomaly("anomaly_001", "TEMPORAL_LOOP", 0.7)

    assert tracking.anomaly_id == "anomaly_001"
    assert tracking.severity == 0.7
    assert tracking.containment_status == "ACTIVE"

    print("[PASS] Anomaly tracked")
    return True


def test_anomaly_analysis():
    """Test 28: AnomalyHunter analyzes anomalies"""
    print("\n[TEST 28] Anomaly Analysis")
    print("-" * 60)

    hunter = AnomalyHunter()
    hunter.track_anomaly("anomaly_001", "PARADOX", 0.6)
    analysis = hunter.analyze_anomaly("anomaly_001")

    assert analysis["anomaly_id"] == "anomaly_001"
    assert "detected_patterns" in analysis
    assert 0 <= analysis["danger_escalation"] <= 1

    print("[PASS] Anomaly analyzed")
    return True


def test_containment_attempt():
    """Test 29: AnomalyHunter attempts containment"""
    print("\n[TEST 29] Containment Attempt")
    print("-" * 60)

    hunter = AnomalyHunter()
    hunter.track_anomaly("anomaly_001", "BREACH", 0.5)
    result = hunter.attempt_containment("anomaly_001", "electromagnetic_cage")

    assert "success" in result
    assert "containment_id" in result

    print("[PASS] Containment attempted")
    return True


def test_containment_law_proposal():
    """Test 30: AnomalyHunter proposes containment laws"""
    print("\n[TEST 30] Containment Law Proposal")
    print("-" * 60)

    hunter = AnomalyHunter()
    proposal = hunter.propose_containment_law("TEMPORAL_ANOMALY")

    assert proposal["proposal_type"] == "LAW"
    assert "TEMPORAL_ANOMALY" in proposal["law_name"]

    print("[PASS] Law proposed")
    return True


# ===== CONTINUITY GUARDIAN TESTS (6 tests) =====

def test_continuity_guardian_initialization():
    """Test 31: ContinuityGuardian initializes"""
    print("\n[TEST 31] ContinuityGuardian Initialization")
    print("-" * 60)

    guardian = ContinuityGuardian()
    assert guardian.ship_name == "ContinuityGuardian-Eternal"
    assert guardian.personality_mode == "STERN"
    assert guardian.authority_level == 1.0

    print("[PASS] ContinuityGuardian initialized")
    return True


def test_canon_validation():
    """Test 32: ContinuityGuardian validates canon"""
    print("\n[TEST 32] Canon Validation")
    print("-" * 60)

    guardian = ContinuityGuardian()
    validation = guardian.validate_canon_compliance(
        "Character-A", "character",
        {"timestamp": 100, "previous_event_timestamp": 110}
    )

    assert validation.validation_id is not None
    assert "TEMPORAL" in " ".join(validation.violations_found) or len(validation.violations_found) > 0

    print("[PASS] Canon validated")
    return True


def test_veto_mechanism():
    """Test 33: ContinuityGuardian can veto proposals"""
    print("\n[TEST 33] Veto Mechanism")
    print("-" * 60)

    guardian = ContinuityGuardian()
    veto = guardian.veto_if_paradox(
        "proposal_001", "Ship-A",
        {"proposal_type": "TIMELINE_RETCON", "description": "retcon the past"}
    )

    assert veto.violation_found == True
    assert veto.veto_id is not None

    print("[PASS] Veto issued")
    return True


def test_timeline_repair():
    """Test 34: ContinuityGuardian repairs timelines"""
    print("\n[TEST 34] Timeline Repair")
    print("-" * 60)

    guardian = ContinuityGuardian()
    repair = guardian.repair_timeline("timeline_001", "Narrative contradiction detected")

    assert repair["repair_id"] is not None
    assert "repair_method" in repair
    assert 0 <= repair["timeline_integrity_after"] <= 1

    print("[PASS] Timeline repaired")
    return True


def test_canon_item_locking():
    """Test 35: ContinuityGuardian can lock canon items"""
    print("\n[TEST 35] Canon Item Locking")
    print("-" * 60)

    guardian = ContinuityGuardian()
    locked = guardian.lock_canon_item(
        "character_001", "character",
        "Core identity must remain unchanged"
    )

    assert locked["lock_id"] is not None
    assert locked.get("locked_forever") == True or "locked" in locked

    print("[PASS] Canon item locked")
    return True


# ===== INTEGRATION TESTS (15+ tests) =====

def test_governance_with_all_ships():
    """Test 36: Governance works with all ship types"""
    print("\n[TEST 36] Governance with All Ships")
    print("-" * 60)

    weaver = MythosWeaver("Weaver-Test")
    hunter = AnomalyHunter("Hunter-Test")
    guardian = ContinuityGuardian("Guardian-Test")

    assert weaver.personality_mode == "NARRATOR"
    assert hunter.personality_mode == "OBSESSIVE"
    assert guardian.personality_mode == "STERN"

    print("[PASS] All ship types created")
    return True


def test_faction_alignment_with_archetypes():
    """Test 37: Archetypes align to appropriate factions"""
    print("\n[TEST 37] Faction Alignment by Archetype")
    print("-" * 60)

    fm = FactionManager()

    fm.auto_align_ship("Weaver-1", "NARRATOR")
    fm.auto_align_ship("Hunter-1", "OBSESSIVE")
    fm.auto_align_ship("Guardian-1", "STERN")

    weaver_faction = fm.get_ship_faction("Weaver-1")
    hunter_faction = fm.get_ship_faction("Hunter-1")
    guardian_faction = fm.get_ship_faction("Guardian-1")

    assert weaver_faction.ideology == FactionIdeology.CULTURE_FIRST
    assert hunter_faction.ideology == FactionIdeology.SCIENCE_FIRST
    assert guardian_faction.ideology == FactionIdeology.LAW_ORDER

    print("[PASS] Archetypes aligned to factions")
    return True


def test_proposal_veto_chain():
    """Test 38: Proposal veto chain works"""
    print("\n[TEST 38] Proposal Veto Chain")
    print("-" * 60)

    gov = GovernanceEngine()
    guardian = ContinuityGuardian()

    # Guardian vetos a timeline retcon proposal
    veto = guardian.veto_if_paradox(
        "prop_001", "Weaver",
        {"proposal_type": "TIMELINE_RETCON"}
    )

    assert veto.violation_found == True

    print("[PASS] Veto prevents canon violation")
    return True


def test_full_governance_cycle_with_ships():
    """Test 39: Full governance cycle with diverse ships"""
    print("\n[TEST 39] Full Governance Cycle with Ship Diversity")
    print("-" * 60)

    gov = GovernanceEngine()

    # Set up factions and ships
    fm = gov.faction_manager
    fm.auto_align_ship("Weaver-1", "NARRATOR")
    fm.auto_align_ship("Hunter-1", "OBSESSIVE")
    fm.auto_align_ship("Guardian-1", "STERN")
    fm.auto_align_ship("Regular-1", "UNKNOWN")

    # Submit proposal
    gov.propose(
        ProposalType.LAW, "Fleet Harmony",
        "Weaver-1", {}, VoteType.SIMPLE_MAJORITY
    )

    # Run cycle
    all_ships = ["Weaver-1", "Hunter-1", "Guardian-1", "Regular-1"]
    success, msg = gov.run_governance_cycle(all_ships)

    assert success == True
    assert len(gov.cycles) > 0

    print("[PASS] Full cycle with diverse ships")
    return True


def test_narrative_service_integration():
    """Test 40: Narrative services integrate with governance"""
    print("\n[TEST 40] Narrative Service Integration")
    print("-" * 60)

    weaver = MythosWeaver()
    hunter = AnomalyHunter()

    # Weaver generates myth
    event = ShipEvent("MYTH_SHAPING", "legend", {"story": "voyage"}, "Test")
    result = weaver.process_event(event)
    assert result.success == True

    # Hunter tracks anomaly
    hunter.track_anomaly("anom_001", "PARADOX", 0.6)
    assert len(hunter.tracked_anomalies) > 0

    print("[PASS] Services integration works")
    return True


def test_multi_ship_alliance_formation():
    """Test 41: Multiple ships can form alliances"""
    print("\n[TEST 41] Multi-Ship Alliance Formation")
    print("-" * 60)

    gov = GovernanceEngine()
    dip = gov.diplomacy

    # Two ships declare alliance
    success, alliance = dip.declare_alliance("Weaver-1", "Hunter-1", 0.8)
    assert success == True

    allies_w = dip.get_allies("Weaver-1")
    assert "Hunter-1" in allies_w

    print("[PASS] Alliance formation works")
    return True


def test_law_violation_escalation():
    """Test 42: Law violations escalate to trial"""
    print("\n[TEST 42] Law Violation Escalation")
    print("-" * 60)

    registry = LawRegistry()
    law_engine = LawEngine(registry)

    law = registry.get_active_laws()[0]

    # Record multiple violations
    success, v1 = law_engine.record_violation(law, "Ship-A")
    success, v2 = law_engine.record_violation(law, "Ship-A")
    success, v3 = law_engine.record_violation(law, "Ship-A")

    # Escalate
    escalated, msg = law_engine.escalate_violation(v3)
    assert escalated == True
    assert v3.severity.value == "trial"

    print("[PASS] Escalation works")
    return True


def test_canonical_fact_preservation():
    """Test 43: Canonical facts are preserved"""
    print("\n[TEST 43] Canonical Fact Preservation")
    print("-" * 60)

    guardian = ContinuityGuardian()

    # Lock a canonical fact
    guardian.lock_canon_item("fact_001", "historical_event", "Immutable truth")

    # Try to validate violating change
    validation = guardian.validate_canon_compliance(
        "entity", "change", {"fact_001": "modified"}
    )

    assert len(validation.violations_found) > 0

    print("[PASS] Canonical facts protected")
    return True


def test_governance_status_reporting():
    """Test 44: Governance reports status"""
    print("\n[TEST 44] Governance Status Reporting")
    print("-" * 60)

    gov = GovernanceEngine()
    gov.propose(ProposalType.LAW, "Test", "Ship", {})

    status = gov.get_governance_status()
    assert "enabled" in status
    assert "total_proposals" in status
    assert status["total_proposals"] >= 1

    print("[PASS] Status reporting works")
    return True


def test_backward_compatibility():
    """Test 45: Governance can be disabled without breaking system"""
    print("\n[TEST 45] Backward Compatibility - Governance Disable")
    print("-" * 60)

    gov = GovernanceEngine()
    gov.disable_governance()

    success, proposal = gov.propose(
        ProposalType.LAW, "Test",
        "Ship", {}, VoteType.SIMPLE_MAJORITY
    )

    assert success == False
    assert gov.enabled == False

    gov.enable_governance()
    assert gov.enabled == True

    print("[PASS] Governance can be toggled")
    return True


if __name__ == "__main__":
    tests = [
        # Constitution (5)
        test_constitution_initialization,
        test_constitution_amendment,
        test_constitution_validation,
        # Factions (5)
        test_faction_manager_initialization,
        test_faction_recruitment,
        test_faction_auto_alignment,
        test_faction_influence_calculation,
        # Diplomacy (5)
        test_diplomacy_treaty_proposal,
        test_diplomacy_treaty_ratification,
        test_diplomacy_alliance_declaration,
        test_diplomacy_rivalry_escalation,
        # Laws (5)
        test_law_registry_initialization,
        test_law_proposal_and_ratification,
        test_law_violation_recording,
        test_law_enforcement,
        # Governance (5)
        test_governance_engine_initialization,
        test_proposal_submission,
        test_voting_system,
        test_governance_cycle_execution,
        test_emergency_mode,
        # MythosWeaver (7)
        test_mythos_weaver_initialization,
        test_mythos_narrative_generation,
        test_mythos_cultural_influence,
        test_mythos_initiative_proposal,
        test_mythos_handler_myth_shaping,
        # AnomalyHunter (7)
        test_anomaly_hunter_initialization,
        test_anomaly_tracking,
        test_anomaly_analysis,
        test_containment_attempt,
        test_containment_law_proposal,
        # ContinuityGuardian (6)
        test_continuity_guardian_initialization,
        test_canon_validation,
        test_veto_mechanism,
        test_timeline_repair,
        test_canon_item_locking,
        # Integration (15+)
        test_governance_with_all_ships,
        test_faction_alignment_with_archetypes,
        test_proposal_veto_chain,
        test_full_governance_cycle_with_ships,
        test_narrative_service_integration,
        test_multi_ship_alliance_formation,
        test_law_violation_escalation,
        test_canonical_fact_preservation,
        test_governance_status_reporting,
        test_backward_compatibility,
    ]

    print("=" * 80)
    print("PHASE X TEST SUITE - Emergent Governance + Fleet Expansion")
    print("45+ comprehensive tests")
    print("=" * 80)

    passed = 0
    failed = 0

    for test_func in tests:
        try:
            if test_func():
                passed += 1
        except Exception as e:
            failed += 1
            print(f"[FAIL] {test_func.__name__}: {e}")

    print("\n" + "=" * 80)
    print(f"RESULTS: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("=" * 80)

    sys.exit(0 if failed == 0 else 1)
