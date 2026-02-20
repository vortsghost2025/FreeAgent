#!/usr/bin/env python3
"""
COSMIC EXPANSION ENHANCER - ADD VISUAL SHIPS AND UNIVERSE TO EXISTING GAME
"""

import random
import math
from typing import List
from dataclasses import dataclass
from enum import Enum
from federation_game_console import FederationConsole


class CosmicDirection(Enum):
    """Three directions of cosmic expansion"""
    X_AXIS = "Physical Expansion - Territory & Matter"
    Y_AXIS = "Consciousness - Identity & Awareness"
    Z_AXIS = "Temporal - Time & Prophecy"


@dataclass
class CosmicEntity:
    """A cosmic entity like a ship or station"""
    entity_id: str
    name: str
    x: float
    y: float
    z: float
    entity_type: str  # ship, station, anomaly, hub
    direction: CosmicDirection
    status: str = "active"


class CosmicExpander:
    """Manages the cosmic visualization for the federation game"""

    def __init__(self, console: FederationConsole):
        self.console = console
        self.entities: List[CosmicEntity] = []
        self.universe_radius = 1.0
        self.tick_count = 0

        # Initialize with core entities
        self._initialize_core_entities()

    def _initialize_core_entities(self):
        """Initialize the core cosmic entities"""
        self.entities.append(CosmicEntity(
            entity_id="FED_HUB_CORE",
            name="Federation Nexus",
            x=0.0, y=0.0, z=0.0,
            entity_type="hub",
            direction=CosmicDirection.X_AXIS
        ))

        cons = self.console.consciousness
        if getattr(cons, 'expansion_hunger', 0) > 0.4:
            self.entities.append(CosmicEntity(
                entity_id="EXP_SHIP_01",
                name="Expansion Vessel",
                x=1.0, y=0.0, z=0.0,
                entity_type="ship",
                direction=CosmicDirection.X_AXIS
            ))

        if getattr(cons, 'identity', 0) > 0.5:
            self.entities.append(CosmicEntity(
                entity_id="CONS_SHIP_01",
                name="Consciousness Probe",
                x=0.0, y=1.0, z=0.0,
                entity_type="ship",
                direction=CosmicDirection.Y_AXIS
            ))

        if getattr(cons, 'prophecies', None) and len(cons.prophecies) > 0:
            self.entities.append(CosmicEntity(
                entity_id="TEMP_SHIP_01",
                name="Temporal Scout",
                x=0.0, y=0.0, z=1.0,
                entity_type="ship",
                direction=CosmicDirection.Z_AXIS
            ))

    def update_cosmos(self):
        """Update the cosmic entities based on game state"""
        self.tick_count += 1

        cons = self.console.consciousness
        base_radius = max(1.0, getattr(self.console, 'turn_number', 1) * 0.1)
        expansion_factor = (getattr(cons, 'expansion_hunger', 0) + getattr(cons, 'identity', 0) + getattr(cons, 'confidence', 0)) / 3
        self.universe_radius = base_radius * (1 + expansion_factor * 0.5)

        self._generate_new_entities()
        self._move_entities()

    def _generate_new_entities(self):
        cons = self.console.consciousness

        if getattr(cons, 'expansion_hunger', 0) > 0.5 and random.random() < getattr(cons, 'expansion_hunger', 0) * 0.3:
            angle = random.uniform(0, 2 * math.pi)
            distance = self.universe_radius * 0.6

            self.entities.append(CosmicEntity(
                entity_id=f"EXP_{len(self.entities):03d}",
                name=f"Explorer-{len(self.entities)}",
                x=math.cos(angle) * distance,
                y=math.sin(angle) * distance * 0.2,
                z=random.uniform(-distance * 0.1, distance * 0.1),
                entity_type="ship",
                direction=CosmicDirection.X_AXIS
            ))

        if getattr(cons, 'identity', 0) > 0.6 and random.random() < getattr(cons, 'identity', 0) * 0.2:
            angle = random.uniform(0, 2 * math.pi)
            distance = self.universe_radius * 0.6

            self.entities.append(CosmicEntity(
                entity_id=f"CONS_{len(self.entities):03d}",
                name=f"Seeker-{len(self.entities)}",
                x=math.cos(angle) * distance * 0.3,
                y=math.sin(angle) * distance,
                z=random.uniform(-distance * 0.3, distance * 0.3),
                entity_type="ship",
                direction=CosmicDirection.Y_AXIS
            ))

        if getattr(cons, 'prophecies', None) and len(cons.prophecies) > 0 and random.random() < min(0.3, len(cons.prophecies) * 0.1):
            angle = random.uniform(0, 2 * math.pi)
            distance = self.universe_radius * 0.6

            self.entities.append(CosmicEntity(
                entity_id=f"TEMP_{len(self.entities):03d}",
                name=f"Chronos-{len(self.entities)}",
                x=math.cos(angle) * distance * 0.2,
                y=math.sin(angle) * distance * 0.2,
                z=math.sin(angle) * distance,
                entity_type="ship",
                direction=CosmicDirection.Z_AXIS
            ))

    def _move_entities(self):
        for entity in self.entities:
            if entity.entity_type == "ship":
                entity.x += random.uniform(-0.1, 0.1)
                entity.y += random.uniform(-0.1, 0.1)
                entity.z += random.uniform(-0.1, 0.1)

                distance = math.sqrt(entity.x**2 + entity.y**2 + entity.z**2)
                max_distance = self.universe_radius * 1.8
                if distance > max_distance:
                    factor = max_distance * 0.9 / distance
                    entity.x *= factor
                    entity.y *= factor
                    entity.z *= factor

    def render_cosmic_view(self, width: int = 75, height: int = 30) -> str:
        display_lines = []
        display_lines.append("⭐ THE COSMIC FEDERATION EXPANSION VIEW ⭐".center(width))
        display_lines.append("=" * width)
        cons = self.console.consciousness
        display_lines.append(f"Turn: {getattr(self.console, 'turn_number',0):3d} | Phase: {getattr(self.console,'game_phase',''):12s} | Radius: {self.universe_radius:.2f}".ljust(width))
        display_lines.append("")

        views = [
            ("XY PLANE - PHYSICAL vs CONSCIOUSNESS", 'x', 'y'),
            ("XZ PLANE - PHYSICAL vs TEMPORAL", 'x', 'z'),
            ("YZ PLANE - CONSCIOUSNESS vs TEMPORAL", 'y', 'z')
        ]

        for view_title, axis1, axis2 in views:
            display_lines.append(view_title.center(width))
            grid = [[' ' for _ in range(width)] for _ in range(height//3 - 2)]
            center_x, center_y = width // 2, (height//3 - 2) // 2
            for x in range(width):
                grid[center_y][x] = '-' if grid[center_y][x] == ' ' else grid[center_y][x]
            for y in range(len(grid)):
                grid[y][center_x] = '|' if grid[y][center_x] == ' ' else grid[y][center_x]
            grid[center_y][center_x] = '+'

            for entity in self.entities:
                coord1 = getattr(entity, axis1)
                coord2 = getattr(entity, axis2)
                norm_x = int((coord1 / self.universe_radius) * (width // 4) + center_x)
                norm_y = int((coord2 / self.universe_radius) * ((height//3 - 2) // 4) + center_y)
                if 0 <= norm_x < width and 0 <= norm_y < len(grid):
                    if entity.entity_type == "hub":
                        symbol = '@'
                    elif entity.direction == CosmicDirection.X_AXIS:
                        symbol = '>'
                    elif entity.direction == CosmicDirection.Y_AXIS:
                        symbol = '^'
                    elif entity.direction == CosmicDirection.Z_AXIS:
                        symbol = '*'
                    else:
                        symbol = '•'

                    if grid[norm_y][norm_x] == ' ':
                        grid[norm_y][norm_x] = symbol
                    elif grid[norm_y][norm_x] != '@':
                        grid[norm_y][norm_x] = '*'

            for row in grid:
                display_lines.append(''.join(row))

            display_lines.append("")

        legend = [
            "LEGEND:",
            "  @ = Federation Central Hub (origin)",
            "  > = Physical Expansion Ships (territory/resources)",
            "  ^ = Consciousness Growth Ships (identity/awareness)",
            "  * = Temporal Ships (prophecy/time)",
            "  • = Other Cosmic Entities",
            "  -,+ = Axes (center of expansion)"
        ]

        for line in legend:
            display_lines.append(line)

        display_lines.append("")
        display_lines.append(f"TOTAL ENTITIES: {len(self.entities)} | ACTIVE SHIPS: {len([e for e in self.entities if e.entity_type == 'ship'])}")
        display_lines.append("=" * width)

        return '\n'.join(display_lines)


def enhance_federation_console(console: FederationConsole):
    cosmic_expander = CosmicExpander(console)

    def cmd_cosmic():
        cosmic_expander.update_cosmos()
        print(cosmic_expander.render_cosmic_view())

    def cmd_expand():
        cosmic_expander.update_cosmos()
        print(cosmic_expander.render_cosmic_view())

    def cmd_universe():
        cosmic_expander.update_cosmos()
        print(cosmic_expander.render_cosmic_view())

    console.commands['cosmic'] = cmd_cosmic
    console.commands['expand'] = cmd_expand
    console.commands['universe'] = cmd_universe

    return cosmic_expander


if __name__ == "__main__":
    console = FederationConsole()
    console.initialize_game()
    cosmic_expander = enhance_federation_console(console)
    print("\n🚀 FEDERATION GAME ENHANCED WITH COSMIC VISUALIZATION 🚀\n")
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
        console.cmd_exit()
