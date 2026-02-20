# THE FEDERATION GAME - TECHNOLOGY TREE & RESEARCH SYSTEM

## Overview

A complete, interconnected technology research system for THE FEDERATION GAME featuring:

- **57+ Pre-Built Technologies** spanning 5 tiers and 7 distinct historical eras
- **4 Distinct Research Philosophies** offering different gameplay paths:
  - **Military Focus**: Dominance through superior warfare capability
  - **Scientific Focus**: Innovation-driven technological superiority
  - **Cultural Focus**: Prosperity and social stability
  - **Consciousness Focus**: Spiritual advancement and transcendence
- **Deep Dependency Chains** that create meaningful research progression
- **Branching Paths** where early tech choices unlock divergent gameplay options
- **Progressive Unlocking System** for quests, perks, and features
- **Turn-Based Research** with breakthrough mechanics and progression tracking

## Core Components

### 1. Technology Class

Represents a single technology in the research tree.

```python
Technology(
    tech_id: str,                      # Unique identifier
    name: str,                         # Display name
    description: str,                  # What it does
    tier: int,                         # 1-5 progression level
    research_cost: int,                # Tech points to research
    era: Era,                          # Historical era (Ancient-Transcendent)
    philosophy: ResearchPhilosophy,   # Alignment (Military/Scientific/Cultural/Consciousness)
    prerequisites: List[str],          # Required techs
    unlocks_techs: List[str],         # Techs this enables
    unlocks_quests: List[str],        # Quest IDs unlocked
    unlocks_perks: List[str],          # Perk IDs unlocked
    unlocks_features: List[str],       # Game features unlocked
    bonuses: List[TechBonus]           # Gameplay bonuses
)
```

### 2. ResearchProject Class

Tracks active research on a specific technology.

```python
ResearchProject(
    project_id: str,                   # Unique project identifier
    technology: Technology,            # What's being researched
    progress: float,                   # 0.0-1.0 completion percentage
    turns_remaining: int,              # Estimated completion time
    owner_faction: str,                # Who's researching
    research_points_invested: int,     # Points spent so far
    paused: bool                       # Research is paused
)
```

### 3. TechTree Class

Central research management system.

**Key Methods:**

- `register_technology(tech)` - Add a technology to the tree
- `get_available_techs(player_id)` - Get researchable techs (prerequisites met)
- `start_research(player_id, tech_id)` - Begin researching
- `advance_research(player_id, project_id, points)` - Spend research points
- `complete_research(player_id, project_id)` - Finalize research
- `get_tech_by_era(era)` - Filter technologies by historical period
- `get_tech_by_philosophy(philosophy)` - Filter by research path
- `get_research_tree()` - Visualization data of entire tree structure
- `get_research_report(player_id)` - Complete research status

## Technology Tree Statistics

### By Tier
- **Tier 1 (Foundational)**: 5 technologies - Foundation for all advancement
- **Tier 2 (Classical)**: 9 technologies - Classical knowledge systems
- **Tier 3 (Medieval)**: 13 technologies - Specialized advancement
- **Tier 4 (Industrial)**: 14 technologies - Mechanization era
- **Tier 5+ (Modern/Future/Transcendent)**: 16 technologies - Advanced/ultimate

### By Research Philosophy
- **Military** (12 tech): Focus on defense, warfare, dominance
- **Scientific** (23 tech): Innovation, research acceleration, breakthroughs
- **Cultural** (9 tech): Prosperity, happiness, unity
- **Consciousness** (13 tech): Spiritual, AI, transcendence

### By Era
- **Ancient**: 5 tech (domestication basics)
- **Classical**: 9 tech (formal knowledge)
- **Medieval**: 13 tech (specialization)
- **Industrial**: 14 tech (mechanization)
- **Modern**: 4 tech (electricity/radio)
- **Future**: 8 tech (space/nuclear/AI)
- **Transcendent**: 4 tech (reality manipulation/ascension)

## Complete Technology List

### TIER 1: FOUNDATIONAL (Ancient Era)

| Technology | Cost | Philosophy | Unlocks |
|------------|------|-----------|---------|
| Animal Husbandry | 30 | Cultural | agriculture, cavalry, quests |
| Agriculture | 35 | Scientific | advanced_farming, irrigation |
| Basic Tools | 25 | Military | metallurgy, craftsmanship |
| Simple Structures | 30 | Cultural | architecture, fortification |
| Writing | 40 | Scientific | philosophy, mathematics, cartography |

### TIER 2: CLASSICAL (Classical Era)

| Technology | Cost | Philosophy | Unlocks |
|------------|------|-----------|---------|
| Philosophy | 50 | Consciousness | ethics, enlightenment, perks |
| Mathematics | 55 | Scientific | architecture, astronomy, engineering |
| Architecture | 50 | Cultural | castle_defense, aqueducts, features |
| Metallurgy | 55 | Military | advanced_metallurgy, steel_working |
| Navigation | 50 | Scientific | cartography, seamanship, posts |
| Governance | 50 | Cultural | democracy, authoritarianism |
| Advanced Farming | 55 | Scientific | industrialized_farming |
| Irrigation | 50 | Scientific | aqueducts, drought_resistance |
| Craftsmanship | 50 | Cultural | fine_arts, masterwork_crafting |

### TIER 3: MEDIEVAL (Medieval Era)

| Technology | Cost | Philosophy | Unlocks |
|------------|------|-----------|---------|
| Knights & Cavalry | 70 | Military | heavy_cavalry, knight_orders, units |
| Castle Defense | 75 | Military | advanced_fortification, siege_eng |
| Alchemy | 70 | Consciousness | chemistry, herbalism, alchemy_lab |
| Universities | 75 | Scientific | scientific_method, research_acceleration |
| Cartography | 70 | Scientific | advanced_cartography, exploration |
| Engineering | 75 | Scientific | manufacturing, aircraft, projects |
| Astronomy | 70 | Scientific | space_travel, quantum_physics |
| Ethics | 70 | Consciousness | enlightenment, moral_authority |
| Democracy | 75 | Cultural | constitutional_gov, innovation |
| Aqueducts | 75 | Cultural | aqueduct_networks, city_capacity |
| Fine Arts | 70 | Cultural | universal_art, cultural_influence |
| Seamanship | 75 | Military | steamships, naval_fleet, units |
| Authoritarianism | 70 | Military | totalitarianism, command_efficiency |

### TIER 4: INDUSTRIAL (Industrial Era)

| Technology | Cost | Philosophy | Unlocks |
|------------|------|-----------|---------|
| Manufacturing | 90 | Scientific | mass_production, automation |
| Steam Power | 100 | Scientific | railways, steamships, mechanization |
| Railways | 95 | Scientific | high_speed_rail, transport_network |
| Telegraph | 85 | Scientific | radio_communications, communication |
| Industrialized Farming | 90 | Scientific | genetic_breeding, mechanized_ag |
| Banking | 85 | Cultural | finance_systems, stock_markets |
| Chemistry | 95 | Scientific | genetic_engineering, pharmaceuticals |
| Advanced Metallurgy | 90 | Military | superior_materials, armor_strength |
| Steel Working | 95 | Military | aircraft, superior_equipment |
| Advanced Fortification | 95 | Military | nuclear_bunkers, fortress_network |
| Enlightenment | 100 | Consciousness | consciousness_technology, morale |
| Basic Electricity | 90 | Scientific | electricity, electric_motors |
| Knight Orders | 90 | Military | elite_forces, knight_order_system |
| Heavy Cavalry | 95 | Military | mechs, armor_protection, units |

### TIER 5: MODERN/FUTURE (Modern, Future, Transcendent Eras)

#### Modern Era (5 Tier-5 techs)

| Technology | Cost | Era | Unlocks |
|------------|------|-----|---------|
| Electricity | 120 | Modern | electronics, computing, power_grid |
| Radio Communications | 115 | Modern | television, satellite_communications |
| Aircraft | 125 | Modern | fighter_aircraft, bombers, air_units |
| Computing | 130 | Modern | artificial_intelligence, cybernetics |
| Genetic Engineering | 135 | Future | bioengineering, human_augmentation |

#### Future Era (6 Tier-5 techs)

| Technology | Cost | Unlocks |
|------------|------|---------|
| Nuclear Energy | 150 | nuclear_fusion, weapons, power |
| Space Travel | 150 | terraforming, interstellar_travel |
| Quantum Physics | 145 | quantum_computing, teleportation |
| Artificial Intelligence | 140 | conscious_ai, singularity, autonomy |
| Bioengineering | 135 | bio_weapons, creature_control |
| Consciousness Technology | 140 | hive_mind, enlightenment, network |
| Human Augmentation | 140 | superhuman_population, clinics |

#### Transcendent Era (4 Tier-5 techs)

| Technology | Cost | Prerequisites | Unlocks |
|------------|------|--------------|---------|
| Dimensional Engineering | 160 | quantum_physics | dimensional_rifts, portal_gates |
| Reality Manipulation | 170 | consciousness_tech, quantum_physics | reality_bending, transcendence |
| Time Mastery | 175 | quantum_physics | temporal_mechanics, prophecy_system |
| Federation Ascension | 200 | consciousness_tech, dimensional_eng, reality_manip | VICTORY |

## Research Philosophies in Detail

### MILITARY DOMINANCE PATH (12 techs, 960 points)
**Strategy**: Build overwhelming military supremacy

**Technology Chain**:
1. Basic Tools → Equipment production (25 pts)
2. Metallurgy → Superior weapons (55 pts)
3. Knights & Cavalry → Elite mounted units (70 pts)
4. Castle Defense → Impregnable fortifications (75 pts)
5. Aircraft → Air superiority (125 pts)
6. Nuclear Energy → Ultimate weapons (150 pts)

**Key Features Unlocked**:
- Advanced cavalry units with charge mechanics
- Fortress networks with multi-layer defenses
- Air force with bombers and fighters
- Nuclear deterrent capability

**Gameplay Advantages**:
- +40% military strength (average)
- Superior siege capabilities
- Elite unit formations
- Rapid conquest capability

### SCIENTIFIC EXCELLENCE PATH (23 techs, 2030 points)
**Strategy**: Innovation-driven technological superiority

**Technology Chain**:
1. Writing → Record-keeping (40 pts)
2. Mathematics → Calculation (55 pts)
3. Universities → Research acceleration (75 pts)
4. Computing → Automation (130 pts)
5. Artificial Intelligence → Autonomous systems (140 pts)
6. Quantum Physics → Reality manipulation (145 pts)

**Key Features Unlocked**:
- Research laboratories and universities
- Advanced computing systems
- AI assistants and autonomous workers
- Quantum computing and teleportation

**Gameplay Advantages**:
- +37% research speed (average)
- Breakthrough chance on all research
- Automation of production
- Scientific breakthrough events

### CULTURAL PROSPERITY PATH (9 techs, 515 points)
**Strategy**: Unity through culture and prosperity

**Technology Chain**:
1. Animal Husbandry → Food production (30 pts)
2. Simple Structures → Settlement capacity (30 pts)
3. Architecture → Grand cities (50 pts)
4. Fine Arts → Cultural influence (70 pts)
5. Banking → Economic growth (85 pts)

**Key Features Unlocked**:
- WonderBuilding system
- Art galleries and cultural sites
- Trade route networks
- Financial markets and investments

**Gameplay Advantages**:
- +28% population happiness
- +25% trade profits
- +20% morale stability
- Diplomatic influence bonuses

### CONSCIOUSNESS ASCENSION PATH (13 techs, 1685 points)
**Strategy**: Illuminate through enlightenment and transcendence

**Technology Chain**:
1. Philosophy → Ethical frameworks (50 pts)
2. Ethics → Moral authority (70 pts)
3. Enlightenment → Collective wisdom (100 pts)
4. Consciousness Technology → Mind linking (140 pts)
5. Dimensional Engineering → Parallel access (160 pts)
6. Reality Manipulation → Physics transcendence (170 pts)
7. Federation Ascension → Ultimate victory (200 pts)

**Key Features Unlocked**:
- Consciousness network systems
- Mind-linking technology
- Dimensional rifts and portals
- Reality-bending capabilities
- Transcendent victory condition

**Gameplay Advantages**:
- +35% morale and stability
- Hive mind consensus mechanics
- Access to transcendent powers
- Ultimate faction victory

## Dependency Chains & Branching Paths

### Critical Path Examples

**Path to Air Superiority**:
- Basic Tools (25) → Metallurgy (55) → Engineering (75) → Aircraft (125) = 280 pts

**Path to Computing**:
- Writing (40) → Mathematics (55) → Universities (75) → Electricity (120) → Computing (130) = 420 pts

**Path to Ultimate Ascension**:
- Philosophy (50) → Ethics (70) → Enlightenment (100) → Consciousness Tech (140) → Dimensional Eng (160) → Reality Manip (170) → Federation Ascension (200) = 890 pts

### Strategic Branching

Many technologies open multiple paths:
- **Writing** unlocks Philosophy, Mathematics, and Cartography
- **Mathematics** unlocks Architecture, Astronomy, and Engineering
- **Metallurgy** splits into military (Knights, Steel) or infrastructure (Architecture)
- **Enlightenment** branches to AI (consciousness path) or cultural prosperity

## Gameplay Integration

### Research Points System

- Players allocate research_points per turn to active projects
- Research_cost determines how many points needed for completion
- Breakthrough chance provides 50% speed boost chance (random)
- Research speed modifier allows subsequent techs to be faster

### Turn-Based Progression

```python
# Example: Spend 20 research points on a project
success, msg, progress = tree.advance_research(
    player_id="player1",
    project_id="research_project_123",
    research_points=20
)

# Check progress
if project.is_complete():
    tree.complete_research(player_id, project_id)
```

### Unlocking Cascades

When a technology completes, it unlocks:
1. **New Technologies**: Prerequisites satisfied, techs become available
2. **Quests**: New quest chains unlock for players
3. **Perks**: Special abilities and bonuses unlock
4. **Features**: New game systems become available (wonder building, etc.)

### Bonus System

Each technology provides gameplay bonuses:

```python
TechBonus(
    bonus_type="military_strength",  # Type of bonus
    value=0.3,                        # Magnitude (30%)
    is_percentage=True,               # Apply as percentage
    applies_to="melee"                # What it affects
)
```

## API Reference

### TechTree Methods

#### get_available_techs(player_id) -> List[Technology]
Returns technologies ready for research (all prerequisites met).

#### start_research(player_id, tech_id) -> Tuple[bool, str, ResearchProject]
Begin researching a technology. Returns (success, message, project).

#### advance_research(player_id, project_id, points) -> Tuple[bool, str, float]
Invest research points. Returns (success, message, progress_0_1).

#### complete_research(player_id, project_id) -> Tuple[bool, str, float]
Finalize research and apply bonuses. Returns (success, message, progress).

#### pause_research(project_id) -> Tuple[bool, str]
Pause active research.

#### resume_research(project_id) -> Tuple[bool, str]
Resume paused research.

#### get_tech_by_era(era) -> List[Technology]
Filter technologies by historical era.

#### get_tech_by_philosophy(philosophy) -> List[Technology]
Filter technologies by research philosophy.

#### get_research_tree() -> Dict
Complete tree visualization data including:
- by_tier: Technologies organized by tier
- by_era: Technologies organized by era
- by_philosophy: Technologies organized by philosophy
- dependency_map: Prerequisite and unlock relationships

#### get_research_report(player_id) -> Dict
Comprehensive research status including:
- completed_technologies: List of researched techs
- in_progress: Active research projects
- available_techs: Researchable technologies
- player_statistics: Completion stats and metrics
- recent_research: Historical research events

#### is_tech_completed(player_id, tech_id) -> bool
Check if player has completed a specific technology.

#### get_unlocked_by_tech(tech_id) -> Dict
Get what a technology unlocks (techs, quests, perks, features).

## Usage Examples

### Basic Research Flow

```python
from federation_game_technology import create_technology_tree

# Initialize
tree = create_technology_tree()

# Show available techs
available = tree.get_available_techs("player1")
print(f"Available: {[t.name for t in available]}")

# Start research
success, msg, project = tree.start_research("player1", "agriculture")
print(msg)  # "Started researching 'Agriculture' (Cost: 35 points)"

# Progress research each turn
for turn in range(5):
    success, msg, progress = tree.advance_research(
        "player1", project.project_id, research_points=10
    )
    print(f"Turn {turn}: {progress:.0%} complete")

# Auto-completes when progress >= 1.0
```

### Checking Research Status

```python
report = tree.get_research_report("player1")

print(f"Completed: {report['completed_technologies']['count']}")
print(f"In Progress: {report['in_progress']['count']}")
print(f"Available: {report['available_techs']['count']}")
print(f"Next: {report['available_techs']['techs'][0]['name']}")
```

### Viewing Technology Tree Structure

```python
tree_data = tree.get_research_tree()

# See techs by tier
for tier, techs in tree_data['by_tier'].items():
    print(f"{tier}: {len(techs)} technologies")

# See dependency chains
dependencies = tree_data['dependency_map']
print(dependencies['electricity']['requires'])  # Prerequisites
```

## System Statistics

- **Total Technologies**: 57
- **Total Research Points**: 5,190 (to complete all)
- **Average Prerequisites**: 1.3 per tech
- **Branching Factor**: Multiple paths at each tier
- **Longest Chain**: ~7 techs (consciousness path to ascension)
- **Most Impactful Tech**: Animal Husbandry (unlocks 4 techs)

## File Structure

- `federation_game_technology.py` - Core system implementation (1200+ LOC)
  - `Technology` class
  - `ResearchProject` dataclass
  - `TechTree` class
  - `create_technology_tree()` factory function with 57 pre-built techs

- `demo_federation_game_technology.py` - Comprehensive demonstration
  - 10 detailed demo sections
  - Example player progressions
  - Philosophy comparison
  - Bonus system showcase

## Integration with Other Systems

### With Quest System
- Techs unlock quests when completed
- Quests reward tech research points
- Quest completion chains to tech trees

### With Faction System
- Factions can specialize in research philosophies
- Faction bonuses can accelerate research
- Faction conflicts can block certain tech paths

### With Game State
- Tech bonuses apply directly to game stats (morale, military, etc.)
- Research points come from game actions
- Unlocked features enable new game mechanics

## Future Expansion Points

1. **Tech Specialization**: Allow players to focus deeper (5+ tier advancements)
2. **Research Teams**: Assign scholars to projects for bonuses
3. **Discovery Mechanics**: Random tech discoveries instead of pure research
4. **Trade Technology**: Technology diffusion between civilizations
5. **Alternative Paths**: Mutually exclusive tech choices with consequences
6. **Tech Decay**: Technologies become outdated without maintenance
7. **Breakthrough Events**: Spontaneous scientific discoveries advancing entire branches

---

*The Federation Game Technology Tree System - Complete interdependent research progression for strategic civilization advancement*
