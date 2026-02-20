#!/usr/bin/env python3
"""
COSMIC ENHANCEMENT INTEGRATION - ADD TO EXISTING FEDERATION GAME
This file adds cosmic visualization to your existing federation game
"""

from federation_visualization import integrate_cosmic_visualization


def enhance_existing_game():
    """Enhance the existing federation game with cosmic visualization"""
    from federation_game_console import FederationConsole

    # Create the console as usual
    console = FederationConsole()
    console.initialize_game()

    # Enhance with cosmic visualization
    visualizer = integrate_cosmic_visualization(console)

    print("\n🌟 FEDERATION GAME ENHANCED WITH COSMIC VISUALIZATION 🌟")
    print("New commands available:")
    print("  > cosmic    - See your expanding universe with ships!")
    print("  > universe  - Same as cosmic")
    print("\nContinue playing as normal, then try the new visualization commands!\n")

    # Run the enhanced game
    while console.is_game_active:
        try:
            command = input("> ").strip().lower()

            if not command:
                continue

            if command in console.commands:
                console.commands[command]()
            else:
                print(f"Unknown command: {command}\n")

        except KeyboardInterrupt:
            print("\n")
            console.cmd_exit()
        except Exception as e:
            print(f"Error: {e}\n")


if __name__ == "__main__":
    enhance_existing_game()
