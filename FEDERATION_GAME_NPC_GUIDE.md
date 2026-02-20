"""
FEDERATION GAME - NPC/CREATURE SYSTEM DOCUMENTATION
Complete guide to the character, companion, and creature systems
"""

# ============================================================================
# OVERVIEW
# ============================================================================

"""
THE FEDERATION NPC SYSTEM is a complete ecosystem for engaging, dynamic NPCs,
recruitable companions, and mystical creatures. It creates emergent storytelling
through personality-driven interactions, relationship dynamics, and gameplay
integration.

KEY FEATURES:
- 39+ unique NPCs with personality traits and backgrounds
- 10 recruitable companions with party bonuses
- 8+ mystical creatures from the mythic era
- Dynamic relationship tracking (-1.0 to 1.0 scale)
- Dialogue system with branching choices and consequences
- Faction integration
- Corruption and character evolution
- Random encounters
- Betrayal mechanics
- Creature taming and domestication
"""

# ============================================================================
# CORE CLASSES
# ============================================================================

"""
1. CHARACTER CLASS
   Base class for all NPCs

   Key Attributes:
   - char_id: Unique identifier
   - name: Character name
   - title: Role/profession
   - Personality (5 traits, 0.0-1.0):
     * loyalty: Faithful vs. self-interested
     * ambition: Power-seeking vs. content
     * wisdom: Thoughtful vs. reactive
     * charisma: Charming vs. isolated
     * cunning: Strategic vs. straightforward

   - affiliation: Faction membership (optional)
   - relationship_to_player: -1.0 (hostile) to 1.0 (devoted)
   - status: active, imprisoned, dead, traveling, hidden, missing, corrupted
   - personality_type: Archetype (Hero, Scholar, Rogue, Warrior, etc.)
   - current_quest: Active quest they're working on
   - skills: List of abilities
   - inventory: Items they possess

   Methods:
   - interact(action, player_id, turn): Engage with character
   - get_personality_summary(): Return all traits as dict


2. COMPANION CLASS (Extends Character)
   NPCs who can join the player's party with gameplay bonuses

   Key Attributes:
   - can_join_player_party: Boolean flag
   - is_recruited: Whether in active party
   - companion_bonus: Type of bonus (morale, research, combat, etc.)
   - bonus_value: Bonus percentage (default 0.15 = 15%)
   - personality_quirks: List of behavioral traits
   - special_ability: Unique action they can perform
   - betrayal_risk: Chance of betrayal (0.0-1.0)

   Methods:
   - get_party_bonus(): Return bonus stats
   - check_betrayal(turn, morale): Evaluate betrayal chance


3. CREATURE CLASS
   Mystical beings that can be encountered and tamed

   Key Attributes:
   - creature_id: Unique identifier
   - name: Creature name
   - creature_type: Type (Sky-Furk, Plasma-Kite, etc.)
   - rarity: common, rare, legendary, mythic
   - size: Tiny to Enormous
   - intelligence: 0.0 (animal) to 1.0 (sentient)
   - danger_level: 0.0 (docile) to 1.0 (deadly)
   - domestication_level: How easily tamed (0.0-1.0)
   - special_ability: Unique powers
   - habitat: Where it's found
   - lore: Creature mythology
   - gameplay_bonuses: Dict of bonus types and values
   - is_tamed: Whether in player's collection
   - affinity_level: -1.0 to 1.0, affects taming chance

   Methods:
   - attempt_tame(player_charisma, turn): Try to tame


4. NPC SYSTEM CLASS
   Master system managing all characters, companions, creatures

   Key Methods:
   - register_character(character): Add NPC to system
   - register_companion(companion): Add recruitable companion
   - register_creature(creature): Add mystical creature
   - spawn_random_encounter(location): Random NPC or creature
   - get_potential_companions(): List recruitable companions
   - recruit_companion(player_id, companion_id): Add to party
   - interact_with_character(player_id, char_id, action, turn): Engage NPC
   - change_relationship(player_id, char_id, delta): Modify relationship
   - encounter_creature(player_id, creature_id, charisma, turn): Tame attempt
   - get_character_dialogue(char_id, dialogue_id, reputation, status): Get dialogue
   - get_character_report/get_creature_report(id): Detailed info
   - advance_turn(): Process turn events (corruption, betrayal, rumors)
"""

# ============================================================================
# CHARACTER ARCHETYPES
# ============================================================================

"""
The system includes 10 character archetypes, each with distinct traits:

1. HERO
   - Courageous, noble, inspiring
   - High loyalty, charisma, wisdom
   - Example: Captain Valor (Companion)

2. SCHOLAR
   - Intellectual, curious, studious
   - High wisdom, variable loyalty
   - Example: Archimedes Prime (Historical Figure)

3. ROGUE
   - Cunning, self-serving, charming
   - High cunning, charisma, ambition
   - Example: Shadowborn (Companion)

4. WARRIOR
   - Strength-focused, honor, combat-skilled
   - High ambition, charisma
   - Example: Thorg Ironhammer (Companion)

5. MYSTIC
   - Spiritual, prophetic, mysterious
   - High wisdom, variable other traits
   - Example: The Void Oracle (Antagonist)

6. LEADER
   - Commanding, strategic, diplomatic
   - High charisma, ambition
   - Example: Ambassador Silven (Faction Leader)

7. SAGE
   - Wise, peaceful, philosophical
   - Very high wisdom, low ambition
   - Example: The Hermit (Mysterious)

8. WANDERER
   - Adventurous, unpredictable, curious
   - Variable traits, high ambition
   - Example: Scout Aria (Companion)

9. DECEIVER
   - Manipulative, ambitious, ruthless
   - High cunning, ambition, low loyalty
   - Example: Lord Malaxis (Antagonist)

10. GUARDIAN
    - Protective, steadfast, traditional
    - High loyalty, wisdom
    - Example: Brother Mercy (Companion)
"""

# ============================================================================
# COMPANION BONUSES
# ============================================================================

"""
When recruited, companions provide gameplay bonuses:

MORALE (+10-20%)
  - Boosts party morale and happiness
  - Helps recover from negative events
  - Examples: Captain Valor, Brother Mercy

RESEARCH (+20-30%)
  - Accelerates technology research
  - Increases breakthrough chance
  - Examples: Elara Moonwhisper, Dr. Sylas Cunningham

COMBAT (+20-25%)
  - Increases combat effectiveness
  - Reduces casualties
  - Examples: Thorg Ironhammer, Kyren Frostblade

DIPLOMACY (+20-25%)
  - Improves negotiations and treaties
  - Increases reputation gains
  - Example: Zephyr Silverspeak

EXPLORATION (+20-25%)
  - Speeds up world discovery
  - Reveals hidden locations
  - Example: Scout Aria

DEFENSE (+25-28%)
  - Reduces damage taken
  - Increases defensive structures
  - Example: Kyren Frostblade

STEALTH (+20-25%)
  - Improves covert operations
  - Increases evasion
  - Examples: Lyra Swiftwind, Shadowborn

SPECIAL ABILITIES
  Each companion has a unique ability:
  - Swift Strike (extra damage)
  - Shield Bash (stun enemies)
  - Lunar Prophecy (predict events)
  - Inspiring Presence (boost morale)
  - Technological Breakthrough (research boost)
  - Frozen Bastion (damage reduction)
  - Silver Tongue (improve negotiations)
  - Pathfinding (discover shortcuts)
  - Healing Touch (restore health)
  - Shadow Clone (create decoys)
"""

# ============================================================================
# CREATURE TYPES
# ============================================================================

"""
SKY-FURK (Common)
  - Fluffy, winged sky-dwellers
  - Friendly, aids travel
  - Bonuses: +25% movement speed, +15% travel safety
  - Helps with: Travel, escape

PLASMA-KITE (Legendary)
  - Manta-shaped light beings
  - Rare, boosts research
  - Bonuses: +40% research speed, +20% breakthrough chance
  - Helps with: Research, crisis

THRUMBACK (Rare)
  - Giant reptilian birds
  - Powerful, aids combat
  - Bonuses: +50% combat power, +25% defense
  - Helps with: Battle, protection

CLOUD-GNASHER (Rare)
  - Fluffy but dangerous
  - Affects morale
  - Bonuses: +30% morale, +20% inspiration
  - Helps with: Morale, overcoming despair

VOID-SKIPPER (Rare)
  - Translucent, shy beings
  - Aids exploration and stealth
  - Bonuses: +45% stealth, +35% escape chance
  - Helps with: Exploration, danger

DREAM-WYRM (Legendary)
  - Ethereal prophecy serpents
  - Appears during visions
  - Bonuses: +50% prophecy accuracy, +35% consciousness
  - Helps with: Prophecy, solutions

HARMONIC-MAW (Mythic)
  - Ancient antagonist creature
  - Massive and intelligent
  - Bonuses: +100% power, +50% invulnerability
  - Helps with: Ultimate battles

PRISM-ASSEMBLY (Legendary)
  - Sentient light-beings
  - Collective consciousness
  - Bonuses: +30% diplomacy, +40% faction unity, +35% knowledge
  - Helps with: Diplomacy, bringing factions together
"""

# ============================================================================
# PRE-BUILT CHARACTERS (39 Total)
# ============================================================================

"""
HISTORICAL FIGURES (5):
  1. Archimedes Prime - Chief Mathematician
  2. Commander Valorix - General of First Fleet
  3. Philosopher Zenith - Keeper of Wisdom
  4. Ambassador Silven - Master Diplomat
  5. Conquistador Drake - Explorer

FACTION LEADERS (8):
  1. Chancellor Harmony (Diplomatic Corps)
  2. Marshal Ironbound (Military Command)
  3. Maestro Celestia (Cultural Ministry)
  4. Dr. Prometheus (Research Division)
  5. Oracle Vex (Consciousness Collective)
  6. Merchant-Prince Aurelius (Economic Council)
  7. Captain Frontier (Exploration Initiative)
  8. Archivist Eternal (Preservation Society)

COMPANION CANDIDATES (10):
  1. Lyra Swiftwind - Rogue Archer (Stealth)
  2. Thorg Ironhammer - Dwarf Warrior (Combat)
  3. Elara Moonwhisper - Moon Mage (Research)
  4. Captain Valor - War Hero (Morale)
  5. Dr. Sylas Cunningham - Brilliant Scientist (Research)
  6. Kyren Frostblade - Frost Knight (Defense)
  7. Zephyr Silverspeak - Diplomat's Aide (Diplomacy)
  8. Scout Aria - Wilderness Guide (Exploration)
  9. Brother Mercy - Healer Monk (Morale)
  10. Shadowborn - Mysterious Assassin (Stealth)

ANTAGONISTS (4):
  1. Lord Malaxis - Dark Tyrant
  2. The Void Oracle - Harbinger of Chaos
  3. Baroness Greed - Economic Overlord
  4. General Devastation - War Machine

MYSTERIOUS FIGURES (6):
  1. The Wanderer - Traveler Between Worlds
  2. The Jester - Cosmic Comedian
  3. The Hermit - Isolated Sage
  4. The Spectre - Ghost of the Past
  5. The Trickster - Fate's Gambler
  6. The Oracle - Seer of Futures

UNIQUE NPCS (6):
  1. Keeper of the Null - Void Custodian
  2. The Cartographer - Mapper of Possibility
  3. Solace Heartmend - Counselor of Sorrows
  4. Cipher - Code-Breaker
  5. Tempus - Time-Touched
  6. Paradox - Living Contradiction
"""

# ============================================================================
# DIALOGUE SYSTEM
# ============================================================================

"""
The dialogue engine enables branching conversations with NPCs:

DialogueNode Structure:
  - id: Unique identifier
  - speaker: Character name
  - text: Dialogue text
  - context: Situation description
  - options: List of available choices

DialogueOption Structure:
  - id: Unique identifier
  - text: Player response text
  - requires_reputation: Minimum relationship (0.0-1.0)
  - requires_status: Character status requirement
  - affects_loyalty: Relationship change (-1.0 to 1.0)
  - response: NPC response text
  - next_dialogue_id: Follow-up dialogue

Usage Example:
  # Create dialogue
  greeting = DialogueNode(
      id="greeting_001",
      speaker="Ambassador Silven",
      text="Greetings, friend.",
      options=[
          DialogueOption(
              id="opt_001",
              text="I need your help",
              affects_loyalty=0.1,
              response="Of course, what do you need?"
          )
      ]
  )

  # Register
  npc_system.register_dialogue(greeting)

  # Use
  dialogue = npc_system.get_character_dialogue(
      "char_004",
      "greeting_001",
      player_reputation=0.5,
      character_status=CharacterStatus.ACTIVE
  )
"""

# ============================================================================
# RELATIONSHIP MECHANICS
# ============================================================================

"""
RELATIONSHIP SCALE (-1.0 to 1.0):
  -1.0  = Sworn enemy, will attack
  -0.5  = Hostile, won't cooperate
   0.0  = Neutral, indifferent
  +0.3  = Minimum for companion recruitment
  +0.5  = Friendly, willing to help
  +0.8  = Close ally
  +1.0  = Devoted follower

RELATIONSHIP CHANGES:
  Gifts:           +0.05 to +0.15
  Conversations:   -0.2 to +0.2 (depends on dialogue choice)
  Quest completion: +0.1 to +0.3
  Betrayal:        -0.5 to -1.0
  Time passing:    ±0.01-0.03 per turn (influenced by personality)

LOYALTY (for Companions):
  0.0-0.3  = High betrayal risk (will leave under pressure)
  0.3-0.6  = Moderate risk (might turn on you)
  0.6-0.8  = Reliable (generally faithful)
  0.8-1.0  = Devoted (will follow to death)
"""

# ============================================================================
# CORRUPTION SYSTEM
# ============================================================================

"""
Characters can become corrupted through various means:

CORRUPTION LEVELS:
  0.0      = Pure
  0.3-0.6  = Compromised
  0.6-1.0  = Corrupted

EFFECTS:
  - Increased deception and cunning
  - Reduced loyalty to faction/player
  - Activation of dark abilities
  - Risk of becoming antagonist
  - Status eventually changes to "corrupted"

CORRUPTION GROWTH:
  - Naturally grows 0.01-0.05 per turn for corrupted characters
  - Can increase through dialogue choices
  - Contact with corrupted entities spreading corruption

VISIBLE CHARACTERS:
  - Lord Malaxis: 80% corruption
  - The Void Oracle: 100% corruption
  - Baroness Greed: 60% corruption
  - General Devastation: 50% corruption
"""

# ============================================================================
# TURN MECHANICS
# ============================================================================

"""
Each turn (advance_turn()), the system processes:

1. CORRUPTION GROWTH
   - Corrupted characters grow more corrupted
   - Full corruption triggers status change

2. COMPANION BETRAYAL
   - Check each recruited companion
   - Risk increases with low loyalty and morale

3. RUMOR SPREADING
   - Rumors about characters spread (0-1.0)
   - Affects how others perceive character
   - Can reveal secrets or create false stories

4. CHARACTER EVENTS
   - Generate narrative events
   - Return list of (type, character, message)
   - Examples: "character_corruption", "companion_betrayal"

TURN ADVANCEMENT:
  for turn in range(1, max_turns + 1):
      events = npc_system.advance_turn()
      for event in events:
          handle_event(event)
"""

# ============================================================================
# INTEGRATION WITH FACTIONS
# ============================================================================

"""
NPCs are integrated with the faction system:

FACTION AFFILIATIONS:
  - Each NPC can belong to a faction
  - Faction leaders are key NPCs
  - Faction quests often involve NPCs

JOINING A FACTION:
  faction_system.join_faction(player_id, faction_id)

  # Automatically meet faction NPCs
  npc_system.get_characters_by_faction(faction_id)

REPUTATION ALIGNMENT:
  - Player faction reputation affects NPC relationships
  - Antagonists oppose player's faction
  - Faction bonuses stack with companion bonuses

USAGE EXAMPLE:
  # Player joins Diplomatic Corps
  join_faction(player, "diplomatic_corps")

  # Meet faction leader
  leader = npc_system.characters["char_101"]

  # Gain faction rep -> NPC reputation improves
  gain_faction_reputation(faction, 0.2)
"""

# ============================================================================
# QUEST INTEGRATION
# ============================================================================

"""
NPCs can be involved in quests:

NPC QUESTS:
  - Character may have current_quest
  - Player can help/hinder quest completion
  - Rewards reputation and items

QUEST TYPES:
  - Personal: Help NPC with personal goal
  - Faction: NPC involved in faction quest
  - Companion: Recruitment quest
  - Investigation: Learn NPC secrets

QUEST EFFECTS:
  - Completing NPC quests increases relationship
  - Interfering decreases relationship dramatically
  - Some quests unlock dialogue options

USAGE:
  # Check current quest
  if char.current_quest:
      quest = get_quest(char.current_quest)
      help_with_quest(quest)  # +rep

  # Completion
  if quest_complete:
      complete_quest(player, char, quest)
      relationship toward character increases
"""

# ============================================================================
# COMPLETE USAGE EXAMPLE
# ============================================================================

"""
from federation_game_npcs import (
    build_npc_system, DialogueNode, DialogueOption, CharacterStatus
)
from federation_game_factions import build_faction_system

# Initialize systems
npc_system = build_npc_system()
faction_system = build_faction_system()
player_id = "player_001"

# === SETUP ===
# Player joins a faction
faction_system.join_faction(player_id, "exploration_initiative")

# === ENCOUNTER NPC ===
# Meet a companion candidate
scout_aria = npc_system.companions["comp_008"]
print(f"Met {scout_aria.name}")

# === INTERACT ===
# Gift to increase relationship
npc_system.interact_with_character(player_id, "comp_008", "gift", turn=1)

# === DIALOGUE ===
# Create dialogue
dialogue = DialogueNode(
    id="aria_greeting",
    speaker="Scout Aria",
    text="Hello, traveler. Do you need a guide?",
    options=[...]
)
npc_system.register_dialogue(dialogue)

# === RECRUIT ===
# Get dialogue response
dialogue_result = npc_system.get_character_dialogue(
    "comp_008",
    "aria_greeting",
    player_reputation=0.5
)

# === PARTY BONUS ===
# After recruitment at relationship >= 0.3
success, msg = npc_system.recruit_companion(player_id, "comp_008")
if success:
    bonus = scout_aria.get_party_bonus()
    # Apply: +23% exploration speed

# === CREATURES ===
# Encounter creatures
encounter = npc_system.spawn_random_encounter()

# Tame if appropriate
result = npc_system.encounter_creature(
    player_id,
    "creature_001",
    player_charisma=0.75,
    turn=5
)

# === TURN ADVANCEMENT ===
# Process character events
events = npc_system.advance_turn()
for event in events:
    if event['type'] == 'companion_betrayal':
        handle_betrayal(event['character'])

# === RELATIONSHIP CHANGE ===
# Improve relationship over time
new_rep = npc_system.change_relationship(player_id, "comp_008", 0.1)
"""

# ============================================================================
# TIPS FOR GAME DESIGNERS
# ============================================================================

"""
1. USE PERSONALITY MECHANICS
   - Loyalty characters are reliable but might bore players
   - Ambitious characters have hidden agendas
   - Wise characters provide counsel
   - Create personality combinations for depth

2. BALANCE COMPANION BONUSES
   - Don't recruit everyone (forces choices)
   - Some bonuses should conflict
   - Betrayal risk should increase with poor loyalty
   - Special abilities enable creative solutions

3. CREATE QUESTLINES
   - Link companion recruitment to quests
   - Make NPC quests affect faction standing
   - Allow multiple solutions through different NPCs
   - Reward player's relationship choices

4. USE ANTAGONISTS AS CONTRAST
   - High ambition/cunning but low loyalty/wisdom
   - Create corruption arcs for tragic turns
   - Make alliances with antagonists costly
   - Show consequences of player's choices

5. CREATURE ENCOUNTERS
   - Rare creatures are memorable encounters
   - Taming should feel like achievement
   - Different creatures help with different situations
   - Legendary creatures unlock endgame options

6. DIALOGUE CONSEQUENCES
   - Make dialogue choices matter long-term
   - Show character's personality in responses
   - Create divergent story paths from choices
   - Repeated interactions should deepen relationships

7. TURN EVENTS
   - Use corruption/betrayal for drama
   - Create emergent stories from random events
   - Let rumors spread and create complications
   - Balance positive and negative events
"""

# ============================================================================
# SYSTEM STATISTICS
# ============================================================================

"""
TOTAL NPCs: 39
  - Active: 29
  - Hidden/Traveling: 4
  - Antagonists: 4
  - Companions: 10 (also in main NPC list)

PERSONALITY DISTRIBUTION:
  - Loyalty: Mean 0.65, Range 0.0-0.95
  - Ambition: Mean 0.58, Range 0.0-0.98
  - Wisdom: Mean 0.70, Range 0.3-0.98
  - Charisma: Mean 0.68, Range 0.0-0.95
  - Cunning: Mean 0.62, Range 0.2-0.95

ARCHETYPE DISTRIBUTION:
  - Mystic: 6
  - Rogue: 6
  - Scholar: 5
  - Warrior: 5
  - Guardian: 5
  - Hero: 2
  - Leader: 3
  - Wanderer: 3
  - Sage: 2
  - Deceiver: 2

CREATURES: 8
  - Common: 1
  - Rare: 3
  - Legendary: 3
  - Mythic: 1

COMPANION BONUSES:
  - Morale: 3
  - Research: 2
  - Combat: 2
  - Diplomacy: 1
  - Exploration: 1
  - Defense: 1
  - Stealth: 2

FACTION AFFILIATIONS:
  - Diplomatic Corps: 2
  - Military Command: 2
  - Cultural Ministry: 1
  - Research Division: 2
  - Consciousness Collective: 2
  - Economic Council: 1
  - Exploration Initiative: 2
  - Preservation Society: 1
"""

# ============================================================================
# FILE STRUCTURE
# ============================================================================

"""
Files in the NPC System:

1. federation_game_npcs.py (PRIMARY)
   - All classes and systems
   - 1500+ lines of code
   - Ready for production use
   - Fully self-contained

2. demo_federation_game_npcs.py (EXAMPLES)
   - 9 comprehensive demos
   - Integration examples
   - Usage patterns
   - System verification

3. This Documentation
   - Complete API reference
   - Integration guide
   - Design patterns
   - Tips and examples

DEPENDENCIES:
  - Python 3.8+
  - Standard library only (no external dependencies)
  - Compatible with federation_game_factions.py
  - Can integrate with federation_game_events.py
"""

# ============================================================================
# NEXT STEPS
# ============================================================================

"""
To use the NPC system in your game:

1. Import the system:
   from federation_game_npcs import build_npc_system
   npc_system = build_npc_system()

2. Initialize player relationships:
   npc_system.player_relationships[player_id] = {}

3. Create encounters:
   encounter = npc_system.spawn_random_encounter()

4. Handle interactions:
   result = npc_system.interact_with_character(
       player_id, char_id, action, turn
   )

5. Manage companions:
   if relationship >= 0.3:
       recruit_companion(player_id, char_id)
   bonus = companion.get_party_bonus()

6. Process creatures:
   result = npc_system.encounter_creature(
       player_id, creature_id, player_charisma, turn
   )

7. Advance time:
   events = npc_system.advance_turn()

8. Query reports:
   char_report = npc_system.get_character_report(char_id)
   creature_report = npc_system.get_creature_report(creature_id)
"""

if __name__ == "__main__":
    print(__doc__)
