from rivals import generate_rivals
from creatures import generate_creatures
from history import generate_hidden_history
from typing import Dict, List, Any

def execute_wild_expansion() -> Dict[str, Any]:
    """
    Execute the complete wild creative expansion engine.
    Generates all rival archetypes, creature taxonomy, and hidden history.
    """
    print("[*] EXECUTING WILD CREATIVE EXPANSION ENGINE...")
    print("=" * 60)

    # Generate all systems
    print("\n[~] Phase 1: Generating Rival Archetypes...")
    rivals = generate_rivals()
    print(f"   [OK] Generated {len(rivals)} rival archetypes")
    for rival in rivals:
        print(f"      - {rival.name} ({rival.personality})")

    print("\n[~] Phase 2: Synthesizing Creature Taxonomy...")
    creatures = generate_creatures()
    print(f"   [OK] Synthesized {len(creatures)} creature species")
    for creature in creatures:
        print(f"      - {creature.species_name}")

    print("\n[~] Phase 3: Recording Hidden History...")
    history = generate_hidden_history()
    print(f"   [OK] Generated {len(history)} historical events")
    print(f"      - Spanning 100 years (2387-2487)")

    # Count by era
    eras = {}
    for event in history:
        if event.year < 2397:
            era = "Genesis"
        elif event.year < 2417:
            era = "Expansion"
        elif event.year < 2437:
            era = "Conflict"
        elif event.year < 2457:
            era = "Reconciliation"
        elif event.year < 2477:
            era = "Evolution"
        else:
            era = "Transcendence"
        eras[era] = eras.get(era, 0) + 1

    for era, count in eras.items():
        print(f"      - {era} Era: {count} events")

    print("\n" + "=" * 60)
    print("[OK] WILD CREATIVE EXPANSION COMPLETE")
    print("=" * 60)

    return {
        "rivals": rivals,
        "creatures": creatures,
        "history": history,
        "metadata": {
            "rival_count": len(rivals),
            "creature_count": len(creatures),
            "history_events": len(history),
            "federation_start": 2387,
            "federation_current": 2487,
            "eras": eras
        }
    }


if __name__ == "__main__":
    results = execute_wild_expansion()
    print(f"\n[OK] Total Systems Generated:")
    print(f"   Rivals: {results['metadata']['rival_count']}")
    print(f"   Creatures: {results['metadata']['creature_count']}")
    print(f"   History Events: {results['metadata']['history_events']}")
