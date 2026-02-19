#!/usr/bin/env python3
"""
Diplomacy system for Phase X governance.
Manages treaties, alliances, and rivalries between ships.
"""

from dataclasses import dataclass
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from governance.governance_types import (
    Treaty, Alliance, Rivalry, Proposal, ProposalType, VoteType
)


class DiplomacyEngine:
    """Manages diplomatic relations and treaties"""

    def __init__(self):
        self.treaties: Dict[str, Treaty] = {}
        self.alliances: Dict[str, Alliance] = {}
        self.rivalries: Dict[str, Rivalry] = {}
        self.enabled = True
        self.treaty_counter = 0
        self.alliance_counter = 0
        self.rivalry_counter = 0

    def propose_treaty(self, name: str, description: str, proposed_by: str,
                      signatories: List[str], terms: Dict[str, Any],
                      duration_days: int = 30) -> Tuple[bool, Treaty]:
        """Propose a new treaty"""
        if not self.enabled:
            return False, None

        treaty_id = f"treaty_{self.treaty_counter:04d}"
        self.treaty_counter += 1

        treaty = Treaty(
            treaty_id=treaty_id,
            name=name,
            description=description,
            proposed_by=proposed_by,
            proposed_timestamp=datetime.now().timestamp(),
            signatories=signatories,
            duration_days=duration_days,
            status="proposed",
            terms=terms
        )

        self.treaties[treaty_id] = treaty
        return True, treaty

    def ratify_treaty(self, treaty_id: str) -> Tuple[bool, str]:
        """Ratify a proposed treaty"""
        if not self.enabled:
            return False, "Diplomacy engine disabled"

        if treaty_id not in self.treaties:
            return False, "Treaty not found"

        treaty = self.treaties[treaty_id]

        if treaty.status != "proposed":
            return False, f"Treaty already {treaty.status}"

        treaty.status = "active"
        treaty.expiration_timestamp = (
            datetime.now().timestamp() + (treaty.duration_days * 86400)
        )

        return True, f"Treaty '{treaty.name}' ratified and active"

    def terminate_treaty(self, treaty_id: str, reason: str = "") -> Tuple[bool, str]:
        """Terminate an active treaty"""
        if not self.enabled:
            return False, "Diplomacy engine disabled"

        if treaty_id not in self.treaties:
            return False, "Treaty not found"

        treaty = self.treaties[treaty_id]
        treaty.status = "terminated"

        return True, f"Treaty terminated: {reason}"

    def declare_alliance(self, ship1: str, ship2: str,
                        strength: float = 0.8) -> Tuple[bool, Alliance]:
        """Declare alliance between two ships"""
        if not self.enabled:
            return False, None

        alliance_id = f"alliance_{self.alliance_counter:04d}"
        self.alliance_counter += 1

        alliance = Alliance(
            alliance_id=alliance_id,
            ship1=ship1,
            ship2=ship2,
            strength=min(strength, 1.0),
            formed_timestamp=datetime.now().timestamp()
        )

        self.alliances[alliance_id] = alliance
        return True, alliance

    def declare_rivalry(self, ship1: str, ship2: str,
                       severity: float = 0.5, reason: str = "") -> Tuple[bool, Rivalry]:
        """Declare rivalry between two ships"""
        if not self.enabled:
            return False, None

        rivalry_id = f"rivalry_{self.rivalry_counter:04d}"
        self.rivalry_counter += 1

        rivalry = Rivalry(
            rivalry_id=rivalry_id,
            ship1=ship1,
            ship2=ship2,
            severity=min(severity, 1.0),
            reason=reason,
            declared_timestamp=datetime.now().timestamp()
        )

        self.rivalries[rivalry_id] = rivalry
        return True, rivalry

    def escalate_rivalry(self, rivalry_id: str, escalation_amount: float = 0.1) -> Tuple[bool, str]:
        """Escalate an existing rivalry"""
        if not self.enabled:
            return False, "Diplomacy engine disabled"

        if rivalry_id not in self.rivalries:
            return False, "Rivalry not found"

        rivalry = self.rivalries[rivalry_id]
        old_severity = rivalry.severity
        rivalry.severity = min(rivalry.severity + escalation_amount, 1.0)
        rivalry.escalation_count += 1

        return True, f"Rivalry escalated from {old_severity:.2f} to {rivalry.severity:.2f}"

    def resolve_rivalry(self, rivalry_id: str) -> Tuple[bool, str]:
        """Resolve/end a rivalry"""
        if not self.enabled:
            return False, "Diplomacy engine disabled"

        if rivalry_id not in self.rivalries:
            return False, "Rivalry not found"

        del self.rivalries[rivalry_id]
        return True, "Rivalry resolved"

    def get_diplomatic_status(self, ship_name: str) -> Dict[str, Any]:
        """Get diplomatic status of a ship"""
        if not self.enabled:
            return {}

        # Find all treaties this ship is in
        ship_treaties = [
            t for t in self.treaties.values()
            if ship_name in t.signatories and t.status == "active"
        ]

        # Find all alliances
        ship_alliances = [
            a for a in self.alliances.values()
            if ship_name in [a.ship1, a.ship2]
        ]

        # Find all rivalries
        ship_rivalries = [
            r for r in self.rivalries.values()
            if ship_name in [r.ship1, r.ship2]
        ]

        return {
            "treaties": len(ship_treaties),
            "alliances": len(ship_alliances),
            "rivalries": len(ship_rivalries),
            "total_allies": len(ship_alliances),
            "total_rivals": len(ship_rivalries),
        }

    def get_allies(self, ship_name: str) -> List[str]:
        """Get all ships allied with given ship"""
        allies = []
        for alliance in self.alliances.values():
            if alliance.ship1 == ship_name:
                allies.append(alliance.ship2)
            elif alliance.ship2 == ship_name:
                allies.append(alliance.ship1)

        return list(set(allies))

    def get_rivals(self, ship_name: str) -> List[str]:
        """Get all ships in rivalry with given ship"""
        rivals = []
        for rivalry in self.rivalries.values():
            if rivalry.ship1 == ship_name:
                rivals.append(rivalry.ship2)
            elif rivalry.ship2 == ship_name:
                rivals.append(rivalry.ship1)

        return list(set(rivals))

    def calculate_diplomatic_bonus(self, ship_name: str) -> float:
        """Calculate diplomatic influence bonus (allies reduce rivals)"""
        allies = len(self.get_allies(ship_name))
        rivals = len(self.get_rivals(ship_name))

        # Bonus increases with allies, penalties increase with rivals
        bonus = (allies * 0.1) - (rivals * 0.1)
        return max(-0.5, min(0.5, bonus))  # Clamp between -0.5 and 0.5

    def is_treaty_active(self, treaty_id: str) -> bool:
        """Check if treaty is active and not expired"""
        if not self.enabled or treaty_id not in self.treaties:
            return False

        treaty = self.treaties[treaty_id]

        if treaty.status != "active":
            return False

        if treaty.expiration_timestamp and datetime.now().timestamp() > treaty.expiration_timestamp:
            treaty.status = "expired"
            return False

        return True

    def get_diplomatic_stats(self) -> Dict[str, Any]:
        """Get aggregate diplomatic statistics"""
        return {
            "total_treaties": len(self.treaties),
            "active_treaties": len([t for t in self.treaties.values() if t.status == "active"]),
            "total_alliances": len(self.alliances),
            "total_rivalries": len(self.rivalries),
            "average_rivalry_severity": (
                sum(r.severity for r in self.rivalries.values()) / len(self.rivalries)
                if self.rivalries else 0
            ),
            "average_alliance_strength": (
                sum(a.strength for a in self.alliances.values()) / len(self.alliances)
                if self.alliances else 0
            ),
        }
