import argparse
import sys
from wild_expansion import execute_wild_expansion
from serializer import FederationSerializer

def main():
    parser = argparse.ArgumentParser(
        description="Federation Wild Creative Expansion Engine",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cli.py run                    # Run full expansion and print results
  python cli.py export rivals          # Export rivals to JSON
  python cli.py export creatures       # Export creatures to JSON
  python cli.py export history         # Export history to JSON
  python cli.py export all             # Export everything to JSON
  python cli.py status                 # Show system status
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Run command
    subparsers.add_parser("run", help="Execute full expansion and display results")

    # Export command
    export_parser = subparsers.add_parser("export", help="Export data to JSON")
    export_parser.add_argument(
        "target",
        choices=["rivals", "creatures", "history", "all"],
        help="What to export"
    )
    export_parser.add_argument(
        "--output", "-o",
        default=None,
        help="Output file (default: stdout)"
    )

    # Status command
    subparsers.add_parser("status", help="Show system status")

    args = parser.parse_args()

    if args.command == "run":
        results = execute_wild_expansion()
        print("\n📊 EXPANSION RESULTS:")
        print(f"   Rivals: {results['metadata']['rival_count']}")
        print(f"   Creatures: {results['metadata']['creature_count']}")
        print(f"   History Events: {results['metadata']['history_events']}")

    elif args.command == "export":
        results = execute_wild_expansion()

        if args.target == "rivals":
            data = FederationSerializer.rivals_to_json(results["rivals"])
            output_file = args.output or "rivals.json"
        elif args.target == "creatures":
            data = FederationSerializer.creatures_to_json(results["creatures"])
            output_file = args.output or "creatures.json"
        elif args.target == "history":
            data = FederationSerializer.history_to_json(results["history"])
            output_file = args.output or "history.json"
        elif args.target == "all":
            data = FederationSerializer.expansion_results_to_json(results)
            output_file = args.output or "federation_expansion.json"

        if args.output:
            FederationSerializer.export_to_file(data, output_file)
        else:
            print(data)

    elif args.command == "status":
        results = execute_wild_expansion()
        print("\n[OK] FEDERATION SYSTEM STATUS:")
        print(f"   [OK] Rival Archetypes: {results['metadata']['rival_count']}")
        print(f"   [OK] Creature Species: {results['metadata']['creature_count']}")
        print(f"   [OK] Historical Events: {results['metadata']['history_events']}")
        print(f"   [OK] Federation Timeline: 2387-2487 (100 years)")
        print(f"\n   Era Distribution:")
        for era, count in results['metadata']['eras'].items():
            print(f"      {era}: {count} events")

    else:
        parser.print_help()

if __name__ == "__main__":
    main()
