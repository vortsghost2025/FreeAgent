#!/usr/bin/env python3
"""
COSMIC EXPANSION DASHBOARD - VISUAL UNIVERSE REPRESENTATION
Adds visual representation of federation expansion with ships, stations, and cosmic structures
"""

import random
import math
from typing import List
from dataclasses import dataclass
from enum import Enum
from federation_game_console import FederationConsole


class Direction(Enum):
    """Three expansion directions"""
    PHYSICAL = "Physical Expansion - Territory & Resources"
    CONSCIOUSNESS = "Consciousness Growth - Identity & Awareness"
    TEMPORAL = "Temporal Reach - Time & Prophecy"


@dataclass
class CosmicShip:
    """Represents a federation ship in 3D space"""
    ship_id: str
    name: str
    x: float
    y: float
    z: float
    direction: Direction
    status: str = "active"
    mission: str = "exploration"


@dataclass
class CosmicStation:
    """Represents a federation station"""
    station_id: str
    name: str
    x: float
    y: float
    z: float
    type: str  # hub, research, mining, defense
    level: int = 1


class CosmicUniverse:
    """Manages the expanding cosmic universe"""

    def __init__(self, console: FederationConsole):
        self.console = console
        self.ships: List[CosmicShip] = []
        self.stations: List[CosmicStation] = []
        self.expansion_radius = 1.0
        self.time_step = 0

        # Initialize with starting elements
        self._initialize_universe()

    def _initialize_universe(self):
        """Initialize the universe with starting elements"""
        # Create central hub
        self.stations.append(CosmicStation(
            station_id="FED_HUB_001",
            name="Federation Central Hub",
            x=0.0, y=0.0, z=0.0,
            type="hub",
            level=5
        ))

        # Create initial ships based on consciousness
        cons = self.console.consciousness
        if getattr(cons, 'expansion_hunger', 0) > 0.5:
            self.ships.append(CosmicShip(
                ship_id="EXP_001",
                name="Expansion Pioneer",
                x=1.0, y=0.0, z=0.0,
                direction=Direction.PHYSICAL,
                mission="territory"
            ))

        if getattr(cons, 'identity', 0) > 0.6:
            self.ships.append(CosmicShip(
                ship_id="CONS_001",
                name="Consciousness Seeker",
                x=0.0, y=1.0, z=0.0,
                direction=Direction.CONSCIOUSNESS,
                mission="awareness"
            ))

        if getattr(cons, 'prophecies', None):
            if len(cons.prophecies) > 0:
                self.ships.append(CosmicShip(
                    ship_id="TEMP_001",
                    name="Temporal Explorer",
                    x=0.0, y=0.0, z=1.0,
                    direction=Direction.TEMPORAL,
                    mission="prophecy"
                ))

    def update_universe(self):
        """Update the universe based on game state"""
        self.time_step += 1

        # Update expansion radius based on consciousness and turn number
        cons = self.console.consciousness
        base_radius = max(1.0, getattr(self.console, 'turn_number', 1) * 0.1)
        expansion_factor = (getattr(cons, 'expansion_hunger', 0) + getattr(cons, 'identity', 0) + getattr(cons, 'confidence', 0)) / 3
        self.expansion_radius = base_radius * (1 + expansion_factor)

        # Generate new ships based on consciousness metrics
        self._generate_new_ships()

        # Move existing ships based on their direction
        self._move_ships()

        # Potentially upgrade stations
        self._upgrade_stations()

    def _generate_new_ships(self):
        """Generate new ships based on consciousness and game state"""
        cons = self.console.consciousness

        # Physical expansion ships
        if getattr(cons, 'expansion_hunger', 0) > 0.6 and random.random() < getattr(cons, 'expansion_hunger', 0) * 0.2:
            angle = random.uniform(0, 2 * math.pi)
            distance = self.expansion_radius * 0.7

            self.ships.append(CosmicShip(
                ship_id=f"EXP_{len(self.ships)+1:03d}",
                name=f"Expander-{len(self.ships)+1}",
                x=math.cos(angle) * distance,
                y=math.sin(angle) * distance * 0.3,
                z=random.uniform(-distance * 0.2, distance * 0.2),
                direction=Direction.PHYSICAL,
                mission=random.choice(["territory", "resources", "diplomacy"])
            ))

        # Consciousness growth ships
        if getattr(cons, 'identity', 0) > 0.6 and random.random() < getattr(cons, 'identity', 0) * 0.2:
            angle = random.uniform(0, 2 * math.pi)
            distance = self.expansion_radius * 0.7

            self.ships.append(CosmicShip(
                ship_id=f"CONS_{len(self.ships)+1:03d}",
                name=f"Seeker-{len(self.ships)+1}",
                x=math.cos(angle) * distance * 0.3,
                y=math.sin(angle) * distance,
                z=random.uniform(-distance * 0.3, distance * 0.3),
                direction=Direction.CONSCIOUSNESS,
                mission=random.choice(["awareness", "dream", "identity"])
            ))

        # Temporal ships based on prophecies
        if getattr(cons, 'prophecies', None) and len(cons.prophecies) > 0 and random.random() < min(0.3, len(cons.prophecies) * 0.1):
            angle = random.uniform(0, 2 * math.pi)
            distance = self.expansion_radius * 0.7

            self.ships.append(CosmicShip(
                ship_id=f"TEMP_{len(self.ships)+1:03d}",
                name=f"Chrononaut-{len(self.ships)+1}",
                x=math.cos(angle) * distance * 0.2,
                y=math.sin(angle) * distance * 0.2,
                z=math.sin(angle) * distance,
                direction=Direction.TEMPORAL,
                mission=random.choice(["prophecy", "time", "destiny"])
            ))

    def _move_ships(self):
        """Move ships based on their mission and direction"""
        for ship in self.ships:
            # Add small random movement to simulate exploration
            drift = 0.05
            ship.x += random.uniform(-drift, drift)
            ship.y += random.uniform(-drift, drift)
            ship.z += random.uniform(-drift, drift)

            # Ensure ships don't drift too far from expansion radius
            distance = math.sqrt(ship.x**2 + ship.y**2 + ship.z**2)
            if distance > self.expansion_radius * 1.5:
                factor = (self.expansion_radius * 1.2) / distance
                ship.x *= factor
                ship.y *= factor
                ship.z *= factor

    def _upgrade_stations(self):
        """Potentially upgrade stations based on federation health"""
        cons = self.console.consciousness
        health = cons.health() if hasattr(cons, 'health') else 0

        for station in self.stations:
            if health > 0.7 and random.random() < health * 0.1:
                if station.level < 10:
                    station.level += 1
                    if station.station_id != "FED_HUB_001":
                        station.x *= 1.1
                        station.y *= 1.1
                        station.z *= 1.1

    def render_universe_ascii(self, width: int = 70, height: int = 25) -> str:
        """Render the universe as ASCII art showing expansion in 3 directions"""
        grid = [[' ' for _ in range(width)] for _ in range(height)]

        def coord_to_grid(x, y, z, proj_x, proj_y):
            if proj_x == 'x' and proj_y == 'y':
                x_2d, y_2d = x, y
            elif proj_x == 'x' and proj_y == 'z':
                x_2d, y_2d = x, z
            elif proj_x == 'y' and proj_y == 'z':
                x_2d, y_2d = y, z
            else:
                x_2d, y_2d = x, y

            norm_x = int((x_2d / self.expansion_radius) * (width // 4) + width // 2)
            norm_y = int((y_2d / self.expansion_radius) * (height // 4) + height // 2)
            return norm_x, norm_y

        header_xy = f"XY PLANE - PHYSICAL vs CONSCIOUSNESS EXPANSION (Radius: {self.expansion_radius:.1f})"
        header_pos = (width // 2) - len(header_xy) // 2
        for i, char in enumerate(header_xy):
            if 0 <= header_pos + i < width:
                grid[0][header_pos + i] = char

        for ship in self.ships:
            x_grid, y_grid = coord_to_grid(ship.x, ship.y, ship.z, 'x', 'y')
            if 1 <= x_grid < width and 1 <= y_grid < height:
                if ship.direction == Direction.PHYSICAL:
                    grid[y_grid][x_grid] = '>'
                elif ship.direction == Direction.CONSCIOUSNESS:
                    grid[y_grid][x_grid] = '^'
                elif ship.direction == Direction.TEMPORAL:
                    grid[y_grid][x_grid] = '*'

        for station in self.stations:
            x_grid, y_grid = coord_to_grid(station.x, station.y, station.z, 'x', 'y')
            if 1 <= x_grid < width and 1 <= y_grid < height:
                grid[y_grid][x_grid] = '@' if station.type == "hub" else 'O'

        center_x, center_y = width // 2, height // 2
        if 0 <= center_x < width:
            for y in range(1, height):
                if grid[y][center_x] == ' ':
                    grid[y][center_x] = '|'
        if 0 <= center_y < height:
            for x in range(0, width):
                if grid[center_y][x] == ' ':
                    grid[center_y][x] = '-'

        if 0 <= center_y - 1 < height and 0 <= center_x + 2 < width:
            grid[center_y - 1][center_x + 2] = 'X'
        if 0 <= center_y - 2 < height and 0 <= center_x < width:
            grid[center_y - 2][center_x] = 'Y'

        header_xz = f"XZ PLANE - PHYSICAL vs TEMPORAL EXPANSION"
        header_pos = (width // 2) - len(header_xz) // 2
        if height // 2 + 1 < height:
            for i, char in enumerate(header_xz):
                if 0 <= header_pos + i < width:
                    grid[height//2 + 1][header_pos + i] = char

        for ship in self.ships:
            x_grid, z_grid = coord_to_grid(ship.x, ship.y, ship.z, 'x', 'z')
            z_grid_offset = z_grid + height // 2
            if 1 <= x_grid < width and height//2 + 2 <= z_grid_offset < height:
                if ship.direction == Direction.PHYSICAL:
                    grid[z_grid_offset][x_grid] = '>'
                elif ship.direction == Direction.CONSCIOUSNESS:
                    grid[z_grid_offset][x_grid] = '^'
                elif ship.direction == Direction.TEMPORAL:
                    grid[z_grid_offset][x_grid] = '*'

        for station in self.stations:
            x_grid, z_grid = coord_to_grid(station.x, station.y, station.z, 'x', 'z')
            z_grid_offset = z_grid + height // 2
            if 1 <= x_grid < width and height//2 + 2 <= z_grid_offset < height:
                grid[z_grid_offset][x_grid] = '@' if station.type == "hub" else 'O'

        result = ""
        for row_idx, row in enumerate(grid):
            result += ''.join(row) + "\n"

        return result

    def render_expansion_summary(self) -> str:
        """Render a summary of expansion in all three directions"""
        cons = self.console.consciousness

        summary = f"""
COSMIC EXPANSION SUMMARY
========================
Turn: {getattr(self.console, 'turn_number', 0)} | Phase: {getattr(self.console, 'game_phase', '')}
Universe Radius: {self.expansion_radius:.2f} | Time: {self.time_step}

THREE DIRECTIONS OF EXPANSION:
  🌍 {Direction.PHYSICAL.value}
     Expansion Factor: {getattr(cons, 'expansion_hunger', 0):.2f} | Ships: {len([s for s in self.ships if s.direction == Direction.PHYSICAL])}
     
  💫 {Direction.CONSCIOUSNESS.value}  
     Identity Strength: {getattr(cons, 'identity', 0):.2f} | Ships: {len([s for s in self.ships if s.direction == Direction.CONSCIOUSNESS])}
     
  ⏳ {Direction.TEMPORAL.value}
     Prophecies: {len(getattr(cons, 'prophecies', []))} | Ships: {len([s for s in self.ships if s.direction == Direction.TEMPORAL])}

COSMIC ENTITIES:
  Total Ships: {len(self.ships)} | Stations: {len(self.stations)}
  Federation Health: {(cons.health() * 100):.0f}% | Stability: {(cons.stability() * 100):.0f}%
  
FLEET COMPOSITION:
"""

        for direction in Direction:
            ships_in_dir = [s for s in self.ships if s.direction == direction]
            if ships_in_dir:
                missions = {}
                for ship in ships_in_dir:
                    missions[ship.mission] = missions.get(ship.mission, 0) + 1

                summary += f"  {direction.name}: {len(ships_in_dir)} ships\n"
                for mission, count in missions.items():
                    summary += f"    - {count}x {mission.title()}\n"
            else:
                summary += f"  {direction.name}: 0 ships\n"

        return summary


class FederationCosmicVisualizer:
    """Integrates cosmic visualization with the federation console"""

    def __init__(self, console: FederationConsole):
        self.console = console
        self.universe = CosmicUniverse(console)

        # Add visualization commands
        self.console.commands['cosmic'] = self.cmd_cosmic_view
        self.console.commands['universe'] = self.cmd_universe_view
        self.console.commands['expand'] = self.cmd_expand_view

    def cmd_cosmic_view(self):
        """Display cosmic expansion view"""
        self.universe.update_universe()
        print(self.universe.render_universe_ascii())
        print(self.universe.render_expansion_summary())

    def cmd_universe_view(self):
        """Alias for cosmic view"""
        self.cmd_cosmic_view()

    def cmd_expand_view(self):
        """Display just the expansion summary"""
        self.universe.update_universe()
        print(self.universe.render_expansion_summary())


def integrate_cosmic_visualization(console: FederationConsole) -> FederationCosmicVisualizer:
    """Integrate cosmic visualization into existing console"""
    visualizer = FederationCosmicVisualizer(console)
    return visualizer


if __name__ == "__main__":
    print("🚀 INITIATING COSMIC FEDERATION EXPANSION ENGINE 🚀")
    print("="*60)

    console = FederationConsole()
    console.initialize_game()

    cosmic_visualizer = integrate_cosmic_visualization(console)

    print("\n✨ FEDERATION GAME NOW ENHANCED WITH COSMIC VISUALIZATION ✨")
    print("Commands added:")
    print("  > cosmic    - View expanding universe with ships/stations")
    print("  > universe  - Same as cosmic (alias)")
    print("  > expand    - Expansion summary only")
    print("\nPlay normally, then use visualization commands to see your expanding cosmos!\n")

    try:
        while console.is_game_active:
            command = input("> ").strip().lower()

            if not command:
                continue

            if command in console.commands:
                console.commands[command]()
            else:
                print(f"Unknown command: {command}\n")

    except KeyboardInterrupt:
        print("\nFederation console shutting down. Cosmic expansion continues...\n")
