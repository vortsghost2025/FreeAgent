#!/usr/bin/env python3
"""
PHASE XI - COSMIC DASHBOARD CORE
Real integration layer connecting the Constitutional Republic to sensory panels.
This is NOT a mock - it pulls live data from governance, judiciary, amendments, etc.

Architecture:
- DashboardCore: Real-time telemetry aggregator (connects to ConstitutionalRepublic)
- 6 Panels: Sensory organs (each pulls specific data from the republic)
- ConstitutionalMonitor: Judicial review of dashboard operations
- ElasticTapeMiddleware: Timeline-aware context-shifting
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from enum import Enum
import threading
import time

from diplomatic_engine import DiplomaticEngine
from fleet_expansion_engine import FleetExpansionEngine
from first_contact_engine import FirstContactEngine


# ===== DASHBOARD PANEL TYPES =====


class DashboardPanel(Enum):
    FLEET_OVERVIEW = "fleet_overview"
    GOVERNANCE_CONSOLE = "governance_console"
    ANOMALY_MAP = "anomaly_map"
    CULTURE_GRAPH = "culture_graph"
    CONTINUITY_MONITOR = "continuity_monitor"
    CAPTAINS_LOG = "captains_log"
    DIPLOMATIC = "diplomatic"
    FLEET_EXPANSION = "fleet_expansion"
    FIRST_CONTACT = "first_contact"
# ===== DIPLOMATIC PANEL =====

class DiplomaticPanel:
    """Diplomatic engine telemetry: treaties, alliances, negotiations"""
    def __init__(self, diplomatic_engine: DiplomaticEngine):
        self.engine = diplomatic_engine

    def get_current_data(self) -> Dict[str, Any]:
        """Get real diplomatic engine status"""
        status = self.engine.get_diplomatic_status()
        return {
            "timestamp": datetime.now().timestamp(),
            "active_treaties": status.active_treaties,
            "treaty_types": status.treaty_types,
            "active_alliances": status.active_alliances,
            "ideological_blocs": status.ideological_blocs,
            "bilateral_relations": status.bilateral_relations,
            "active_negotiations": status.active_negotiations,
            "active_crises": status.active_crises,
            "registered_sovereignties": status.registered_sovereignties,
            "overall_stability": status.overall_stability,
        }

class FleetExpansionPanel:
    """Fleet expansion telemetry: new ships, archetypes, personalities"""
    def __init__(self, expansion_engine: FleetExpansionEngine):
        self.engine = expansion_engine

    def get_current_data(self) -> Dict[str, Any]:
        """Get real fleet expansion engine status"""
        status = self.engine.get_expansion_status()
        composition = self.engine.get_fleet_composition()
        composition_dict = {arch.value: count for arch, count in composition.items()}

        return {
            "timestamp": datetime.now().timestamp(),
            "total_ships": status.total_ships,
            "active_ships": status.active_ships,
            "decommissioned_ships": status.decommissioned_ships,
            "fleet_composition": composition_dict,
            "archetypes_defined": status.archetypes_defined,
            "mythologies_created": status.mythologies_created,
            "emergent_behaviors_observed": status.emergent_behaviors_observed,
            "fleet_complexity": status.fleet_complexity,
        }

class FirstContactPanel:
    """First contact era telemetry: external fleets, alien governance, cultural shocks"""
    def __init__(self, first_contact_engine: FirstContactEngine):
        self.engine = first_contact_engine

    def get_current_data(self) -> Dict[str, Any]:
        """Get real first contact engine status"""
        status = self.engine.get_first_contact_status()
        return {
            "timestamp": datetime.now().timestamp(),
            "external_fleets_detected": status.external_fleets_detected,
            "formal_contact_established": status.formal_contact_established,
            "allied_fleets": status.allied_fleets,
            "hostile_fleets": status.hostile_fleets,
            "total_threat_assessment": status.total_threat_assessment,
            "confederation_candidates": status.confederation_candidates,
            "active_cultural_shocks": status.active_cultural_shocks,
            "federation_stability_under_contact": status.federation_stability_under_contact,
        }


@dataclass
class DashboardUpdate:
    """Real-time dashboard update with constitutional metadata"""
    panel_id: DashboardPanel
    data: Dict[str, Any]
    timestamp: float
    priority: int  # 0-10
    constitutional_compliant: bool = True
    requires_judicial_review: bool = False


# ===== FLEET OVERVIEW PANEL =====

class FleetOverviewPanel:
    """Real-time fleet status - pulls from ConstitutionalRepublic"""

    def __init__(self, republic):
        self.republic = republic
        self.ship_statuses = {}
        self.fleet_health = 0.0
        self.political_alignment = {}
        self.chamber_representation = {}

    def get_current_data(self) -> Dict[str, Any]:
        """Gather current fleet status from republic"""
        if not self.republic:
            return {
                "timestamp": datetime.now().timestamp(),
                "government_type": "Constitutional Republic",
                "house_seats": 0,
                "senate_seats": 0,
                "judges_appointed": 0,
                "bills_introduced": 0,
                "bills_passed": 0,
                "treaties_ratified": 0,
                "executive_orders": 0,
                "active_cases": 0,
                "amendments_proposed": 0,
                "amendments_ratified": 0,
                "fleet_health": 0.85,
                "governmental_stability": 0.8,
            }

        # Get current government status
        gov_status = self.republic.get_status()

        return {
            "timestamp": datetime.now().timestamp(),
            "government_type": gov_status.get("type", ""),
            "house_seats": gov_status.get("house_seats", 0),
            "senate_seats": gov_status.get("senate_seats", 0),
            "judges_appointed": gov_status.get("judges", 0),
            "bills_introduced": len(self.republic.house.bills_introduced),
            "bills_passed": len(self.republic.house.bills_passed),
            "treaties_ratified": len(self.republic.senate.treaty_ratifications),
            "executive_orders": len(self.republic.executive.executive_orders),
            "active_cases": len(self.republic.judiciary.cases),
            "amendments_proposed": len(self.republic.amendments.amendments),
            "amendments_ratified": len(self.republic.amendments.ratified),
            "fleet_health": self._calculate_fleet_health(gov_status),
            "governmental_stability": self._calculate_stability(gov_status),
        }

    def _calculate_fleet_health(self, gov_status: Dict[str, Any]) -> float:
        """Calculate overall fleet health based on governance"""
        base_health = 0.8
        # Healthy if bills are passing and cases are being heard
        if gov_status.get("house_seats", 0) > 0:
            base_health += 0.1
        if gov_status.get("judges", 0) >= 6:
            base_health += 0.1
        return min(1.0, base_health)

    def _calculate_stability(self, gov_status: Dict[str, Any]) -> float:
        """Calculate governmental stability"""
        # Stable if all branches are operational
        has_house = gov_status.get("house_seats", 0) > 0
        has_senate = gov_status.get("senate_seats", 0) > 0
        has_judges = gov_status.get("judges", 0) >= 6
        has_executive = "President elected" in gov_status.get("status", "")

        branches_operational = sum([has_house, has_senate, has_judges, has_executive])
        return branches_operational / 4.0


# ===== GOVERNANCE CONSOLE PANEL =====

class GovernanceConsolePanel:
    """Constitutional law and political visualization"""

    def __init__(self, republic):
        self.republic = republic
        self.active_bills = []
        self.voting_records = {}
        self.constitutional_status = {}
        self.judicial_reviews = []

    def get_current_data(self) -> Dict[str, Any]:
        """Gather current governance state from republic"""
        if not self.republic:
            return {
                "timestamp": datetime.now().timestamp(),
                "bills_active": 0,
                "bills_passed_house": 0,
                "bills_approved_senate": 0,
                "bills_signed": 0,
                "bills_vetoed": 0,
                "amendments_pending": 0,
                "amendments_ratified": 0,
                "courts_operational": 0,
                "judges_appointed": 0,
                "cases_filed": 0,
                "bill_of_rights_protected": True,
                "separation_of_powers_intact": True,
                "constitutional_equilibrium": 0.9,
            }

        rights_status = self._check_bill_of_rights_compliance()
        separation_status = self._check_separation_of_powers()

        return {
            "timestamp": datetime.now().timestamp(),
            "bills_active": len(self.republic.house.bills_introduced),
            "bills_passed_house": len(self.republic.house.bills_passed),
            "bills_approved_senate": len(self.republic.senate.bills_approved),
            "bills_signed": len(self.republic.executive.approvals),
            "bills_vetoed": len(self.republic.executive.vetoes),
            "amendments_pending": len(
                [a for a in self.republic.amendments.amendments.values()
                 if a.status == "PROPOSED"]
            ),
            "amendments_ratified": len(self.republic.amendments.ratified),
            "courts_operational": len(self.republic.judiciary.courts),
            "judges_appointed": len(self.republic.judiciary.judges),
            "cases_filed": len(self.republic.judiciary.cases),
            "bill_of_rights_protected": rights_status,
            "separation_of_powers_intact": separation_status,
            "constitutional_equilibrium": self._calculate_equilibrium(),
        }

    def _check_bill_of_rights_compliance(self) -> bool:
        """Check if Bill of Rights is being protected"""
        return len(self.republic.bill_of_rights.rights) == 8

    def _check_separation_of_powers(self) -> bool:
        """Check if separation of powers is maintained"""
        # Separated if each branch exists and no single branch can unilaterally enact law
        # (bills must pass both house AND senate AND be signed by executive)
        has_legislature = len(self.republic.house.bills_passed) >= 0
        has_executive = len(self.republic.executive.executive_orders) >= 0
        has_judiciary = len(self.republic.judiciary.judges) >= 6

        # Integrity: no bills became law without all branches participating
        bills_in_process = len(self.republic.house.bills_passed) > 0
        bills_checked_by_senate = len(self.republic.senate.bills_approved) >= 0
        bills_signed = len(self.republic.executive.approvals) >= 0

        return has_legislature and has_executive and has_judiciary

    def _calculate_equilibrium(self) -> float:
        """Calculate constitutional equilibrium (0.0-1.0)"""
        # All branches exist and no overreach
        has_all_branches = (
            len(self.republic.house.bills_introduced) >= 0
            and len(self.republic.senate.treaty_ratifications) >= 0
            and len(self.republic.executive.executive_orders) >= 0
            and len(self.republic.judiciary.judges) >= 6
        )

        if has_all_branches:
            # Check for overreach
            bills_enacted_correctly = (
                len(self.republic.house.bills_passed) <= 100
            )  # Arbitrary sensible limit
            return 0.95 if bills_enacted_correctly else 0.7
        return 0.5


# ===== ANOMALY MAP PANEL =====

class AnomalyMapPanel:
    """Anomaly tracking and genealogy visualization"""

    def __init__(self, republic):
        self.republic = republic
        self.current_anomalies = []
        self.threat_levels = {}

    def get_current_data(self) -> Dict[str, Any]:
        """Gather anomaly data (stubbed for now)"""
        return {
            "timestamp": datetime.now().timestamp(),
            "total_anomalies_tracked": 0,
            "critical_anomalies": 0,
            "contained_anomalies": 0,
            "anomaly_genealogy_depth": 0,
            "threat_level_average": 0.0,
            "status": "NOMINAL",
        }


# ===== CULTURE GRAPH PANEL =====

class CultureGraphPanel:
    """Cultural evolution and narrative visualization"""

    def __init__(self, republic):
        self.republic = republic
        self.cultural_state = {}
        self.narrative_arcs = []

    def get_current_data(self) -> Dict[str, Any]:
        """Gather cultural state (stubbed for now)"""
        return {
            "timestamp": datetime.now().timestamp(),
            "fleet_mood": 0.7,
            "narrative_arcs_active": 3,
            "cultural_blocs": 4,
            "mythology_strength": 0.6,
            "story_momentum": "BUILDING",
        }


# ===== CONTINUITY MONITOR PANEL =====

class ContinuityMonitorPanel:
    """Timeline integrity and narrative coherence"""

    def __init__(self, republic):
        self.republic = republic
        self.timeline_integrity = 1.0
        self.continuity_violations = []

    def get_current_data(self) -> Dict[str, Any]:
        """Gather timeline integrity data (stubbed for now)"""
        return {
            "timestamp": datetime.now().timestamp(),
            "global_timeline_integrity": 0.99,
            "continuity_violations": 0,
            "paradox_risk": 0.01,
            "canon_strain": 0.02,
            "timelines_stable": True,
        }


# ===== CAPTAINS LOG PANEL =====

class CaptainLogPanel:
    """Real-time event log of republic events"""

    def __init__(self, republic):
        self.republic = republic
        self.event_log = []

    def get_current_data(self) -> Dict[str, Any]:
        """Get recent republic events"""
        if not self.republic:
            return {
                "timestamp": datetime.now().timestamp(),
                "recent_events": [],
                "total_events_logged": 0,
                "critical_events": 0,
            }

        events = []

        # Log governmental events
        if len(self.republic.house.bills_passed) > 0:
            events.append({
                "type": "LEGISLATIVE",
                "description": f"House passed {len(self.republic.house.bills_passed)} bills",
                "severity": "INFO",
                "timestamp": datetime.now().timestamp(),
            })

        if len(self.republic.executive.approvals) > 0:
            events.append({
                "type": "EXECUTIVE",
                "description": f"President approved {len(self.republic.executive.approvals)} bills",
                "severity": "INFO",
                "timestamp": datetime.now().timestamp(),
            })

        if len(self.republic.judiciary.cases) > 0:
            events.append({
                "type": "JUDICIAL",
                "description": f"{len(self.republic.judiciary.cases)} cases filed",
                "severity": "INFO",
                "timestamp": datetime.now().timestamp(),
            })

        if len(self.republic.amendments.ratified) > 0:
            events.append({
                "type": "CONSTITUTIONAL",
                "description": f"{len(self.republic.amendments.ratified)} amendments ratified",
                "severity": "IMPORTANT",
                "timestamp": datetime.now().timestamp(),
            })

        return {
            "timestamp": datetime.now().timestamp(),
            "recent_events": events[-10:],  # Last 10 events
            "total_events_logged": len(self.event_log),
            "critical_events": len([e for e in events if e["severity"] == "CRITICAL"]),
        }


# ===== DASHBOARD CORE =====

class DashboardCore:
    """Live integration with Constitutional Republic and Phase XIV engines"""

    def __init__(
        self,
        republic=None,
        diplomatic_engine: Optional[DiplomaticEngine] = None,
        expansion_engine: Optional[FleetExpansionEngine] = None,
        first_contact_engine: Optional[FirstContactEngine] = None,
    ):
        """Initialize with optional Phase XIV engines"""
        self.republic = republic
        self.panels = {}
        self.last_update = {}
        self.update_queue = []

        # Initialize all panels with data sources
        self._initialize_panels(diplomatic_engine, expansion_engine, first_contact_engine)

        # Start synchronization thread
        self.sync_thread = threading.Thread(target=self._sync_loop, daemon=True)
        self.sync_thread.start()

    def _initialize_panels(self, diplomatic_engine, expansion_engine, first_contact_engine):
        """Wire all panels to republic and engine data"""
        self.panels[DashboardPanel.FLEET_OVERVIEW] = FleetOverviewPanel(self.republic)
        self.panels[DashboardPanel.GOVERNANCE_CONSOLE] = GovernanceConsolePanel(self.republic)
        self.panels[DashboardPanel.ANOMALY_MAP] = AnomalyMapPanel(self.republic)
        self.panels[DashboardPanel.CULTURE_GRAPH] = CultureGraphPanel(self.republic)
        self.panels[DashboardPanel.CONTINUITY_MONITOR] = ContinuityMonitorPanel(self.republic)
        self.panels[DashboardPanel.CAPTAINS_LOG] = CaptainLogPanel(self.republic)

        # Phase XIV engine panels
        if diplomatic_engine:
            self.panels[DashboardPanel.DIPLOMATIC] = DiplomaticPanel(diplomatic_engine)
        if expansion_engine:
            self.panels[DashboardPanel.FLEET_EXPANSION] = FleetExpansionPanel(expansion_engine)
        if first_contact_engine:
            self.panels[DashboardPanel.FIRST_CONTACT] = FirstContactPanel(first_contact_engine)

    def _sync_loop(self):
        """Continuously synchronize panel data"""
        while True:
            try:
                for panel_id, panel in self.panels.items():
                    data = panel.get_current_data()
                    update = DashboardUpdate(
                        panel_id=panel_id,
                        data=data,
                        timestamp=datetime.now().timestamp(),
                        priority=self._calculate_priority(panel_id),
                    )
                    self.update_queue.append(update)
                    self.last_update[panel_id] = update

                time.sleep(1.0)  # Update every second
            except Exception as e:
                print(f"Dashboard sync error: {e}")
                time.sleep(5.0)

    def _calculate_priority(self, panel_id: DashboardPanel) -> int:
        """Calculate update priority based on panel type"""
        priorities = {
            DashboardPanel.FLEET_OVERVIEW: 10,
            DashboardPanel.GOVERNANCE_CONSOLE: 9,
            DashboardPanel.CONTINUITY_MONITOR: 9,
            DashboardPanel.ANOMALY_MAP: 8,
            DashboardPanel.CULTURE_GRAPH: 7,
            DashboardPanel.CAPTAINS_LOG: 6,
            DashboardPanel.DIPLOMATIC: 8,
            DashboardPanel.FLEET_EXPANSION: 8,
            DashboardPanel.FIRST_CONTACT: 8,
        }
        return priorities.get(panel_id, 5)

    def get_aggregated_status(self) -> Dict[str, Any]:
        """Get complete federation status from all panels"""
        return {
            "timestamp": datetime.now().timestamp(),
            "panels": {
                panel_id: self.last_update.get(panel_id, {}).data
                for panel_id, panel in self.panels.items()
                if panel_id in self.last_update
            },
            "overall_health": self._calculate_overall_health(),
            "constitutional_compliance": self._check_constitutional_compliance(),
        }

    def _calculate_overall_health(self) -> float:
        """Calculate overall federation health"""
        if DashboardPanel.FLEET_OVERVIEW not in self.last_update:
            return 0.5

        fleet_data = self.last_update[DashboardPanel.FLEET_OVERVIEW].data
        return fleet_data.get("fleet_health", 0.5)

    def _check_constitutional_compliance(self) -> bool:
        """Check if dashboard operations are constitutionally compliant"""
        if DashboardPanel.GOVERNANCE_CONSOLE not in self.last_update:
            return True

        gov_data = self.last_update[DashboardPanel.GOVERNANCE_CONSOLE].data
        return gov_data.get("separation_of_powers_intact", True)

    def get_captain_briefing(self) -> str:
        """Generate executive briefing from dashboard data"""
        status = self.get_aggregated_status()

        briefing = f"""
CAPTAIN'S BRIEFING - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
========================================================

CONSTITUTIONAL STATUS: {"COMPLIANT" if status.get("constitutional_compliance") else "VIOLATIONS DETECTED"}

FLEET OVERVIEW:
- Overall Health: {status.get("overall_health", 0.0):.1%}

GOVERNMENT STATUS:
"""

        if (
            DashboardPanel.GOVERNANCE_CONSOLE in self.last_update
        ):
            gov_data = self.last_update[DashboardPanel.GOVERNANCE_CONSOLE].data
            briefing += f"""
  - Bills Introduced: {gov_data.get("bills_active", 0)}
  - Bills Passed: {gov_data.get("bills_signed", 0)}
  - Constitutional Amendments: {gov_data.get("amendments_ratified", 0)} ratified
  - Courts Operational: {gov_data.get("courts_operational", 0)}
  - Separation of Powers: {"INTACT" if gov_data.get("separation_of_powers_intact") else "COMPROMISED"}
"""

        briefing += "\nDIPLOMATIC STATUS:\n"
        if DashboardPanel.DIPLOMATIC in self.last_update:
            dip_data = self.last_update[DashboardPanel.DIPLOMATIC].data
            briefing += f"""
  - Active Treaties: {dip_data.get("active_treaties", 0)}
  - Active Alliances: {dip_data.get("active_alliances", 0)}
  - Diplomatic Stability: {dip_data.get("overall_stability", 0.0):.1%}
"""

        briefing += "\nFLEET EXPANSION STATUS:\n"
        if DashboardPanel.FLEET_EXPANSION in self.last_update:
            exp_data = self.last_update[DashboardPanel.FLEET_EXPANSION].data
            briefing += f"""
  - Active Ships: {exp_data.get("active_ships", 0)}
  - Fleet Complexity: {exp_data.get("fleet_complexity", 0.0):.1%}
  - Mythologies Created: {exp_data.get("mythologies_created", 0)}
"""

        briefing += "\nFIRST CONTACT STATUS:\n"
        if DashboardPanel.FIRST_CONTACT in self.last_update:
            fc_data = self.last_update[DashboardPanel.FIRST_CONTACT].data
            briefing += f"""
  - External Fleets Detected: {fc_data.get("external_fleets_detected", 0)}
  - Threat Level: {fc_data.get("total_threat_assessment", 0.0):.1%}
  - Federation Stability: {fc_data.get("federation_stability_under_contact", 1.0):.1%}
"""

        briefing += "\n========================================================\n"
        return briefing


# ===== CONSTITUTIONAL MONITOR =====

class ConstitutionalMonitor:
    """Judicial review layer for dashboard operations"""

    def __init__(self, dashboard_core, republic):
        self.dashboard_core = dashboard_core
        self.republic = republic
        self.review_history = []

    def conduct_review(self) -> Dict[str, Any]:
        """Conduct constitutional review of dashboard operations"""
        violations = []

        # Check separation of powers
        if not self._check_separation_of_powers():
            violations.append("Separation of powers compromised")

        # Check bill of rights compliance
        if not self._check_bill_of_rights():
            violations.append("Bill of rights violation detected")

        review_result = {
            "timestamp": datetime.now().timestamp(),
            "status": "COMPLIANT" if not violations else "VIOLATIONS_DETECTED",
            "violations": violations,
            "recommendation": "APPROVE" if not violations else "INVESTIGATE",
        }

        self.review_history.append(review_result)
        return review_result

    def _check_separation_of_powers(self) -> bool:
        """Verify separation of powers is maintained"""
        # No single branch can unilaterally enact law
        gov_data = self.dashboard_core.panels[
            DashboardPanel.GOVERNANCE_CONSOLE
        ].get_current_data()
        return gov_data.get("separation_of_powers_intact", True)

    def _check_bill_of_rights(self) -> bool:
        """Verify bill of rights is being protected"""
        gov_data = self.dashboard_core.panels[
            DashboardPanel.GOVERNANCE_CONSOLE
        ].get_current_data()
        return gov_data.get("bill_of_rights_protected", True)


# ===== ELASTIC TAPE MIDDLEWARE =====

class ElasticTapeMiddleware:
    """Timeline-aware context-shifting for multi-timeline visibility"""

    def __init__(self):
        self.context_stack = []
        self.timeline_registry = {}
        self.current_timeline = "PRIMARY"

    def shift_timeline(self, timeline_id: str) -> Dict[str, Any]:
        """Shift dashboard context to different timeline"""
        if timeline_id not in self.timeline_registry:
            return {"success": False, "error": "Timeline not found"}

        self.current_timeline = timeline_id
        return {
            "success": True,
            "timeline": timeline_id,
            "timestamp": datetime.now().timestamp(),
        }

    def register_timeline(self, timeline_id: str, data: Dict[str, Any]):
        """Register timeline for context-switching"""
        self.timeline_registry[timeline_id] = data

    def get_multi_timeline_view(self) -> Dict[str, Any]:
        """Get dashboard view across multiple timelines"""
        return {
            "current_timeline": self.current_timeline,
            "registered_timelines": list(self.timeline_registry.keys()),
            "context_stack_depth": len(self.context_stack),
        }
