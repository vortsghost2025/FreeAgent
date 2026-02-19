#!/usr/bin/env python3
"""
PHASE XII - CONSTITUTIONAL REPUBLIC EXPANSION PACK
The institutional layer that transforms governance mechanics into a federal democracy
with separation of powers, bicameral legislature, independent judiciary, bill of rights.

Builds on Phase X governance kernel without modifying it.
Integrates with Phase XI dashboard visualization.
"""

import sys
sys.path.insert(0, '/c/workspace/uss-chaosbringer')

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Set
from datetime import datetime
from enum import Enum


# ===== BILL OF RIGHTS =====

class FundamentalRight(Enum):
    """Constitutional rights of all ships"""
    AUTONOMY = "autonomy"                           # Right to operate independently
    CULTURAL_EXPRESSION = "cultural_expression"     # Right to create culture
    DIPLOMATIC_REPRESENTATION = "diplomatic"         # Right to participate in governance
    CONTINUITY_PROTECTION = "continuity_protection" # Protection from timeline alteration
    PARADOX_PROTECTION = "paradox_protection"       # Protection from paradox exposure
    FAIR_TRIAL = "fair_trial"                       # Right to judicial review
    PETITION = "petition"                            # Right to petition government
    ASSEMBLY = "assembly"                            # Right to form coalitions


@dataclass
class BillOfRights:
    """Constitutional protections for all ships"""
    rights: Dict[FundamentalRight, str] = field(default_factory=dict)

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


# ===== LEGISLATURE =====

class Chamber(Enum):
    """Legislative chambers"""
    HOUSE = "house"          # House of Representatives (population-based)
    SENATE = "senate"        # Senate (equal representation)


@dataclass
class Representative:
    """Legislative representative"""
    rep_id: str
    ship_name: str
    chamber: Chamber
    district: Optional[str]
    term_start: float
    term_end: float
    votes_cast: int = 0
    bills_sponsored: int = 0
    committees: List[str] = field(default_factory=list)


class HouseOfRepresentatives:
    """Lower chamber - population-based representation"""

    def __init__(self):
        self.representatives: Dict[str, Representative] = {}
        self.districts = {}
        self.term_length = 365 * 24 * 3600  # 1 year simulation units

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

    def get_representation() -> Dict[str, int]:
        """Get representation by district"""
        return {}


class Senate:
    """Upper chamber - equal representation per ship archetype"""

    def __init__(self):
        self.senators: Dict[str, Representative] = {}
        self.term_length = 365 * 24 * 3600 * 2  # 2 year simulation units

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


@dataclass
class Committee:
    """Legislative committee"""
    committee_id: str
    name: str
    chamber: Chamber
    jurisdiction: str
    members: List[str] = field(default_factory=list)
    chair: Optional[str] = None


class CommitteeSystem:
    """Manages legislative committees"""

    def __init__(self):
        self.committees: Dict[str, Committee] = {}
        self._initialize_committees()

    def _initialize_committees(self):
        """Create standard committees"""
        standard_committees = [
            ("Cultural Affairs", "Culture, myths, narrative influence"),
            ("National Security", "Anomalies, threats, containment"),
            ("Continuity & Law", "Canon, timelines, judicial matters"),
            ("Intelligence", "Signals, data, analysis"),
            ("Planning & Forecasting", "Probabilities, scenarios"),
            ("Budget & Finance", "Resources, allocation"),
            ("Foreign Affairs", "Diplomacy, treaties"),
            ("Crisis Management", "Emergency protocols"),
        ]

        for name, jurisdiction in standard_committees:
            committee = Committee(
                committee_id=f"comm_{len(self.committees):04d}",
                name=name,
                chamber=Chamber.HOUSE,
                jurisdiction=jurisdiction
            )
            self.committees[committee.committee_id] = committee


# ===== EXECUTIVE BRANCH =====

@dataclass
class President:
    """Federal executive"""
    president_id: str
    ship_name: str
    term_start: float
    term_end: float
    veto_power: bool = True
    commander_in_chief: bool = True
    appointment_power: bool = True


class ExecutiveBranch:
    """Presidential government"""

    def __init__(self):
        self.president: Optional[President] = None
        self.cabinet: Dict[str, Any] = {}
        self.executive_orders: List[Dict[str, Any]] = []
        self.vetoes: List[str] = []

    def elect_president(self, ship_name: str) -> President:
        """Elect a president"""
        self.president = President(
            president_id="pres_001",
            ship_name=ship_name,
            term_start=datetime.now().timestamp(),
            term_end=datetime.now().timestamp() + (365 * 24 * 3600 * 4)  # 4 year term
        )
        return self.president

    def issue_veto(self, bill_id: str, reason: str) -> bool:
        """President vetoes a bill"""
        if self.president:
            self.vetoes.append(bill_id)
            return True
        return False


# ===== JUDICIAL BRANCH =====

@dataclass
class Judge:
    """Judicial officer"""
    judge_id: str
    name: str
    court: str
    appointment_date: float
    lifetime_appointment: bool = True


class CourtSystem:
    """Integrated federal judiciary"""

    def __init__(self):
        self.judges: Dict[str, Judge] = {}
        self.courts = {
            "SUPREME_COURT": {"jurisdiction": "Constitutional review", "judges": []},
            "APPEALS_COURT": {"jurisdiction": "Appeal review", "judges": []},
            "DISTRICT_COURTS": {"jurisdiction": "General jurisdiction", "judges": []},
            "ANOMALY_TRIBUNAL": {"jurisdiction": "Anomaly cases", "judges": []},
            "PARADOX_COURT": {"jurisdiction": "Temporal paradox cases", "judges": []},
            "CONTINUITY_COURT": {"jurisdiction": "Timeline disputes", "judges": []},
        }
        self.cases: Dict[str, Dict[str, Any]] = {}

    def appoint_judge(self, name: str, court: str) -> Judge:
        """Appoint a judge"""
        judge = Judge(
            judge_id=f"judge_{len(self.judges):04d}",
            name=name,
            court=court,
            appointment_date=datetime.now().timestamp()
        )
        self.judges[judge.judge_id] = judge
        self.courts[court]["judges"].append(judge.judge_id)
        return judge

    def file_case(self, case_type: str, plaintiff: str, defendant: str,
                 description: str) -> str:
        """File a case in the judiciary"""
        case_id = f"case_{len(self.cases):04d}"
        self.cases[case_id] = {
            "type": case_type,
            "plaintiff": plaintiff,
            "defendant": defendant,
            "description": description,
            "filed_date": datetime.now().timestamp(),
            "status": "FILED"
        }
        return case_id

    def render_judgment(self, case_id: str, verdict: str) -> Dict[str, Any]:
        """Render judgment in a case"""
        if case_id in self.cases:
            self.cases[case_id]["status"] = "ADJUDICATED"
            self.cases[case_id]["verdict"] = verdict
            return self.cases[case_id]
        return {}


# ===== SEPARATION OF POWERS =====

class SeparationOfPowers:
    """Checks and balances system"""

    def __init__(self, house: HouseOfRepresentatives, senate: Senate,
                 executive: ExecutiveBranch, judiciary: CourtSystem,
                 bill_of_rights: BillOfRights):
        self.house = house
        self.senate = senate
        self.executive = executive
        self.judiciary = judiciary
        self.bill_of_rights = bill_of_rights

    def validate_presidential_action(self, action: str, context: Dict[str, Any]) -> bool:
        """Check if presidential action is constitutional"""
        # President cannot violate bill of rights
        if "violates_autonomy" in context:
            return False
        if "violates_fair_trial" in context:
            return False
        return True

    def validate_legislative_action(self, bill_id: str, bill_content: Dict[str, Any]) -> bool:
        """Check if bill is constitutional"""
        # Bills cannot violate bill of rights
        if "violates_fundamental_right" in bill_content:
            return False
        return True

    def can_override_veto(self, veto_votes_yes: int, total_votes: int) -> bool:
        """Check if veto can be overridden (2/3 supermajority)"""
        threshold = (total_votes * 2) // 3 + 1
        return veto_votes_yes >= threshold


# ===== FEDERALISM =====

@dataclass
class Federation:
    """Federal system connecting local and central government"""
    name: str
    member_ships: List[str] = field(default_factory=list)
    central_authority: float = 0.6  # 0-1 scale
    local_authority: float = 0.4

    def add_member_ship(self, ship_name: str):
        """Add ship to federation"""
        self.member_ships.append(ship_name)

    def get_balance_of_power(self) -> Dict[str, float]:
        """Get power distribution"""
        return {
            "central": self.central_authority,
            "local": self.local_authority
        }


# ===== AMENDMENT PROCESS =====

@dataclass
class Amendment:
    """Constitutional amendment proposal"""
    amendment_id: str
    description: str
    proposed_by: str
    proposed_date: float
    amendment_text: str
    ratification_votes: Dict[str, str] = field(default_factory=dict)  # ship_name -> yes/no
    status: str = "PROPOSED"
    ratified_date: Optional[float] = None


class AmendmentProcess:
    """Constitutional amendment mechanism"""

    def __init__(self):
        self.amendments: Dict[str, Amendment] = {}
        self.ratified_amendments: List[Amendment] = []

    def propose_amendment(self, description: str, proposed_by: str,
                         amendment_text: str) -> Amendment:
        """Propose a constitutional amendment"""
        amendment = Amendment(
            amendment_id=f"amend_{len(self.amendments):04d}",
            description=description,
            proposed_by=proposed_by,
            proposed_date=datetime.now().timestamp(),
            amendment_text=amendment_text
        )
        self.amendments[amendment.amendment_id] = amendment
        return amendment

    def vote_on_amendment(self, amendment_id: str, ship_name: str, vote: str) -> bool:
        """Ship votes on amendment"""
        if amendment_id in self.amendments:
            self.amendments[amendment_id].ratification_votes[ship_name] = vote
            return True
        return False

    def ratify_amendment(self, amendment_id: str, votes_yes: int,
                        votes_total: int) -> bool:
        """Ratify amendment if meets 3/4 supermajority"""
        if amendment_id not in self.amendments:
            return False

        threshold = (votes_total * 3) // 4 + 1
        if votes_yes >= threshold:
            amendment = self.amendments[amendment_id]
            amendment.status = "RATIFIED"
            amendment.ratified_date = datetime.now().timestamp()
            self.ratified_amendments.append(amendment)
            return True
        return False


# ===== CONSTITUTIONAL REPUBLIC CORE =====

class ConstitutionalRepublic:
    """Federal democratic republic with separation of powers"""

    def __init__(self):
        self.bill_of_rights = BillOfRights()
        self.house = HouseOfRepresentatives()
        self.senate = Senate()
        self.executive = ExecutiveBranch()
        self.judiciary = CourtSystem()
        self.committees = CommitteeSystem()
        self.federation = Federation("USS Chaosbringer Federation")
        self.amendment_process = AmendmentProcess()
        self.separation_of_powers = SeparationOfPowers(
            self.house, self.senate, self.executive,
            self.judiciary, self.bill_of_rights
        )

        self.enabled = True

    def get_constitution_status(self) -> Dict[str, Any]:
        """Get constitutional republic status"""
        return {
            "timestamp": datetime.now().timestamp(),
            "type": "Federal Democratic Republic",
            "status": "OPERATIONAL",
            "fundamental_rights": len(self.bill_of_rights.rights),
            "house_representatives": len(self.house.representatives),
            "senate_members": len(self.senate.senators),
            "committees": len(self.committees.committees),
            "president": self.executive.president.ship_name if self.executive.president else None,
            "judges_appointed": len(self.judiciary.judges),
            "amendments_ratified": len(self.amendment_process.ratified_amendments),
            "federal_members": len(self.federation.member_ships),
        }

    def establish_government(self):
        """Establish initial government structure"""
        # Elect president
        self.executive.elect_president("USS_Chaosbringer")

        # Seat legislators
        ships = ["MythosWeaver", "AnomalyHunter", "ContinuityGuardian",
                 "SignalHarvester", "ProbabilityWeaver", "EntropyDancer",
                 "ParadoxRunner", "SensingShip"]

        for ship in ships:
            self.senate.seat_senator(ship)
            self.house.seat_representative(ship, f"District_{ships.index(ship)}")
            self.federation.add_member_ship(ship)

        # Appoint judges
        self.judiciary.appoint_judge("Chief Justice Continuity", "SUPREME_COURT")
        self.judiciary.appoint_judge("Judge Analytics", "APPEALS_COURT")
        self.judiciary.appoint_judge("Judge Oversight", "DISTRICT_COURTS")
        self.judiciary.appoint_judge("Judge Anomaly", "ANOMALY_TRIBUNAL")
        self.judiciary.appoint_judge("Judge Temporal", "PARADOX_COURT")
        self.judiciary.appoint_judge("Judge Timeline", "CONTINUITY_COURT")


# ===== TESTS =====

def test_bill_of_rights():
    """Test 1: Bill of Rights"""
    print("\n[TEST 1] Bill of Rights")
    print("-" * 60)

    rights = BillOfRights()
    assert len(rights.rights) == 8
    assert FundamentalRight.AUTONOMY in rights.rights

    print("[PASS] Bill of Rights established with 8 fundamental rights")
    return True


def test_house_of_representatives():
    """Test 2: House of Representatives"""
    print("\n[TEST 2] House of Representatives")
    print("-" * 60)

    house = HouseOfRepresentatives()
    rep = house.seat_representative("Ship-A", "District-1")

    assert rep.chamber == Chamber.HOUSE
    assert rep.district == "District-1"
    assert len(house.representatives) == 1

    print("[PASS] House of Representatives seating representatives")
    return True


def test_senate():
    """Test 3: Senate"""
    print("\n[TEST 3] Senate")
    print("-" * 60)

    senate = Senate()
    senator = senate.seat_senator("Ship-B")

    assert senator.chamber == Chamber.SENATE
    assert len(senate.senators) == 1

    print("[PASS] Senate seating senators")
    return True


def test_executive_branch():
    """Test 4: Executive Branch"""
    print("\n[TEST 4] Executive Branch")
    print("-" * 60)

    executive = ExecutiveBranch()
    president = executive.elect_president("Ship-C")

    assert executive.president is not None
    assert president.veto_power == True

    veto_result = executive.issue_veto("bill_001", "Continuity violation")
    assert veto_result == True
    assert "bill_001" in executive.vetoes

    print("[PASS] Executive branch operational with veto power")
    return True


def test_judicial_branch():
    """Test 5: Judicial Branch"""
    print("\n[TEST 5] Judicial Branch")
    print("-" * 60)

    judiciary = CourtSystem()
    judge = judiciary.appoint_judge("Chief Justice", "SUPREME_COURT")

    assert judge in judiciary.judges.values()
    assert judge.judge_id in judiciary.courts["SUPREME_COURT"]["judges"]

    case_id = judiciary.file_case("CONSTITUTIONAL", "Ship-A", "Ship-B", "Rights violation")
    assert case_id in judiciary.cases

    print("[PASS] Judicial branch with 6 courts and case filing")
    return True


def test_committee_system():
    """Test 6: Committee System"""
    print("\n[TEST 6] Committee System")
    print("-" * 60)

    committees = CommitteeSystem()
    assert len(committees.committees) >= 8

    committee_names = [c.name for c in committees.committees.values()]
    assert "Cultural Affairs" in committee_names
    assert "National Security" in committee_names

    print("[PASS] Committee system with 8+ committees")
    return True


def test_separation_of_powers():
    """Test 7: Separation of Powers"""
    print("\n[TEST 7] Separation of Powers")
    print("-" * 60)

    rights = BillOfRights()
    house = HouseOfRepresentatives()
    senate = Senate()
    executive = ExecutiveBranch()
    judiciary = CourtSystem()

    sep_powers = SeparationOfPowers(house, senate, executive, judiciary, rights)

    # Test validation
    result = sep_powers.validate_presidential_action("test", {})
    assert result == True

    result = sep_powers.validate_legislative_action("bill_001", {})
    assert result == True

    # Test veto override
    can_override = sep_powers.can_override_veto(7, 10)
    assert can_override == True

    print("[PASS] Separation of powers with checks and balances")
    return True


def test_amendment_process():
    """Test 8: Amendment Process"""
    print("\n[TEST 8] Amendment Process")
    print("-" * 60)

    amendments = AmendmentProcess()
    amendment = amendments.propose_amendment(
        "Rights for Anomalies",
        "MythosWeaver",
        "All anomalies have proto-consciousness protections"
    )

    assert amendment.status == "PROPOSED"

    # Ships vote on amendment
    amendments.vote_on_amendment(amendment.amendment_id, "Ship-A", "yes")
    amendments.vote_on_amendment(amendment.amendment_id, "Ship-B", "yes")

    # Ratify with 3/4 supermajority
    ratified = amendments.ratify_amendment(amendment.amendment_id, 8, 9)
    assert ratified == True
    assert amendment.status == "RATIFIED"

    print("[PASS] Amendment process with 3/4 supermajority ratification")
    return True


def test_federalism():
    """Test 9: Federalism"""
    print("\n[TEST 9] Federalism")
    print("-" * 60)

    federation = Federation("Federation")
    federation.add_member_ship("Ship-A")
    federation.add_member_ship("Ship-B")

    assert len(federation.member_ships) == 2

    balance = federation.get_balance_of_power()
    assert balance["central"] + balance["local"] == 1.0

    print("[PASS] Federal system with power balance")
    return True


def test_constitutional_republic():
    """Test 10: Constitutional Republic Core"""
    print("\n[TEST 10] Constitutional Republic Core")
    print("-" * 60)

    republic = ConstitutionalRepublic()
    republic.establish_government()

    status = republic.get_constitution_status()
    assert status["type"] == "Federal Democratic Republic"
    assert status["fundamental_rights"] == 8
    assert status["senate_members"] > 0
    assert status["judges_appointed"] >= 6

    print("[PASS] Constitutional republic established and operational")
    return True


if __name__ == "__main__":
    tests = [
        test_bill_of_rights,
        test_house_of_representatives,
        test_senate,
        test_executive_branch,
        test_judicial_branch,
        test_committee_system,
        test_separation_of_powers,
        test_amendment_process,
        test_federalism,
        test_constitutional_republic,
    ]

    print("=" * 80)
    print("PHASE XII TEST SUITE - Constitutional Republic Foundation")
    print("10 core constitutional tests")
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
