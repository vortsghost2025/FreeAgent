#!/usr/bin/env python3
"""
SHIP GENERATOR — Autonomous Vessel Spawning System
Creates new starships dynamically based on:
  - Current fleet needs (from FleetBrain recommendations)
  - Strategic objectives
  - Available resources
  - Personality compatibility
Enables the universe to grow without user intervention.
"""

from typing import Dict, Any, Optional, Type
from dataclasses import dataclass
import random
from datetime import datetime


@dataclass
class ShipBlueprint:
    """Template for a ship to be spawned"""
    ship_type: str
    ship_name: str
    personality_mode: str
    config: Dict[str, Any]
    priority: str = 'NORMAL'  # NORMAL, HIGH, CRITICAL
    created_at: float = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().timestamp()


class ShipGenerator:
    """
    Autonomous ship spawning and configuration system.

    Generates new ships based on:
    - Strategic requirements from FleetBrain
    - Random personality mixing
    - Available ship type templates
    - Fleet composition balance
    """

    # Available ship classes (lazy-loaded)
    SHIP_TYPES = {
        'ChaosbringingerShip': None,
        'SensingShip': None,
        'SignalHarvester': None,
        'ProbabilityWeaver': None,
        'ParadoxRunner': None,
    }

    # Personality distribution for random generation
    PERSONALITY_WEIGHTS = {
        'CALM': 0.25,
        'SARCASM': 0.15,
        'NOIR': 0.15,
        'DOCUMENTARY': 0.15,
        'TIRED_ENGINEER': 0.15,
        'CAPTAINS_LOG': 0.10,
        'AI_TRYING_ITS_BEST': 0.05,
    }

    # Strategy-to-ship-type mapping
    STRATEGY_SPAWNS = {
        'DEFENSIVE': ['SensingShip'],
        'AGGRESSIVE': ['SignalHarvester'],
        'SCOUT': ['SensingShip'],
        'EVASIVE': ['ProbabilityWeaver'],
        'BALANCED': ['SensingShip', 'SignalHarvester'],
    }

    def __init__(self, base_namespace: str = r'c:\workspace\uss-chaosbringer'):
        """Initialize the ship generator"""
        self.base_namespace = base_namespace
        self.ships_generated = 0
        self.generation_log: list[Dict[str, Any]] = []
        self._load_ship_classes()

    def _load_ship_classes(self):
        """Dynamically load ship class definitions"""
        import sys
        sys.path.insert(0, self.base_namespace)

        try:
            from chaosbringer_ship import ChaosbringingerShip
            from sensing_ship import SensingShip
            self.SHIP_TYPES['ChaosbringingerShip'] = ChaosbringingerShip
            self.SHIP_TYPES['SensingShip'] = SensingShip

            # Try to load optional ship types (may not exist yet)
            try:
                from signal_harvester_ship import SignalHarvesterShip
                self.SHIP_TYPES['SignalHarvester'] = SignalHarvesterShip
            except ImportError:
                pass

            try:
                from probability_weaver_ship import ProbabilityWeaverShip
                self.SHIP_TYPES['ProbabilityWeaver'] = ProbabilityWeaverShip
            except ImportError:
                pass

            try:
                from paradox_runner_ship import ParadoxRunnerShip
                self.SHIP_TYPES['ParadoxRunner'] = ParadoxRunnerShip
            except ImportError:
                pass

        except ImportError as e:
            raise ImportError(f"Failed to load ship classes: {e}")

    def generate_from_blueprint(self, blueprint: ShipBlueprint) -> Any:
        """
        Generate a new ship from a blueprint specification.

        Args:
            blueprint: ShipBlueprint with type, name, personality

        Returns:
            New instantiated ship object
        """
        if blueprint.ship_type not in self.SHIP_TYPES:
            raise ValueError(f"Unknown ship type: {blueprint.ship_type}")

        ship_class = self.SHIP_TYPES[blueprint.ship_type]
        if ship_class is None:
            raise ValueError(f"Ship type not available: {blueprint.ship_type}")

        # Instantiate with personality mode
        ship = ship_class(
            ship_name=blueprint.ship_name,
            personality_mode=blueprint.personality_mode
        )

        # Log the generation
        self.ships_generated += 1
        self.generation_log.append({
            'ship_id': self.ships_generated,
            'type': blueprint.ship_type,
            'name': blueprint.ship_name,
            'personality': blueprint.personality_mode,
            'timestamp': datetime.now().timestamp(),
            'priority': blueprint.priority,
        })

        return ship

    def generate_strategic(
        self,
        strategy: str,
        fleet_size: int,
        autonomy_level: int = 5
    ) -> ShipBlueprint:
        """
        Generate a blueprint based on strategic requirements.

        Args:
            strategy: Strategy type (DEFENSIVE, AGGRESSIVE, etc.)
            fleet_size: Current number of ships in fleet
            autonomy_level: Autonomy of spawning system (0-10)

        Returns:
            ShipBlueprint ready for instantiation
        """
        # Select ship type based on strategy
        candidate_types = self.STRATEGY_SPAWNS.get(strategy, ['SensingShip'])
        ship_type = random.choice(candidate_types)

        # Generate ship name
        ship_name = self._generate_ship_name(ship_type, fleet_size)

        # Select personality (weighted random with autonomy influence)
        personality = self._select_personality(strategy, autonomy_level)

        # Determine priority
        priority = 'HIGH' if autonomy_level >= 8 else 'NORMAL'

        blueprint = ShipBlueprint(
            ship_type=ship_type,
            ship_name=ship_name,
            personality_mode=personality,
            config={
                'strategy': strategy,
                'autonomy_level': autonomy_level,
                'generation_method': 'strategic',
            },
            priority=priority
        )

        return blueprint

    def generate_random(self, fleet_size: int) -> ShipBlueprint:
        """
        Generate a random ship blueprint for universe expansion.

        Useful for exploration and growth without explicit strategy.
        """
        ship_type = random.choice(list(self.SHIP_TYPES.keys()))
        ship_name = self._generate_ship_name(ship_type, fleet_size)
        personality = self._random_personality()

        blueprint = ShipBlueprint(
            ship_type=ship_type,
            ship_name=ship_name,
            personality_mode=personality,
            config={'generation_method': 'random'},
            priority='NORMAL'
        )

        return blueprint

    def generate_balanced_fleet(self, target_size: int) -> list[ShipBlueprint]:
        """
        Generate a balanced fleet composition.

        Returns ship blueprints for a well-rounded fleet.
        """
        blueprints = []
        ship_type_quota = {
            'SensingShip': max(1, target_size // 4),
            'SignalHarvester': max(1, target_size // 4),
            'ChaosbringingerShip': 1,
        }

        fleet_count = 0
        for ship_type, quota in ship_type_quota.items():
            for i in range(quota):
                ship_name = self._generate_ship_name(ship_type, fleet_count)
                personality = self._random_personality()

                blueprint = ShipBlueprint(
                    ship_type=ship_type,
                    ship_name=ship_name,
                    personality_mode=personality,
                    config={'generation_method': 'balanced'},
                    priority='NORMAL'
                )

                blueprints.append(blueprint)
                fleet_count += 1

        return blueprints

    def _generate_ship_name(self, ship_type: str, fleet_index: int) -> str:
        """Generate a unique ship name"""
        prefixes = {
            'ChaosbringingerShip': 'USS',
            'SensingShip': 'SENSOR',
            'SignalHarvester': 'SIGNAL',
            'ProbabilityWeaver': 'PROB',
            'ParadoxRunner': 'PARADOX',
        }

        adjectives = [
            'Swift', 'Silent', 'Sharp', 'Steady', 'Stellar',
            'Bright', 'Bold', 'Brave', 'Brilliant', 'Boundless',
            'Quantum', 'Celestial', 'Phoenix', 'Nebula', 'Titan'
        ]

        prefix = prefixes.get(ship_type, 'SHIP')
        adjective = random.choice(adjectives)
        number = fleet_index + 1

        return f"{prefix}-{adjective}-{number:03d}"

    def _select_personality(self, strategy: str, autonomy_level: int) -> str:
        """Select personality based on strategy and autonomy"""
        personality_map = {
            'DEFENSIVE': 'CALM',
            'AGGRESSIVE': 'NOIR',
            'SCOUT': 'DOCUMENTARY',
            'EVASIVE': 'AI_TRYING_ITS_BEST',
            'BALANCED': 'CALM',
        }

        # Base personality for strategy
        base_personality = personality_map.get(strategy, 'CALM')

        # If autonomy is very high, occasionally override with random
        if autonomy_level >= 9 and random.random() < 0.2:
            return self._random_personality()

        return base_personality

    def _random_personality(self) -> str:
        """Select a random personality weighted by distribution"""
        personalities = list(self.PERSONALITY_WEIGHTS.keys())
        weights = list(self.PERSONALITY_WEIGHTS.values())
        return random.choices(personalities, weights=weights, k=1)[0]

    def get_generation_report(self) -> Dict[str, Any]:
        """Return a report of ship generation activity"""
        if not self.generation_log:
            return {
                'ships_generated': 0,
                'generation_log': [],
            }

        ship_type_counts = {}
        personality_counts = {}

        for entry in self.generation_log:
            ship_type = entry['type']
            personality = entry['personality']
            ship_type_counts[ship_type] = ship_type_counts.get(ship_type, 0) + 1
            personality_counts[personality] = personality_counts.get(personality, 0) + 1

        return {
            'ships_generated': self.ships_generated,
            'by_type': ship_type_counts,
            'by_personality': personality_counts,
            'generation_timeline': self.generation_log,
        }

    def __repr__(self):
        return f"<ShipGenerator ships_generated={self.ships_generated} available_types={sum(1 for v in self.SHIP_TYPES.values() if v is not None)}>"
