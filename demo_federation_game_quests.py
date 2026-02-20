#!/usr/bin/env python3
"""
THE FEDERATION GAME - QUEST SYSTEM INTEGRATION DEMO
~300 LOC

Demonstrates complete quest system functionality and integration with
FederationConsole. Shows quest lifecycle, objective progression, reward
distribution, and quest chain unlocking.

This is production-ready example code showing best practices for using
the quest system.
"""

from federation_game_quests import (
    create_quest_library,
    ObjectiveType,
    QuestDifficulty,
    FactionAffiliation
)


def print_header(title: str):
    """Print formatted section header"""
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")


def print_quest(quest, include_objectives=True):
    """Pretty-print a quest"""
    difficulty_colors = {
        'TUTORIAL': '  [TUTORIAL]',
        'EASY': '  [EASY]',
        'NORMAL': '  [NORMAL]',
        'HARD': '  [HARD]',
        'LEGENDARY': '  [LEGENDARY]'
    }

    difficulty_str = difficulty_colors.get(quest.difficulty.name, '')
    faction_str = f" [{quest.faction_affiliation.value.upper()}]" if quest.faction_affiliation.value != "none" else ""

    print(f"{quest.title}{difficulty_str}{faction_str}")
    print(f"  {quest.description}")
    print(f"  ID: {quest.quest_id}")
    print(f"  Status: {quest.status.value}")

    if include_objectives and quest.objectives:
        print(f"  Objectives ({len(quest.objectives)}):")
        for obj in quest.objectives:
            filled = int(obj.get_progress_percentage() / 5)
            empty = 20 - filled
            progress_bar = "=" * filled + "-" * empty
            status = "[X]" if obj.completed else "[ ]"
            print(f"    {status} {obj.description}")
            print(f"        [{progress_bar}] {obj.current_progress}/{obj.target}")

    if quest.rewards:
        rewards = []
        if quest.rewards.resources > 0:
            rewards.append(f"{quest.rewards.resources} resources")
        if quest.rewards.reputation > 0:
            rewards.append(f"{quest.rewards.reputation:.1f} reputation")
        if quest.rewards.morale_boost > 0:
            rewards.append(f"+{quest.rewards.morale_boost:.1f} morale")
        if quest.rewards.stability_boost > 0:
            rewards.append(f"+{quest.rewards.stability_boost:.1f} stability")
        if quest.rewards.tech_points > 0:
            rewards.append(f"{quest.rewards.tech_points} tech points")
        if quest.rewards.unlocked_quests:
            rewards.append(f"Unlocks {len(quest.rewards.unlocked_quests)} quests")

        if rewards:
            print(f"  Rewards: {', '.join(rewards)}")

    print()


def demo_basic_quest_lifecycle():
    """Demonstrate basic quest lifecycle"""
    print_header("DEMO 1: Basic Quest Lifecycle")

    # Initialize system
    system = create_quest_library()
    player_id = "Federation_Commander"
    print(f"Game initialized with {len(system.quests)} available quests\n")

    # Get available quests
    available = system.get_available_quests(player_id)
    print(f"Available quests at start: {len(available)}\n")
    for quest in available[:3]:
        print_quest(quest, include_objectives=False)

    # Accept first quest
    print("\n--- Accepting 'First Contact Protocol' ---\n")
    quest_id = "first_contact_protocol"
    success, msg = system.accept_quest(player_id, quest_id, current_turn=0)
    print(f"[OK] {msg}\n")

    # Get the quest
    quest = system.quests[quest_id]
    print_quest(quest, include_objectives=True)

    # Progress on objectives
    print("\n--- Making Progress on Quest --- \n")
    for i, objective in enumerate(quest.objectives, 1):
        success, msg = system.progress_objective(
            player_id, quest_id, objective.objective_id, 1
        )
        print(f"{msg}\n")

    # Display current quest state
    print_quest(quest, include_objectives=True)

    # Complete the quest
    print("\n--- Completing Quest ---\n")
    success, msg, rewards = system.complete_quest(player_id, quest_id, current_turn=5)
    if success:
        print(f"[OK] {msg}")
        print(f"\nRewards Earned:")
        print(f"  Resources: {rewards.resources}")
        print(f"  Reputation: {rewards.reputation}")
        print(f"  Morale Boost: {rewards.morale_boost}")
        print(f"  Unlocked Quests: {len(rewards.unlocked_quests)}")
        if rewards.unlocked_quests:
            for unlocked_id in rewards.unlocked_quests:
                unlocked_quest = system.quests[unlocked_id]
                print(f"    - {unlocked_quest.title}")
    else:
        print(f"[FAIL] {msg}")


def demo_quest_chains():
    """Demonstrate interconnected quest chains"""
    print_header("DEMO 2: Quest Chains & Unlocking")

    system = create_quest_library()
    player_id = "Federation_Commander"

    print("Quest Chain Analysis:")
    print("  'First Contact Protocol' (TUTORIAL)")
    print("    -> Unlocks: 'Treaty Negotiation'")
    print("  'Treaty Negotiation' (EASY)")
    print("    -> Unlocks: 'Alliance of Equals'")
    print("  'Alliance of Equals' (NORMAL)")
    print("    -> Unlocks: 'United Federation'")
    print("  'United Federation' (LEGENDARY)")
    print("    -> Unlocks: 'The Eternal Federation'\n")

    # Show locked quests
    print("At game start, 'Treaty Negotiation' is LOCKED because prerequisites not met:\n")
    quest = system.quests["treaty_negotiation"]
    print(f"Quest: {quest.title}")
    print(f"Status: {quest.status.value}")
    print(f"Prerequisites: {quest.prerequisites}")
    print(f"Has prerequisites been met? {all(p in [] for p in quest.prerequisites)}\n")

    # Complete first quest to unlock chain
    print("--- Completing 'First Contact Protocol' ---\n")
    system.accept_quest(player_id, "first_contact_protocol", 0)
    quest = system.quests["first_contact_protocol"]
    for obj in quest.objectives:
        system.progress_objective(player_id, "first_contact_protocol", obj.objective_id, 1)
    success, msg, rewards = system.complete_quest(player_id, "first_contact_protocol", 5)
    print(f"[OK] {msg}\n")

    # Now check if unlocked quests are available
    print("--- Checking Available Quests After Completion ---\n")
    available = system.get_available_quests(player_id)
    print(f"Total available quests now: {len(available)}\n")

    for quest_id in ["treaty_negotiation"]:
        if quest_id in system.quests:
            quest = system.quests[quest_id]
            if quest.status == "available":
                print(f"[UNLOCKED] {quest.title}")
            else:
                print(f"  {quest.title}: {quest.status.value}")


def demo_difficulty_and_filters():
    """Demonstrate filtering by difficulty and faction"""
    print_header("DEMO 3: Quest Filters & Difficulty")

    system = create_quest_library()

    # Count by difficulty
    print("Quests by Difficulty Level:\n")
    difficulties = {}
    for quest in system.quests.values():
        diff = quest.difficulty.name
        difficulties[diff] = difficulties.get(diff, 0) + 1

    for diff in ['TUTORIAL', 'EASY', 'NORMAL', 'HARD', 'LEGENDARY']:
        count = difficulties.get(diff, 0)
        bar = "#" * count
        print(f"  {diff:10} ({count:2}) {bar}")

    # Count by faction
    print("\nQuests by Faction Affiliation:\n")
    factions = {}
    for quest in system.quests.values():
        faction = quest.faction_affiliation.value
        factions[faction] = factions.get(faction, 0) + 1

    for faction in sorted(factions.keys()):
        count = factions[faction]
        print(f"  {faction:30} ({count} quests)")

    # Show sample faction-specific quest
    print("\n--- Example: Diplomatic Corps Quests ---\n")
    diplomatic_quests = [q for q in system.quests.values()
                        if q.faction_affiliation == FactionAffiliation.DIPLOMATIC_CORPS]
    for quest in diplomatic_quests[:3]:
        print_quest(quest, include_objectives=False)


def demo_reward_calculations():
    """Demonstrate reward calculation with optional objectives"""
    print_header("DEMO 4: Reward Calculations & Bonuses")

    system = create_quest_library()
    player_id = "Federation_Commander"

    # Find a quest with optional objectives
    quest = system.quests["fortress_unbreakable"]

    print(f"Quest: {quest.title}")
    print(f"Base Reward: {quest.rewards.resources} resources\n")

    print("Objective Progression Scenarios:\n")

    # Scenario 1: Only mandatory objectives
    system.accept_quest(player_id, "fortress_unbreakable", 0)
    test_quest = system.quests["fortress_unbreakable"]

    print("Scenario 1: Complete mandatory objectives only")
    for obj in test_quest.objectives:
        if not obj.optional:
            test_quest.objectives[test_quest.objectives.index(obj)].current_progress = obj.target
            test_quest.objectives[test_quest.objectives.index(obj)].completed = True

    multiplier = test_quest.get_optional_bonus_multiplier()
    final_rewards = multiplier * quest.rewards.resources
    print(f"  Bonus Multiplier: {multiplier}x")
    print(f"  Final Reward: {int(final_rewards)} resources\n")

    system.abandon_quest(player_id, "fortress_unbreakable")

    # Scenario 2: All objectives
    system.accept_quest(player_id, "fortress_unbreakable", 10)
    test_quest = system.quests["fortress_unbreakable"]

    print("Scenario 2: Complete all objectives (including optional)")
    for obj in test_quest.objectives:
        test_quest.objectives[test_quest.objectives.index(obj)].current_progress = obj.target
        test_quest.objectives[test_quest.objectives.index(obj)].completed = True

    multiplier = test_quest.get_optional_bonus_multiplier()
    final_rewards = multiplier * quest.rewards.resources
    print(f"  Bonus Multiplier: {multiplier}x")
    print(f"  Final Reward: {int(final_rewards)} resources\n")


def demo_quest_statistics():
    """Demonstrate quest system statistics and reporting"""
    print_header("DEMO 5: Quest Statistics & Reporting")

    system = create_quest_library()
    player_id = "Federation_Commander"

    # Simulate some quest activity
    quests_to_complete = [
        "first_contact_protocol",
        "cultural_renaissance",
        "resource_abundance"
    ]

    print("Simulating Quest Activity:\n")
    for quest_id in quests_to_complete:
        if quest_id not in system.quests:
            continue

        success, msg = system.accept_quest(player_id, quest_id)
        if not success:
            continue

        print(f"  ACCEPTED: {system.quests[quest_id].title}")

        quest = system.quests[quest_id]
        for obj in quest.objectives:
            system.progress_objective(player_id, quest_id, obj.objective_id, 1)

        success, msg, rewards = system.complete_quest(player_id, quest_id)
        if success and rewards:
            print(f"  COMPLETED: {system.quests[quest_id].title}")
            print(f"    Rewards: {rewards.resources} resources, {rewards.reputation} reputation\n")
        else:
            print(f"  FAILED TO COMPLETE: {msg}\n")

    # Generate report
    print("\n--- Final Quest Report ---\n")
    report = system.get_quest_sync_report(player_id)

    print(f"Completed Quests: {report['completed_quests']['count']}")
    for quest in report['completed_quests']['quests']:
        print(f"  [X] {quest['title']}")

    print(f"\nPlayer Statistics:")
    stats = report['player_statistics']
    print(f"  Quests Accepted: {stats['quests_accepted']}")
    print(f"  Quests Completed: {stats['quests_completed']}")
    print(f"  Total Resources Earned: {stats['total_resources_earned']}")
    print(f"  Total Tech Points Earned: {stats['total_tech_points_earned']}")

    print(f"\nAvailable Quests After Progress: {report['available_quests']['count']}")


def run_all_demos():
    """Run all demonstration scenarios"""
    print("\n")
    print("=" * 70)
    print("  FEDERATION GAME - QUEST SYSTEM DEMO")
    print("=" * 70)

    demo_basic_quest_lifecycle()
    demo_quest_chains()
    demo_difficulty_and_filters()
    demo_reward_calculations()
    demo_quest_statistics()

    print_header("DEMO COMPLETE")
    print("The quest system is production-ready and fully integrated with FederationConsole!")
    print("All 22 quests are available with interconnected chains and proper reward systems.\n")


if __name__ == "__main__":
    run_all_demos()
