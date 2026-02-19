#!/usr/bin/env python3
"""
PHASE XIV - DASHBOARD INTEGRATION TESTS
Tests verifying dashboard panels properly wire to engines.
"""

import pytest
import time

from dashboard_core import DashboardCore, DashboardPanel
from diplomatic_engine import DiplomaticEngine, TreatyType, IdeologyType
from fleet_expansion_engine import FleetExpansionEngine, ShipArchetype
from first_contact_engine import FirstContactEngine, GovernanceType, TechnologyLevel


class TestDashboardIntegration:
    """Test dashboard integration with Phase XIV engines"""

    def test_dashboard_with_all_engines(self):
        """Test dashboard initialized with all three engines"""
        diplomatic = DiplomaticEngine()
        expansion = FleetExpansionEngine()
        first_contact = FirstContactEngine()

        dashboard = DashboardCore(
            republic=None,
            diplomatic_engine=diplomatic,
            expansion_engine=expansion,
            first_contact_engine=first_contact,
        )

        # Verify all panels created
        assert DashboardPanel.DIPLOMATIC in dashboard.panels
        assert DashboardPanel.FLEET_EXPANSION in dashboard.panels
        assert DashboardPanel.FIRST_CONTACT in dashboard.panels

    def test_diplomatic_panel_live_data(self):
        """Test diplomatic panel pulls live engine data"""
        diplomatic = DiplomaticEngine()

        # Create treaty in engine
        treaty = diplomatic.propose_treaty(
            "Test Treaty",
            TreatyType.TRADE,
            ["A", "B"],
            ["clause"],
            "enforcement",
        )
        diplomatic.ratify_treaty(treaty.treaty_id)

        # Create dashboard with engine
        dashboard = DashboardCore(
            republic=None,
            diplomatic_engine=diplomatic,
        )

        # Give sync loop time to update
        time.sleep(0.2)

        # Check panel data contains treaty
        panel_data = dashboard.last_update[DashboardPanel.DIPLOMATIC].data
        assert panel_data["active_treaties"] == 1

    def test_expansion_panel_live_data(self):
        """Test expansion panel pulls live engine data"""
        expansion = FleetExpansionEngine()

        # Commission ships in engine
        expansion.commission_ship("Ship-A", ShipArchetype.WARRIOR, "Brave", [])
        expansion.commission_ship("Ship-B", ShipArchetype.SCHOLAR, "Curious", [])

        # Create dashboard with engine
        dashboard = DashboardCore(
            republic=None,
            expansion_engine=expansion,
        )

        # Give sync loop time to update
        time.sleep(0.2)

        # Check panel data contains ships
        panel_data = dashboard.last_update[DashboardPanel.FLEET_EXPANSION].data
        assert panel_data["active_ships"] == 2

    def test_first_contact_panel_live_data(self):
        """Test first contact panel pulls live engine data"""
        first_contact = FirstContactEngine()

        # Detect fleet in engine
        fleet = first_contact.detect_external_fleet(
            "Test Fleet",
            "Test Civilization",
            GovernanceType.DEMOCRACY,
            100000,
            TechnologyLevel.ADVANCED,
            0.4,
        )

        # Create dashboard with engine
        dashboard = DashboardCore(
            republic=None,
            first_contact_engine=first_contact,
        )

        # Give sync loop time to update
        time.sleep(0.2)

        # Check panel data contains fleet
        panel_data = dashboard.last_update[DashboardPanel.FIRST_CONTACT].data
        assert panel_data["external_fleets_detected"] == 1

    def test_dashboard_aggregated_status(self):
        """Test dashboard aggregates all panel data"""
        diplomatic = DiplomaticEngine()
        expansion = FleetExpansionEngine()
        first_contact = FirstContactEngine()

        # Add data to engines
        treaty = diplomatic.propose_treaty(
            "Treaty", TreatyType.TRADE, ["A", "B"], ["clause"], "enforcement"
        )
        diplomatic.ratify_treaty(treaty.treaty_id)

        expansion.commission_ship("Ship", ShipArchetype.EXPLORER, "Curious", [])

        fleet = first_contact.detect_external_fleet(
            "Fleet",
            "Civ",
            GovernanceType.DEMOCRACY,
            100000,
            TechnologyLevel.ADVANCED,
            0.3,
        )

        # Create dashboard
        dashboard = DashboardCore(
            republic=None,
            diplomatic_engine=diplomatic,
            expansion_engine=expansion,
            first_contact_engine=first_contact,
        )

        # Give sync loop time
        time.sleep(0.2)

        # Get aggregated status
        status = dashboard.get_aggregated_status()
        panels = status.get("panels", {})

        # Verify all panel data present
        assert DashboardPanel.DIPLOMATIC in panels
        assert DashboardPanel.FLEET_EXPANSION in panels
        assert DashboardPanel.FIRST_CONTACT in panels

        # Verify data integrity
        assert panels[DashboardPanel.DIPLOMATIC]["active_treaties"] == 1
        assert panels[DashboardPanel.FLEET_EXPANSION]["active_ships"] == 1
        assert panels[DashboardPanel.FIRST_CONTACT]["external_fleets_detected"] == 1

    def test_dashboard_captain_briefing(self):
        """Test captain's briefing includes engine data"""
        diplomatic = DiplomaticEngine()
        expansion = FleetExpansionEngine()
        first_contact = FirstContactEngine()

        # Create data
        treaty = diplomatic.propose_treaty(
            "Treaty", TreatyType.ALLIANCE, ["A", "B"], ["clause"], "enforcement"
        )
        diplomatic.ratify_treaty(treaty.treaty_id)

        expansion.commission_ship("Ship", ShipArchetype.DIPLOMAT, "Diplomatic", [])

        first_contact.detect_external_fleet(
            "Fleet", "Civ", GovernanceType.DEMOCRACY, 100000, TechnologyLevel.ADVANCED, 0.3
        )

        # Create dashboard
        dashboard = DashboardCore(
            republic=None,
            diplomatic_engine=diplomatic,
            expansion_engine=expansion,
            first_contact_engine=first_contact,
        )

        # Get briefing
        time.sleep(0.2)
        briefing = dashboard.get_captain_briefing()

        # Verify briefing contains all sections
        assert "DIPLOMATIC STATUS" in briefing
        assert "FLEET EXPANSION" in briefing
        assert "FIRST CONTACT" in briefing

        # Verify data appears in briefing
        assert "Active Treaties: 1" in briefing
        assert "Active Ships: 1" in briefing
        assert "External Fleets Detected: 1" in briefing


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
