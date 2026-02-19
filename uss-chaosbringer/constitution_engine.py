#!/usr/bin/env python3
"""
PHASE XVIII - CONSTITUTION ENGINE
Self-interpreting laws, judicial reasoning, constitutional amendment logic.
Provides legal framework for the federation with adaptive constitutional mechanics.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Set, Tuple, Callable
from datetime import datetime
from enum import Enum


class ConstitutionalPrinciple(Enum):
    """Core constitutional principles"""
    SEPARATION_OF_POWERS = "separation_of_powers"
    RULE_OF_LAW = "rule_of_law"
    DEMOCRATIC_REPRESENTATION = "democratic_representation"
    PROTECTION_OF_RIGHTS = "protection_of_rights"
    FEDERALISM = "federalism"
    PERPETUAL_SELF_IMPROVEMENT = "perpetual_self_improvement"


class AmendmentStatus(Enum):
    """Amendment lifecycle status"""
    PROPOSED = "proposed"
    DEBATED = "debated"
    VOTED = "voted"
    RATIFIED = "ratified"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class InterpretationType(Enum):
    """Types of constitutional interpretation"""
    STRICT_CONSTRUCTION = "strict_construction"
    LIVING_DOCUMENT = "living_document"
    ORIGINALIST = "originalist"
    TEXTUALIST = "textualist"
    PURPOSIVIST = "purposivist"


@dataclass
class ConstitutionalRight:
    """A right granted by the constitution"""
    right_id: str
    name: str
    description: str
    protected_actions: List[str]
    ratification_number: int  # Which amendment established this
    priority: int  # Higher = more fundamental


@dataclass
class ConstitutionalConstraint:
    """A limit on power enforced by constitution"""
    constraint_id: str
    description: str
    affected_actors: List[str]  # Who is constrained (e.g., "executive", "legislature")
    enforcement_mechanism: str  # How it's enforced
    penalty_for_violation: str
    checkable: bool  # Can be verified programmatically


@dataclass
class ConstitutionalAmendment:
    """A proposed change to the constitution"""
    amendment_id: str
    amendment_number: int  # 1st, 2nd, 3rd amendment, etc.
    proposer: str
    proposed_at: float
    status: AmendmentStatus
    title: str
    description: str
    proposed_changes: Dict[str, Any]  # What's being changed
    ratification_votes: List[Tuple[str, bool]]  # (voter, vote_for_or_against)
    ratification_count: int = 0
    ratification_required: int = 0  # E.g., 2/3 majority
    reasoning: str = ""
    precedents: List[str] = field(default_factory=list)


@dataclass
class JudicialOpinion:
    """A court's interpretation of a law or constitutional question"""
    opinion_id: str
    case_id: str
    judge: str
    interpretation_type: InterpretationType
    question: str
    ruling: str
    reasoning: List[str]
    precedents_cited: List[str]
    issued_at: float
    authority_level: str  # SUPREME_COURT, APPELLATE, TRIAL


@dataclass
class ConstitutionalCase:
    """A legal case involving constitutional questions"""
    case_id: str
    plaintiff: str
    defendant: str
    question: str
    facts: str
    trial_date: float
    opinions: List[str] = field(default_factory=list)  # JudicialOpinion IDs
    status: str = "PENDING"  # PENDING, DECIDED, APPEALED
    precedent_value: float = 0.0  # How much weight this sets for future cases


class ConstitutionEngine:
    """Self-interpreting constitution with judicial reasoning"""

    def __init__(self):
        self.principles: Dict[str, List[str]] = {}  # principle → list of supporting laws
        self.rights: Dict[str, ConstitutionalRight] = {}
        self.constraints: Dict[str, ConstitutionalConstraint] = {}
        self.amendments: Dict[str, ConstitutionalAmendment] = {}
        self.opinions: Dict[str, JudicialOpinion] = {}
        self.cases: Dict[str, ConstitutionalCase] = {}
        self.amendment_counter = 0
        self.opinion_counter = 0
        self.case_counter = 0
        self.interpretation_weight = {
            InterpretationType.STRICT_CONSTRUCTION: 0.7,
            InterpretationType.LIVING_DOCUMENT: 0.8,
            InterpretationType.ORIGINALIST: 0.6,
            InterpretationType.TEXTUALIST: 0.7,
            InterpretationType.PURPOSIVIST: 0.8,
        }
        self._initialize_base_constitution()

    def _initialize_base_constitution(self):
        """Initialize foundational constitutional framework"""
        # Foundational principles
        for principle in ConstitutionalPrinciple:
            self.principles[principle.value] = []

        # Core rights (Bill of Rights equivalent)
        self._establish_right(
            "right_free_speech",
            "Freedom of Speech",
            "All agents may express opinions freely",
            ["propose_law", "debate", "publish_narrative"],
            amendment_number=1,
            priority=10,
        )
        self._establish_right(
            "right_due_process",
            "Due Process",
            "No agent shall be punished without fair trial",
            ["trial_participation", "legal_representation"],
            amendment_number=5,
            priority=9,
        )
        self._establish_right(
            "right_petition",
            "Right to Petition",
            "All agents may petition for redress of grievances",
            ["propose_amendment", "appeal"],
            amendment_number=1,
            priority=8,
        )

        # Core constraints
        self._establish_constraint(
            "no_unilateral_law",
            "No single branch may unilaterally enact law",
            ["legislature", "executive"],
            "Requires participation from multiple branches",
            "Veto of unilateral actions",
            checkable=True,
        )
        self._establish_constraint(
            "separation_of_powers",
            "Executive, legislative, judicial branches kept separate",
            ["all"],
            "Judicial review and oversight",
            "Removal of officials for overreach",
            checkable=True,
        )
        self._establish_constraint(
            "no_ex_post_facto",
            "No retroactive punishment for past actions",
            ["legislature", "judiciary"],
            "Constitutional review",
            "Nullification of retroactive laws",
            checkable=True,
        )

    def _establish_right(
        self,
        right_id: str,
        name: str,
        description: str,
        protected_actions: List[str],
        amendment_number: int,
        priority: int,
    ):
        """Establish a constitutional right"""
        right = ConstitutionalRight(
            right_id=right_id,
            name=name,
            description=description,
            protected_actions=protected_actions,
            ratification_number=amendment_number,
            priority=priority,
        )
        self.rights[right_id] = right
        if amendment_number <= 3:
            self.principles[ConstitutionalPrinciple.PROTECTION_OF_RIGHTS.value].append(
                right_id
            )

    def _establish_constraint(
        self,
        constraint_id: str,
        description: str,
        affected_actors: List[str],
        enforcement_mechanism: str,
        penalty: str,
        checkable: bool,
    ):
        """Establish a constitutional constraint"""
        constraint = ConstitutionalConstraint(
            constraint_id=constraint_id,
            description=description,
            affected_actors=affected_actors,
            enforcement_mechanism=enforcement_mechanism,
            penalty_for_violation=penalty,
            checkable=checkable,
        )
        self.constraints[constraint_id] = constraint
        self.principles[ConstitutionalPrinciple.SEPARATION_OF_POWERS.value].append(constraint_id)

    def propose_amendment(
        self,
        proposer: str,
        title: str,
        description: str,
        proposed_changes: Dict[str, Any],
        ratification_required: int = 2,  # E.g., 2/3 majority
    ) -> str:
        """Propose a constitutional amendment"""
        self.amendment_counter += 1
        amendment_id = f"amendment_{self.amendment_counter:04d}"
        amendment = ConstitutionalAmendment(
            amendment_id=amendment_id,
            amendment_number=self.amendment_counter,
            proposer=proposer,
            proposed_at=datetime.now().timestamp(),
            status=AmendmentStatus.PROPOSED,
            title=title,
            description=description,
            proposed_changes=proposed_changes,
            ratification_votes=[],
            ratification_required=ratification_required,
        )
        self.amendments[amendment_id] = amendment
        return amendment_id

    def vote_on_amendment(self, amendment_id: str, voter: str, vote_for: bool) -> bool:
        """Cast vote on amendment"""
        if amendment_id not in self.amendments:
            return False

        amendment = self.amendments[amendment_id]
        if amendment.status not in [AmendmentStatus.PROPOSED, AmendmentStatus.DEBATED]:
            return False

        amendment.ratification_votes.append((voter, vote_for))
        if amendment.status == AmendmentStatus.PROPOSED:
            amendment.status = AmendmentStatus.DEBATED

        return True

    def finalize_amendment_vote(self, amendment_id: str) -> bool:
        """Finalize amendment ratification based on votes"""
        if amendment_id not in self.amendments:
            return False

        amendment = self.amendments[amendment_id]
        votes_for = sum(1 for _, vote in amendment.ratification_votes if vote)
        total_votes = len(amendment.ratification_votes)

        amendment.status = AmendmentStatus.VOTED
        amendment.ratification_count = votes_for

        # Check if ratified
        if self._meets_ratification_threshold(votes_for, total_votes, amendment.ratification_required):
            amendment.status = AmendmentStatus.RATIFIED
            self._apply_amendment(amendment)
            return True
        else:
            amendment.status = AmendmentStatus.REJECTED
            return False

    def _meets_ratification_threshold(self, votes_for: int, total_votes: int, required: int) -> bool:
        """Check if vote meets ratification threshold"""
        if required == 1:
            return votes_for >= total_votes  # Unanimous
        elif required == 2:
            return votes_for >= (total_votes * 2 / 3)  # 2/3 majority
        elif required == 3:
            return votes_for >= (total_votes * 3 / 4)  # 3/4 majority
        else:
            return votes_for >= required

    def _apply_amendment(self, amendment: ConstitutionalAmendment):
        """Apply ratified amendment to constitution"""
        # Amendment logic here - could establish new rights, constraints, etc.
        if "new_right" in amendment.proposed_changes:
            right_data = amendment.proposed_changes["new_right"]
            self._establish_right(
                f"right_{amendment.amendment_number}",
                right_data.get("name", ""),
                right_data.get("description", ""),
                right_data.get("protected_actions", []),
                amendment.amendment_number,
                right_data.get("priority", 5),
            )

    def file_case(
        self,
        plaintiff: str,
        defendant: str,
        question: str,
        facts: str,
    ) -> str:
        """File a constitutional case"""
        self.case_counter += 1
        case_id = f"case_{self.case_counter:04d}"
        case = ConstitutionalCase(
            case_id=case_id,
            plaintiff=plaintiff,
            defendant=defendant,
            question=question,
            facts=facts,
            trial_date=datetime.now().timestamp(),
        )
        self.cases[case_id] = case
        return case_id

    def issue_judicial_opinion(
        self,
        case_id: str,
        judge: str,
        interpretation_type: InterpretationType,
        ruling: str,
        reasoning: List[str],
        precedents_cited: List[str] = None,
        authority_level: str = "TRIAL",
    ) -> str:
        """Issue a judicial opinion on a case"""
        if precedents_cited is None:
            precedents_cited = []

        self.opinion_counter += 1
        opinion_id = f"opinion_{self.opinion_counter:04d}"

        # Extract question from case
        question = ""
        if case_id in self.cases:
            question = self.cases[case_id].question

        opinion = JudicialOpinion(
            opinion_id=opinion_id,
            case_id=case_id,
            judge=judge,
            interpretation_type=interpretation_type,
            question=question,
            ruling=ruling,
            reasoning=reasoning,
            precedents_cited=precedents_cited,
            issued_at=datetime.now().timestamp(),
            authority_level=authority_level,
        )

        self.opinions[opinion_id] = opinion

        if case_id in self.cases:
            self.cases[case_id].opinions.append(opinion_id)
            self.cases[case_id].status = "DECIDED"
            # Set precedent value based on authority
            if authority_level == "SUPREME_COURT":
                self.cases[case_id].precedent_value = 1.0
            elif authority_level == "APPELLATE":
                self.cases[case_id].precedent_value = 0.7
            else:
                self.cases[case_id].precedent_value = 0.4

        return opinion_id

    def validate_law(self, law_text: str, proposed_by: str) -> Dict[str, Any]:
        """Validate a proposed law against constitution"""
        issues = []
        warnings = []

        # Check against constraints
        for constraint_id, constraint in self.constraints.items():
            if constraint.checkable:
                if self._violates_constraint(law_text, constraint):
                    issues.append(f"Violates: {constraint.description}")

        # Check rights protection
        for right_id, right in self.rights.items():
            if self._conflicts_with_right(law_text, right):
                warnings.append(f"May restrict right: {right.name}")

        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "can_be_amended": len(issues) > 0,  # If unconstitutional, could propose amendment
        }

    def _violates_constraint(self, law_text: str, constraint: ConstitutionalConstraint) -> bool:
        """Check if law text violates a constraint"""
        # Simplified: check for keywords
        violation_keywords = {
            "no_unilateral_law": ["unilateral", "absolute", "sole"],
            "separation_of_powers": ["executive power", "legislative power"],
            "no_ex_post_facto": ["retroactive", "previous", "before"],
        }
        keywords = violation_keywords.get(constraint.constraint_id, [])
        return any(keyword in law_text.lower() for keyword in keywords)

    def _conflicts_with_right(self, law_text: str, right: ConstitutionalRight) -> bool:
        """Check if law conflicts with a right"""
        # Simplified: check for restriction keywords
        restriction_keywords = ["restrict", "prohibit", "forbid", "deny"]
        return any(keyword in law_text.lower() for keyword in restriction_keywords)

    def interpret_constitution(
        self,
        question: str,
        interpretation_type: InterpretationType,
    ) -> Dict[str, Any]:
        """Provide constitutional interpretation for a question"""
        authority = self.interpretation_weight[interpretation_type]

        question_lower = question.lower()
        answer = ""
        if "separation" in question_lower or "executive" in question_lower:
            answer = (
                "The constitution mandates separation of executive, legislative, and "
                "judicial powers to prevent concentration of authority."
            )
        elif "amendment" in question_lower:
            answer = (
                "Amendments require ratification by supermajority, ensuring broad consensus "
                "for constitutional change."
            )
        elif "right" in question_lower:
            answer = (
                "Constitutional rights are fundamental protections that cannot be "
                "unilaterally suspended."
            )
        else:
            answer = "The constitution's principle of rule of law applies to all actions."

        return {
            "question": question,
            "interpretation_type": interpretation_type.value,
            "answer": answer,
            "authority_level": authority,
            "reasoning": [
                "Follows established constitutional principles",
                f"Interpretation type: {interpretation_type.value}",
            ],
        }

    def get_constitutional_status(self) -> Dict[str, Any]:
        """Get comprehensive constitutional status"""
        amendments_ratified = sum(
            1 for a in self.amendments.values() if a.status == AmendmentStatus.RATIFIED
        )
        amendments_pending = sum(
            1 for a in self.amendments.values()
            if a.status in [AmendmentStatus.PROPOSED, AmendmentStatus.DEBATED, AmendmentStatus.VOTED]
        )
        cases_decided = sum(1 for c in self.cases.values() if c.status == "DECIDED")
        cases_pending = sum(1 for c in self.cases.values() if c.status == "PENDING")

        return {
            "total_rights": len(self.rights),
            "total_constraints": len(self.constraints),
            "amendments_proposed": len(self.amendments),
            "amendments_ratified": amendments_ratified,
            "amendments_pending": amendments_pending,
            "amendments_rejected": sum(
                1 for a in self.amendments.values() if a.status == AmendmentStatus.REJECTED
            ),
            "cases_filed": len(self.cases),
            "cases_decided": cases_decided,
            "cases_pending": cases_pending,
            "core_principles": list(self.principles.keys()),
            "interpretation_methods": [m.value for m in InterpretationType],
        }
