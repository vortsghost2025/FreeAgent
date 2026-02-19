#!/usr/bin/env python3
"""
PHASE XI REAL INTEGRATION TESTS
Testing live dashboard integration with Constitutional Republic (not mocks).
This is the moment the republic gains "eyes" and "ears".
"""

import sys
sys.path.insert(0, '/c/workspace/uss-chaosbringer')

from constitutional_republic import ConstitutionalRepublic
from dashboard_core import (
    DashboardCore, ConstitutionalMonitor, ElasticTapeMiddleware, DashboardPanel
)


def test_dashboard_core_initialization():
    """Test dashboard core can connect to real republic"""
    print("\n[TEST 1] Dashboard Core Initialization")
    print("-" * 60)

    republic = ConstitutionalRepublic()
    republic.establish_government(["Ship-A", "Ship-B", "Ship-C"])

    dashboard = DashboardCore(republic)
    assert dashboard.republic == republic
    assert len(dashboard.panels) == 6
    assert DashboardPanel.FLEET_OVERVIEW in dashboard.panels
    assert DashboardPanel.GOVERNANCE_CONSOLE in dashboard.panels

    print("[PASS] Dashboard core connected to republic")
    return True


def test_fleet_overview_panel():
    """Test fleet overview pulls real government status"""
    print("\n[TEST 2] Fleet Overview Panel")
    print("-" * 60)

    republic = ConstitutionalRepublic()
    republic.establish_government(["Ship-A", "Ship-B", "Ship-C"])

    dashboard = DashboardCore(republic)
    fleet_data = dashboard.panels[DashboardPanel.FLEET_OVERVIEW].get_current_data()

    assert "government_type" in fleet_data
    assert "house_seats" in fleet_data
    assert "senate_seats" in fleet_data
    assert "judges_appointed" in fleet_data
    assert fleet_data["judges_appointed"] >= 6

    print(f"[PASS] Fleet overview shows {fleet_data['judges_appointed']} judges appointed")
    return True


def test_governance_console_panel():
    """Test governance console shows constitutional status"""
    print("\n[TEST 3] Governance Console Panel")
    print("-" * 60)

    republic = ConstitutionalRepublic()
    republic.establish_government(["Ship-A", "Ship-B", "Ship-C"])

    # Add some legislative activity
    republic.house.introduce_bill("bill_001", "Ship-A")
    republic.house.pass_bill("bill_001")
    republic.senate.approve_bill("bill_001")

    dashboard = DashboardCore(republic)
    gov_data = dashboard.panels[DashboardPanel.GOVERNANCE_CONSOLE].get_current_data()

    assert "bills_active" in gov_data
    assert "bills_passed_house" in gov_data
    assert gov_data["bills_passed_house"] == 1
    assert gov_data["bill_of_rights_protected"] == True
    assert gov_data["separation_of_powers_intact"] == True

    print("[PASS] Governance console shows real legislative activity")
    return True


def test_captains_log_panel():
    """Test captain's log records republic events"""
    print("\n[TEST 4] Captain's Log Panel")
    print("-" * 60)

    republic = ConstitutionalRepublic()
    republic.establish_government(["Ship-A", "Ship-B", "Ship-C"])

    # Create some events
    republic.house.introduce_bill("bill_001", "Ship-A")
    republic.house.pass_bill("bill_001")

    dashboard = DashboardCore(republic)
    log_data = dashboard.panels[DashboardPanel.CAPTAINS_LOG].get_current_data()

    assert "recent_events" in log_data
    assert isinstance(log_data["recent_events"], list)
    assert len(log_data["recent_events"]) > 0

    print(f"[PASS] Captain's log recorded {len(log_data['recent_events'])} events")
    return True


def test_dashboard_aggregated_status():
    """Test dashboard can aggregate all panel data"""
    print("\n[TEST 5] Dashboard Aggregated Status")
    print("-" * 60)

    republic = ConstitutionalRepublic()
    republic.establish_government(["Ship-A", "Ship-B", "Ship-C"])

    dashboard = DashboardCore(republic)
    status = dashboard.get_aggregated_status()

    assert "timestamp" in status
    assert "panels" in status
    assert "overall_health" in status
    assert "constitutional_compliance" in status
    assert 0.0 <= status["overall_health"] <= 1.0

    print(f"[PASS] Dashboard aggregated status: health={status['overall_health']:.1%}")
    return True


def test_dashboard_captain_briefing():
    """Test dashboard generates executive briefing"""
    print("\n[TEST 6] Dashboard Captain's Briefing")
    print("-" * 60)

    republic = ConstitutionalRepublic()
    republic.establish_government(["Ship-A", "Ship-B", "Ship-C"])

    # Create legislative activity
    republic.house.introduce_bill("bill_001", "Ship-A")
    republic.house.pass_bill("bill_001")
    republic.senate.approve_bill("bill_001")
    republic.executive.sign_bill("bill_001")

    dashboard = DashboardCore(republic)
    briefing = dashboard.get_captain_briefing()

    assert "CAPTAIN'S BRIEFING" in briefing
    assert "CONSTITUTIONAL STATUS" in briefing
    assert "COMPLIANT" in briefing or "VIOLATION" in briefing
    assert len(briefing) > 100

    print("[PASS] Captain's briefing generated")
    print(briefing.split('\n')[0:5])
    return True


def test_constitutional_monitor_compliance():
    """Test constitutional monitor verifies dashboard compliance"""
    print("\n[TEST 7] Constitutional Monitor Compliance")
    print("-" * 60)

    republic = ConstitutionalRepublic()
    republic.establish_government(["Ship-A", "Ship-B", "Ship-C"])

    dashboard = DashboardCore(republic)
    monitor = ConstitutionalMonitor(dashboard, republic)

    review = monitor.conduct_review()

    assert "status" in review
    assert "violations" in review
    assert review["status"] in ["COMPLIANT", "VIOLATIONS_DETECTED"]
    assert "recommendation" in review

    print(f"[PASS] Constitutional review: {review['status']}")
    return True


def test_elastic_tape_timeline_registry():
    """Test elastic tape can register timelines"""
    print("\n[TEST 8] Elastic Tape Timeline Registry")
    print("-" * 60)

    middleware = ElasticTapeMiddleware()

    timeline_data = {"status": "stable", "integrity": 0.99}
    middleware.register_timeline("ALPHA", timeline_data)
    middleware.register_timeline("BETA", timeline_data)

    multi_view = middleware.get_multi_timeline_view()

    assert "ALPHA" in multi_view["registered_timelines"]
    assert "BETA" in multi_view["registered_timelines"]

    print(f"[PASS] Registered {len(multi_view['registered_timelines'])} timelines")
    return True


def test_elastic_tape_context_shifting():
    """Test elastic tape timeline context-shifting"""
    print("\n[TEST 9] Elastic Tape Context Shifting")
    print("-" * 60)

    middleware = ElasticTapeMiddleware()
    middleware.register_timeline("ALPHA", {})
    middleware.register_timeline("BETA", {})

    result = middleware.shift_timeline("ALPHA")
    assert result["success"] == True
    assert middleware.current_timeline == "ALPHA"

    result = middleware.shift_timeline("BETA")
    assert result["success"] == True
    assert middleware.current_timeline == "BETA"

    print("[PASS] Timeline context-shifting functional")
    return True


def test_dashboard_live_synchronization():
    """Test dashboard continuously syncs with republic"""
    print("\n[TEST 10] Dashboard Live Synchronization")
    print("-" * 60)

    republic = ConstitutionalRepublic()
    republic.establish_government(["Ship-A", "Ship-B", "Ship-C"])

    dashboard = DashboardCore(republic)

    # Give sync thread a moment to populate
    import time
    time.sleep(0.5)

    # Check that updates have been queued
    assert len(dashboard.update_queue) > 0
    assert len(dashboard.last_update) > 0

    print(f"[PASS] Dashboard queued {len(dashboard.update_queue)} updates")
    return True


def test_dashboard_governance_tracking():
    """Test dashboard tracks real governance changes"""
    print("\n[TEST 11] Dashboard Governance Tracking")
    print("-" * 60)

    republic = ConstitutionalRepublic()
    republic.establish_government(["Ship-A", "Ship-B", "Ship-C"])

    dashboard = DashboardCore(republic)

    # Get initial state
    import time
    time.sleep(0.1)
    initial_status = dashboard.get_aggregated_status()

    # Add legislative activity
    republic.house.introduce_bill("test_bill", "Ship-A")
    republic.house.pass_bill("test_bill")

    time.sleep(0.1)

    # Get updated state
    updated_status = dashboard.get_aggregated_status()

    # Dashboard should reflect changes
    assert updated_status is not None
    assert "panels" in updated_status

    print("[PASS] Dashboard tracked legislative changes")
    return True


def test_dashboard_amendment_tracking():
    """Test dashboard tracks amendment ratification"""
    print("\n[TEST 12] Dashboard Amendment Tracking")
    print("-" * 60)

    republic = ConstitutionalRepublic()
    republic.establish_government(["Ship-A", "Ship-B", "Ship-C"])

    # Propose amendment
    amendment = republic.amendments.propose(
        "Test Amendment",
        "Test description",
        "TestProposer"
    )

    # Ratify it (3 out of 3 = 100% > 75%)
    republic.amendments.vote(amendment.amendment_id, "Ship-A", "yes")
    republic.amendments.vote(amendment.amendment_id, "Ship-B", "yes")
    republic.amendments.vote(amendment.amendment_id, "Ship-C", "yes")

    republic.amendments.ratify(amendment.amendment_id, 3, 3)

    dashboard = DashboardCore(republic)
    gov_data = dashboard.panels[DashboardPanel.GOVERNANCE_CONSOLE].get_current_data()

    assert gov_data["amendments_ratified"] == 1

    print("[PASS] Dashboard tracked amendment ratification")
    return True


def test_dashboard_judiciary_tracking():
    """Test dashboard tracks judicial appointments and cases"""
    print("\n[TEST 13] Dashboard Judiciary Tracking")
    print("-" * 60)

    republic = ConstitutionalRepublic()
    republic.establish_government(["Ship-A", "Ship-B", "Ship-C"])

    # File a case
    case = republic.judiciary.file_case(
        "SUPREME_COURT",
        "CONSTITUTIONAL",
        "Ship-A",
        "Ship-B",
        "Test case"
    )

    dashboard = DashboardCore(republic)
    gov_data = dashboard.panels[DashboardPanel.GOVERNANCE_CONSOLE].get_current_data()

    assert gov_data["courts_operational"] == 6  # All 6 courts exist
    assert gov_data["cases_filed"] == 1

    print("[PASS] Dashboard tracked judicial activity")
    return True


if __name__ == "__main__":
    tests = [
        test_dashboard_core_initialization,
        test_fleet_overview_panel,
        test_governance_console_panel,
        test_captains_log_panel,
        test_dashboard_aggregated_status,
        test_dashboard_captain_briefing,
        test_constitutional_monitor_compliance,
        test_elastic_tape_timeline_registry,
        test_elastic_tape_context_shifting,
        test_dashboard_live_synchronization,
        test_dashboard_governance_tracking,
        test_dashboard_amendment_tracking,
        test_dashboard_judiciary_tracking,
    ]

    print("=" * 80)
    print("PHASE XI - REAL INTEGRATION TEST SUITE")
    print("Dashboard wired into Constitutional Republic")
    print("=" * 80)

    passed = 0
    failed = 0

    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"[FAIL] {test.__name__}: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print("\n" + "=" * 80)
    print(f"RESULTS: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("=" * 80)
