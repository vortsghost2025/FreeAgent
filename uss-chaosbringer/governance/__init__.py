"""
PHASE X - EMERGENT GOVERNANCE + FLEET EXPANSION

Governance infrastructure for the USS Chaosbringer fleet:
- Constitutional system (principles, rights, constraints, amendments)
- Faction system (groups with ideology and voting power)
- Diplomacy system (treaties, alliances, rivalries)
- Law engine (create, enforce, escalate violations)
- Governance engine (orchestrate constitution, voting, execution)

All systems are optional and can be disabled without breaking core logic.
"""

from governance.governance_types import (
    ProposalType, VoteType, LawType, FactionIdeology,
    ConstitutionalPrinciple, ConstitutionalRight, ConstitutionalConstraint,
    Amendment, Faction, FactionAllegiance,
    Treaty, Alliance, Rivalry, Proposal,
    Law, LawViolation, LawEnforcement,
    GovernanceVote, GovernanceCycle
)

from governance.constitution import Constitution
from governance.factions import Faction as FactionClass, FactionManager
from governance.diplomacy import DiplomacyEngine
from governance.law_engine import LawRegistry, LawEngine
from governance.core import GovernanceEngine

__all__ = [
    # Types and enums
    'ProposalType', 'VoteType', 'LawType', 'FactionIdeology',
    'ConstitutionalPrinciple', 'ConstitutionalRight', 'ConstitutionalConstraint',
    'Amendment', 'Faction', 'FactionAllegiance',
    'Treaty', 'Alliance', 'Rivalry', 'Proposal',
    'Law', 'LawViolation', 'LawEnforcement',
    'GovernanceVote', 'GovernanceCycle',

    # Core systems
    'Constitution',
    'FactionClass', 'FactionManager',
    'DiplomacyEngine',
    'LawRegistry', 'LawEngine',
    'GovernanceEngine',
]
