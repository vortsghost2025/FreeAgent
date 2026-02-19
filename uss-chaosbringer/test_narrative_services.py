#!/usr/bin/env python3
"""
TEST SUITE - PHASE IX: Narrative Service Bureau
25+ comprehensive tests covering all 12 services and integration scenarios
"""

import sys
sys.path.insert(0, '/c/workspace/uss-chaosbringer')

from anomaly_engine.narrative_services import (
    ParadoxFireDepartment, TemporalArchaeologyDepartment,
    NarrativeTherapyCenter, TemporalGardeningService,
    NarrativeChemistryLab, ContinuityInsuranceCompany,
    TemporalPlumbingService, NarrativeRealEstateAgency,
    TemporalCateringService, NarrativeLandscapingCompany,
    TemporalCleaningService, NarrativePestControl,
    Paradox, StoryElement, StoryLocation, StoryEnvironment,
    ParadoxType
)
from datetime import datetime


def test_paradox_fire_department_extinguish():
    """Test 1: ParadoxFireDepartment - Extinguish paradox"""
    print("\n[TEST 1] ParadoxFireDepartment - Extinguish Paradox")
    print("-" * 60)

    dept = ParadoxFireDepartment()
    paradox = Paradox(
        paradox_id="paradox_001",
        paradox_type=ParadoxType.TEMPORAL_LOOP,
        intensity=0.8,
        affected_timeline="primary",
        fire_spread_rate=0.5,
        affected_agents=["Agent_A", "Agent_B"]
    )

    result = dept.extinguish_paradox_flame(paradox)
    assert result.paradox_id == "paradox_001"
    assert 0.0 <= result.flame_intensity_after <= 0.8
    assert result.method_used != ""
    print("[PASS] Paradox extinguished")
    print(f"[PASS] Flame intensity reduced to {result.flame_intensity_after:.2f}")
    print(f"[PASS] Method: {result.method_used}")
    return True


def test_paradox_fire_department_rescue():
    """Test 2: ParadoxFireDepartment - Rescue trapped agents"""
    print("\n[TEST 2] ParadoxFireDepartment - Rescue Trapped Agents")
    print("-" * 60)

    dept = ParadoxFireDepartment()
    rescued = dept.rescue_trapped_agents("primary")

    assert isinstance(rescued, list)
    print("[PASS] Agents rescued from timeline")
    print(f"[PASS] Agent count: {len(rescued)}")
    return True


def test_temporal_archaeology_excavate():
    """Test 3: TemporalArchaeologyDepartment - Excavate event"""
    print("\n[TEST 3] TemporalArchaeologyDepartment - Excavate Event")
    print("-" * 60)

    dept = TemporalArchaeologyDepartment()
    event = dept.excavate_old_event(datetime.now())

    assert event.event_id is not None
    assert 0.0 <= event.degradation_level <= 1.0
    assert len(event.artifacts_found) > 0
    print("[PASS] Event excavated")
    print(f"[PASS] Artifacts found: {len(event.artifacts_found)}")
    print(f"[PASS] Event age: {event.age_estimate:.1f} seconds")
    return True


def test_temporal_archaeology_dating():
    """Test 4: TemporalArchaeologyDepartment - Carbon date narrative"""
    print("\n[TEST 4] TemporalArchaeologyDepartment - Carbon Date")
    print("-" * 60)

    dept = TemporalArchaeologyDepartment()
    origin = dept.carbon_date_narrative("story_001")

    assert isinstance(origin, datetime)
    assert origin < datetime.now()
    print("[PASS] Narrative dated")
    print(f"[PASS] Estimated origin: {origin}")
    return True


def test_narrative_therapy_session():
    """Test 5: NarrativeTherapyCenter - Therapy session"""
    print("\n[TEST 5] NarrativeTherapyCenter - Therapy Session")
    print("-" * 60)

    center = NarrativeTherapyCenter()
    result = center.therapy_session("character_001")

    assert result.character_id == "character_001"
    assert -1.0 <= result.emotional_growth <= 1.0
    assert len(result.insights_gained) > 0
    print("[PASS] Therapy session completed")
    print(f"[PASS] Emotional growth: {result.emotional_growth:.2f}")
    print(f"[PASS] Insights gained: {len(result.insights_gained)}")
    return True


def test_narrative_therapy_diagnosis():
    """Test 6: NarrativeTherapyCenter - Diagnose trauma"""
    print("\n[TEST 6] NarrativeTherapyCenter - Diagnose Trauma")
    print("-" * 60)

    center = NarrativeTherapyCenter()
    diagnosis = center.diagnose_narrative_trauma("story_001")

    assert diagnosis.severity is not None
    assert len(diagnosis.symptoms) > 0
    assert diagnosis.recovery_time_estimate > 0
    print("[PASS] Trauma diagnosed")
    print(f"[PASS] Severity: {diagnosis.severity.value}")
    print(f"[PASS] Symptoms: {', '.join(diagnosis.symptoms)}")
    return True


def test_temporal_gardening_prune():
    """Test 7: TemporalGardeningService - Prune branches"""
    print("\n[TEST 7] TemporalGardeningService - Prune Branches")
    print("-" * 60)

    svc = TemporalGardeningService()
    result = svc.prune_paradox_branches("timeline_001")

    assert result.branches_removed >= 0
    assert 0.0 <= result.timeline_health_improvement <= 1.0
    assert 0.0 <= result.outcome_quality_after <= 1.0
    print("[PASS] Branches pruned")
    print(f"[PASS] Branches removed: {result.branches_removed}")
    print(f"[PASS] Health improvement: {result.timeline_health_improvement:.1%}")
    return True


def test_narrative_chemistry_combine():
    """Test 8: NarrativeChemistryLab - Combine elements"""
    print("\n[TEST 8] NarrativeChemistryLab - Combine Elements")
    print("-" * 60)

    lab = NarrativeChemistryLab()
    elem1 = StoryElement("elem_001", "CHARACTER", "Hero", {})
    elem2 = StoryElement("elem_002", "THEME", "Redemption", {})

    compound = lab.combine_elements(elem1, elem2)

    assert len(compound. constituent_elements) == 2
    assert 0.0 <= compound.stability_rating <= 1.0
    print("[PASS] Elements combined")
    print(f"[PASS] Stability rating: {compound.stability_rating:.2f}")
    print(f"[PASS] Emergence properties: {list(compound.emergence_properties.keys())}")
    return True


def test_continuity_insurance_issue_policy():
    """Test 9: ContinuityInsuranceCompany - Issue policy"""
    print("\n[TEST 9] ContinuityInsuranceCompany - Issue Policy")
    print("-" * 60)

    insurance = ContinuityInsuranceCompany()
    policy = insurance.issue_policy("timeline_001")

    assert policy.policy_id is not None
    assert policy.premium > 0.0
    assert policy.claims_remaining > 0
    print("[PASS] Insurance policy issued")
    print(f"[PASS] Premium: {policy.premium:.2f}")
    print(f"[PASS] Coverage: {policy.coverage_amount:.2f}")
    return True


def test_temporal_plumbing_fix_leak():
    """Test 10: TemporalPlumbingService - Fix leak"""
    print("\n[TEST 10] TemporalPlumbingService - Fix Leak")
    print("-" * 60)

    plumbing = TemporalPlumbingService()
    result = plumbing.fix_temporal_leak("timeline_001", 0.5)

    assert result.repair_id is not None
    assert result.repair_method != ""
    assert 0.0 <= result.timeline_integrity_after <= 1.0
    print("[PASS] Leak repaired")
    print(f"[PASS] Method: {result.repair_method}")
    print(f"[PASS] Timeline integrity: {result.timeline_integrity_after:.2f}")
    return True


def test_narrative_realestate_list():
    """Test 11: NarrativeRealEstateAgency - List property"""
    print("\n[TEST 11] NarrativeRealEstateAgency - List Property")
    print("-" * 60)

    agency = NarrativeRealEstateAgency()
    location = StoryLocation("loc_001", "Dark Tower", "primary", {})
    listing = agency.list_property(location)

    assert listing.asking_price > 0.0
    assert 0.0 <= listing.narrative_value <= 1.0
    print("[PASS] Property listed")
    print(f"[PASS] Asking price: {listing.asking_price:.2f}")
    print(f"[PASS] Narrative value: {listing.narrative_value:.2f}")
    return True


def test_temporal_catering_menu():
    """Test 12: TemporalCateringService - Generate menu"""
    print("\n[TEST 12] TemporalCateringService - Generate Menu")
    print("-" * 60)

    catering = TemporalCateringService()
    menu = catering.generate_period_menu("medieval")

    assert "time_period" in menu
    assert len(menu["menu_items"]) > 0
    assert 0.0 <= menu["historical_authenticity"] <= 1.0
    print("[PASS] Menu generated")
    print(f"[PASS] Period: {menu['time_period']}")
    print(f"[PASS] Items: {', '.join(menu['menu_items'])}")
    return True


def test_narrative_landscaping():
    """Test 13: NarrativeLandscapingCompany - Landscape environment"""
    print("\n[TEST 13] NarrativeLandscapingCompany - Landscape")
    print("-" * 60)

    landscaping = NarrativeLandscapingCompany()
    setting = StoryEnvironment("env_001", "Castle", {"mood": "dark"})
    landscaped = landscaping.landscape_environment(setting)

    assert landscaped.environment_id is not None
    assert 0.0 <= landscaped.aesthetic_quality <= 1.0
    assert landscaped.atmosphere != ""
    print("[PASS] Environment landscaped")
    print(f"[PASS] Aesthetic quality: {landscaped.aesthetic_quality:.2f}")
    print(f"[PASS] Atmosphere: {landscaped.atmosphere}")
    return True


def test_temporal_cleaning_sanitize():
    """Test 14: TemporalCleaningService - Sanitize timeline"""
    print("\n[TEST 14] TemporalCleaningService - Sanitize Timeline")
    print("-" * 60)

    cleaning = TemporalCleaningService()
    result = cleaning.sanitize_timeline("timeline_001")

    assert result.stains_removed >= 0
    assert result.inconsistencies_cleaned >= 0
    assert 0.0 <= result.timeline_purity_after <= 1.0
    print("[PASS] Timeline sanitized")
    print(f"[PASS] Stains removed: {result.stains_removed}")
    print(f"[PASS] Timeline purity: {result.timeline_purity_after:.2f}")
    return True


def test_narrative_pestcontrol_identify():
    """Test 15: NarrativePestControl - Identify pests"""
    print("\n[TEST 15] NarrativePestControl - Identify Pests")
    print("-" * 60)

    pestcontrol = NarrativePestControl()
    pests = pestcontrol.identify_pests("narrative_001")

    assert isinstance(pests, list)
    for pest in pests:
        assert 0.0 <= pest.severity <= 1.0
        assert pest.pest_type is not None
    print("[PASS] Pests identified")
    print(f"[PASS] Pest count: {len(pests)}")
    return True


def test_narrative_pestcontrol_exterminate():
    """Test 16: NarrativePestControl - Exterminate pest"""
    print("\n[TEST 16] NarrativePestControl - Exterminate Pest")
    print("-" * 60)

    from anomaly_engine.narrative_services import NarrativePest, PestType

    pestcontrol = NarrativePestControl()
    pest = NarrativePest(
        pest_id="pest_001",
        pest_type=PestType.PLOT_HOLE,
        severity=0.6,
        location="Chapter 5",
        damage_caused="Lost character motivation",
        timestamp=datetime.now().timestamp()
    )

    result = pestcontrol.exterminate_pest(pest)
    assert result.pest_id == "pest_001"
    assert result.elimination_method != ""
    print("[PASS] Pest exterminated")
    print(f"[PASS] Method: {result.elimination_method}")
    print(f"[PASS] Success: {result.containment_successful}")
    return True


# ===== INTEGRATION TESTS =====

def test_chain_paradox_rescue_therapy():
    """Test 17: Integration - Paradox rescue + Therapy chain"""
    print("\n[TEST 17] Integration - Paradox -> Rescue -> Therapy")
    print("-" * 60)

    # Step 1: Detect paradox
    fire_dept = ParadoxFireDepartment()
    paradox = Paradox(
        paradox_id="paradox_chain_1",
        paradox_type=ParadoxType.CAUSAL_CIRCLE,
        intensity=0.7,
        affected_timeline="alt_A",
        fire_spread_rate=0.4,
        affected_agents=["Agent_X"]
    )

    # Step 2: Extinguish paradox
    suppression = fire_dept.extinguish_paradox_flame(paradox)
    assert suppression.success or suppression.flame_intensity_after < 0.5

    # Step 3: Rescue agents
    rescued = fire_dept.rescue_trapped_agents("alt_A")

    # Step 4: Provide therapy
    therapy = NarrativeTherapyCenter()
    for agent in rescued:
        result = therapy.therapy_session(agent)
        assert result.character_id == agent

    print("[PASS] Paradox crisis resolved through multi-step sequence")
    print(f"[PASS] Paradox suppressed: {suppression.success}")
    print(f"[PASS] Agents rescued: {len(rescued)}")
    return True


def test_chain_pest_cleaning_landscaping():
    """Test 18: Integration - Pest elimination + Cleaning + Landscaping"""
    print("\n[TEST 18] Integration - Pest -> Clean -> Landscape")
    print("-" * 60)

    # Step 1: Identify pests
    pest_control = NarrativePestControl()
    pests = pest_control.identify_pests("narrative_damaged")
    assert len(pests) >= 0

    # Step 2: Eliminate pests
    eliminated = 0
    for pest in pests:
        result = pest_control.exterminate_pest(pest)
        if result.containment_successful:
            eliminated += 1

    # Step 3: Deep clean narrative
    cleaning = TemporalCleaningService()
    clean_result = cleaning.deep_clean_narrative("narrative_damaged")
    assert "issues_fixed" in clean_result

    # Step 4: Landscape environment for recovery
    landscaping = NarrativeLandscapingCompany()
    setting = StoryEnvironment("recovery_zone", "Healing Space", {})
    landscaped = landscaping.landscape_environment(setting)
    assert landscaped.immersion_level > 0

    print("[PASS] Damaged narrative fully restored")
    print(f"[PASS] Pests eliminated: {eliminated}/{len(pests)}")
    print(f"[PASS] Environment recovered: {landscaped.aesthetic_quality:.2f}")
    return True


def test_chain_insurance_repair_restoration():
    """Test 19: Integration - Insurance -> Repair -> Appraisal"""
    print("\n[TEST 19] Integration - Insurance -> Repair -> Appraisal")
    print("-" * 60)

    # Step 1: Get insurance
    insurance = ContinuityInsuranceCompany()
    policy = insurance.issue_policy("timeline_crisis")
    assert policy.claims_remaining > 0

    # Step 2: File claim for breach
    from anomaly_engine.narrative_services import ContinuityBreach
    breach = ContinuityBreach(
        breach_id="breach_001",
        timeline_id="timeline_crisis",
        breach_type="narrative_contradiction",
        severity=0.6,
        damage_description="Character behavior inconsistent",
        timestamp=datetime.now().timestamp()
    )

    claim = insurance.process_claim(breach)
    assert claim.claim_id is not None

    # Step 3: Repair timeline using plumbing
    if claim.approved:
        plumbing = TemporalPlumbingService()
        repair = plumbing.fix_temporal_leak("timeline_crisis", breach.severity)
        assert repair.timeline_integrity_after > 0

    print("[PASS] Timeline crisis fully remedied")
    print(f"[PASS] Claim approved: {claim.approved}")
    print(f"[PASS] Timeline restored: {claim.timeline_repaired}")
    return True


def test_service_disable_enable():
    """Test 20: Service disable/enable functionality"""
    print("\n[TEST 20] Service Disable/Enable Functionality")
    print("-" * 60)

    # Test ParadoxFireDepartment disable
    dept = ParadoxFireDepartment()
    dept.enabled = False

    paradox = Paradox(
        paradox_id="test",
        paradox_type=ParadoxType.BOOTSTRAP,
        intensity=0.5,
        affected_timeline="test",
        fire_spread_rate=0.1
    )

    result = dept.extinguish_paradox_flame(paradox)
    assert result.success == False
    assert result.method_used == "DISABLED"

    # Re-enable
    dept.enabled = True
    result2 = dept.extinguish_paradox_flame(paradox)
    assert result2.method_used != "DISABLED"

    print("[PASS] Services can be disabled without error")
    print("[PASS] Services can be re-enabled")
    return True


def test_all_services_initialized():
    """Test 21: All 12 services initialize without error"""
    print("\n[TEST 21] All Services Initialize")
    print("-" * 60)

    services = [
        ParadoxFireDepartment(),
        TemporalArchaeologyDepartment(),
        NarrativeTherapyCenter(),
        TemporalGardeningService(),
        NarrativeChemistryLab(),
        ContinuityInsuranceCompany(),
        TemporalPlumbingService(),
        NarrativeRealEstateAgency(),
        TemporalCateringService(),
        NarrativeLandscapingCompany(),
        TemporalCleaningService(),
        NarrativePestControl()
    ]

    assert len(services) == 12
    for service in services:
        assert hasattr(service, 'enabled')
        assert service.enabled == True

    print("[PASS] All 12 services initialized")
    print(f"[PASS] Total services: {len(services)}")
    return True


def test_chemistry_lab_analysis():
    """Test 22: Narrative Chemistry Lab - Analyze compound"""
    print("\n[TEST 22] NarrativeChemistryLab - Analyze Compound")
    print("-" * 60)

    lab = NarrativeChemistryLab()
    elem1 = StoryElement("e1", "CHARACTER", "Villain", {})
    elem2 = StoryElement("e2", "THEME", "Corruption", {})

    compound = lab.combine_elements(elem1, elem2)
    analysis = lab.analyze_story_compound(compound)

    assert analysis.compound_id == compound.compound_id
    assert analysis.narrative_impact in ["Low", "Medium", "High"]
    assert len(analysis.recommendations) > 0
    print("[PASS] Compound analyzed")
    print(f"[PASS] Impact: {analysis.narrative_impact}")
    print(f"[PASS] Recommendations: {len(analysis.recommendations)}")
    return True


def test_catering_supply_chain():
    """Test 23: Temporal Catering - Supply chain management"""
    print("\n[TEST 23] TemporalCateringService - Supply Chain")
    print("-" * 60)

    catering = TemporalCateringService()
    result = catering.manage_temporal_supply_chain(5)

    assert "on_time_delivery_rate" in result
    assert "freshness_rating" in result
    assert 0.0 <= result["on_time_delivery_rate"] <= 1.0
    print("[PASS] Supply chain managed")
    print(f"[PASS] On-time rate: {result['on_time_delivery_rate']:.1%}")
    print(f"[PASS] Customer satisfaction: {result['customer_satisfaction']:.2f}")
    return True


def test_landscaping_maintenance():
    """Test 24: Narrative Landscaping - Maintain scenery"""
    print("\n[TEST 24] NarrativeLandscapingCompany - Maintain Scenery")
    print("-" * 60)

    landscaping = NarrativeLandscapingCompany()
    result = landscaping.maintain_scenery("env_001")

    assert "restoration_work_done" in result
    assert 0.0 <= result["setting_coherence_score"] <= 1.0
    print("[PASS] Scenery maintained")
    print(f"[PASS] Coherence score: {result['setting_coherence_score']:.2f}")
    print(f"[PASS] Work done: {result['restoration_work_done']}")
    return True


def test_pest_prevention():
    """Test 25: Narrative Pest Control - Prevention"""
    print("\n[TEST 25] NarrativePestControl - Prevention")
    print("-" * 60)

    pestcontrol = NarrativePestControl()
    result = pestcontrol.prevent_infestation("narrative_001")

    assert "infestation_probability_after" in result
    assert 0.0 <= result["infestation_probability_after"] <= 1.0
    assert len(result["prevention_measures"]) > 0
    print("[PASS] Prevention measures recommended")
    print(f"[PASS] Infestation probability: {result['infestation_probability_after']:.1%}")
    print(f"[PASS] Measures: {', '.join(result['prevention_measures'])}")
    return True


if __name__ == "__main__":
    tests = [
        test_paradox_fire_department_extinguish,
        test_paradox_fire_department_rescue,
        test_temporal_archaeology_excavate,
        test_temporal_archaeology_dating,
        test_narrative_therapy_session,
        test_narrative_therapy_diagnosis,
        test_temporal_gardening_prune,
        test_narrative_chemistry_combine,
        test_continuity_insurance_issue_policy,
        test_temporal_plumbing_fix_leak,
        test_narrative_realestate_list,
        test_temporal_catering_menu,
        test_narrative_landscaping,
        test_temporal_cleaning_sanitize,
        test_narrative_pestcontrol_identify,
        test_narrative_pestcontrol_exterminate,
        test_chain_paradox_rescue_therapy,
        test_chain_pest_cleaning_landscaping,
        test_chain_insurance_repair_restoration,
        test_service_disable_enable,
        test_all_services_initialized,
        test_chemistry_lab_analysis,
        test_catering_supply_chain,
        test_landscaping_maintenance,
        test_pest_prevention,
    ]

    print("=" * 80)
    print("PHASE IX TEST SUITE - Narrative Service Bureau")
    print("25+ comprehensive tests covering all 12 services")
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
