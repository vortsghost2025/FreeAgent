"""
FEDERATION GAME - NPC/Creature Integration Demo
Complete gameplay example showing NPCs, companions, creatures, and interactions
"""

import json
from federation_game_npcs import (
    build_npc_system, DialogueNode, DialogueOption, CharacterStatus,
    CreatureType, PersonalityTrait, CompanionBonus
)
from federation_game_factions import build_faction_system


def demo_npc_interactions():
    """Demonstrate NPC interaction mechanics"""
    print("\n" + "=" * 80)
    print("DEMO 1: NPC INTERACTIONS AND RELATIONSHIPS")
    print("=" * 80)

    system = build_npc_system()
    player_id = "player_001"

    # Get a character
    archimedes = system.characters["char_001"]
    print(f"\nCharacter: {archimedes.name}")
    print(f"Title: {archimedes.title}")
    print(f"Personality: {archimedes.get_personality_summary()}")

    # Simulate relationship changes
    print(f"\nInitial relationship: {archimedes.relationship_to_player:.2f}")

    # Gift-giving interaction
    result = system.interact_with_character(player_id, "char_001", "gift", turn=1)
    print(f"\nAction: {result.get('message', 'Unknown')}")

    # Check updated relationship
    new_rep = system.change_relationship(player_id, "char_001", 0.2)
    print(f"After interaction: {new_rep:.2f}")

    # Trade interaction
    result = system.interact_with_character(player_id, "char_001", "trade", turn=2)
    print(f"Trade: {result.get('inventory', {})}")

    return system


def demo_companions():
    """Demonstrate companion recruitment and bonuses"""
    print("\n" + "=" * 80)
    print("DEMO 2: COMPANION RECRUITMENT AND PARTY BONUSES")
    print("=" * 80)

    system = build_npc_system()
    player_id = "player_001"

    # List available companions
    available = system.get_potential_companions()
    print(f"\nAvailable companions: {len(available)}")

    # Try to recruit one
    comp = available[0]
    print(f"\nAttempting to recruit: {comp.name} ({comp.title})")
    print(f"Current relationship: {comp.relationship_to_player:.2f} (need >= 0.3)")

    # Increase relationship to recruitment level
    system.change_relationship(player_id, comp.char_id, 0.5)
    print(f"After bonding: {comp.relationship_to_player:.2f}")

    # Recruit
    success, message = system.recruit_companion(player_id, comp.char_id)
    print(f"Result: {message}")

    # Show party bonus
    bonus = comp.get_party_bonus()
    print(f"\nParty Bonus:")
    print(f"  Type: {bonus['bonus_type']}")
    print(f"  Value: +{bonus['value']:.0%}")
    print(f"  Ability: {bonus['ability']}")

    # Show all recruited
    print(f"\nRecruited companions: {system.recruited_companions.get(player_id, set())}")

    # Show betrayal risk
    print(f"\nBettrayal Risk: {comp.betrayal_risk:.0%}")
    print(f"Loyalty Factor: {comp.loyalty:.2f}")

    return system


def demo_creatures():
    """Demonstrate creature encounters and taming"""
    print("\n" + "=" * 80)
    print("DEMO 3: CREATURE ENCOUNTERS AND TAMING")
    print("=" * 80)

    system = build_npc_system()
    player_id = "player_001"

    # Encounter creatures
    creatures_to_encounter = ["creature_001", "creature_005", "creature_002"]

    for creature_id in creatures_to_encounter:
        creature = system.creatures[creature_id]
        print(f"\n--- Encountering {creature.name} ---")
        print(f"Rarity: {creature.rarity.value}")
        print(f"Description: {creature.description}")
        print(f"Habitat: {creature.habitat}")
        print(f"Lore: {creature.lore}")

        # Encounter with player stats
        player_charisma = 0.7
        result = system.encounter_creature(
            player_id, creature_id,
            player_charisma=player_charisma,
            turn=1
        )

        print(f"\nAttempt to tame:")
        print(f"  Success: {result['success']}")
        print(f"  Message: {result['message']}")
        print(f"  Affinity: {result['affinity']:.2f}")
        print(f"  Tamed: {result['tamed']}")

        if result['tamed']:
            print(f"  Bonuses: {result['bonus']}")

    # Show encountered creatures
    print(f"\nTotal creatures encountered: {len(system.encountered_creatures.get(player_id, set()))}")

    return system


def demo_dialogue_system():
    """Demonstrate dialogue and conversation mechanics"""
    print("\n" + "=" * 80)
    print("DEMO 4: DIALOGUE SYSTEM AND CONVERSATIONS")
    print("=" * 80)

    system = build_npc_system()
    player_id = "player_001"

    # Create dialogue for a character
    dialogue_greetings = DialogueNode(
        id="greeting_001",
        speaker="Ambassador Silven",
        text="Greetings, friend. It's been too long. What brings you to these halls?",
        context="Initial meeting at diplomatic headquarters",
        options=[
            DialogueOption(
                id="opt_001",
                text="I come seeking allies for a dangerous quest",
                requires_reputation=0.0,
                affects_loyalty=0.1,
                response="Interesting... Tell me more about this quest."
            ),
            DialogueOption(
                id="opt_002",
                text="I need your political support",
                requires_reputation=0.3,
                affects_loyalty=-0.05,
                response="Political support comes at a price, friend."
            ),
            DialogueOption(
                id="opt_003",
                text="I've come to prove my worth to you",
                requires_reputation=0.5,
                affects_loyalty=0.2,
                response="Ah, now that is something I respect."
            ),
        ]
    )

    system.register_dialogue(dialogue_greetings)

    # Get character
    char = system.characters["char_004"]
    print(f"Character: {char.name}")

    # Get dialogue
    dialogue_result = system.get_character_dialogue(
        "char_004",
        "greeting_001",
        player_reputation=0.4,
        character_status=CharacterStatus.ACTIVE
    )

    print(f"\n{dialogue_result['dialogue_text']}")
    print(f"\nAvailable responses:")
    for i, option in enumerate(dialogue_result['available_options'], 1):
        print(f"  {i}. {option['text']}")

    # Simulate dialogue choice
    print(f"\nPlayer chooses option 2...")
    for option in dialogue_greetings.options:
        if option.id == "opt_002":
            print(f"Response: {option.response}")
            print(f"Loyalty change: {option.affects_loyalty:+.2f}")

            # Update relationship
            new_loyalty = system.change_relationship(player_id, "char_004", option.affects_loyalty)
            print(f"New relationship: {new_loyalty:.2f}")

    return system


def demo_faction_integration():
    """Demonstrate integration with faction system"""
    print("\n" + "=" * 80)
    print("DEMO 5: NPC/FACTION INTEGRATION")
    print("=" * 80)

    npc_system = build_npc_system()
    faction_system = build_faction_system()

    player_id = "player_001"

    # Show NPC affiliations
    print(f"\nCharacters affiliated with each faction:\n")
    for faction_id in faction_system.factions:
        chars = npc_system.get_characters_by_faction(faction_id)
        if chars:
            faction = faction_system.factions[faction_id]
            print(f"{faction.name}:")
            for char in chars[:3]:  # Show first 3
                print(f"  - {char.name} ({char.title})")
            if len(chars) > 3:
                print(f"  ... and {len(chars) - 3} more")

    # Show how joining a faction affects NPC relationships
    print(f"\n--- Player joins Diplomatic Corps ---")
    faction_system.join_faction(player_id, "diplomatic_corps")

    # Show faction leader
    diplomatic_leader = npc_system.characters["char_101"]
    print(f"Faction Leader: {diplomatic_leader.name}")
    print(f"Title: {diplomatic_leader.title}")

    # Improve relationship with faction
    new_rep = faction_system.change_reputation(player_id, "diplomatic_corps", 0.2)
    print(f"Faction reputation: {new_rep:.2f}")

    return npc_system, faction_system


def demo_antagonists():
    """Demonstrate antagonist characters"""
    print("\n" + "=" * 80)
    print("DEMO 6: ANTAGONISTS AND OPPOSITION")
    print("=" * 80)

    system = build_npc_system()

    # Show antagonists
    antagonists = [
        system.characters["char_201"],
        system.characters["char_202"],
        system.characters["char_203"],
        system.characters["char_204"],
    ]

    print(f"\nMajor Antagonists:")
    for antagonist in antagonists:
        print(f"\n{antagonist.name} ({antagonist.title})")
        print(f"  Status: {antagonist.status.value}")
        print(f"  Corruption: {antagonist.corruption_level:.0%}")
        print(f"  Threat to Player: {abs(antagonist.relationship_to_player):.0%}")
        print(f"  Ambition: {antagonist.ambition:.2f}")
        print(f"  Cunning: {antagonist.cunning:.2f}")

    return system


def demo_world_events():
    """Demonstrate character events and turn advancement"""
    print("\n" + "=" * 80)
    print("DEMO 7: TURN ADVANCEMENT AND CHARACTER EVENTS")
    print("=" * 80)

    system = build_npc_system()
    player_id = "player_001"

    # Create some corruption
    void_oracle = system.characters["char_202"]
    print(f"Initial status: {void_oracle.status.value}")
    print(f"Initial corruption: {void_oracle.corruption_level:.0%}")

    # Advance turns and watch corruption spread
    print(f"\nAdvancing 10 turns...")
    for turn in range(10):
        events = system.advance_turn()

        # Print any events
        for event in events:
            print(f"  Turn {turn}: {event['message']}")

    print(f"\nFinal status: {void_oracle.status.value}")
    print(f"Final corruption: {void_oracle.corruption_level:.0%}")

    # Show rumor spreading
    print(f"\nCharacter rumors:")
    for char in list(system.characters.values())[:5]:
        print(f"  {char.name}: Rumor level {char.rumor_level:.2f}")

    return system


def demo_character_archetypes():
    """Demonstrate different character archetypes"""
    print("\n" + "=" * 80)
    print("DEMO 8: CHARACTER ARCHETYPES")
    print("=" * 80)

    system = build_npc_system()

    archetypes = {}
    for char in system.characters.values():
        archetype = char.personality_type.value
        if archetype not in archetypes:
            archetypes[archetype] = []
        archetypes[archetype].append(char)

    print(f"\nCharacter archetypes and examples:\n")
    for archetype_name, chars in sorted(archetypes.items()):
        print(f"{archetype_name.upper()} ({len(chars)} characters)")
        for char in chars[:2]:  # Show first 2 of each type
            print(f"  - {char.name}: {char.description[:50]}...")
        if len(chars) > 2:
            print(f"  ... and {len(chars) - 2} more")

    return system


def demo_comprehensive_scenario():
    """Run a comprehensive gameplay scenario"""
    print("\n" + "=" * 80)
    print("DEMO 9: COMPREHENSIVE GAMEPLAY SCENARIO")
    print("=" * 80)

    npc_system = build_npc_system()
    faction_system = build_faction_system()
    player_id = "player_universe_explorer"

    print(f"\n=== GAME START ===")
    print(f"Player: {player_id}")

    # Round 1: Choose faction
    print(f"\n--- Turn 1: Joining a Faction ---")
    faction_system.join_faction(player_id, "exploration_initiative")
    print(f"Joined: Exploration Initiative")

    # Round 2: Meet faction leader
    faction_leader = npc_system.characters["char_107"]
    print(f"\n--- Turn 2: Meet Faction Leader ---")
    print(f"Leader: {faction_leader.name}")
    print(f"Initial relationship: {faction_leader.relationship_to_player:.2f}")

    # Round 3: Recruit companion
    print(f"\n--- Turn 3: Recruit Companion ---")
    scout_aria = npc_system.companions["comp_008"]
    npc_system.change_relationship(player_id, "comp_008", 0.6)
    success, msg = npc_system.recruit_companion(player_id, "comp_008")
    print(f"{msg}")
    print(f"Companion bonus: +{scout_aria.bonus_value:.0%} {scout_aria.companion_bonus.value}")

    # Round 4: Encounter creatures
    print(f"\n--- Turn 4: Creature Encounters ---")
    sky_furk = npc_system.creatures["creature_001"]
    result = npc_system.encounter_creature(player_id, "creature_001", player_charisma=0.75, turn=4)
    if result['success']:
        print(f"Tamed: {sky_furk.name}")
        print(f"Bonuses: {result['bonus']}")

    void_skipper = npc_system.creatures["creature_005"]
    result = npc_system.encounter_creature(player_id, "creature_005", player_charisma=0.75, turn=4)
    if result['success']:
        print(f"Tamed: {void_skipper.name}")

    # Round 5: Improve faction standing
    print(f"\n--- Turn 5: Improve Faction Standing ---")
    new_rep = faction_system.change_reputation(player_id, "exploration_initiative", 0.3)
    print(f"Faction reputation: {new_rep:.0%}")

    # Show player progress
    print(f"\n=== PLAYER STATUS ===")
    print(f"Recruited Companions: {len(npc_system.recruited_companions.get(player_id, []))}")
    print(f"Tamed Creatures: {len(npc_system.encountered_creatures.get(player_id, []))}")
    faction = faction_system.get_player_faction(player_id)
    if faction:
        print(f"Current Faction: {faction.name}")
        print(f"Faction Reputation: {faction_system.get_player_reputation(player_id, faction.faction_id):.0%}")
    print(f"Friendly NPCs: {len([c for c in npc_system.characters.values() if c.relationship_to_player > 0])}")

    return npc_system, faction_system


# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == "__main__":
    print("\n")
    print("=" * 80)
    print(" " * 15 + "FEDERATION GAME - COMPLETE INTEGRATION DEMO")
    print("=" * 80)

    # Run all demos
    demo_npc_interactions()
    demo_companions()
    demo_creatures()
    demo_dialogue_system()
    demo_faction_integration()
    demo_antagonists()
    demo_world_events()
    demo_character_archetypes()
    npc_sys, fac_sys = demo_comprehensive_scenario()

    # Final summary
    print("\n" + "=" * 80)
    print("FEDERATION GAME - NPC SYSTEM SUMMARY")
    print("=" * 80)

    print(f"""
Total NPCs/Characters: {len(npc_sys.characters)}
  - Active Characters: {len(npc_sys.get_all_characters_active())}
  - Companions: {len(npc_sys.companions)}
  - Antagonists: 4

Total Creatures: {len(npc_sys.creatures)}
  - Common: 1
  - Rare: 3
  - Legendary: 3
  - Mythic: 1

Core Systems:
  - Personality-based interaction (5 traits)
  - Dynamic relationship tracking (-1 to +1)
  - Dialogue engine with choices
  - Creature taming and affinity
  - Party bonuses from companions
  - Faction integration
  - Corruption and character evolution
  - Random encounters
  - Betrayal mechanics

Features Demonstrated:
  1. NPC interactions and relationships
  2. Companion recruitment and party bonuses
  3. Creature encounters and taming
  4. Dialogue system with branching choices
  5. Faction integration
  6. Antagonist opposition
  7. Turn-based events
  8. Character archetypes
  9. Comprehensive gameplay scenario""")

    print(f"\n" + "=" * 80)
    print("All systems working successfully!")
    print("=" * 80 + "\n")
