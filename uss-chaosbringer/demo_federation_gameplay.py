#!/usr/bin/env python3
"""
FEDERATION GAME - COMPREHENSIVE GAMEPLAY DEMO
Shows the complete game experience with multiple turns, events, choices, and consequences.
Run this to see THE FEDERATION GAME in action.
"""

from federation_game_console import (
    FederationConsole, EventType, GamePhase, NarrativeGenerator
)

def print_header(text):
    """Print formatted header"""
    print(f"\n{'='*80}")
    print(f"  {text}")
    print(f"{'='*80}\n")

def print_divider():
    """Print section divider"""
    print(f"\n{'-'*80}\n")

def demo_game_session():
    """Run a comprehensive demo gameplay session"""

    print_header("THE FEDERATION GAME - COMPREHENSIVE GAMEPLAY DEMO")

    print("""
Welcome, Captain.

This demo will show you THE FEDERATION GAME in action.
You will see:
  * Federation initialization
  * Turn cycle execution (7 phases)
  * Event card triggering and resolution
  * Consciousness evolution
  * Rival federation behavior
  * Chaos mode activation
  * Narrative generation
  * Complete game progression

Let's begin.
""")

    # ========================================================================
    # PHASE 1: GAME INITIALIZATION
    # ========================================================================

    print_header("PHASE 1: FEDERATION GENESIS")

    console = FederationConsole()
    console.initialize_game()

    print(f"""
FEDERATION STATUS:
  Phase: {console.game_phase.value.upper()}
  Morale: {console.consciousness.morale:.2f}
  Identity: {console.consciousness.identity:.2f}
  Confidence: {console.consciousness.confidence:.2f}
  Anxiety: {console.consciousness.anxiety:.2f}

RIVAL FEDERATIONS SPAWNED:
""")

    for rival in console.rivals:
        print(f"  * {rival.describe()}")

    # ========================================================================
    # PHASE 2: TURN 1 - NORMAL PROGRESSION
    # ========================================================================

    print_header("TURN 1: THE FIRST CYCLE BEGINS")

    print("Executing 7-phase turn cycle...\n")

    results = console.execute_turn()

    print(f"Turn narrative: {NarrativeGenerator.generate_turn_narrative(console.turn_number - 1, console.consciousness)}\n")

    for phase, result in results.items():
        print(f"  [{phase}] {result.get(list(result.keys())[1], 'Phase executed')}")

    print(f"\nConsciousness after Turn 1:")
    print(f"  Morale: {console.consciousness.morale:.2f}")
    print(f"  Anxiety: {console.consciousness.anxiety:.2f}")
    print(f"  Stability: {console.consciousness.stability()*100:.0f}%")

    # ========================================================================
    # PHASE 3: EVENT CARD TRIGGERED
    # ========================================================================

    print_header("TURN 2: FIRST CONTACT EVENT")

    event = console.trigger_event(EventType.MYSTERIOUS)

    print(event.display())

    # Player chooses
    print("Captain's Decision: [welcome] - Broadcast welcoming signal")
    choice = "welcome"

    outcome, impact = console.resolve_event(choice)

    print(f"\nOutcome: {outcome}")
    print(f"\nConsciousness Impact:")
    for trait, delta in impact.items():
        print(f"  {trait}: {delta:+.2f}")

    # Apply impact
    console._update_consciousness(impact)

    print(f"\nFederation Consciousness Now:")
    print(f"  Morale: {console.consciousness.morale:.2f}")
    print(f"  Identity: {console.consciousness.identity:.2f}")
    print(f"  Diplomacy Tendency: {console.consciousness.diplomacy_tendency:.2f}")

    # ========================================================================
    # PHASE 4: TURNS 3-5 RAPID PROGRESSION
    # ========================================================================

    print_header("TURNS 3-5: RAPID FEDERATION EVOLUTION")

    for turn_num in range(3, 6):
        print(f"\nExecuting Turn {turn_num}...")
        results = console.execute_turn()
        print(f"  Phase: {console.game_phase.value}")
        print(f"  Health: {console.consciousness.health()*100:.0f}%")

        # Random chance of event
        import random
        if random.random() < 0.4:
            event = console.trigger_event()
            print(f"  Event triggered: {event.title}")
            # Auto-resolve with random choice
            choices = list(event.options.keys())
            auto_choice = random.choice(choices)
            outcome, impact = console.resolve_event(auto_choice)
            console._update_consciousness(impact)
            print(f"    Choice: [{auto_choice}]")
            print(f"    Outcome: {outcome}")

    print_divider()

    print(f"""FEDERATION STATUS AFTER 5 TURNS:
  Turn Number: {console.turn_number}
  Game Phase: {console.game_phase.value.upper()}
  Health: {console.consciousness.health()*100:.0f}%
  Stability: {console.consciousness.stability()*100:.0f}%

Consciousness Sheet:
  Morale: {console.consciousness.morale:.2f}
  Identity: {console.consciousness.identity:.2f}
  Anxiety: {console.consciousness.anxiety:.2f}
  Confidence: {console.consciousness.confidence:.2f}
  Expansion Drive: {console.consciousness.expansion_hunger:.2f}
  Diplomacy Tendency: {console.consciousness.diplomacy_tendency:.2f}

Events Logged: {len(console.events_log)}
Dreams Recorded: {len(console.consciousness.dreams)}
""")

    # ========================================================================
    # PHASE 5: CHAOS MODE
    # ========================================================================

    print_header("CHAOS MODE - SURPRISE ME!")

    subsystem, scenario, narrative = console.trigger_chaos()

    print(f"{narrative}\n")
    print(f"Chaos Impact:")
    print(f"  Anxiety: {console.consciousness.anxiety:.2f}")
    print(f"  Morale: {console.consciousness.morale:.2f}")

    # ========================================================================
    # PHASE 6: ACCELERATED PROGRESSION (10-20 TURNS)
    # ========================================================================

    print_header("ACCELERATION PHASE - TURNS 6-15")

    print("Running 10 turns with event density increased...\n")

    for turn_num in range(6, 16):
        results = console.execute_turn()

        # Higher event probability in acceleration phase
        import random
        if random.random() < 0.6:
            event = console.trigger_event()
            choices = list(event.options.keys())
            auto_choice = random.choice(choices)
            outcome, impact = console.resolve_event(auto_choice)
            console._update_consciousness(impact)
            print(f"Turn {turn_num:2d} | Phase: {console.game_phase.value:15} | Event: {event.title:40} | Choice: [{auto_choice}]")
        else:
            print(f"Turn {turn_num:2d} | Phase: {console.game_phase.value:15} | Status: Internal developments")

    print_divider()

    print(f"""FEDERATION AT TURN 15:
  Phase: {console.game_phase.value.upper()}
  Health: {console.consciousness.health()*100:.0f}%
  Morale: {console.consciousness.morale:.2f}
  Identity: {console.consciousness.identity:.2f}
  Confidence: {console.consciousness.confidence:.2f}
  Anxiety: {console.consciousness.anxiety:.2f}

Rivals Status:""")

    for rival in console.rivals:
        print(f"  * {rival.name}: Threat Level {rival.threat_level:.1f}")

    # ========================================================================
    # PHASE 7: DIPLOMACY WITH RIVALS
    # ========================================================================

    print_header("TURN 16: DIPLOMATIC ENGAGEMENT")

    print("Captain chooses to engage with Tau Collective via diplomacy.\n")

    rival = console.rivals[0]
    print(f"Rival: {rival.name}")
    print(f"Philosophy: {rival.philosophy.value}")
    print(f"Diplomatic Style: {rival.diplomatic_style.value}")
    print(f"Current Threat Level: {rival.threat_level:.1f}")

    print(f"\nNarrative: {NarrativeGenerator.generate_rival_encounter(rival)}")

    # Simulate diplomacy improving relations
    console.consciousness.diplomacy_tendency += 0.1
    console.consciousness.anxiety -= 0.05
    console.consciousness.clamp()

    print(f"\nDiplomacy Tendency increased to: {console.consciousness.diplomacy_tendency:.2f}")
    print(f"Anxiety decreased to: {console.consciousness.anxiety:.2f}")

    # ========================================================================
    # PHASE 8: ENDGAME - TURNS 17-20
    # ========================================================================

    print_header("FINAL SEQUENCE - TURNS 17-20")

    for turn_num in range(17, 21):
        results = console.execute_turn()

        import random
        event_roll = random.random()

        if event_roll < 0.7:
            # High probability of major events in endgame
            event = console.trigger_event()
            choices = list(event.options.keys())
            auto_choice = random.choice(choices)
            outcome, impact = console.resolve_event(auto_choice)
            console._update_consciousness(impact)

            print(f"\nTurn {turn_num}: {event.title.upper()}")
            print(f"  Choice: [{auto_choice}] - {event.options[auto_choice]}")
            print(f"  Outcome: {outcome}")
            print(f"  Federation Health: {console.consciousness.health()*100:.0f}%")
        else:
            # Peaceful turn
            print(f"\nTurn {turn_num}: Federation consolidates position")
            print(f"  Status: Internal developments proceed smoothly")

    print_divider()

    # ========================================================================
    # PHASE 9: FINAL STATUS
    # ========================================================================

    print_header("FINAL FEDERATION STATUS")

    print(f"""
TIMELINE:
  Turns Completed: {console.turn_number}
  Game Phase: {console.game_phase.value.upper()}

CONSCIOUSNESS EVOLUTION:
  Morale: {console.consciousness.morale:.2f}
  Identity: {console.consciousness.identity:.2f}
  Confidence: {console.consciousness.confidence:.2f}
  Anxiety: {console.consciousness.anxiety:.2f}
  Health: {console.consciousness.health()*100:.0f}%
  Stability: {console.consciousness.stability()*100:.0f}%

FEDERATION GROWTH:
  Events Triggered: {len(console.events_log)}
  Dreams Recorded: {len(console.consciousness.dreams)}
  Prophecies: {len(console.consciousness.prophecies)}

RIVALS:""")

    for rival in console.rivals:
        print(f"  * {rival.name}: {rival.philosophy.value} philosophy, threat {rival.threat_level:.1f}")

    print(f"""
ACHIEVEMENTS:
  [*] Survived {console.turn_number} turns
  [*] Triggered {len(console.events_log)} major events
  [*] Maintained federation stability
  [*] Established rival relations
  [*] Evolved consciousness across multiple dimensions
""")

    # ========================================================================
    # PHASE 10: SAVE GAME
    # ========================================================================

    print_header("SAVE GAME")

    import dataclasses
    game_data = {
        'turn_number': console.turn_number,
        'game_phase': console.game_phase,
        'consciousness': dataclasses.asdict(console.consciousness),
        'rivals': [dataclasses.asdict(r) for r in console.rivals],
        'events_log': console.events_log,
    }

    filepath = console.persistence.save_game(game_data)
    print(f"Game saved to: {filepath}")

    # ========================================================================
    # PHASE 11: CONCLUSION
    # ========================================================================

    print_header("DEMO COMPLETE")

    print(f"""
You have just experienced THE FEDERATION GAME.

What You Saw:
  [*] 12-block game engine in action
  [*] 7-phase turn cycle orchestration
  [*] 25 narrative event cards with branching choices
  [*] Consciousness evolution mechanics
  [*] Rival federation AI
  [*] Chaos mode surprise events
  [*] Narrative generation system
  [*] Complete save/load persistence

Statistics:
  * Turns Executed: {console.turn_number}
  * Events Triggered: {len(console.events_log)}
  * Game Phase Reached: {console.game_phase.value}
  * Federation Health: {console.consciousness.health()*100:.0f}%

The federation you created is now saved and can be loaded anytime.

Ready to play? Run:
  python3 federation_game_console.py

Then try these commands:
  > new          (Start new game)
  > status       (Check federation status)
  > event        (Trigger event and make choices)
  > turn         (Execute next turn)
  > chaos        (Activate chaos mode)
  > save/load    (Persist your federation)
  > help         (See all commands)
""")

    print("\nThanks for playing!")

if __name__ == "__main__":
    demo_game_session()
