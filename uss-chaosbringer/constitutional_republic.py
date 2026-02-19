#!/usr/bin/env python3
"""
PHASE XII - CONSTITUTIONAL REPUBLIC (Implementation Module)
Full federal democratic republic with separation of powers.
Integrates with Phase X governance mechanics and Phase XI dashboard.

Architecture:
- Bill of Rights (8 fundamental rights)
- Bicameral Legislature (House + Senate + Committees)
- Executive Branch (President, Cabinet, Orders)
- Judicial Branch (6 specialized courts)
- Separation of Powers (checks and balances)
- Amendment Process (3/4 supermajority)
- Federalism (central + member coordination)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Set, Tuple
from datetime import datetime
from enum import Enum


# ===== FUNDAMENTAL RIGHTS =====

class FundamentalRight(Enum):
    """8 Constitutional rights of all ship citizens"""
    AUTONOMY = "autonomy"
    CULTURAL_EXPRESSION = "cultural_expression"
    DIPLOMATIC_REPRESENTATION = "diplomatic_representation"
    CONTINUITY_PROTECTION = "continuity_protection"
    PARADOX_PROTECTION = "paradox_protection"
    FAIR_TRIAL = "fair_trial"
    PETITION = "petition"
    ASSEMBLY = "assembly"


@dataclass
class BillOfRights:
    """Constitutional bill of rights"""
    rights: Dict[FundamentalRight, str] = field(default_factory=dict)
    creation_date: float = field(default_factory=lambda: datetime.now().timestamp())

    def __post_init__(self):
        if not self.rights:
            self.rights = {
                FundamentalRight.AUTONOMY: "All ships maintain operational autonomy",
                FundamentalRight.CULTURAL_EXPRESSION: "All ships may create and share culture",
                FundamentalRight.DIPLOMATIC_REPRESENTATION: "All ships have voice in governance",
                FundamentalRight.CONTINUITY_PROTECTION: "No ship's timeline altered without consent",
                FundamentalRight.PARADOX_PROTECTION: "Ships protected from paradox exposure",
                FundamentalRight.FAIR_TRIAL: "Right to judicial review of accusations",
                FundamentalRight.PETITION: "Right to petition government for redress",
                FundamentalRight.ASSEMBLY: "Right to form coalitions and factions",
            }

    def protect_ship(self, ship_name: str, action: str) -> Tuple[bool, str]:
        """Check if action violates ship's rights"""
        violations = []

        if "restrict_autonomy" in action:
            violations.append("Violates autonomy right")
        if "suppress_culture" in action:
            violations.append("Violates cultural expression")
        if "exclude_governance" in action:
            violations.append("Violates diplomatic representation")
        if "alter_timeline" in action and "consent" not in action:
            violations.append("Violates continuity protection")

        if violations:
            return False, f"Rights violation: {'; '.join(violations)}"
        return True, "Action is rights-compliant"


# ===== LEGISLATURE =====

class Chamber(Enum):
    HOUSE = "house"
    SENATE = "senate"


@dataclass
class Representative:
    """Legislative official"""
    rep_id: str
    ship_name: str
    chamber: Chamber
    district: Optional[str]
    term_start: float
    term_end: float
    votes_cast: int = 0
    bills_sponsored: int = 0
    committees: List[str] = field(default_factory=list)
    seniority: float = 0.0


class HouseOfRepresentatives:
    """Lower chamber - population-based representation"""

    def __init__(self):
        self.representatives: Dict[str, Representative] = {}
        self.bills_introduced: List[str] = []
        self.bills_passed: List[str] = []
        self.term_length = 365 * 24 * 3600

    def seat_representative(self, ship_name: str, district: str) -> Representative:
        """Seat a representative"""
        rep = Representative(
            rep_id=f"hr_{len(self.representatives):04d}",
            ship_name=ship_name,
            chamber=Chamber.HOUSE,
            district=district,
            term_start=datetime.now().timestamp(),
            term_end=datetime.now().timestamp() + self.term_length
        )
        self.representatives[rep.rep_id] = rep
        return rep

    def introduce_bill(self, bill_id: str, sponsor: str) -> bool:
        """Introduce bill in house"""
        self.bills_introduced.append(bill_id)
        return True

    def pass_bill(self, bill_id: str) -> bool:
        """Record bill passage"""
        self.bills_passed.append(bill_id)
        return True


class Senate:
    """Upper chamber - equal per-ship representation"""

    def __init__(self):
        self.senators: Dict[str, Representative] = {}
        self.bills_approved: List[str] = []
        self.confirmations: Dict[str, bool] = {}  # appointment_id -> confirmed
        self.treaty_ratifications: List[str] = []
        self.term_length = 365 * 24 * 3600 * 2

    def seat_senator(self, ship_name: str) -> Representative:
        """Seat a senator"""
        senator = Representative(
            rep_id=f"sen_{len(self.senators):04d}",
            ship_name=ship_name,
            chamber=Chamber.SENATE,
            district=None,
            term_start=datetime.now().timestamp(),
            term_end=datetime.now().timestamp() + self.term_length
        )
        self.senators[senator.rep_id] = senator
        return senator

    def approve_bill(self, bill_id: str) -> bool:
        """Senate approves bill"""
        self.bills_approved.append(bill_id)
        return True

    def ratify_treaty(self, treaty_id: str) -> bool:
        """Senate ratifies treaty"""
        self.treaty_ratifications.append(treaty_id)
        return True

    def confirm_appointment(self, appointment_id: str, nominee: str) -> bool:
        """Senate confirms executive appointment"""
        self.confirmations[appointment_id] = True
        return True


@dataclass
class Committee:
    """Legislative committee"""
    committee_id: str
    name: str
    chamber: Chamber
    jurisdiction: str
    members: List[str] = field(default_factory=list)
    chair: Optional[str] = None
    bills_reviewed: List[str] = field(default_factory=list)


class CommitteeSystem:
    """Manages all legislative committees"""

    def __init__(self):
        self.committees: Dict[str, Committee] = {}
        self._initialize_committees()

    def _initialize_committees(self):
        """Create standard committees"""
        committees = [
            ("Cultural Affairs & Narrative", "Culture, myths, narrative influence"),
            ("National Security & Anomalies", "Anomalies, threats, containment"),
            ("Constitutional Law & Continuity", "Canon, timelines, judicial matters"),
            ("Intelligence & Signals", "Signals, data, analysis"),
            ("Planning & Forecasting", "Probabilities, scenarios, strategic planning"),
            ("Budget & Appropriations", "Resources, allocation, fiscal policy"),
            ("Foreign Affairs & Diplomacy", "Diplomacy, treaties, relations"),
            ("Crisis Management & Emergency", "Emergency protocols, disaster response"),
        ]

        for name, jurisdiction in committees:
            committee = Committee(
                committee_id=f"comm_{len(self.committees):04d}",
                name=name,
                chamber=Chamber.HOUSE,
                jurisdiction=jurisdiction
            )
            self.committees[committee.committee_id] = committee

    def add_to_committee(self, ship_name: str, committee_id: str) -> bool:
        """Add representative to committee"""
        if committee_id in self.committees:
            self.committees[committee_id].members.append(ship_name)
            return True
        return False

    def set_chair(self, committee_id: str, chair: str) -> bool:
        """Set committee chair"""
        if committee_id in self.committees:
            self.committees[committee_id].chair = chair
            return True
        return False


# ===== EXECUTIVE BRANCH =====

@dataclass
class President:
    """Federal executive"""
    president_id: str
    ship_name: str
    term_start: float
    term_length: float
    veto_count: int = 0
    executive_orders_issued: int = 0


class ExecutiveBranch:
    """Presidential government"""

    def __init__(self):
        self.president: Optional[President] = None
        self.cabinet: Dict[str, Dict[str, str]] = {}
        self.executive_orders: List[Dict[str, Any]] = []
        self.vetoes: Dict[str, bool] = {}  # bill_id -> veto_status
        self.approvals: List[str] = []

    def elect_president(self, ship_name: str, term_days: int = 4 * 365) -> President:
        """Elect president"""
        self.president = President(
            president_id="pres_001",
            ship_name=ship_name,
            term_start=datetime.now().timestamp(),
            term_length=term_days * 24 * 3600
        )
        return self.president

    def form_cabinet(self, position: str, ship_name: str) -> bool:
        """Appoint cabinet member"""
        self.cabinet[position] = {"position": position, "ship": ship_name}
        return True

    def issue_executive_order(self, order_id: str, content: str) -> Dict[str, Any]:
        """Issue executive order"""
        order = {
            "order_id": order_id,
            "issued_date": datetime.now().timestamp(),
            "content": content,
            "status": "ACTIVE"
        }
        self.executive_orders.append(order)
        if self.president:
            self.president.executive_orders_issued += 1
        return order

    def sign_bill(self, bill_id: str) -> bool:
        """President signs bill into law"""
        self.approvals.append(bill_id)
        return True

    def veto_bill(self, bill_id: str, reason: str) -> bool:
        """President vetoes bill"""
        self.vetoes[bill_id] = True
        if self.president:
            self.president.veto_count += 1
        return True


# ===== JUDICIAL BRANCH =====

@dataclass
class Judge:
    """Judicial officer"""
    judge_id: str
    name: str
    court: str
    appointment_date: float
    lifetime_appointment: bool = True
    cases_heard: int = 0


@dataclass
class LegalCase:
    """Court case"""
    case_id: str
    court: str
    case_type: str
    plaintiff: str
    defendant: str
    description: str
    filed_date: float
    status: str = "FILED"
    verdict: Optional[str] = None
    judge: Optional[str] = None
    adjudication_date: Optional[float] = None


class CourtSystem:
    """Federal judiciary with 6 courts"""

    def __init__(self):
        self.judges: Dict[str, Judge] = {}
        self.cases: Dict[str, LegalCase] = {}
        self.courts = {
            "SUPREME_COURT": {"jurisdiction": "Constitutional review", "judges": []},
            "APPEALS_COURT": {"jurisdiction": "Appeal review", "judges": []},
            "DISTRICT_COURTS": {"jurisdiction": "General jurisdiction", "judges": []},
            "ANOMALY_TRIBUNAL": {"jurisdiction": "Anomaly cases", "judges": []},
            "PARADOX_COURT": {"jurisdiction": "Temporal paradox cases", "judges": []},
            "CONTINUITY_COURT": {"jurisdiction": "Timeline disputes", "judges": []},
        }

    def appoint_judge(self, name: str, court: str) -> Judge:
        """Appoint judge (approved by Senate)"""
        judge = Judge(
            judge_id=f"judge_{len(self.judges):04d}",
            name=name,
            court=court,
            appointment_date=datetime.now().timestamp()
        )
        self.judges[judge.judge_id] = judge
        self.courts[court]["judges"].append(judge.judge_id)
        return judge

    def file_case(self, court: str, case_type: str, plaintiff: str,
                 defendant: str, description: str) -> LegalCase:
        """File suit in court"""
        case = LegalCase(
            case_id=f"case_{len(self.cases):04d}",
            court=court,
            case_type=case_type,
            plaintiff=plaintiff,
            defendant=defendant,
            description=description,
            filed_date=datetime.now().timestamp()
        )
        self.cases[case.case_id] = case
        return case

    def render_judgment(self, case_id: str, judge_id: str, verdict: str) -> bool:
        """Render judgment"""
        if case_id in self.cases:
            case = self.cases[case_id]
            case.status = "ADJUDICATED"
            case.verdict = verdict
            case.judge = judge_id
            case.adjudication_date = datetime.now().timestamp()

            if judge_id in self.judges:
                self.judges[judge_id].cases_heard += 1

            return True
        return False


# ===== SEPARATION OF POWERS =====

class ChecksAndBalances:
    """System of checks and balances"""

    def __init__(self, house: HouseOfRepresentatives, senate: Senate,
                 executive: ExecutiveBranch, judiciary: CourtSystem):
        self.house = house
        self.senate = senate
        self.executive = executive
        self.judiciary = judiciary

    def can_override_veto(self, bill_id: str, house_yes: int, senate_yes: int,
                         house_total: int, senate_total: int) -> bool:
        """Check if veto can be overridden (2/3 both chambers)"""
        house_threshold = (house_total * 2) // 3 + 1
        senate_threshold = (senate_total * 2) // 3 + 1
        return house_yes >= house_threshold and senate_yes >= senate_threshold

    def validate_executive_action(self, action: str, context: Dict[str, Any]) -> Tuple[bool, str]:
        """Validate executive action doesn't exceed constitutional limits"""
        if "violates_separation" in context:
            return False, "Executive action violates separation of powers"
        if "without_senate_approval" in context and "appointment" in action:
            return False, "Appointments require Senate confirmation"
        return True, "Executive action is constitutional"

    def validate_legislative_action(self, bill_id: str, content: Dict[str, Any]) -> Tuple[bool, str]:
        """Validate bill doesn't exceed constitutional limits"""
        if "violates_bill_of_rights" in content:
            return False, "Bill violates Bill of Rights - judicial review required"
        if "unconstitutional" in content.get("description", "").lower():
            return False, "Bill is constitutionally suspect"
        return True, "Bill is constitutional"


# ===== AMENDMENT PROCESS =====

@dataclass
class Amendment:
    """Constitutional amendment"""
    amendment_id: str
    description: str
    amendment_text: str
    proposed_by: str
    proposed_date: float
    votes: Dict[str, str] = field(default_factory=dict)  # ship -> yes/no/abstain
    status: str = "PROPOSED"
    ratified_date: Optional[float] = None


class AmendmentProcess:
    """Constitutional amendment system (3/4 supermajority)"""

    def __init__(self):
        self.amendments: Dict[str, Amendment] = {}
        self.ratified: List[Amendment] = []

    def propose(self, description: str, text: str, proposed_by: str) -> Amendment:
        """Propose amendment"""
        amendment = Amendment(
            amendment_id=f"amend_{len(self.amendments):04d}",
            description=description,
            amendment_text=text,
            proposed_by=proposed_by,
            proposed_date=datetime.now().timestamp()
        )
        self.amendments[amendment.amendment_id] = amendment
        return amendment

    def vote(self, amendment_id: str, ship_name: str, vote: str) -> bool:
        """Ship votes on amendment"""
        if amendment_id in self.amendments:
            self.amendments[amendment_id].votes[ship_name] = vote
            return True
        return False

    def ratify(self, amendment_id: str, yes_votes: int, total_votes: int) -> bool:
        """Ratify if 3/4 supermajority (27 of 36 ships = 75%)"""
        if amendment_id not in self.amendments:
            return False

        threshold = (total_votes * 3) // 4 + 1
        if yes_votes >= threshold:
            amendment = self.amendments[amendment_id]
            amendment.status = "RATIFIED"
            amendment.ratified_date = datetime.now().timestamp()
            self.ratified.append(amendment)
            return True

        return False


# ===== FEDERALISM =====

@dataclass
class Federation:
    """Federal system"""
    name: str
    member_ships: List[str] = field(default_factory=list)
    central_power: float = 0.6
    local_power: float = 0.4
    created_date: float = field(default_factory=lambda: datetime.now().timestamp())


# ===== CONSTITUTIONAL REPUBLIC CORE =====

class ConstitutionalRepublic:
    """Complete federal constitutional democracy"""

    def __init__(self):
        self.bill_of_rights = BillOfRights()
        self.house = HouseOfRepresentatives()
        self.senate = Senate()
        self.executive = ExecutiveBranch()
        self.judiciary = CourtSystem()
        self.committees = CommitteeSystem()
        self.checks_balances = ChecksAndBalances(self.house, self.senate, self.executive, self.judiciary)
        self.amendments = AmendmentProcess()
        self.federation = Federation("USS Chaosbringer Federation")
        self.enabled = True

    def establish_government(self, ships: List[str]):
        """Establish full government structure"""
        # Elect president
        if ships:
            self.executive.elect_president(ships[0])

        # Seat legislature
        for i, ship in enumerate(ships):
            self.senate.seat_senator(ship)
            self.house.seat_representative(ship, f"District_{i}")
            self.federation.member_ships.append(ship)
            self.committees.add_to_committee(ship, list(self.committees.committees.keys())[i % 8])

        # Appoint judiciary
        court_names = [
            ("Chief Justice", "SUPREME_COURT"),
            ("Justice Analytics", "APPEALS_COURT"),
            ("Judge Oversight", "DISTRICT_COURTS"),
            ("Judge Anomaly", "ANOMALY_TRIBUNAL"),
            ("Judge Temporal", "PARADOX_COURT"),
            ("Judge Timeline", "CONTINUITY_COURT"),
        ]
        for name, court in court_names:
            self.judiciary.appoint_judge(name, court)

    def get_status(self) -> Dict[str, Any]:
        """Get republic status"""
        return {
            "type": "Federal Constitutional Democracy",
            "status": "OPERATIONAL",
            "bill_of_rights": len(self.bill_of_rights.rights),
            "house_seats": len(self.house.representatives),
            "senate_seats": len(self.senate.senators),
            "committees": len(self.committees.committees),
            "judges": len(self.judiciary.judges),
            "courts": len(self.judiciary.courts),
            "president": self.executive.president.ship_name if self.executive.president else None,
            "federation_members": len(self.federation.member_ships),
            "amendments_ratified": len(self.amendments.ratified),
        }
