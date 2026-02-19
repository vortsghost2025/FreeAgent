#!/usr/bin/env python3
"""
Test suite for federation_game_state.py
"""

from federation_game_state import GameState, GamePhase, VictoryType
import json
import tempfile
from pathlib import Path

def test_game_initialization():
    """Test creating a new game"""
    print("TEST: Game Initialization")
    state = GameState()

    assert state.statistics.current_turn == 0
    assert state.federation.morale == 0.5
    assert state.federation.treasury == 1000
    print("  [PASS] Game initializes with correct default values\n")


def test_turn_advancement():
    """Test advancing game turns"""
    print("TEST: Turn Advancement")
    state = GameState()

    for i in range(5):
        result = state.advance_turn()
        assert result['success']
        assert result['new_turn'] == i + 1

    assert state.statistics.current_turn == 5
    assert state.game_phase == GamePhase.EARLY_EXPANSION
    print("  [PASS] Turns advance correctly\n")


def test_action_recording():
    """Test recording player actions"""
    print("TEST: Action Recording")
    state = GameState()
    state.advance_turn()

    result = state.record_action(
        action_type="diplomacy",
        description="Negotiated peace treaty with rivals",
        outcome="Treaty accepted",
        morale_delta=0.1,
        stability_delta=0.05,
        treasury_delta=-50
    )

    assert result['success']
    assert state.federation.morale == 0.6
    assert state.federation.stability == 0.65
    assert state.federation.treasury == 950
    assert len(state.action_history) == 1
    print("  [PASS] Actions recorded and state updated\n")


def test_game_summary():
    """Test comprehensive game summary"""
    print("TEST: Game Summary")
    state = GameState()

    for _ in range(10):
        state.advance_turn()

    for _ in range(5):
        state.record_action(
            "military",
            "Defeated rival faction",
            "Victory",
            morale_delta=0.15,
            treasury_delta=100
        )

    summary = state.get_game_summary()
    assert summary['success']
    assert summary['game_summary']['current_turn'] == 10
    assert summary['game_summary']['federation_core']['morale'] > 0.5
    assert summary['game_summary']['federation_core']['treasury'] == 1500
    print("  [PASS] Game summary generated successfully\n")


def test_statistics():
    """Test gameplay statistics"""
    print("TEST: Statistics")
    state = GameState()

    state.statistics.total_battles_fought = 10
    state.statistics.battles_won = 7
    state.statistics.resources_gained = 500
    state.statistics.resources_spent = 200

    stats = state.get_statistics()
    assert stats['success']
    assert stats['statistics']['military']['win_rate'] == 0.7
    assert stats['statistics']['resources']['net_resources'] == 300
    print("  [PASS] Statistics calculated correctly\n")


def test_victory_condition():
    """Test marking victory"""
    print("TEST: Victory Condition")
    state = GameState()

    for _ in range(50):
        state.advance_turn()

    result = state.set_victory_condition(VictoryType.DIPLOMATIC)
    assert result['success']
    assert result['game_won']
    assert state.game_phase == GamePhase.VICTORY
    assert state.is_game_over
    print("  [PASS] Victory condition set correctly\n")


def test_defeat_condition():
    """Test marking defeat"""
    print("TEST: Defeat Condition")
    state = GameState()

    result = state.set_defeat_condition("Internal collapse due to low morale")
    assert result['success']
    assert result['game_lost']
    assert state.game_phase == GamePhase.DEFEAT
    assert state.defeat_reason == "Internal collapse due to low morale"
    print("  [PASS] Defeat condition set correctly\n")


def test_save_and_load():
    """Test game save/load functionality"""
    print("TEST: Save/Load Game")

    with tempfile.TemporaryDirectory() as tmpdir:
        save_path = str(Path(tmpdir) / "test_save.json")

        # Create and modify game
        state1 = GameState()
        for _ in range(25):
            state1.advance_turn()
        state1.record_action(
            "research",
            "Completed new technology",
            "Success",
            morale_delta=0.2
        )
        state1.subsystems.consciousness_level = 0.7

        # Save
        save_result = state1.save_game(save_path)
        assert save_result['success']
        assert Path(save_path).exists()

        # Load into new game state
        state2 = GameState()
        load_result = state2.load_game(save_path)
        assert load_result['success']
        assert state2.statistics.current_turn == 25
        assert state2.federation.morale == 0.7
        assert state2.subsystems.consciousness_level == 0.7
        assert len(state2.action_history) == 1

        print("  [PASS] Game saved and loaded successfully\n")


def test_validation():
    """Test state validation"""
    print("TEST: State Validation")
    state = GameState()

    # Valid state should pass
    validation = state.validate_state()
    assert validation['success']
    assert validation['validation_passed']

    # Corrupt state should fail validation
    state.federation.morale = 1.5  # Out of range
    validation = state.validate_state()
    assert validation['success']
    assert not validation['validation_passed']
    assert len(validation['issues']) > 0

    print("  [PASS] State validation working correctly\n")


def test_reset_game():
    """Test game reset"""
    print("TEST: Reset Game")
    state = GameState()

    # Play a bit
    for _ in range(50):
        state.advance_turn()
    state.record_action("test", "Test", "Test", morale_delta=0.3)

    old_turn = state.statistics.current_turn

    # Reset
    reset_result = state.reset_game()
    assert reset_result['success']
    assert reset_result['game_reset']
    assert reset_result['previous_game_stats']['turns_played'] == old_turn

    # Check state is clean
    assert state.statistics.current_turn == 0
    assert state.federation.morale == 0.5
    assert len(state.action_history) == 0
    assert state.game_phase == GamePhase.GENESIS

    print("  [PASS] Game reset to initial state\n")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("THE FEDERATION GAME STATE MANAGER - TEST SUITE")
    print("="*60 + "\n")

    test_game_initialization()
    test_turn_advancement()
    test_action_recording()
    test_game_summary()
    test_statistics()
    test_victory_condition()
    test_defeat_condition()
    test_save_and_load()
    test_validation()
    test_reset_game()

    print("="*60)
    print("ALL TESTS PASSED [PASS]")
    print("="*60 + "\n")
