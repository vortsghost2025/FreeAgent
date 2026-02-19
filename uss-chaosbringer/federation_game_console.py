#!/usr/bin/env python3
"""
FEDERATION GAME CONSOLE - MAIN INTERACTIVE INTERFACE
~600 LOC - Production-Ready CLI

The bridge that connects the player to THE FEDERATION GAME. Interactive command-line
interface where the player takes on the role of Federation Commander, issuing directives
that flow through the entire architecture of consciousness, diplomacy, rivals, dreams,
and cosmic expansion.

This is where gameplay happens. This is where the player connects.
"""

import sys
import io
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from dataclasses import dataclass, asdict
import re

# Fix Windows console encoding to UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(name)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger("GameConsole")


class GameStrategy(Enum):
    """Possible federation strategies"""
    EXPAND = "expand"          # Aggressive territorial growth
    DEFEND = "defend"          # Fortify and protect territory
    DIPLOMACY = "diplomacy"    # Build alliances and negotiate
    RESEARCH = "research"      # Technological advancement
    CULTURE = "culture"        # Cultural influence and soft power
    HYBRID = "hybrid"          # Mix of multiple approaches


class DiplomacyAction(Enum):
    """Diplomatic action types"""
    PROPOSE = "propose"        # Propose treaty or alliance
    DECLARE_WAR = "declare_war"  # Declare war on civilization
    ALLY = "ally"              # Form alliance
    DEMAND = "demand"          # Demand something
    NEGOTIATE = "negotiate"    # Start negotiations
    BREAK = "break"            # Break alliance/treaty


class DreamAction(Enum):
    """Dream/consciousness interaction types"""
    INTERPRET = "interpret"    # Interpret a dream
    INTEGRATE = "integrate"    # Integrate dream into consciousness
    TRIGGER = "trigger"        # Trigger lucid dreaming


class RivalAction(Enum):
    """Rival federation actions"""
    SPAWN = "spawn"            # Create new rival
    SIMULATE = "simulate"      # Simulate rival behavior
    WATCH = "watch"            # Monitor rival status
    ENGAGE = "engage"          # Engage with rival


class ProphecyAction(Enum):
    """Prophecy/future sight actions"""
    GENERATE = "generate"      # Generate new prophecy
    INTERPRET = "interpret"    # Interpret prophecy


class TurnAction(Enum):
    """Turn management actions"""
    ADVANCE = "advance"        # Advance one turn
    AUTO = "auto"              # Auto-play multiple turns


@dataclass
class GameStatistics:
    """Player statistics tracking"""
    turns_played: int = 0
    diplomacy_actions_taken: int = 0
    dreams_interpreted: int = 0
    rivals_spawned: int = 0
    prophecies_generated: int = 0
    chaos_events_triggered: int = 0
    manual_saves: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


class GameConsole:
    """
    Main interactive game console for THE FEDERATION GAME.

    Responsibilities:
    - Parse and execute player commands
    - Maintain game state across sessions
    - Route commands to subsystems
    - Display formatted output
    - Track player statistics
    - Handle save/load operations
    - Support hybrid mode (interactive + auto-play)
    """

    def __init__(self, save_dir: str = None):
        """Initialize the game console"""
        self.save_dir = Path(save_dir or "federation_saves")
        self.save_dir.mkdir(exist_ok=True)

        # Game state
        self.is_game_active = False
        self.current_turn = 0
        self.federation_name = "USS Chaosbringer"
        self.player_name = "Commander"

        # Strategy and settings
        self.current_strategy = GameStrategy.HYBRID
        self.auto_play_enabled = False
        self.auto_play_turns = 0
        self.verbose_mode = True

        # Game state containers
        self.game_state: Dict[str, Any] = self._init_game_state()
        self.statistics = GameStatistics()

        # Command registry
        self.commands = {
            'status': self.cmd_status,
            'strategy': self.cmd_strategy,
            'diplomacy': self.cmd_diplomacy,
            'dream': self.cmd_dream,
            'rival': self.cmd_rival,
            'chaos': self.cmd_chaos,
            'prophecy': self.cmd_prophecy,
            'turn': self.cmd_turn,
            'save': self.cmd_save,
            'load': self.cmd_load,
            'stats': self.cmd_stats,
            'help': self.cmd_help,
            'new': self.cmd_new_game,
            'exit': self.cmd_exit,
        }

    def _init_game_state(self) -> Dict[str, Any]:
        """Initialize blank game state"""
        return {
            'federation_core': {
                'morale': 0.5,
                'identity_strength': 0.3,
                'stability': 0.6,
                'technological_level': 0.2,
                'military_power': 0.3,
                'treasury': 1000,
                'population': 10000,
                'territory_size': 100.0,
            },
            'diplomacy': {
                'relationships': {},
                'treaties': [],
                'alliances': [],
                'tensions': {},
            },
            'consciousness': {
                'level': 0.2,
                'traumas': [],
                'dreams': [],
                'memories': {},
            },
            'rivals': {
                'active': [],
                'defeated': [],
                'threat_level': 0.5,
            },
            'campaigns': {
                'active': [],
                'completed': [],
                'progress': {},
            },
            'prophecies': [],
            'events': [],
        }

    def start(self) -> None:
        """Start the game console"""
        self._print_banner()

        while True:
            try:
                if not self.is_game_active:
                    self._print_welcome()
                    self._print_new_game_prompt()
                    continue

                # Main input loop
                self._print_prompt()
                user_input = input().strip().lower()

                if not user_input:
                    continue

                if not self._execute_command(user_input):
                    if self.verbose_mode:
                        self._print_error(f"Unknown command: {user_input}")
                        self._print_hint("Type 'help' for available commands")

            except KeyboardInterrupt:
                self._print_emergency_stop()
                sys.exit(0)
            except Exception as e:
                logger.error(f"Console error: {e}")
                self._print_error(f"An error occurred: {e}")

    def _execute_command(self, command_str: str) -> bool:
        """Parse and execute a command. Returns True if command was found."""
        parts = command_str.split()
        if not parts:
            return False

        cmd = parts[0]
        args = parts[1:] if len(parts) > 1 else []

        if cmd in self.commands:
            try:
                self.commands[cmd](*args)
                return True
            except Exception as e:
                logger.error(f"Command error: {e}")
                self._print_error(f"Error executing command: {e}")
                return True

        return False

    def cmd_status(self) -> None:
        """Display federation status"""
        self._print_header("FEDERATION STATUS REPORT")

        core = self.game_state['federation_core']
        self._print_stat_bar("Morale", core['morale'])
        self._print_stat_bar("Identity Strength", core['identity_strength'])
        self._print_stat_bar("Stability", core['stability'])
        self._print_stat_bar("Technological Level", core['technological_level'])
        self._print_stat_bar("Military Power", core['military_power'])

        print()
        print(f"  Treasury: {core['treasury']} credits")
        print(f"  Population: {core['population']} million")
        print(f"  Territory: {core['territory_size']} light-years")

        print()
        print(f"  Current Strategy: {self.current_strategy.value.upper()}")
        print(f"  Current Turn: {self.current_turn}")
        print(f"  Auto-Play: {'ENABLED' if self.auto_play_enabled else 'disabled'}")

        self._print_subsystems_summary()
        self._print_footer()

    def cmd_strategy(self, action: str = None, *args) -> None:
        """Set or display federation strategy"""
        if action is None:
            self._print_header("CURRENT STRATEGY")
            print(f"\n  Active Strategy: {self.current_strategy.value.upper()}")
            print("\n  Available Strategies:")
            for strategy in GameStrategy:
                symbol = "→" if strategy == self.current_strategy else " "
                print(f"    {symbol} {strategy.value:15} - {self._strategy_description(strategy)}")
            self._print_footer()
            return

        try:
            new_strategy = GameStrategy(action.lower())
            self.current_strategy = new_strategy
            self._print_success(f"Strategy changed to: {new_strategy.value.upper()}")
            self._print_strategy_briefing(new_strategy)
        except ValueError:
            self._print_error(f"Unknown strategy: {action}")
            self._print_hint(f"Valid strategies: {', '.join(s.value for s in GameStrategy)}")

    def cmd_diplomacy(self, action: str = None, target: str = None, *args) -> None:
        """Manage diplomacy"""
        if action is None:
            self._print_header("DIPLOMACY STATUS")
            print("\n  Available Actions:")
            for dip_action in DiplomacyAction:
                print(f"    - diplomacy {dip_action.value} <civilization>")

            print("\n  Current Relationships:")
            relationships = self.game_state['diplomacy']['relationships']
            if relationships:
                for civ, standing in relationships.items():
                    self._print_relation(civ, standing)
            else:
                print("    (No relationships established yet)")
            self._print_footer()
            return

        if target is None:
            self._print_error("Diplomacy action requires a target civilization")
            return

        try:
            dip_action = DiplomacyAction(action.lower())
            self._execute_diplomacy_action(dip_action, target)
            self.statistics.diplomacy_actions_taken += 1
        except ValueError:
            self._print_error(f"Unknown diplomacy action: {action}")

    def cmd_dream(self, action: str = None, *args) -> None:
        """Interact with dreams and consciousness"""
        if action is None:
            self._print_header("CONSCIOUSNESS & DREAMS")
            print("\n  Available Actions:")
            for dream_action in DreamAction:
                print(f"    - dream {dream_action.value}")

            consciousness_level = self.game_state['consciousness']['level']
            self._print_stat_bar("Consciousness Level", consciousness_level)

            dreams = self.game_state['consciousness']['dreams']
            if dreams:
                print(f"\n  Recent Dreams: {len(dreams)} recorded")
            self._print_footer()
            return

        try:
            dream_action = DreamAction(action.lower())
            self._execute_dream_action(dream_action)
            self.statistics.dreams_interpreted += 1
        except ValueError:
            self._print_error(f"Unknown dream action: {action}")

    def cmd_rival(self, action: str = None, target: str = None, *args) -> None:
        """Manage rival federations"""
        if action is None:
            self._print_header("RIVAL FEDERATIONS")
            print("\n  Available Actions:")
            for rival_action in RivalAction:
                print(f"    - rival {rival_action.value}")

            rivals = self.game_state['rivals']
            self._print_stat_bar("Threat Level", rivals['threat_level'])
            print(f"\n  Active Rivals: {len(rivals['active'])}")
            print(f"  Rivals Defeated: {len(rivals['defeated'])}")
            self._print_footer()
            return

        try:
            rival_action = RivalAction(action.lower())
            self._execute_rival_action(rival_action, target)
            if rival_action == RivalAction.SPAWN:
                self.statistics.rivals_spawned += 1
        except ValueError:
            self._print_error(f"Unknown rival action: {action}")

    def cmd_chaos(self, action: str = None, *args) -> None:
        """Trigger chaos/surprise events"""
        if action is None or action == "surprise":
            self._print_header("⚡ CHAOS MODE ⚡")
            print("\n  Initiating random chaos event...")
            self._execute_chaos_event()
            self.statistics.chaos_events_triggered += 1
        else:
            self._print_error(f"Unknown chaos action: {action}")
            self._print_hint("Use: chaos [surprise]")

    def cmd_prophecy(self, action: str = None, *args) -> None:
        """Generate and interpret prophecies"""
        if action is None:
            self._print_header("PROPHECY ENGINE")
            print("\n  Available Actions:")
            for prophecy_action in ProphecyAction:
                print(f"    - prophecy {prophecy_action.value}")

            prophecies = self.game_state['prophecies']
            print(f"\n  Prophecies Recorded: {len(prophecies)}")
            self._print_footer()
            return

        try:
            prophecy_action = ProphecyAction(action.lower())
            self._execute_prophecy_action(prophecy_action)
            self.statistics.prophecies_generated += 1
        except ValueError:
            self._print_error(f"Unknown prophecy action: {action}")

    def cmd_turn(self, action: str = None, count: str = None, *args) -> None:
        """Manage game turns"""
        if action is None:
            print(f"\n  Current Turn: {self.current_turn}")
            print("  Available Actions:")
            print("    - turn advance       (Play one turn)")
            print("    - turn auto <count>  (Auto-play N turns)")
            print()
            return

        if action == "advance":
            self._execute_turn()
        elif action == "auto":
            try:
                num_turns = int(count) if count else 5
                self._execute_auto_play(num_turns)
            except ValueError:
                self._print_error(f"Invalid turn count: {count}")

    def cmd_save(self, filename: str = None, *args) -> None:
        """Save current game"""
        if filename is None:
            filename = f"federation_{self.current_turn}_{int(datetime.now().timestamp())}"

        save_path = self.save_dir / f"{filename}.json"

        save_data = {
            'timestamp': datetime.now().isoformat(),
            'federation_name': self.federation_name,
            'player_name': self.player_name,
            'turn': self.current_turn,
            'strategy': self.current_strategy.value,
            'game_state': self.game_state,
            'statistics': self.statistics.to_dict(),
        }

        try:
            with open(save_path, 'w') as f:
                json.dump(save_data, f, indent=2, default=str)
            self._print_success(f"Game saved to: {save_path}")
            self.statistics.manual_saves += 1
        except Exception as e:
            self._print_error(f"Failed to save game: {e}")

    def cmd_load(self, filename: str = None, *args) -> None:
        """Load saved game"""
        if filename is None:
            self._print_header("AVAILABLE SAVES")
            saves = list(self.save_dir.glob("*.json"))
            if saves:
                for i, save_path in enumerate(saves, 1):
                    print(f"  {i}. {save_path.stem}")
            else:
                print("  No saved games found")
            self._print_footer()
            return

        save_path = self.save_dir / f"{filename}.json"

        if not save_path.exists():
            self._print_error(f"Save file not found: {filename}")
            return

        try:
            with open(save_path, 'r') as f:
                save_data = json.load(f)

            self.federation_name = save_data['federation_name']
            self.player_name = save_data['player_name']
            self.current_turn = save_data['turn']
            self.current_strategy = GameStrategy(save_data['strategy'])
            self.game_state = save_data['game_state']

            # Partial restore of statistics
            self.statistics = GameStatistics(**save_data['statistics'])
            self.is_game_active = True

            self._print_success(f"Game loaded from turn {self.current_turn}")
        except Exception as e:
            self._print_error(f"Failed to load game: {e}")

    def cmd_stats(self, *args) -> None:
        """Display player statistics"""
        self._print_header("COMMAND STATISTICS")
        stats = self.statistics
        print(f"\n  Turns Played: {stats.turns_played}")
        print(f"  Diplomacy Actions: {stats.diplomacy_actions_taken}")
        print(f"  Dreams Interpreted: {stats.dreams_interpreted}")
        print(f"  Rivals Spawned: {stats.rivals_spawned}")
        print(f"  Prophecies Generated: {stats.prophecies_generated}")
        print(f"  Chaos Events Triggered: {stats.chaos_events_triggered}")
        print(f"  Manual Saves: {stats.manual_saves}")
        self._print_footer()

    def cmd_help(self, *args) -> None:
        """Display help information"""
        self._print_header("FEDERATION GAME - COMMAND REFERENCE")

        print("\nCORE COMMANDS:")
        print("  status              - Federation status overview")
        print("  strategy <type>     - Set federation strategy")
        print("  turn <action>       - Advance turns or enable auto-play")
        print("  new                 - Start a new game")

        print("\nDIPLOMACY & RELATIONS:")
        print("  diplomacy                     - Show diplomacy status")
        print("  diplomacy <action> <target>   - Execute diplomatic action")

        print("\nCONSCIOUSNESS & DREAMS:")
        print("  dream                         - Show consciousness status")
        print("  dream <action>                - Interact with dreams")

        print("\nRIVALS & COMPETITION:")
        print("  rival                         - Show rival status")
        print("  rival <action> [target]       - Manage rivals")

        print("\nCHAOS & PROPHECY:")
        print("  chaos                         - Trigger random chaos event")
        print("  prophecy <action>             - Work with prophecies")

        print("\nGAME MANAGEMENT:")
        print("  save [filename]               - Save current game")
        print("  load [filename]               - Load saved game")
        print("  stats                         - Show player statistics")
        print("  help                          - Show this help")
        print("  exit                          - Exit the game")

        self._print_footer()

    def cmd_new_game(self, *args) -> None:
        """Start a new game"""
        self._print_header("NEW GAME")

        federation_name = input("\n  Federation Name [USS Chaosbringer]: ").strip()
        if not federation_name:
            federation_name = "USS Chaosbringer"

        player_name = input("  Commander Name [Captain]: ").strip()
        if not player_name:
            player_name = "Captain"

        self.federation_name = federation_name
        self.player_name = player_name
        self.current_turn = 0
        self.game_state = self._init_game_state()
        self.statistics = GameStatistics()
        self.is_game_active = True

        self._print_success(f"Game started!")
        print(f"\n  Federation: {self.federation_name}")
        print(f"  Commander: {self.player_name}")
        print(f"  Turn: {self.current_turn}")
        self._print_footer()

    def cmd_exit(self, *args) -> None:
        """Exit the game"""
        if self.is_game_active:
            response = input("\n  Save before exiting? (y/n): ").strip().lower()
            if response == 'y':
                self.cmd_save()

        self._print_farewell()
        sys.exit(0)

    # ========== COMMAND EXECUTION HELPERS ==========

    def _execute_diplomacy_action(self, action: DiplomacyAction, target: str) -> None:
        """Execute a diplomacy command"""
        outcomes = {
            DiplomacyAction.PROPOSE: "Proposed mutual defense pact",
            DiplomacyAction.DECLARE_WAR: "Declared war on enemy",
            DiplomacyAction.ALLY: "Formed new alliance",
            DiplomacyAction.DEMAND: "Issued ultimatum",
            DiplomacyAction.NEGOTIATE: "Started negotiations",
            DiplomacyAction.BREAK: "Ended diplomatic relations",
        }

        self._print_header(f"DIPLOMACY: {action.value.upper()}")
        print(f"\n  Target: {target}")
        print(f"  Action: {outcomes[action]}")

        # Update game state
        if target not in self.game_state['diplomacy']['relationships']:
            self.game_state['diplomacy']['relationships'][target] = 0.0

        self._print_success("Diplomatic action executed")
        self._print_footer()

    def _execute_dream_action(self, action: DreamAction) -> None:
        """Execute a dream command"""
        self._print_header(f"CONSCIOUSNESS: {action.value.upper()}")

        messages = {
            DreamAction.INTERPRET: "Analyzing dream patterns and symbolism...",
            DreamAction.INTEGRATE: "Integrating consciousness fragments...",
            DreamAction.TRIGGER: "Entering lucid dream state...",
        }

        print(f"\n  {messages[action]}")

        # Simulate consciousness update
        consciousness = self.game_state['consciousness']
        consciousness['level'] = min(1.0, consciousness['level'] + 0.05)

        self._print_success("Dream action completed")
        self._print_footer()

    def _execute_rival_action(self, action: RivalAction, target: str = None) -> None:
        """Execute a rival command"""
        self._print_header(f"RIVALS: {action.value.upper()}")

        if action == RivalAction.SPAWN:
            rival_name = target or f"Rival_{len(self.game_state['rivals']['active']) + 1}"
            self.game_state['rivals']['active'].append(rival_name)
            self._print_success(f"Spawned new rival: {rival_name}")
        elif action == RivalAction.WATCH:
            print(f"\n  Monitoring rival activity...")
            if self.game_state['rivals']['active']:
                for rival in self.game_state['rivals']['active']:
                    print(f"    - {rival}")
            else:
                print("    No active rivals")

        self._print_footer()

    def _execute_chaos_event(self) -> None:
        """Execute chaos/surprise event"""
        import random
        chaos_messages = [
            "A mysterious signal has been detected from unknown space!",
            "The federation's core consciousness just experienced a revelation!",
            "An unexpected alliance opportunity has emerged!",
            "A rival federation has launched a surprise attack!",
            "A scientific breakthrough has been discovered!",
            "A prophecy has manifested in reality!",
            "Internal conflict threatens federation stability!",
            "A cosmic phenomenon has altered the timestream!",
        ]

        event = random.choice(chaos_messages)
        print(f"\n  ⚡ {event}")

        # Update stability randomly
        core = self.game_state['federation_core']
        core['stability'] += random.uniform(-0.2, 0.1)
        core['stability'] = max(0.0, min(1.0, core['stability']))

        self._print_success("Chaos event resolved")
        self._print_footer()

    def _execute_prophecy_action(self, action: ProphecyAction) -> None:
        """Execute prophecy command"""
        self._print_header(f"PROPHECY: {action.value.upper()}")

        import random
        prophecies = [
            "In the darkness, a new star will be born...",
            "The federation's consciousness awakens...",
            "Three rivals shall clash, and one shall fall...",
            "Unity and separation coexist in paradox...",
            "The past repeats in the future's echo...",
        ]

        prophecy = random.choice(prophecies)
        print(f"\n  {prophecy}")

        self.game_state['prophecies'].append({
            'timestamp': datetime.now().isoformat(),
            'prophecy': prophecy,
            'turn': self.current_turn,
        })

        self._print_footer()

    def _execute_turn(self) -> None:
        """Execute a single turn"""
        self.current_turn += 1
        self.statistics.turns_played += 1

        self._print_header(f"TURN {self.current_turn}")

        print("\n  Federation Status Update:")
        core = self.game_state['federation_core']

        # Simulate turn changes
        core['morale'] = max(0.0, min(1.0, core['morale'] + (0.01 if self.current_strategy == GameStrategy.DIPLOMACY else 0)))
        core['technological_level'] = max(0.0, min(1.0, core['technological_level'] + 0.02))
        core['treasury'] = max(0, core['treasury'] + (100 if self.current_strategy == GameStrategy.RESEARCH else 50))

        self._print_stat_bar("  Morale", core['morale'])
        self._print_stat_bar("  Technology", core['technological_level'])

        print(f"  Treasury: {core['treasury']} credits")
        self._print_success("Turn complete")
        self._print_footer()

    def _execute_auto_play(self, num_turns: int) -> None:
        """Auto-play multiple turns"""
        self._print_header(f"AUTO-PLAY MODE: {num_turns} turns")
        self.auto_play_enabled = True

        for i in range(num_turns):
            self._execute_turn()
            if i < num_turns - 1:
                print()

        self.auto_play_enabled = False
        self._print_success(f"Auto-play completed ({num_turns} turns)")
        self._print_footer()

    # ========== DISPLAY HELPERS ==========

    def _print_banner(self) -> None:
        """Print game title banner"""
        print("\n" + "=" * 70)
        print("╔═══════════════════════════════════════════════════════════════════╗")
        print("║                   THE FEDERATION GAME                             ║")
        print("║          Command the USS Chaosbringer to Federation Glory          ║")
        print("╚═══════════════════════════════════════════════════════════════════╝")
        print("=" * 70)

    def _print_welcome(self) -> None:
        """Print welcome message"""
        print("\n" + "="*70)
        print("Welcome, Commander!")
        print("="*70)
        print("\nType 'new' to start a new game")
        print("Type 'load' to load a saved game")
        print("Type 'help' for available commands")
        print("Type 'exit' to quit")
        print("="*70)

    def _print_new_game_prompt(self) -> None:
        """Print new game prompt"""
        print()

    def _print_prompt(self) -> None:
        """Print the command prompt"""
        if self.is_game_active:
            print()
            print(f"[Turn {self.current_turn}] {self.player_name}> ", end="", flush=True)
        else:
            print("Federation> ", end="", flush=True)

    def _print_header(self, title: str) -> None:
        """Print formatted header"""
        print("\n" + "─" * 70)
        print(f"  {title}")
        print("─" * 70)

    def _print_footer(self) -> None:
        """Print formatted footer"""
        print("─" * 70)

    def _print_success(self, message: str) -> None:
        """Print success message"""
        print(f"\n  ✓ {message}")

    def _print_error(self, message: str) -> None:
        """Print error message"""
        print(f"\n  ✗ {message}")

    def _print_hint(self, message: str) -> None:
        """Print hint message"""
        print(f"  ℹ {message}")

    def _print_farewell(self) -> None:
        """Print farewell message"""
        self._print_header("FAREWELL")
        print("\n  Thank you for playing THE FEDERATION GAME")
        print("  May the cosmos guide your future endeavors")
        print("\n")

    def _print_emergency_stop(self) -> None:
        """Print emergency stop message"""
        print("\n\n[EMERGENCY] Commander has ordered all stop!")
        print("Game systems shutting down...")

    def _print_stat_bar(self, name: str, value: float, width: int = 25) -> None:
        """Print a statistics bar"""
        filled = int(width * value)
        empty = width - filled
        bar = "█" * filled + "░" * empty
        percentage = int(value * 100)
        print(f"  {name:20} [{bar}] {percentage:3}%")

    def _print_relation(self, civilization: str, standing: float) -> None:
        """Print relationship status"""
        if standing < -0.5:
            status = "⚔ HOSTILE"
        elif standing < 0:
            status = "⚠ TENSE"
        elif standing < 0.5:
            status = "→ NEUTRAL"
        elif standing < 0.8:
            status = "✓ FRIENDLY"
        else:
            status = "♥ ALLIED"

        self._print_stat_bar(f"  {civilization:15}", (standing + 1) / 2)
        print(f"    {status}")

    def _print_subsystems_summary(self) -> None:
        """Print subsystems status"""
        print("\n  Subsystems:")

        diplomacy = self.game_state['diplomacy']
        print(f"    • Diplomatic Relations: {len(diplomacy['relationships'])} entities")

        consciousness = self.game_state['consciousness']
        print(f"    • Consciousness Level: {int(consciousness['level']*100)}%")

        rivals = self.game_state['rivals']
        print(f"    • Active Rivals: {len(rivals['active'])}")

        prophecies = self.game_state['prophecies']
        print(f"    • Prophecies: {len(prophecies)}")

    def _strategy_description(self, strategy: GameStrategy) -> str:
        """Get strategy description"""
        descriptions = {
            GameStrategy.EXPAND: "Rapid territorial growth and expansion",
            GameStrategy.DEFEND: "Fortify and protect current territory",
            GameStrategy.DIPLOMACY: "Build alliances and negotiate",
            GameStrategy.RESEARCH: "Focus on tech advancement",
            GameStrategy.CULTURE: "Cultural influence and soft power",
            GameStrategy.HYBRID: "Balanced multi-approach strategy",
        }
        return descriptions.get(strategy, "Unknown strategy")

    def _print_strategy_briefing(self, strategy: GameStrategy) -> None:
        """Print strategy briefing"""
        briefings = {
            GameStrategy.EXPAND: "Territory acquisition increased. Economic growth focused. Military expansion prioritized.",
            GameStrategy.DEFEND: "Defensive capabilities enhanced. Resource conservation active. Territory consolidation mode.",
            GameStrategy.DIPLOMACY: "Alliance formation probability increased. Treaty negotiations active. Conflict reduction enabled.",
            GameStrategy.RESEARCH: "Technology progression accelerated. Scientific breakthrough probability increased.",
            GameStrategy.CULTURE: "Cultural influence spreading. Alliance through shared values enhanced.",
            GameStrategy.HYBRID: "Balanced approach across all fronts. Adaptive strategy enabled.",
        }
        print(f"  {briefings.get(strategy, '')}\n")


def main() -> None:
    """Main entry point"""
    console = GameConsole(save_dir="federation_saves")
    console.start()


if __name__ == "__main__":
    main()
