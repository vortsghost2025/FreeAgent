#!/usr/bin/env python3
"""
Constitutional system for Phase X governance.
Manages principles, rights, constraints, and amendments.
"""

from dataclasses import dataclass
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from governance.governance_types import (
    ConstitutionalPrinciple, ConstitutionalRight, ConstitutionalConstraint,
    Amendment, Proposal, ProposalType
)


class Constitution:
    """Manages the constitution of the fleet"""

    def __init__(self):
        self.principles: Dict[str, ConstitutionalPrinciple] = {}
        self.rights: Dict[str, ConstitutionalRight] = {}
        self.constraints: Dict[str, ConstitutionalConstraint] = {}
        self.amendments: Dict[str, Amendment] = {}
        self.enabled = True
        self._initialize_foundation()

    def _initialize_foundation(self):
        """Initialize foundational constitutional principles"""
        if not self.enabled:
            return

        # Core principles
        foundation_principles = [
            ("principle_001", "All Ships Have Voice",
             "Every ship in the fleet has the right to be heard in governance."),
            ("principle_002", "Canon Is Sacred",
             "The narrative continuity of the universe shall be protected above all."),
            ("principle_003", "Rule of Law",
             "All actions shall be governed by established laws, equally applied."),
            ("principle_004", "Democratic Process",
             "Decisions shall be made through fair voting and consensus-building."),
        ]

        for pid, name, desc in foundation_principles:
            principle = ConstitutionalPrinciple(
                principle_id=pid,
                name=name,
                description=desc,
                ratified_timestamp=datetime.now().timestamp()
            )
            self.principles[pid] = principle

        # Core rights
        foundation_rights = [
            ("right_001", "Right to Propose",
             "All ships have the right to propose laws, treaties, and amendments."),
            ("right_002", "Right to Vote",
             "All ships have the right to vote on proposals."),
            ("right_003", "Right to Fair Trial",
             "Any ship accused of violating law has the right to a hearing."),
            ("right_004", "Right to Information",
             "All ships have access to governance records and decisions."),
        ]

        for rid, name, desc in foundation_rights:
            right = ConstitutionalRight(
                right_id=rid,
                name=name,
                description=desc,
                applies_to=["ALL"],
                ratified_timestamp=datetime.now().timestamp()
            )
            self.rights[rid] = right

        # Core constraints
        foundation_constraints = [
            ("constraint_001", "Separation of Powers",
             "No single ship shall hold absolute power over governance."),
            ("constraint_002", "Continuity Guardian Veto",
             "ContinuityGuardian has veto power over proposals that violate canon."),
            ("constraint_003", "No Retroactive Laws",
             "Laws cannot be applied to events that occurred before their ratification."),
            ("constraint_004", "Democratic Majority",
             "Constitutional amendments require supermajority (2/3) approval."),
        ]

        for cid, name, desc in foundation_constraints:
            constraint = ConstitutionalConstraint(
                constraint_id=cid,
                name=name,
                description=desc,
                ratified_timestamp=datetime.now().timestamp()
            )
            self.constraints[cid] = constraint

    def add_amendment(self, amendment: Amendment) -> bool:
        """Submit an amendment for consideration"""
        if not self.enabled:
            return False

        amendment.amendment_id = f"amendment_{len(self.amendments):04d}"
        amendment.proposed_timestamp = datetime.now().timestamp()
        amendment.status = "pending"

        self.amendments[amendment.amendment_id] = amendment
        return True

    def ratify_amendment(self, amendment_id: str, votes_yes: int, votes_total: int) -> bool:
        """Ratify an amendment if it meets 2/3 supermajority"""
        if not self.enabled or amendment_id not in self.amendments:
            return False

        amendment = self.amendments[amendment_id]
        required_votes = (votes_total * 2) // 3  # 2/3 supermajority

        if votes_yes >= required_votes:
            amendment.status = "ratified"
            amendment.ratified_timestamp = datetime.now().timestamp()

            # Apply amendment based on type
            if amendment.amendment_type == "principle":
                principle = ConstitutionalPrinciple(
                    principle_id=f"principle_{len(self.principles):04d}",
                    name=amendment.description,
                    description=f"Ratified as amendment: {amendment.amendment_id}",
                    ratified_timestamp=amendment.ratified_timestamp
                )
                self.principles[principle.principle_id] = principle
            elif amendment.amendment_type == "right":
                right = ConstitutionalRight(
                    right_id=f"right_{len(self.rights):04d}",
                    name=amendment.description,
                    description=f"Ratified as amendment: {amendment.amendment_id}",
                    ratified_timestamp=amendment.ratified_timestamp
                )
                self.rights[right.right_id] = right
            elif amendment.amendment_type == "constraint":
                constraint = ConstitutionalConstraint(
                    constraint_id=f"constraint_{len(self.constraints):04d}",
                    name=amendment.description,
                    description=f"Ratified as amendment: {amendment.amendment_id}",
                    ratified_timestamp=amendment.ratified_timestamp
                )
                self.constraints[constraint.constraint_id] = constraint

            return True

        amendment.status = "rejected"
        return False

    def validate_proposal(self, proposal: Proposal) -> Tuple[bool, str]:
        """Check if proposal complies with constitution"""
        if not self.enabled:
            return True, "Constitution disabled"

        # Check basic validity
        if not proposal.description:
            return False, "Proposal must have description"

        # Check that proposal respects fundamental constraints
        if proposal.proposal_type == ProposalType.AMENDMENT:
            # Amendments require supermajority vote
            proposal.vote_type = "qualified_majority"

        # Check for retroactive laws
        if proposal.proposal_type == ProposalType.LAW:
            if "retroactive" in proposal.content.get("description", "").lower():
                return False, "Retroactive laws violate Constitution"

        return True, "Proposal is constitutional"

    def get_narrative_canon(self) -> Dict[str, Any]:
        """Get canonical facts about constitution"""
        return {
            "principles": {name: p.name for name, p in self.principles.items()},
            "rights": {name: r.name for name, r in self.rights.items()},
            "constraints": {name: c.name for name, c in self.constraints.items()},
            "amendments_ratified": len([a for a in self.amendments.values() if a.status == "ratified"]),
        }

    def get_ratified_amendments(self) -> List[Amendment]:
        """Get all ratified amendments"""
        return [a for a in self.amendments.values() if a.status == "ratified"]

    def is_action_constitutional(self, action: str, context: Dict[str, Any]) -> bool:
        """Check if an action is constitutional"""
        if not self.enabled:
            return True

        # Basic checks
        if "veto" in action and context.get("ship") != "ContinuityGuardian":
            return False

        if "retroactive" in action:
            return False

        return True
