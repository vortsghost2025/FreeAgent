# FEDERATION GAME NPC SYSTEM - QUICK START GUIDE

## Files Created

1. **federation_game_npcs.py** (1500+ lines)
   - Main implementation with all classes and systems
   - 39 pre-built NPCs + 10 companions + 8 creatures
   - Production-ready code

2. **demo_federation_game_npcs.py**
   - 9 comprehensive integration demos
   - Shows all features in action
   - Run with: `python demo_federation_game_npcs.py`

3. **FEDERATION_GAME_NPC_IMPLEMENTATION.md**
   - Complete implementation summary
   - Feature overview
   - Usage patterns

4. **FEDERATION_GAME_NPC_GUIDE.md**
   - Comprehensive API reference
   - Design patterns
   - Integration guide
   - Tips for designers

---

## Import and Use

```python
from federation_game_npcs import build_npc_system
from federation_game_factions import build_faction_system

# Initialize
npc_system = build_npc_system()
faction_system = build_faction_system()

player_id = "player_001"
```

---

## Core Operations

### 1. Random Encounters
```python
encounter = npc_system.spawn_random_encounter()
if encounter['type'] == 'character':
    char = encounter['entity']
    print(f"Met {char.name}")
elif encounter['type'] == 'creature':
    creature = encounter['entity']
    print(f"Encountered {creature.name}")
```

### 2. Interact with NPCs
```python
# Gift to improve relationship
result = npc_system.interact_with_character(
    player_id, char_id, "gift", turn=1
)

# Change relationship
new_rep = npc_system.change_relationship(
    player_id, char_id, 0.1  # +0.1 relationship
)

# Get dialogue
dialogue = npc_system.get_character_dialogue(
    char_id, dialogue_id, player_reputation, status
)
```

### 3. Recruit Companions
```python
# Check recruitment status
if companion.relationship_to_player >= 0.3:
    success, msg = npc_system.recruit_companion(
        player_id, companion_id
    )

    if success:
        # Get bonus info
        bonus = companion.get_party_bonus()
        # bonus = {
        #    'bonus_type': 'combat',
        #    'value': 0.25,
        #    'ability': 'Special ability text'
        # }
```

### 4. Encounter Creatures
```python
result = npc_system.encounter_creature(
    player_id,
    creature_id,
    player_charisma=0.75,  # 0.0-1.0
    turn=current_turn
)

# result = {
#    'success': True/False,
#    'message': 'Description',
#    'creature': creature_object,
#    'affinity': -1.0 to 1.0,
#    'tamed': True/False,
#    'bonus': {bonuses dictionary}
# }
```

### 5. Advance Turn
```python
events = npc_system.advance_turn()

for event in events:
    if event['type'] == 'companion_betrayal':
        print(f"{event['character']} has betrayed you!")
    elif event['type'] == 'character_corruption':
        print(f"{event['character']} is fully corrupted!")
```

### 6. Get Reports
```python
char_report = npc_system.get_character_report(char_id)
# Returns: dict with all character info

creature_report = npc_system.get_creature_report(creature_id)
# Returns: dict with all creature info
```

---

## Available Characters by Type

### Recruitable Companions (10)
- Lyra Swiftwind (Stealth)
- Thorg Ironhammer (Combat)
- Elara Moonwhisper (Research)
- Captain Valor (Morale)
- Dr. Sylas Cunningham (Research)
- Kyren Frostblade (Defense)
- Zephyr Silverspeak (Diplomacy)
- Scout Aria (Exploration)
- Brother Mercy (Morale)
- Shadowborn (Stealth)

### Faction Leaders (8)
- Chancellor Harmony (Diplomatic Corps)
- Marshal Ironbound (Military Command)
- Maestro Celestia (Cultural Ministry)
- Dr. Prometheus (Research Division)
- Oracle Vex (Consciousness Collective)
- Merchant-Prince Aurelius (Economic Council)
- Captain Frontier (Exploration Initiative)
- Archivist Eternal (Preservation Society)

### Antagonists (4)
- Lord Malaxis
- The Void Oracle
- Baroness Greed
- General Devastation

### Mysterious Figures (6)
- The Wanderer
- The Jester
- The Hermit
- The Spectre
- The Trickster
- The Oracle

### Historical Figures & Unique NPCs (11)
- Archimedes Prime
- Commander Valorix
- Philosopher Zenith
- Ambassador Silven
- Conquistador Drake
- Plus 6 more...

---

## Available Creatures

| Creature | Rarity | Main Bonus | Effect |
|----------|--------|-----------|--------|
| Sky-Furk | Common | Travel | +25% movement |
| Plasma-Kite | Legendary | Research | +40% research |
| Thrumback | Rare | Combat | +50% combat |
| Cloud-Gnasher | Rare | Morale | +30% morale |
| Void-Skipper | Rare | Stealth | +45% stealth |
| Dream-Wyrm | Legendary | Prophecy | +50% prophecy |
| Harmonic Maw | Mythic | Power | +100% power |
| Prism Assembly | Legendary | Unity | +40% unity |

---

## Personality Traits (All NPCs)

Each character has 5 traits (0.0-1.0):

- **Loyalty**: Faithful vs. self-interested
- **Ambition**: Power-seeking vs. content
- **Wisdom**: Thoughtful vs. reactive
- **Charisma**: Charming vs. isolated
- **Cunning**: Strategic vs. straightforward

Access with:
```python
traits = npc_system.characters[char_id].get_personality_summary()
# Returns: { 'loyalty': 0.8, 'ambition': 0.3, ... }
```

---

## Companion Bonuses

When recruited, companions provide:

| Bonus Type | Scale | Examples |
|-----------|-------|----------|
| Morale | +10-25% | Captain Valor, Brother Mercy |
| Research | +20-30% | Elara, Dr. Cunningham |
| Combat | +20-25% | Thorg, Kyren |
| Diplomacy | +20-25% | Zephyr |
| Exploration | +20-25% | Scout Aria |
| Defense | +25-28% | Kyren |
| Stealth | +20-25% | Lyra, Shadowborn |

Plus **Special Abilities** unique to each companion.

---

## Key Mechanics

### Relationship System
- **-1.0**: Sworn enemy, hostile
- **-0.5**: Hostile, won't help
- **0.0**: Neutral
- **+0.3**: Minimum for companion recruitment
- **+0.5**: Friendly
- **+0.8**: Close ally
- **+1.0**: Devoted follower

### Loyalty (Companions)
- **0.0-0.3**: High betrayal risk
- **0.3-0.6**: Moderate risk
- **0.6-0.8**: Reliable
- **0.8-1.0**: Devoted

### Corruption (Antagonists)
- **0.0**: Pure
- **0.3-0.6**: Compromised
- **0.6-1.0**: Fully corrupted -> Status = "corrupted"

---

## Integration Patterns

### With Factions
```python
# Player joins faction
faction_system.join_faction(player_id, "exploration_initiative")

# Get faction NPCs
chars = npc_system.get_characters_by_faction("exploration_initiative")

# NPC leader is key character
leader = npc_system.characters["char_107"]  # Captain Frontier
```

### With Events
```python
# Process turn events
events = npc_system.advance_turn()

for event in events:
    # Handle character evolution
    if event['type'] == 'character_corruption':
        # Character status now 'corrupted'
        pass
```

### With Combat/Gameplay
```python
# Get recruited companions for party
recruited = npc_system.recruited_companions.get(player_id, set())

for comp_id in recruited:
    comp = npc_system.companions[comp_id]
    bonus = comp.get_party_bonus()
    # Apply bonus['value'] to appropriate game stat
```

---

## Create Custom NPCs

```python
from federation_game_npcs import Character

new_char = Character(
    char_id="custom_001",
    name="Your Custom NPC",
    title="Their Role",
    description="Physical appearance",
    loyalty=0.7,
    ambition=0.4,
    wisdom=0.8,
    charisma=0.6,
    cunning=0.5,
    personality_type=CharacterArchetype.WARRIOR,
    affiliation="military_command",  # Optional faction
    skills=["Combat", "Leadership"],
    status=CharacterStatus.ACTIVE
)

npc_system.register_character(new_char)
```

### Create Custom Companions

```python
from federation_game_npcs import Companion, CompanionBonus

new_comp = Companion(
    char_id="custom_comp_001",
    name="Dream Ranger",
    title="Mystic Scout",
    ...
    companion_bonus=CompanionBonus.EXPLORATION,
    bonus_value=0.25,  # 25% bonus
    special_ability="Dream Walk - Visit far places in sleep",
    personality_quirks=["Dreamy", "Artistic", "Loyal"],
    betrayal_risk=0.15  # 15% chance to betray
)

npc_system.register_companion(new_comp)
```

---

## Query Functions

```python
# Get all active NPCs
active = npc_system.get_all_characters_active()

# Get NPCs by faction
chars = npc_system.get_characters_by_faction(faction_id)

# Get NPCs by archetype
heroes = npc_system.get_characters_by_archetype(CharacterArchetype.HERO)

# Get potential recruits
available_comps = npc_system.get_potential_companions()

# Get full details
char_report = npc_system.get_character_report(char_id)
creature_report = npc_system.get_creature_report(creature_id)
```

---

## Testing

Run the comprehensive demo:
```bash
python demo_federation_game_npcs.py
```

This runs 9 different demos showing:
1. NPC interactions and relationships
2. Companion recruitment and bonuses
3. Creature encounters and taming
4. Dialogue system
5. Faction integration
6. Antagonists
7. Turn advancement and events
8. Character archetypes
9. Complete gameplay scenario

---

## System Stats

**Characters**: 39 total
- 29 active
- 4 hidden/traveling
- 4 antagonists
- 10 recruitable companions

**Creatures**: 8 total
- 1 common
- 3 rare
- 3 legendary
- 1 mythic

**Archetypes**: 10 types
- Hero, Scholar, Rogue, Warrior, Mystic
- Leader, Sage, Wanderer, Deceiver, Guardian

**Factions**: All 8 represented

---

## No Installation Required

```python
# Just import and use!
from federation_game_npcs import build_npc_system
npc_system = build_npc_system()

# Zero external dependencies
# Works with Python 3.8+
```

---

## Ready to Use

The NPC system is complete, tested, and ready for integration into THE FEDERATION GAME. Every component is production-quality code with documentation.

Start creating emergent stories in your game world!
