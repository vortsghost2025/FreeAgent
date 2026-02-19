#!/usr/bin/env python3
"""
Core governance engine for Phase X.
Orchestrates constitution, factions, diplomacy, and law enforcement.
"""

from dataclasses import dataclass
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import random

from governance.constitution import Constitution
from governance.factions import FactionManager
from governance.diplomacy import DiplomacyEngine
from governance.law_engine import LawRegistry, LawEngine
from governance.governance_types import (
    Proposal, ProposalType, VoteType, GovernanceVote, GovernanceCycle,
    GovernanceVote as GovernanceVoteDataclass
)


class GovernanceEngine:
    """Central governance orchestrator for the fleet"""

    def __init__(self):
        self.constitution = Constitution()
        self.faction_manager = FactionManager()
        self.diplomacy = DiplomacyEngine()
        self.law_registry = LawRegistry()
        self.law_engine = LawEngine(self.law_registry)

        self.proposals: Dict[str, Proposal] = {}
        self.votes: Dict[str, GovernanceVoteDataclass] = {}
        self.cycles: Dict[str, GovernanceCycle] = {}

        self.enabled = True
        self.proposal_counter = 0
        self.vote_counter = 0
        self.cycle_counter = 0

        # Emergency state
        self.emergency_mode = False

    def enable_governance(self):
        """Enable governance system"""
        self.enabled = True
        self.constitution.enabled = True
        self.faction_manager.enabled = True
        self.diplomacy.enabled = True
        self.law_registry.enabled = True
        self.law_engine.enabled = True

    def disable_governance(self):
        """Disable governance system"""
        self.enabled = False
        self.constitution.enabled = False
        self.faction_manager.enabled = False
        self.diplomacy.enabled = False
        self.law_registry.enabled = False
        self.law_engine.enabled = False

    def propose(self, proposal_type: ProposalType, description: str,
               proposed_by: str, content: Dict[str, Any],
               vote_type: VoteType = VoteType.SIMPLE_MAJORITY) -> Tuple[bool, Proposal]:
        """Submit a proposal for governance vote"""
        if not self.enabled:
            return False, None

        # Validate proposal is constitutional
        proposal = Proposal(
            proposal_id=f"proposal_{self.proposal_counter:04d}",
            proposal_type=proposal_type,
            description=description,
            proposed_by=proposed_by,
            proposed_timestamp=datetime.now().timestamp(),
            content=content,
            vote_type=vote_type,
            status="pending"
        )
        self.proposal_counter += 1

        # Constitutional validation
        is_constitutional, msg = self.constitution.validate_proposal(proposal)
        if not is_constitutional:
            return False, proposal

        self.proposals[proposal.proposal_id] = proposal
        return True, proposal

    def vote(self, proposal_id: str, ship_name: str, vote: str,
            faction_alignment_strength: float = 0.5) -> Tuple[bool, str]:
        """Record a vote from a ship on a proposal"""
        if not self.enabled:
            return False, "Governance disabled"

        if proposal_id not in self.proposals:
            return False, "Proposal not found"

        if vote not in ["yes", "no", "abstain"]:
            return False, "Invalid vote"

        proposal = self.proposals[proposal_id]

        if proposal.status != "pending" and proposal.status != "voting":
            return False, f"Proposal already {proposal.status}"

        # Record vote
        vote_id = f"vote_{self.vote_counter:04d}"
        self.vote_counter += 1

        gov_vote = GovernanceVoteDataclass(
            vote_id=vote_id,
            proposal_id=proposal_id,
            ship_name=ship_name,
            vote=vote,
            timestamp=datetime.now().timestamp(),
            faction_alignment=faction_alignment_strength
        )

        self.votes[vote_id] = gov_vote

        # Update proposal vote counts
        if vote == "yes":
            proposal.votes_yes += 1
        elif vote == "no":
            proposal.votes_no += 1
        else:
            proposal.votes_abstain += 1

        proposal.status = "voting"

        return True, f"Vote recorded: {ship_name} voted {vote}"

    def calculate_vote_result(self, proposal: Proposal, total_ships: int) -> Tuple[bool, str]:
        """Calculate if proposal passes based on vote type"""
        total_votes = proposal.votes_yes + proposal.votes_no

        if total_votes == 0:
            return False, "No votes cast"

        if proposal.vote_type == VoteType.SIMPLE_MAJORITY:
            threshold = total_votes // 2 + 1
            passed = proposal.votes_yes >= threshold

        elif proposal.vote_type == VoteType.QUALIFIED_MAJORITY:
            threshold = (total_votes * 2) // 3 + 1
            passed = proposal.votes_yes >= threshold

        elif proposal.vote_type == VoteType.CONSENSUS:
            threshold = (total_votes * 9) // 10
            passed = proposal.votes_yes > threshold

        elif proposal.vote_type == VoteType.UNANIMOUS:
            passed = proposal.votes_no == 0 and proposal.votes_yes > 0

        else:
            passed = False

        return passed, f"Votes: {proposal.votes_yes} yes, {proposal.votes_no} no"

    def execute_proposal(self, proposal_id: str) -> Tuple[bool, str]:
        """Execute a ratified proposal"""
        if not self.enabled:
            return False, "Governance disabled"

        if proposal_id not in self.proposals:
            return False, "Proposal not found"

        proposal = self.proposals[proposal_id]

        if proposal.status != "ratified":
            return False, f"Proposal not ratified (status: {proposal.status})"

        # Import execution logic
        if proposal.proposal_type == ProposalType.LAW:
            return self._execute_law_proposal(proposal)
        elif proposal.proposal_type == ProposalType.TREATY:
            return self._execute_treaty_proposal(proposal)
        elif proposal.proposal_type == ProposalType.AMENDMENT:
            return self._execute_amendment_proposal(proposal)
        elif proposal.proposal_type == ProposalType.ALLIANCE:
            return self._execute_alliance_proposal(proposal)
        elif proposal.proposal_type == ProposalType.RIVALRY:
            return self._execute_rivalry_proposal(proposal)

        return False, f"Unknown proposal type: {proposal.proposal_type}"

    def _execute_law_proposal(self, proposal: Proposal) -> Tuple[bool, str]:
        """Execute law proposal"""
        law_name = proposal.content.get("name", "Unnamed Law")
        law_type = proposal.content.get("law_type", "conduct")

        # Ratify through law registry
        success = False
        for law in self.law_registry.laws.values():
            if law.law_id == proposal.content.get("law_id"):
                success, msg = self.law_registry.ratify_law(law.law_id)
                break

        proposal.executed_timestamp = datetime.now().timestamp()
        return success, f"Law executed: {law_name}"

    def _execute_treaty_proposal(self, proposal: Proposal) -> Tuple[bool, str]:
        """Execute treaty proposal"""
        treaty_id = proposal.content.get("treaty_id", "")

        if treaty_id and treaty_id in self.diplomacy.treaties:
            success, msg = self.diplomacy.ratify_treaty(treaty_id)
            proposal.executed_timestamp = datetime.now().timestamp()
            return success, msg

        return False, "Treaty not found"

    def _execute_amendment_proposal(self, proposal: Proposal) -> Tuple[bool, str]:
        """Execute constitutional amendment"""
        amendment_id = proposal.content.get("amendment_id", "")

        if amendment_id and amendment_id in self.constitution.amendments:
            success = self.constitution.ratify_amendment(
                amendment_id,
                proposal.votes_yes,
                proposal.votes_yes + proposal.votes_no
            )
            proposal.executed_timestamp = datetime.now().timestamp()
            return success, f"Amendment executed"

        return False, "Amendment not found"

    def _execute_alliance_proposal(self, proposal: Proposal) -> Tuple[bool, str]:
        """Execute alliance proposal"""
        ship1 = proposal.content.get("ship1", "")
        ship2 = proposal.content.get("ship2", "")

        success, alliance = self.diplomacy.declare_alliance(ship1, ship2)
        proposal.executed_timestamp = datetime.now().timestamp()
        return success, f"Alliance formed between {ship1} and {ship2}"

    def _execute_rivalry_proposal(self, proposal: Proposal) -> Tuple[bool, str]:
        """Execute rivalry proposal"""
        ship1 = proposal.content.get("ship1", "")
        ship2 = proposal.content.get("ship2", "")
        reason = proposal.content.get("reason", "")

        success, rivalry = self.diplomacy.declare_rivalry(ship1, ship2, reason=reason)
        proposal.executed_timestamp = datetime.now().timestamp()
        return success, f"Rivalry declared between {ship1} and {ship2}"

    def run_governance_cycle(self, all_ships: List[str]) -> Tuple[bool, str]:
        """Run a full governance cycle"""
        if not self.enabled:
            return False, "Governance disabled"

        cycle_id = f"cycle_{self.cycle_counter:04d}"
        self.cycle_counter += 1

        cycle = GovernanceCycle(
            cycle_id=cycle_id,
            cycle_number=self.cycle_counter,
            start_timestamp=datetime.now().timestamp()
        )

        # 1. Gather pending proposals
        pending_proposals = [
            p for p in self.proposals.values()
            if p.status == "pending"
        ]
        cycle.proposals_submitted = len(pending_proposals)

        # 2. Process each proposal
        for proposal in pending_proposals:
            # Auto-vote based on faction alignment and personality
            for ship_name in all_ships:
                faction = self.faction_manager.get_ship_faction(ship_name)
                alignment_strength = 0.5 if not faction else 0.8

                # Simulate vote based on faction + random personality
                if random.random() > 0.3:  # 70% likelihood to vote
                    vote = random.choice(["yes", "no"])
                    self.vote(proposal.proposal_id, ship_name, vote, alignment_strength)

            # Calculate result
            passed, msg = self.calculate_vote_result(proposal, len(all_ships))

            if passed:
                proposal.status = "ratified"
                cycle.proposals_ratified += 1

                # Execute immediately
                exec_result, exec_msg = self.execute_proposal(proposal.proposal_id)
            else:
                proposal.status = "rejected"
                cycle.proposals_rejected += 1

        # 3. Process any law violations
        violations_to_process = [
            v for v in self.law_engine.violations.values()
            if v.status == "recorded"
        ]

        for violation in violations_to_process:
            cycle.violations_processed += 1

            # Check if should escalate
            escalated, msg = self.law_engine.escalate_violation(violation)
            if escalated:
                cycle.violations_escalated += 1
                cycle.notes.append(msg)

        cycle.end_timestamp = datetime.now().timestamp()
        self.cycles[cycle_id] = cycle

        return True, f"Governance cycle {cycle.cycle_number} completed"

    def activate_emergency_mode(self, reason: str = "") -> Tuple[bool, str]:
        """Temporarily suspend governance during emergency"""
        self.emergency_mode = True
        return True, f"Emergency mode activated: {reason}"

    def deactivate_emergency_mode(self) -> Tuple[bool, str]:
        """Restore normal governance after emergency"""
        self.emergency_mode = False
        return True, "Emergency mode deactivated. Governance restored."

    def get_governance_status(self) -> Dict[str, Any]:
        """Get overall governance status"""
        return {
            "enabled": self.enabled,
            "emergency_mode": self.emergency_mode,
            "total_proposals": len(self.proposals),
            "pending_proposals": len([p for p in self.proposals.values() if p.status == "pending"]),
            "total_laws": self.law_registry.law_counter,
            "active_laws": len(self.law_registry.get_active_laws()),
            "total_violations": len(self.law_engine.violations),
            "factions": len(self.faction_manager.factions),
            "treaties": len([t for t in self.diplomacy.treaties.values() if t.status == "active"]),
        }
