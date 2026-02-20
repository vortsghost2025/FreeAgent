#!/usr/bin/env python3
"""
FEDERATION GAME TECHNOLOGY TREE - COMPREHENSIVE DEMO
Demonstrates all features of the technology tree and research system
"""

from federation_game_technology import (
    create_technology_tree, Technology, ResearchPhilosophy, Era,
    TechBonus
)
import json


def main():
    print("=" * 80)
    print("THE FEDERATION GAME - TECHNOLOGY TREE SYSTEM DEMO")
    print("=" * 80)

    # Initialize the technology tree
    tree = create_technology_tree()

    # Demo 1: View technology statistics
    print("\n[DEMO 1] TECHNOLOGY TREE OVERVIEW")
    print("-" * 80)
    tree_data = tree.get_research_tree()
    print(f"Total Techs: {tree_data['total_techs']}")
    print(f"\nTechs by Tier:")
    for tier, techs in tree_data['by_tier'].items():
        print(f"  {tier}: {len(techs)} technologies")

    print(f"\nTechs by Era:")
    for era, techs in tree_data['by_era'].items():
        print(f"  {era}: {len(techs)} technologies")

    print(f"\nTechs by Philosophy:")
    for philosophy, techs in tree_data['by_philosophy'].items():
        print(f"  {philosophy}: {len(techs)} technologies")

    # Demo 2: Show technology details for each research philosophy
    print("\n[DEMO 2] RESEARCH PHILOSOPHIES IN DETAIL")
    print("-" * 80)

    for philosophy in ResearchPhilosophy:
        techs = tree.get_tech_by_philosophy(philosophy)
        print(f"\n{philosophy.value.upper()} RESEARCH PATH ({len(techs)} techs)")
        print("-" * 40)
        tier_breakdown = {}
        for tech in techs:
            tier_breakdown.setdefault(tech.tier, []).append(tech)

        for tier in sorted(tier_breakdown.keys()):
            print(f"  Tier {tier}:")
            for tech in sorted(tier_breakdown[tier], key=lambda t: t.research_cost):
                unlocks = len(tech.unlocks_techs) + len(tech.unlocks_quests)
                print(f"    - {tech.name} ({tech.era.value}, {tech.research_cost} pts, unlocks {unlocks})")

    # Demo 3: Show technology dependency chains
    print("\n[DEMO 3] KEY TECHNOLOGY CHAINS & DEPENDENCIES")
    print("-" * 80)

    # Military chain
    print("\nMILITARY TECHNOLOGY CHAIN:")
    military_chain = ["basic_tools", "metallurgy", "knights_cavalry", "aircraft", "nuclear_energy"]
    for tech_id in military_chain:
        if tech_id in tree.technologies:
            tech = tree.technologies[tech_id]
            print(f"  {tech.name}")
            if tech.unlocks_techs:
                print(f"    Unlocks: {', '.join(tech.unlocks_techs[:3])}")

    # Scientific chain
    print("\nSCIENTIFIC TECHNOLOGY CHAIN:")
    scientific_chain = ["writing", "mathematics", "universities", "electricity", "computing"]
    for tech_id in scientific_chain:
        if tech_id in tree.technologies:
            tech = tree.technologies[tech_id]
            print(f"  {tech.name}")
            if tech.unlocks_techs:
                print(f"    Unlocks: {', '.join(tech.unlocks_techs[:3])}")

    # Cultural chain
    print("\nCULTURAL TECHNOLOGY CHAIN:")
    cultural_chain = ["simple_structures", "architecture", "fine_arts"]
    for tech_id in cultural_chain:
        if tech_id in tree.technologies:
            tech = tree.technologies[tech_id]
            print(f"  {tech.name}")
            if tech.unlocks_techs:
                print(f"    Unlocks: {', '.join(tech.unlocks_techs[:3])}")

    # Consciousness chain
    print("\nCONSCIOUSNESS TECHNOLOGY CHAIN:")
    consciousness_chain = ["philosophy", "ethics", "enlightenment", "consciousness_technology",
                          "reality_manipulation", "federation_ascension"]
    for tech_id in consciousness_chain:
        if tech_id in tree.technologies:
            tech = tree.technologies[tech_id]
            print(f"  {tech.name}")
            if tech.unlocks_techs:
                print(f"    Unlocks: {', '.join(tech.unlocks_techs[:2])}")

    # Demo 4: Demonstrate research in action
    print("\n[DEMO 4] RESEARCH IN ACTION - PLAYER PROGRESSION")
    print("-" * 80)

    player_id = "commander_alpha"

    # Start with foundational techs
    foundational_techs = [
        "agriculture", "basic_tools", "animal_husbandry",
        "simple_structures", "writing"
    ]

    print(f"\nPlayer: {player_id}")
    print("Research Path: BALANCED (All philosophies)")
    print("\nStarting foundational research:")

    for tech_id in foundational_techs:
        success, msg, project = tree.start_research(player_id, tech_id)
        print(f"  [OK] {msg}")

        # Advance the research significantly
        if project:
            for _ in range(3):
                success, msg, progress = tree.advance_research(player_id, project.project_id, 15)

            if project.is_complete():
                success, msg, _ = tree.complete_research(player_id, project.project_id)
                print(f"    >> {msg}")

    # Show available techs after foundational research
    available = tree.get_available_techs(player_id)
    print(f"\nAvailable technologies after foundational research: {len(available)}")
    print("Next tier options:")
    for tech in available[:8]:
        print(f"  - {tech.name} ({tech.era.value}, Tier {tech.tier}, {tech.research_cost} pts)")

    # Demo 5: Show research report
    print("\n[DEMO 5] DETAILED RESEARCH REPORT")
    print("-" * 80)

    report = tree.get_research_report(player_id)
    print(f"\nPlayer: {player_id}")
    print(f"Completed Technologies: {report['completed_technologies']['count']}")
    for tech in report['completed_technologies']['techs'][:5]:
        print(f"  [OK] {tech['name']} ({tech['era']} Era)")

    print(f"\nIn Progress: {report['in_progress']['count']} projects")
    for project in report['in_progress']['projects'][:3]:
        print(f"  [*] {tree.technologies[project['technology']].name}: "
              f"{project['progress_percentage']:.1f}%")

    print(f"\nAvailable for Research: {report['available_techs']['count']} technologies")
    print("Next research options:")
    for tech in report['available_techs']['techs'][:5]:
        print(f"  - {tech['name']} ({tech['cost']} research points)")

    print(f"\nPlayer Statistics:")
    for stat, value in report['player_statistics'].items():
        print(f"  {stat}: {value}")

    # Demo 6: Show breakthrough mechanics
    print("\n[DEMO 6] BREAKTHROUGH MECHANICS")
    print("-" * 80)

    breakthroughs_before = report['player_statistics'].get('breakthroughs', 0)
    print(f"Breakthroughs before aggressive research: {breakthroughs_before}")

    # Simulate aggressive research which increases breakthrough chances
    print("\nConducting intensive research with philosopher leadership...")
    test_player = "philosopher_council"
    success, msg, proj1 = tree.start_research(test_player, "philosophy")
    if proj1:
        for _ in range(5):
            tree.advance_research(test_player, proj1.project_id, 20)

    report2 = tree.get_research_report(test_player)
    breakthroughs_after = report2['player_statistics'].get('breakthroughs', 0)
    if breakthroughs_after > breakthroughs_before:
        print(f"Breakthroughs achieved: {breakthroughs_after}")

    # Demo 7: Show technology bonuses
    print("\n[DEMO 7] TECHNOLOGY BONUSES - GAMEPLAY IMPACTS")
    print("-" * 80)

    bonus_techs = ["metallurgy", "electricity", "artificial_intelligence",
                  "consciousness_technology", "space_travel"]

    for tech_id in bonus_techs:
        if tech_id in tree.technologies:
            tech = tree.technologies[tech_id]
            print(f"\n{tech.name.upper()}")
            print(f"  Cost: {tech.research_cost} research points")
            print(f"  Era: {tech.era.value} | Tier: {tech.tier}")
            if tech.bonuses:
                print("  Gameplay Bonuses:")
                for bonus in tech.bonuses:
                    bonus_str = f"{bonus.bonus_type}: {bonus.value}"
                    if bonus.is_percentage:
                        bonus_str += "%"
                    else:
                        bonus_str += f" ({bonus.applies_to})"
                    print(f"    [*] {bonus_str}")
            if tech.unlocks_techs:
                print(f"  Unlocks Techs: {', '.join(tech.unlocks_techs[:3])}")
            if tech.unlocks_quests:
                print(f"  Unlocks Quests: {len(tech.unlocks_quests)} new quests")
            if tech.unlocks_features:
                print(f"  Unlocks Features: {', '.join(tech.unlocks_features[:2])}")

    # Demo 8: Show ultimate technologies
    print("\n[DEMO 8] ULTIMATE TRANSCENDENT TECHNOLOGIES")
    print("-" * 80)

    transcendent_ids = [
        "dimensional_engineering",
        "reality_manipulation",
        "time_mastery",
        "federation_ascension"
    ]

    for tech_id in transcendent_ids:
        if tech_id in tree.technologies:
            tech = tree.technologies[tech_id]
            print(f"\n{tech.name}")
            print(f"  Description: {tech.description}")
            print(f"  Cost: {tech.research_cost} research points")
            print(f"  Prerequisites: {', '.join(tech.prerequisites)}")
            if tech.unlocks_features:
                print(f"  Unlocks: {', '.join(tech.unlocks_features)}")

    # Demo 9: Show research philosophies comparison
    print("\n[DEMO 9] RESEARCH PHILOSOPHY PROGRESSION COMPARISON")
    print("-" * 80)

    philosophies = {
        ResearchPhilosophy.MILITARY: "MILITARY DOMINANCE",
        ResearchPhilosophy.SCIENTIFIC: "SCIENTIFIC EXCELLENCE",
        ResearchPhilosophy.CULTURAL: "CULTURAL PROSPERITY",
        ResearchPhilosophy.CONSCIOUSNESS: "CONSCIOUSNESS ASCENSION"
    }

    for philosophy, title in philosophies.items():
        techs = tree.get_tech_by_philosophy(philosophy)
        tier_dist = {}
        for tech in techs:
            tier_dist.setdefault(tech.tier, 0)
            tier_dist[tech.tier] += 1

        avg_cost = sum(t.research_cost for t in techs) / len(techs) if techs else 0
        total_cost = sum(t.research_cost for t in techs)

        print(f"\n{title}")
        print(f"  Total Techs: {len(techs)}")
        print(f"  Tier Distribution: {tier_dist}")
        print(f"  Average Cost: {avg_cost:.0f} points")
        print(f"  Total Cost to Complete: {total_cost} points")

        # Show tier 5 techs for this philosophy
        tier5_techs = [t for t in techs if t.tier == 5]
        if tier5_techs:
            print(f"  Tier 5 Endpoint Techs: {', '.join(t.name for t in tier5_techs[:2])}")

    # Demo 10: Statistics summary
    print("\n[DEMO 10] SYSTEM STATISTICS SUMMARY")
    print("-" * 80)

    total_research_points = sum(tech.research_cost for tech in tree.technologies.values())
    avg_prerequisites = sum(len(tech.prerequisites) for tech in tree.technologies.values()) / len(tree.technologies)

    print(f"\nTotal Research Points to Complete All: {total_research_points}")
    print(f"Average Prerequisites per Tech: {avg_prerequisites:.1f}")
    print(f"Total Tech Lock-in Points (prerequisites): {sum(len(t.prerequisites) for t in tree.technologies.values())}")

    # Techs with most unlocks
    most_unlocks = max(
        tree.technologies.values(),
        key=lambda t: len(t.unlocks_techs) + len(t.unlocks_quests) + len(t.unlocks_features)
    )
    print(f"\nMost Impactful Tech: {most_unlocks.name}")
    print(f"  Total Unlocks: {len(most_unlocks.unlocks_techs) + len(most_unlocks.unlocks_quests)}")

    # Deepest tech chains
    print(f"\nDeepest Dependency Chains:")
    chains = [
        ("Military Path", ["basic_tools", "metallurgy", "knights_cavalry", "aircraft", "nuclear_energy"]),
        ("Scientific Path", ["writing", "mathematics", "universities", "electricity", "computing"]),
        ("Consciousness Path", ["philosophy", "ethics", "consciousness_technology", "federation_ascension"])
    ]

    for chain_name, chain_techs in chains:
        valid_chain = [t for t in chain_techs if t in tree.technologies]
        if valid_chain:
            cost = sum(tree.technologies[t].research_cost for t in valid_chain)
            print(f"  {chain_name}: {len(valid_chain)} techs, {cost} points")

    print("\n" + "=" * 80)
    print("DEMO COMPLETE - Technology Tree System Fully Operational")
    print("=" * 80)


if __name__ == "__main__":
    main()
