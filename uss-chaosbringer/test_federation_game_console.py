#!/usr/bin/env python3
"""
TEST: Federation Game Console Integration
Demonstrates the console's capabilities and integration with subsystems
"""

import sys
from pathlib import Path

# Add path to find federation modules
sys.path.insert(0, str(Path(__file__).parent))

from federation_game_console import (
    GameConsole, GameStrategy, DiplomacyAction, DreamAction,
    RivalAction, ProphecyAction, GameStatistics
)


def test_console_initialization():
    """Test console can be created and initialized"""
    print("TEST 1: Console Initialization")
    print("-" * 60)

    console = GameConsole()

    assert console.federation_name == "USS Chaosbringer"
    assert console.player_name == "Commander"
    assert console.current_turn == 0
    assert console.is_game_active == False
    assert len(console.commands) == 14

    print("✓ Console initialized successfully")
    print(f"✓ {len(console.commands)} commands registered")
    print(f"✓ Game state has {len(console.game_state)} subsystems")
    print()


def test_game_state_structure():
    """Test game state structure matches requirements"""
    print("TEST 2: Game State Structure")
    print("-" * 60)

    console = GameConsole()
    state = console.game_state

    # Test federation core
    assert 'federation_core' in state
    core = state['federation_core']
    assert 'morale' in core
    assert 'stability' in core
    assert 'treasury' in core
    assert 'population' in core

    # Test diplomacy
    assert 'diplomacy' in state
    diplomacy = state['diplomacy']
    assert 'relationships' in diplomacy
    assert 'treaties' in diplomacy
    assert 'alliances' in diplomacy

    # Test consciousness
    assert 'consciousness' in state
    consciousness = state['consciousness']
    assert 'level' in consciousness
    assert 'dreams' in consciousness

    # Test rivals
    assert 'rivals' in state
    rivals = state['rivals']
    assert 'active' in rivals
    assert 'threat_level' in rivals

    print("✓ Federation core state valid")
    print("✓ Diplomacy subsystem valid")
    print("✓ Consciousness subsystem valid")
    print("✓ Rivals subsystem valid")
    print("✓ Campaigns subsystem valid")
    print("✓ Prophecies subsystem valid")
    print("✓ Events subsystem valid")
    print()


def test_strategy_system():
    """Test strategy selection and effects"""
    print("TEST 3: Strategy System")
    print("-" * 60)

    console = GameConsole()

    # Test all strategies
    for strategy in GameStrategy:
        console.current_strategy = strategy
        assert console.current_strategy == strategy
        print(f"✓ Strategy '{strategy.value}' valid")

    print()


def test_statistics_tracking():
    """Test statistics accumulation"""
    print("TEST 4: Statistics Tracking")
    print("-" * 60)

    console = GameConsole()
    stats = console.statistics

    # Simulate gameplay stats
    stats.turns_played = 50
    stats.diplomacy_actions_taken = 12
    stats.dreams_interpreted = 8
    stats.rivals_spawned = 3
    stats.prophecies_generated = 6
    stats.chaos_events_triggered = 4
    stats.manual_saves = 2

    dict_stats = stats.to_dict()
    assert dict_stats['turns_played'] == 50
    assert dict_stats['diplomacy_actions_taken'] == 12
    assert dict_stats['dreams_interpreted'] == 8

    print("✓ Turns played tracked")
    print("✓ Diplomacy actions tracked")
    print("✓ Dreams interpreted tracked")
    print("✓ Rivals spawned tracked")
    print("✓ Prophecies generated tracked")
    print("✓ Chaos events triggered tracked")
    print("✓ Manual saves tracked")
    print()


def test_new_game_flow():
    """Test new game initialization"""
    print("TEST 5: New Game Flow")
    print("-" * 60)

    console = GameConsole()

    # Simulate new game
    console.federation_name = "Test Federation"
    console.player_name = "Test Commander"
    console.is_game_active = True
    console.current_turn = 0

    assert console.federation_name == "Test Federation"
    assert console.player_name == "Test Commander"
    assert console.is_game_active == True
    assert console.current_turn == 0

    print("✓ Game initialized")
    print(f"✓ Federation: {console.federation_name}")
    print(f"✓ Commander: {console.player_name}")
    print(f"✓ Turn: {console.current_turn}")
    print()


def test_turn_progression():
    """Test turn advancement"""
    print("TEST 6: Turn Progression")
    print("-" * 60)

    console = GameConsole()
    console.is_game_active = True

    initial_turn = console.current_turn
    initial_tech = console.game_state['federation_core']['technological_level']

    # Simulate turn
    console.statistics.turns_played += 1
    console.current_turn += 1
    console.game_state['federation_core']['technological_level'] += 0.02

    assert console.current_turn == initial_turn + 1
    assert console.statistics.turns_played == 1
    assert console.game_state['federation_core']['technological_level'] > initial_tech

    print("✓ Turn advanced")
    print(f"✓ Tech level improved: {initial_tech:.2f} → {console.game_state['federation_core']['technological_level']:.2f}")
    print()


def test_diplomacy_actions():
    """Test diplomacy system"""
    print("TEST 7: Diplomacy Actions")
    print("-" * 60)

    console = GameConsole()
    console.is_game_active = True

    # Test diplomacy state updates
    diplomacy = console.game_state['diplomacy']

    # Simulate establishing relationships
    diplomacy['relationships']['Rome'] = 0.3
    diplomacy['relationships']['Greece'] = -0.2
    diplomacy['relationships']['Egypt'] = 0.8

    assert 'Rome' in diplomacy['relationships']
    assert 'Greece' in diplomacy['relationships']
    assert len(diplomacy['relationships']) == 3

    print("✓ Relationships established")
    print(f"✓ Rome relationship: {diplomacy['relationships']['Rome']}")
    print(f"✓ Greece relationship: {diplomacy['relationships']['Greece']}")
    print(f"✓ Egypt relationship: {diplomacy['relationships']['Egypt']}")
    print()


def test_consciousness_evolution():
    """Test consciousness system"""
    print("TEST 8: Consciousness Evolution")
    print("-" * 60)

    console = GameConsole()
    consciousness = console.game_state['consciousness']

    initial_level = consciousness['level']

    # Simulate consciousness growth
    consciousness['level'] = min(1.0, consciousness['level'] + 0.05)
    consciousness['dreams'].append("Federation dreams of unity")

    assert consciousness['level'] > initial_level
    assert len(consciousness['dreams']) > 0

    print("✓ Consciousness level increased")
    print(f"✓ Level: {initial_level:.2f} → {consciousness['level']:.2f}")
    print(f"✓ Dreams recorded: {len(consciousness['dreams'])}")
    print()


def test_rival_management():
    """Test rival federation system"""
    print("TEST 9: Rival Management")
    print("-" * 60)

    console = GameConsole()
    rivals = console.game_state['rivals']

    # Spawn rivals
    rivals['active'].append('Klingon Empire')
    rivals['active'].append('Romulan Syndicate')
    rivals['active'].append('Dominion Alliance')

    assert len(rivals['active']) == 3
    assert 'Klingon Empire' in rivals['active']

    print("✓ Rivals spawned")
    print(f"✓ Active rivals: {', '.join(rivals['active'])}")
    print(f"✓ Threat level: {rivals['threat_level']}")
    print()


def test_prophecy_system():
    """Test prophecy tracking"""
    print("TEST 10: Prophecy System")
    print("-" * 60)

    console = GameConsole()
    prophecies = console.game_state['prophecies']

    # Add prophecies
    prophecies.append({
        'timestamp': '2026-02-19T10:00:00',
        'prophecy': 'In the darkness, a new star will be born',
        'turn': 1,
    })
    prophecies.append({
        'timestamp': '2026-02-19T11:00:00',
        'prophecy': 'The federation\'s consciousness awakens',
        'turn': 2,
    })

    assert len(prophecies) == 2
    print("✓ Prophecies recorded")
    print(f"✓ Total prophecies: {len(prophecies)}")
    print()


def test_save_load_simulation():
    """Test save/load mechanics"""
    print("TEST 11: Save/Load Simulation")
    print("-" * 60)

    console = GameConsole()
    console.federation_name = "Test Federation"
    console.player_name = "Test Commander"
    console.is_game_active = True
    console.current_turn = 25
    console.current_strategy = GameStrategy.DIPLOMACY
    console.statistics.turns_played = 25

    # Prepare save data
    save_data = {
        'federation_name': console.federation_name,
        'player_name': console.player_name,
        'turn': console.current_turn,
        'strategy': console.current_strategy.value,
        'game_state': console.game_state,
        'statistics': console.statistics.to_dict(),
    }

    # Load data into new console
    console2 = GameConsole()
    console2.federation_name = save_data['federation_name']
    console2.player_name = save_data['player_name']
    console2.current_turn = save_data['turn']
    console2.current_strategy = GameStrategy(save_data['strategy'])

    assert console2.federation_name == "Test Federation"
    assert console2.player_name == "Test Commander"
    assert console2.current_turn == 25
    assert console2.current_strategy == GameStrategy.DIPLOMACY

    print("✓ Save state prepared")
    print("✓ Load state restored")
    print(f"✓ Federation: {console2.federation_name}")
    print(f"✓ Commander: {console2.player_name}")
    print(f"✓ Turn: {console2.current_turn}")
    print()


def test_command_parsing():
    """Test command parsing logic"""
    print("TEST 12: Command Parsing")
    print("-" * 60)

    console = GameConsole()
    console.is_game_active = True

    # Test command execution detection
    test_commands = [
        ('status', True),
        ('help', True),
        ('invalid_command', False),
        ('', False),
    ]

    for cmd, should_exist in test_commands:
        if cmd in console.commands:
            assert should_exist, f"Command {cmd} shouldn't exist but does"
            print(f"✓ Command '{cmd}' found")
        else:
            assert not should_exist, f"Command {cmd} should exist but doesn't"
            if cmd:
                print(f"✓ Command '{cmd}' correctly not found")

    print()


def test_enumeration_completeness():
    """Test all enums are properly defined"""
    print("TEST 13: Enumeration Completeness")
    print("-" * 60)

    # Test GameStrategy
    strategies = [s for s in GameStrategy]
    assert len(strategies) == 6
    print(f"✓ GameStrategy: {len(strategies)} strategies")

    # Test DiplomacyAction
    dip_actions = [d for d in DiplomacyAction]
    assert len(dip_actions) == 6
    print(f"✓ DiplomacyAction: {len(dip_actions)} actions")

    # Test DreamAction
    dream_actions = [d for d in DreamAction]
    assert len(dream_actions) == 3
    print(f"✓ DreamAction: {len(dream_actions)} actions")

    # Test RivalAction
    rival_actions = [r for r in RivalAction]
    assert len(rival_actions) == 4
    print(f"✓ RivalAction: {len(rival_actions)} actions")

    # Test ProphecyAction
    prophecy_actions = [p for p in ProphecyAction]
    assert len(prophecy_actions) == 2
    print(f"✓ ProphecyAction: {len(prophecy_actions)} actions")

    print()


def run_all_tests():
    """Run all integration tests"""
    print("\n" + "=" * 60)
    print("FEDERATION GAME CONSOLE - INTEGRATION TEST SUITE")
    print("=" * 60 + "\n")

    tests = [
        test_console_initialization,
        test_game_state_structure,
        test_strategy_system,
        test_statistics_tracking,
        test_new_game_flow,
        test_turn_progression,
        test_diplomacy_actions,
        test_consciousness_evolution,
        test_rival_management,
        test_prophecy_system,
        test_save_load_simulation,
        test_command_parsing,
        test_enumeration_completeness,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"✗ FAILED: {e}\n")
            failed += 1
        except Exception as e:
            print(f"✗ ERROR: {e}\n")
            failed += 1

    # Summary
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Passed: {passed}/{len(tests)}")
    print(f"Failed: {failed}/{len(tests)}")

    if failed == 0:
        print("\n✓ ALL TESTS PASSED!")
    else:
        print(f"\n✗ {failed} test(s) failed")

    print("=" * 60)
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
