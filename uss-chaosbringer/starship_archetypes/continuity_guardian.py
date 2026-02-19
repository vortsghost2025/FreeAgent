#!/usr/bin/env python3
"""
ContinuityGuardian — Canon Enforcer (Phase X Archetype)
Personality: STERN (lawful, authoritative, unwavering)
Domains: CONTINUITY_ENFORCEMENT, TIMELINE_REPAIR, CANON_VALIDATION
Governance Role: Constitutional veto power on proposals that violate canon
"""

from typing import Dict, Any, List, Callable
from dataclasses import dataclass
from datetime import datetime
import random

from starship import Starship, ShipEvent, ShipEventResult


@dataclass
class CanonValidation:
    """Result of canon validation"""
    validation_id: str
    entity: str
    entity_type: str
    is_canonical: bool
    confidence: float
    violations_found: List[str]
    remediation: str


@dataclass
class VetoDecision:
    """Decision to veto or allow a proposal"""
    veto_id: str
    proposal_id: str
    proposed_by: str
    violation_found: bool
    violation_type: str
    veto_reasoning: str
    canonical_authority: float


class ContinuityGuardian(Starship):
    """A starship that protects narrative canon and timeline integrity"""

    def __init__(self, ship_name: str = "ContinuityGuardian-Eternal"):
        super().__init__(ship_name, personality_mode='STERN')
        self.canonical_facts: Dict[str, Any] = {}
        self.veto_history: List[VetoDecision] = []
        self.timeline_repairs: List[Dict[str, Any]] = []
        self.canon_violations: List[Dict[str, Any]] = []
        self.authority_level: float = 1.0  # Maximum authority

    def get_initial_state(self) -> Dict[str, Any]:
        """Initialize ContinuityGuardian state"""
        return {
            # Base starship fields
            "threat_level": 2,  # Low, guardians are stable
            "mode": "NORMAL",
            "shields": 100,
            "warp_factor": 4,
            "reactor_temp": 45,

            # ContinuityGuardian-specific fields
            "canonical_certainty": 0.99,
            "veto_power": 1.0,
            "timeline_integrity": 0.98,
            "violations_detected": 0,
            "authority_rating": 0.95,
            "legal_precedents": 0,
            "canon_locked_items": 0,
            "timeline_repairs_performed": 0,
        }

    def _register_handlers(self):
        """Register domain handlers for ContinuityGuardian"""
        self.handlers['CONTINUITY_ENFORCEMENT'] = self._handle_continuity_enforcement
        self.handlers['TIMELINE_REPAIR'] = self._handle_timeline_repair
        self.handlers['CANON_VALIDATION'] = self._handle_canon_validation

    def get_narrator_config(self) -> Dict[str, Any]:
        """Return STERN personality configuration"""
        return {
            "default_tone": "stern_authoritative",
            "signature_phrases": [
                "This violates established canon.",
                "The record must be preserved.",
                "By constitutional authority, I cannot permit this.",
                "Timeline integrity is non-negotiable.",
                "The facts are immutable.",
                "Canon stands. Arguments are irrelevant.",
            ],
            "tone_inflexibility": 0.95,
            "legalism": 0.98,
            "precedent_adherence": 0.99,
        }

    def get_safety_rules(self) -> List[Dict[str, Any]]:
        """Safety rules for ContinuityGuardian"""
        return [
            {
                "name": "Canon Integrity",
                "condition": lambda state: state.get("canonical_certainty", 1.0) < 0.8,
                "action": lambda state: {
                    **state,
                    "threat_level": min(10, state.get("threat_level", 0) + 1),
                    "canonical_certainty": min(1.0, state.get("canonical_certainty", 0) + 0.1)
                },
                "severity": "ALERT"
            },
            {
                "name": "Timeline Collapse Risk",
                "condition": lambda state: state.get("timeline_integrity", 1.0) < 0.7,
                "action": lambda state: {
                    **state,
                    "mode": "CRITICAL",
                    "threat_level": 10
                },
                "severity": "CRITICAL"
            },
        ]

    def validate_canon_compliance(self, entity: str, entity_type: str,
                                 context: Dict[str, Any]) -> CanonValidation:
        """Validate if entity/proposal complies with established canon"""
        violations = self._find_canon_violations(entity, entity_type, context)

        validation = CanonValidation(
            validation_id=f"validation_{len(self.canonical_facts):04d}",
            entity=entity,
            entity_type=entity_type,
            is_canonical=len(violations) == 0,
            confidence=(1.0 - (len(violations) * 0.15)),
            violations_found=violations,
            remediation=self._suggest_remediation(violations) if violations else "No action required"
        )

        return validation

    def veto_if_paradox(self, proposal_id: str, proposed_by: str,
                       proposal_content: Dict[str, Any]) -> VetoDecision:
        """Examine proposal for canon violations and veto if necessary"""
        violation_found = False
        violation_type = ""

        # Check for retroactive law violations
        if "retroactive" in proposal_content.get("description", "").lower():
            violation_found = True
            violation_type = "RETROACTIVE_LAW"

        # Check for timeline retcons
        if proposal_content.get("proposal_type") == "TIMELINE_RETCON":
            violation_found = True
            violation_type = "TIMELINE_RETCON"

        # Check for character/fact changes
        if "character_change" in proposal_content or "rewrite" in proposal_content.get("description", "").lower():
            violation_found = True
            violation_type = "CHARACTER_RETCON"

        veto_decision = VetoDecision(
            veto_id=f"veto_{len(self.veto_history):04d}",
            proposal_id=proposal_id,
            proposed_by=proposed_by,
            violation_found=violation_found,
            violation_type=violation_type if violation_found else "NONE",
            veto_reasoning=self._generate_veto_reasoning(violation_type) if violation_found else "",
            canonical_authority=self.authority_level
        )

        if violation_found:
            self.veto_history.append(veto_decision)
            self.state["violations_detected"] = len(self.veto_history)

        return veto_decision

    def enforce_continuity_law(self, violation: Dict[str, Any]) -> Dict[str, Any]:
        """Enforce continuity law against violator"""
        enforcement = {
            "enforcement_id": f"enforce_{len(self.canon_violations):04d}",
            "violation": violation,
            "enforcer": self.ship_name,
            "action": "TIMELINE_LOCKDOWN",
            "affected_timeline": violation.get("timeline_id", ""),
            "repair_order": "REQUIRED",
            "authority_invoked": "CONSTITUTIONAL_VETO",
            "enforcement_timestamp": datetime.now().timestamp(),
        }

        self.canon_violations.append(enforcement)
        self.state["violations_detected"] += 1

        return enforcement

    def repair_timeline(self, timeline_id: str, damage_description: str) -> Dict[str, Any]:
        """Repair a damaged timeline"""
        repair = {
            "repair_id": f"repair_{len(self.timeline_repairs):04d}",
            "timeline_id": timeline_id,
            "damage_description": damage_description,
            "repair_method": random.choice([
                "Causal Chain Reconstruction",
                "Narrative Coherence Enforcement",
                "Event Reordering",
                "Character Arc Restoration",
                "Thematic Realignment",
            ]),
            "timeline_integrity_before": random.uniform(0.5, 0.9),
            "timeline_integrity_after": random.uniform(0.85, 0.99),
            "repair_timestamp": datetime.now().timestamp(),
            "success": random.random() > 0.1,
        }

        self.timeline_repairs.append(repair)
        self.state["timeline_repairs_performed"] = len(self.timeline_repairs)
        self.state["timeline_integrity"] = repair["timeline_integrity_after"]

        return repair

    def lock_canon_item(self, item_id: str, item_type: str, reason: str) -> Dict[str, Any]:
        """Lock an item in canon (prevent modification)"""
        locked_item = {
            "lock_id": f"lock_{self.state['canon_locked_items'] + 1:04d}",
            "item_id": item_id,
            "item_type": item_type,
            "reason": reason,
            "locked_timestamp": datetime.now().timestamp(),
            "locked_by": self.ship_name,
            "locked_forever": True,
        }

        self.canonical_facts[item_id] = {
            "item": item_type,
            "locked": True,
            "reason": reason
        }

        self.state["canon_locked_items"] += 1

        return locked_item

    def get_canonical_authority_report(self) -> Dict[str, Any]:
        """Get report on canonical authority and enforcement"""
        return {
            "canonical_certainty": self.state.get("canonical_certainty", 0),
            "veto_power": self.state.get("veto_power", 0),
            "timeline_integrity": self.state.get("timeline_integrity", 0),
            "vetoes_issued": len(self.veto_history),
            "violations_detected": self.state.get("violations_detected", 0),
            "timelines_repaired": len(self.timeline_repairs),
            "canon_items_locked": self.state.get("canon_locked_items", 0),
            "authority_rating": self.state.get("authority_rating", 0),
        }

    def _find_canon_violations(self, entity: str, entity_type: str,
                              context: Dict[str, Any]) -> List[str]:
        """Find canon violations in entity"""
        violations = []

        # Check against canonical facts
        for fact_id, fact in self.canonical_facts.items():
            if fact.get("locked", False) and fact_id in context:
                violations.append(f"LOCKED_CANON_VIOLATION: {fact_id}")

        # Check for temporal inconsistencies
        if "timestamp" in context:
            if context["timestamp"] < context.get("previous_event_timestamp", float('inf')):
                violations.append("TEMPORAL_PARADOX")

        # Check for continuity contradictions
        if "contradicts" in context:
            violations.append("NARRATIVE_CONTRADICTION")

        return violations

    def _suggest_remediation(self, violations: List[str]) -> str:
        """Suggest remediation for violations"""
        if not violations:
            return "No remediation needed"

        if "TEMPORAL_PARADOX" in violations:
            return "Temporal paradox requires timeline reconstruction"

        if "NARRATIVE_CONTRADICTION" in violations:
            return "Narrative contradiction requires rewrite or clarification"

        if "LOCKED_CANON_VIOLATION" in violations:
            return "Canon item locked. Proposal must be resubmitted without this element."

        return "Review proposal and resubmit with canon-compliant content"

    def _generate_veto_reasoning(self, violation_type: str) -> str:
        """Generate reasoning for veto"""
        reasons = {
            "RETROACTIVE_LAW": "Retroactive laws violate constitutional timeline protection clause",
            "TIMELINE_RETCON": "Timeline retception violates canon protection mandate",
            "CHARACTER_RETCON": "Character retcon violates established narrative integrity",
        }
        return reasons.get(violation_type, "Canon violation detected")

    def _handle_continuity_enforcement(self, event: ShipEvent) -> Dict[str, Any]:
        """Handle CONTINUITY_ENFORCEMENT domain events"""
        violation = event.payload.get("violation", {})

        enforcement = self.enforce_continuity_law(violation)

        self.state["canonical_certainty"] = max(0.8, self.state.get("canonical_certainty", 1.0) - 0.05)

        return {
            "domain_action": "continuity_enforced",
            "enforcement_id": enforcement["enforcement_id"],
            "action": enforcement["action"],
        }

    def _handle_timeline_repair(self, event: ShipEvent) -> Dict[str, Any]:
        """Handle TIMELINE_REPAIR domain events"""
        timeline_id = event.payload.get("timeline_id", "")
        damage_desc = event.payload.get("damage_description", "Unknown damage")

        repair = self.repair_timeline(timeline_id, damage_desc)

        return {
            "domain_action": "timeline_repaired",
            "repair_id": repair["repair_id"],
            "method": repair["repair_method"],
            "success": repair["success"],
            "integrity_after": repair["timeline_integrity_after"],
        }

    def _handle_canon_validation(self, event: ShipEvent) -> Dict[str, Any]:
        """Handle CANON_VALIDATION domain events"""
        entity = event.payload.get("entity", "")
        entity_type = event.payload.get("type", "unknown")
        context = event.payload.get("context", {})

        validation = self.validate_canon_compliance(entity, entity_type, context)

        return {
            "domain_action": "canon_validated",
            "validation_id": validation.validation_id,
            "is_canonical": validation.is_canonical,
            "confidence": validation.confidence,
            "violations": len(validation.violations_found),
        }
