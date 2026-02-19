#!/usr/bin/env python3
"""
Law engine for Phase X governance.
Creates, enforces, and escalates laws across the fleet.
"""

from dataclasses import dataclass
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from governance.governance_types import (
    Law, LawType, LawViolation, LawEnforcement, ViolationSeverity,
    Proposal, ProposalType
)


class LawRegistry:
    """Registry of all laws in the fleet"""

    def __init__(self):
        self.laws: Dict[str, Law] = {}
        self.enabled = True
        self.law_counter = 0
        self._initialize_default_laws()

    def _initialize_default_laws(self):
        """Initialize foundational laws"""
        if not self.enabled:
            return

        default_laws = [
            ("Anomaly Reporting Law", LawType.REPORTING,
             "All detected anomalies must be reported to AnomalyHunter within 1 tick",
             "Warning and mandatory retraining",
             "Failure to report anomalies compromises fleet safety"),

            ("Canon Protection Law", LawType.CONTINUITY,
             "All narrative retcons require ContinuityGuardian approval",
             "Proposal rejection and timeline repair",
             "Unilateral timeline changes create continuity paradoxes"),

            ("Conduct Law", LawType.CONDUCT,
             "All ships must follow established protocols and respect democratic process",
             "Citation and potential hearing",
             "Insubordination threatens fleet cohesion"),

            ("Emergency Protocol Law", LawType.EMERGENCY,
             "During fleet emergency, all ships must comply with emergency directives",
             "Immediate sanction and containment",
             "Non-compliance during emergency threatens all ships"),
        ]

        for name, law_type, rule, enforcement, penalty in default_laws:
            law = Law(
                law_id=f"law_{self.law_counter:04d}",
                name=name,
                law_type=law_type,
                rule_description=rule,
                enforcement_action=enforcement,
                penalty_description=penalty,
                proposed_by="SYSTEM",
                proposed_timestamp=datetime.now().timestamp(),
                ratified_timestamp=datetime.now().timestamp(),
                status="active"
            )
            self.laws[law.law_id] = law
            self.law_counter += 1

    def propose_law(self, name: str, law_type: LawType, rule_desc: str,
                   enforcement: str, penalty: str,
                   proposed_by: str) -> Tuple[bool, Law]:
        """Propose a new law"""
        if not self.enabled:
            return False, None

        law_id = f"law_{self.law_counter:04d}"
        self.law_counter += 1

        law = Law(
            law_id=law_id,
            name=name,
            law_type=law_type,
            rule_description=rule_desc,
            enforcement_action=enforcement,
            penalty_description=penalty,
            proposed_by=proposed_by,
            proposed_timestamp=datetime.now().timestamp(),
            status="proposed"
        )

        self.laws[law_id] = law
        return True, law

    def ratify_law(self, law_id: str) -> Tuple[bool, str]:
        """Ratify a proposed law"""
        if not self.enabled:
            return False, "Law registry disabled"

        if law_id not in self.laws:
            return False, "Law not found"

        law = self.laws[law_id]

        if law.status != "proposed":
            return False, f"Law already {law.status}"

        law.status = "active"
        law.ratified_timestamp = datetime.now().timestamp()

        return True, f"Law '{law.name}' ratified and active"

    def repeal_law(self, law_id: str, reason: str = "") -> Tuple[bool, str]:
        """Repeal an active law"""
        if not self.enabled:
            return False, "Law registry disabled"

        if law_id not in self.laws:
            return False, "Law not found"

        law = self.laws[law_id]
        law.status = "repealed"

        return True, f"Law '{law.name}' repealed: {reason}"

    def get_active_laws(self) -> List[Law]:
        """Get all active laws"""
        return [l for l in self.laws.values() if l.status == "active"]

    def get_law_by_type(self, law_type: LawType) -> List[Law]:
        """Get all laws of a specific type"""
        return [l for l in self.laws.values() if l.law_type == law_type]

    def get_law_stats(self) -> Dict[str, Any]:
        """Get aggregate law statistics"""
        active_laws = self.get_active_laws()
        return {
            "total_laws": len(self.laws),
            "active_laws": len(active_laws),
            "proposed_laws": len([l for l in self.laws.values() if l.status == "proposed"]),
            "average_violations": (
                sum(l.violation_count for l in active_laws) / len(active_laws)
                if active_laws else 0
            ),
        }


class LawEngine:
    """Enforces laws and processes violations"""

    def __init__(self, law_registry: LawRegistry):
        self.law_registry = law_registry
        self.violations: Dict[str, LawViolation] = {}
        self.enforcements: Dict[str, LawEnforcement] = {}
        self.enabled = True
        self.violation_counter = 0
        self.enforcement_counter = 0

    def record_violation(self, law: Law, violator: str,
                        evidence: List[str] = None) -> Tuple[bool, LawViolation]:
        """Record a law violation"""
        if not self.enabled:
            return False, None

        if evidence is None:
            evidence = []

        violation_id = f"violation_{self.violation_counter:04d}"
        self.violation_counter += 1

        violation = LawViolation(
            violation_id=violation_id,
            law_id=law.law_id,
            law_name=law.name,
            violator=violator,
            violation_timestamp=datetime.now().timestamp(),
            evidence=evidence,
            severity=ViolationSeverity.WARNING,
            status="recorded"
        )

        self.violations[violation_id] = violation
        law.violation_count += 1

        return True, violation

    def check_legal_compliance(self, action: str, ship_name: str,
                              context: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Check if action complies with active laws"""
        if not self.enabled:
            return True, []

        violations_triggered = []

        for law in self.law_registry.get_active_laws():
            if self._violates_law(law, action, context):
                violations_triggered.append(law.law_id)

        compliant = len(violations_triggered) == 0
        return compliant, violations_triggered

    def _violates_law(self, law: Law, action: str, context: Dict[str, Any]) -> bool:
        """Check if action violates specific law"""
        if law.law_type == LawType.REPORTING:
            if "anomaly" in action and "report" not in action:
                return True
        elif law.law_type == LawType.CONTINUITY:
            if "retcon" in action or "timeline_change" in action:
                if context.get("approval") != "ContinuityGuardian":
                    return True
        elif law.law_type == LawType.CONDUCT:
            if "insubordinate" in context or "violates_protocol" in context:
                return True
        elif law.law_type == LawType.EMERGENCY:
            if context.get("emergency_mode") and "non_compliant" in context:
                return True

        return False

    def enforce_law_violation(self, violation: LawViolation,
                             enforcer: str) -> Tuple[bool, LawEnforcement]:
        """Enforce response to law violation"""
        if not self.enabled:
            return False, None

        # Determine enforcement action based on violation severity
        action_type = {
            ViolationSeverity.WARNING: "warning",
            ViolationSeverity.CITATION: "citation",
            ViolationSeverity.FINE: "fine",
            ViolationSeverity.HEARING: "hearing",
            ViolationSeverity.TRIAL: "trial",
            ViolationSeverity.SANCTION: "sanction",
        }.get(violation.severity, "warning")

        enforcement_id = f"enforcement_{self.enforcement_counter:04d}"
        self.enforcement_counter += 1

        enforcement = LawEnforcement(
            enforcement_id=enforcement_id,
            violation_id=violation.violation_id,
            enforcer=enforcer,
            action_timestamp=datetime.now().timestamp(),
            action_type=action_type,
        )

        self.enforcements[enforcement_id] = enforcement
        violation.status = "adjudicated"

        return True, enforcement

    def escalate_violation(self, violation: LawViolation) -> Tuple[bool, str]:
        """Escalate violation to trial if pattern repeats"""
        if not self.enabled:
            return False, "Law engine disabled"

        # Check if ship has previous violations of same law
        previous_violations = [
            v for v in self.violations.values()
            if v.violator == violation.violator and v.law_id == violation.law_id
            and v.violation_id != violation.violation_id
        ]

        if len(previous_violations) >= 2:
            # Escalate to trial
            violation.severity = ViolationSeverity.TRIAL
            return True, f"Escalated to trial: Pattern of violations by {violation.violator}"

        return False, "Insufficient violations for escalation"

    def get_ship_violation_history(self, ship_name: str) -> List[LawViolation]:
        """Get all violations recorded for a ship"""
        return [v for v in self.violations.values() if v.violator == ship_name]

    def get_violation_stats(self) -> Dict[str, Any]:
        """Get aggregate violation statistics"""
        by_severity = {}
        for severity in ViolationSeverity:
            count = len([v for v in self.violations.values() if v.severity == severity])
            by_severity[severity.value] = count

        return {
            "total_violations": len(self.violations),
            "violations_by_severity": by_severity,
            "total_enforcements": len(self.enforcements),
            "ships_with_violations": len(set(v.violator for v in self.violations.values())),
        }
