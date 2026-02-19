"""
FEDERATION GAME - Faction Integration Example
Demonstrates how to integrate the faction system into the main game engine
"""

from federation_game_factions import (
    build_faction_system,
    FactionSystem,
    Faction,
    BonusType,
    get_faction_report
)
from typing import Dict, List, Optional


class FederationGameWithFactions:
    """Main game engine with integrated faction system"""

    def __init__(self):
        """Initialize game with faction system"""
        self.faction_system: FactionSystem = build_faction_system()

        # Game state
        self.players: Dict[str, Dict] = {}
        self.game_turn: int = 1

        # Gameplay mechanics affected by factions
        self.morale_multiplier: float = 1.0
        self.research_speed: float = 1.0
        self.resource_production: float = 1.0
        self.military_strength: float = 1.0
        self.trade_profit: float = 1.0

    # ========================================================================
    # FACTION INTEGRATION
    # ========================================================================

    def create_player(self, player_id: str) -> None:
        """Create a new player"""
        self.players[player_id] = {
            "credits": 5000,
            "morale": 50,
            "research_points": 0,
            "faction": None,
            "reputation": {},
        }

    def player_join_faction(self, player_id: str, faction_id: str) -> bool:
        """Player joins a faction"""
        if player_id not in self.players:
            return False

        success = self.faction_system.join_faction(player_id, faction_id)
        if success:
            self.players[player_id]["faction"] = faction_id
            print(f"[FACTION] {player_id} joined {faction_id}")
            self._apply_faction_bonuses(player_id)
        return success

    def player_switch_faction(self, player_id: str, new_faction_id: str) -> bool:
        """Player switches to a different faction"""
        success = self.faction_system.join_faction(player_id, new_faction_id)
        if success:
            self.players[player_id]["faction"] = new_faction_id
            print(f"[FACTION] {player_id} switched to {new_faction_id}")
            self._apply_faction_bonuses(player_id)
        return success

    def _apply_faction_bonuses(self, player_id: str) -> None:
        """Apply current faction bonuses to player"""
        faction = self.faction_system.get_player_faction(player_id)
        if not faction:
            return

        # Get all active bonuses
        bonuses = faction.get_faction_bonuses(player_id)

        # Convert enum keys to values for calculation
        self.morale_multiplier = 1.0 + bonuses.get(BonusType.MORALE, 0.0)
        self.research_speed = 1.0 + bonuses.get(BonusType.RESEARCH_SPEED, 0.0)
        self.resource_production = 1.0 + bonuses.get(BonusType.RESOURCE_PRODUCTION, 0.0)
        self.military_strength = 1.0 + bonuses.get(BonusType.MILITARY_STRENGTH, 0.0)
        self.trade_profit = 1.0 + bonuses.get(BonusType.TRADE_PROFIT, 0.0)

    # ========================================================================
    # GAMEPLAY WITH FACTION MECHANICS
    # ========================================================================

    def process_turn(self) -> None:
        """Process one game turn with faction effects"""
        print(f"\n[TURN {self.game_turn}]")

        for player_id in self.players:
            player = self.players[player_id]

            if player["faction"]:
                # Apply faction bonuses to resource production
                base_production = 100
                modified_production = base_production * self.resource_production
                player["credits"] += int(modified_production)

                print(f"  {player_id}: +{modified_production:.0f} credits (faction bonus applied)")

        self.faction_system.advance_turn()
        self.game_turn += 1

    def conduct_research(self, player_id: str, tech_name: str, cost: int) -> bool:
        """Conduct research with faction speed bonuses"""
        if player_id not in self.players:
            return False

        player = self.players[player_id]
        modified_cost = int(cost / self.research_speed)

        if player["credits"] < modified_cost:
            return False

        player["credits"] -= modified_cost
        player["research_points"] += 10 * self.research_speed

        current_faction = self.faction_system.get_player_faction(player_id)
        if current_faction:
            print(f"[RESEARCH] {player_id} researched {tech_name} in {current_faction.name}")
            print(f"  Cost: {modified_cost} credits (reduced by research speed bonus)")
            print(f"  Points earned: {10 * self.research_speed:.1f}")

        return True

    def complete_faction_quest(self, player_id: str, quest_id: str) -> bool:
        """Complete a faction quest and gain rewards"""
        faction = self.faction_system.get_player_faction(player_id)
        if not faction:
            return False

        success, rewards = self.faction_system.complete_quest(
            player_id,
            faction.faction_id,
            quest_id
        )

        if success:
            player = self.players[player_id]

            # Apply rewards
            player["credits"] += rewards["resources_gained"].get("credits", 0)
            player["morale"] += int(rewards["reputation_gained"] * 20)  # Example conversion

            print(f"[QUEST] {player_id} completed: {rewards['quest_name']}")
            print(f"  Reputation: +{rewards['reputation_gained']:.0%}")
            print(f"  Rewards: {rewards['resources_gained']}")

            # Reapply bonuses (new perks may have unlocked)
            self._apply_faction_bonuses(player_id)

        return success

    def get_available_faction_quests(self, player_id: str) -> List[str]:
        """Get list of quests available to player"""
        faction = self.faction_system.get_player_faction(player_id)
        if not faction:
            return []

        quests = faction.get_available_quests(player_id)
        return [f"{q.quest_id}: {q.quest_name} (difficulty: {q.difficulty})" for q in quests]

    # ========================================================================
    # PLAYER STATUS & INFORMATION
    # ========================================================================

    def get_player_status(self, player_id: str) -> Dict:
        """Get full player status including faction info"""
        if player_id not in self.players:
            return {}

        player = self.players[player_id]
        faction = self.faction_system.get_player_faction(player_id)

        status = {
            "player_id": player_id,
            "credits": player["credits"],
            "morale": player["morale"],
            "research_points": player["research_points"],
            "faction": faction.name if faction else "None",
        }

        if faction:
            reputation = self.faction_system.get_player_reputation(player_id, faction.faction_id)
            perks = self.faction_system.get_faction_perks(faction.faction_id, player_id)

            status["faction_id"] = faction.faction_id
            status["reputation"] = reputation
            status["perks"] = [p.perk_name for p in perks]
            status["perk_count"] = len(perks)

            # Active bonuses
            bonuses = faction.get_faction_bonuses(player_id)
            status["active_bonuses"] = {b.value: v for b, v in bonuses.items()}

        return status

    def get_faction_leaderboard(self) -> List[Dict]:
        """Get ranking of factions by member count"""
        factions_data = []

        for faction_id, faction in self.faction_system.factions.items():
            factions_data.append({
                "name": faction.name,
                "ideology": faction.ideology.value,
                "members": faction.member_count,
                "level": faction.faction_level,
                "power": faction.accumulated_power,
            })

        # Sort by member count
        return sorted(factions_data, key=lambda f: f["members"], reverse=True)

    def display_faction_comparison(self) -> None:
        """Display comparison of all factions"""
        print("\n" + "="*80)
        print("FACTION COMPARISON")
        print("="*80)

        print(f"\n{'Faction':<30} {'Ideology':<15} {'Members':<10} {'Level':<8} {'Power':<10}")
        print("-"*80)

        for faction_id, faction in self.faction_system.factions.items():
            print(f"{faction.name:<30} {faction.ideology.value:<15} {faction.member_count:<10} {faction.faction_level:<8} {faction.accumulated_power:<10.2f}")

    def display_player_faction_info(self, player_id: str) -> None:
        """Display detailed faction information for a player"""
        faction = self.faction_system.get_player_faction(player_id)
        if not faction:
            print(f"{player_id} is not in a faction")
            return

        reputation = self.faction_system.get_player_reputation(player_id, faction.faction_id)
        perks = faction.get_active_perks(player_id)
        quests = faction.get_available_quests(player_id)

        print(f"\n{faction.name}")
        print(f"Reputation: {reputation:.0%}")
        print(f"Members: {faction.member_count}")
        print(f"Level: {faction.faction_level}")

        print(f"\nActive Perks ({len(perks)}):")
        for perk in perks:
            print(f"  - {perk.perk_name}: {perk.description}")
            print(f"    Bonus: +{perk.bonus_value} {perk.bonus_type.value}")

        print(f"\nAvailable Quests ({len(quests)}):")
        for quest in quests:
            print(f"  - {quest.quest_name} ({quest.difficulty})")
            print(f"    Reward: +{quest.reputation_reward:.0%} reputation")
            print(f"    Objective: {quest.objective}")


# ============================================================================
# DEMONSTRATION
# ============================================================================

if __name__ == "__main__":
    print("THE FEDERATION GAME - Faction Integration Demo")
    print("="*80)

    # Create game instance
    game = FederationGameWithFactions()

    # Create players
    game.create_player("Alice")
    game.create_player("Bob")
    game.create_player("Charlie")

    print("\n[PLAYER CREATION]")
    print("Created 3 players: Alice, Bob, Charlie")

    # Players join different factions
    print("\n[FACTION JOINING]")
    game.player_join_faction("Alice", "diplomatic_corps")
    game.player_join_faction("Bob", "military_command")
    game.player_join_faction("Charlie", "research_division")

    # Show initial status
    print("\n[PLAYER STATUS]")
    for player_id in ["Alice", "Bob", "Charlie"]:
        status = game.get_player_status(player_id)
        print(f"\n{player_id}:")
        print(f"  Credits: {status['credits']}")
        print(f"  Faction: {status['faction']}")
        print(f"  Reputation: {status.get('reputation', 0):.0%}")

    # Process a turn with faction bonuses
    print("\n[GAME TURN PROCESSING]")
    game.process_turn()
    game.process_turn()

    # Alice conducts research (gets speed bonus from faction if applicable)
    print("\n[RESEARCH]")
    game.conduct_research("Alice", "Advanced Diplomacy", 100)

    # Get available quests
    print("\n[AVAILABLE QUESTS]")
    quests = game.get_available_faction_quests("Alice")
    print(f"Alice's available quests:")
    for quest in quests:
        print(f"  - {quest}")

    # Complete a quest
    print("\n[QUEST COMPLETION]")
    if quests:
        quest_id = "first_treaty"  # From Diplomatic Corps
        game.complete_faction_quest("Alice", quest_id)

    # Show updated status
    print("\n[UPDATED STATUS]")
    status = game.get_player_status("Alice")
    print(f"Alice:")
    print(f"  Reputation: {status.get('reputation', 0):.0%}")
    print(f"  Perks: {status['perks']}")

    # Show faction comparison
    game.display_faction_comparison()

    # Show detailed faction info
    print("\n[FACTION DETAILS]")
    game.display_player_faction_info("Alice")
    game.display_player_faction_info("Bob")

    # Switch faction
    print("\n[FACTION SWITCH]")
    game.player_switch_faction("Alice", "research_division")
    print("Alice switched to Research Division!")

    # Final status
    print("\n[FINAL STATUS]")
    status = game.get_player_status("Alice")
    print(f"Alice's new faction: {status['faction']}")
    print(f"Reputation: {status.get('reputation', 0):.0%}")

    print("\n" + "="*80)
    print("Integration demo complete!")
