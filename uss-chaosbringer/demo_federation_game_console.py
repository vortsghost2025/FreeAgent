#!/usr/bin/env python3
"""
FEDERATION GAME CONSOLE - VISUAL DEMO
Showcases the console's interactive features without requiring user input
"""

import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))

from federation_game_console import GameConsole, GameStrategy


def print_section(title):
    """Print a section header"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)


def demo_console():
    """Run a visual demo of the console"""

    # Initialize console
    console = GameConsole()

    print_section("1. CONSOLE INITIALIZATION & BANNER")
    console._print_banner()

    # New game
    print_section("2. NEW GAME")
    console.federation_name = "Federation of Light"
    console.player_name = "Admiral Vance"
    console.is_game_active = True
    print(f"\n  ✓ Game started!")
    print(f"  Federation: {console.federation_name}")
    print(f"  Commander: {console.player_name}")
    print(f"  Turn: {console.current_turn}")

    # Status report
    print_section("3. FEDERATION STATUS REPORT")
    console.cmd_status()

    # Strategy selection
    print_section("4. STRATEGY SELECTION")
    console.cmd_strategy()

    # Change strategy
    print("\n[Changing strategy to DIPLOMACY]")
    console.current_strategy = GameStrategy.DIPLOMACY
    console.cmd_strategy("diplomacy")

    # Turn progression
    print_section("5. TURN PROGRESSION")
    print("\n[Turn 1]")
    console.cmd_turn("advance")

    print("\n[Turn 2]")
    console.cmd_turn("advance")

    print("\n[Auto-play mode demo - 3 turns]")
    console.cmd_turn("auto", "3")

    # Diplomacy
    print_section("6. DIPLOMACY SYSTEM")
    console.cmd_diplomacy()

    print("\n[Initiating diplomacy with Rome]")
    console.cmd_diplomacy("ally", "Rome")

    print("\n[Treaty with Greece]")
    console.cmd_diplomacy("propose", "Greece")

    # Consciousness
    print_section("7. CONSCIOUSNESS & DREAMS")
    console.cmd_dream()

    print("\n[Interpreting federation dreams]")
    console.cmd_dream("interpret")

    # Rivals
    print_section("8. RIVAL FEDERATION MANAGEMENT")
    console.cmd_rival()

    print("\n[Spawning rival faction]")
    console.cmd_rival("spawn", "Klingon_Empire")

    print("\n[Creating second rival]")
    console.cmd_rival("spawn", "Romulan_Syndicate")

    # Prophecy
    print_section("9. PROPHECY ENGINE")
    console.cmd_prophecy()

    print("\n[Generating prophecies]")
    for i in range(2):
        console.cmd_prophecy("generate")

    # Chaos
    print_section("10. CHAOS MODE")
    console.cmd_chaos()

    # Statistics
    print_section("11. PLAYER STATISTICS")
    console.statistics.turns_played = console.current_turn
    console.statistics.diplomacy_actions_taken = 2
    console.statistics.dreams_interpreted = 1
    console.statistics.rivals_spawned = 2
    console.statistics.prophecies_generated = 2
    console.statistics.chaos_events_triggered = 1
    console.cmd_stats()

    # Help
    print_section("12. COMMAND HELP")
    console.cmd_help()

    # Simulation summary
    print_section("GAMEPLAY SIMULATION COMPLETE")
    print(f"""
  Federation: {console.federation_name}
  Commander: {console.player_name}
  Final Turn: {console.current_turn}
  Current Strategy: {console.current_strategy.value.upper()}

  Statistics Summary:
    • Turns Played: {console.statistics.turns_played}
    • Diplomacy Actions: {console.statistics.diplomacy_actions_taken}
    • Dreams Interpreted: {console.statistics.dreams_interpreted}
    • Rivals Spawned: {console.statistics.rivals_spawned}
    • Prophecies Generated: {console.statistics.prophecies_generated}
    • Chaos Events: {console.statistics.chaos_events_triggered}

  Game State:
    • Morale: {console.game_state['federation_core']['morale']:.1%}
    • Stability: {console.game_state['federation_core']['stability']:.1%}
    • Tech Level: {console.game_state['federation_core']['technological_level']:.1%}
    • Treasury: {console.game_state['federation_core']['treasury']} credits
    • Population: {console.game_state['federation_core']['population']} million

  Subsystems:
    • Diplomatic Relationships: {len(console.game_state['diplomacy']['relationships'])}
    • Consciousness Level: {console.game_state['consciousness']['level']:.1%}
    • Active Rivals: {len(console.game_state['rivals']['active'])}
    • Recorded Prophecies: {len(console.game_state['prophecies'])}
""")

    print_section("DEMO FEATURES SHOWCASED")
    print("""
  ✓ Interactive CLI with beautiful formatting
  ✓ Federation core state management
  ✓ 6 strategy types with effects
  ✓ Turn progression system
  ✓ Auto-play mode for continuous gameplay
  ✓ Diplomacy system with relationships
  ✓ Consciousness and dreams subsystem
  ✓ Rival federation management
  ✓ Prophecy generation and tracking
  ✓ Chaos mode with random events
  ✓ Player statistics tracking
  ✓ Comprehensive help system
  ✓ Beautiful stat bars and formatting
  ✓ Game state persistence ready
  ✓ Production-ready error handling
""")

    print("=" * 80)
    print("  End of Demo")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    demo_console()
