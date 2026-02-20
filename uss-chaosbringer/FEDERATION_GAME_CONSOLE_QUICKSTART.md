# Federation Game Console - Quick Start Guide

## Installation & Launch

### Prerequisites
- Python 3.8+
- Windows/Linux/Mac compatible

### Running the Console

```bash
# Navigate to the uss-chaosbringer directory
cd uss-chaosbringer

# Launch the game
python federation_game_console.py
```

You should see the banner:
```
================================================================================
║                   THE FEDERATION GAME
║          Command the USS Chaosbringer to Federation Glory
================================================================================
```

---

## Your First Game (5 Minutes)

### Step 1: Create a New Game
```
Federation> new
  Federation Name [USS Chaosbringer]: My Federation
  Commander Name [Captain]: Commander Solo
```

### Step 2: Check Federation Status
```
[Turn 0] Commander Solo> status
```

You'll see your federation's core metrics:
- Morale, Stability, Technology
- Treasury, Population, Territory
- Current Strategy and Turn

### Step 3: Play Your First Turn
```
[Turn 0] Commander Solo> turn advance
```

Watch your technology improve and treasury grow!

### Step 4: Set Your Strategy
```
[Turn 1] Commander Solo> strategy diplomacy
```

Now your diplomacy actions are more effective.

### Step 5: Establish Relations
```
[Turn 1] Commander Solo> diplomacy ally Rome
```

Rome is now your ally! Check your status again to see it reflected.

### Step 6: Explore Consciousness
```
[Turn 2] Commander Solo> dream interpret
```

Your federation becomes slightly more conscious.

### Step 7: Spawn a Rival
```
[Turn 3] Commander Solo> rival spawn Athens
```

Create competition for your federation.

### Step 8: Save Your Progress
```
[Turn 5] Commander Solo> save my_first_game
```

Game saved! You can load it anytime with: `load my_first_game`

---

## Essential Commands

### Get Help Anytime
```
help              # Show all available commands
status            # Check federation status
stats             # See your gameplay statistics
```

### Core Gameplay
```
turn advance      # Play one turn
turn auto 5       # Auto-play 5 turns
strategy [type]   # Set strategy (expand, defend, diplomacy, research, culture, hybrid)
```

### Interact with Game Systems
```
diplomacy         # Show diplomacy menu
dream             # Show consciousness status
rival             # Show rival status
prophecy          # Show prophecies
chaos             # Trigger random event
```

### Save & Load
```
save [name]       # Save your game
load [name]       # Load a saved game
load              # List all saves
```

### Exit Game
```
exit              # Exit (will prompt to save)
```

---

## Beginner Tips

### 1. Play Turns Strategically
Each turn advances your technology and economy. Play more turns to grow stronger before confronting rivals.

### 2. Choose Your Strategy Wisely
- **DIPLOMACY** - Best for peaceful alliances
- **EXPAND** - Best for territorial growth
- **RESEARCH** - Best for tech advantage
- **HYBRID** - Jack of all trades, master of none

### 3. Manage Relationships
Your diplomacy relationships affect your success:
- HOSTILE (red) - War is likely
- TENSE (yellow) - Be careful
- NEUTRAL (gray) - No effect
- FRIENDLY (blue) - Trade benefits
- ALLIED (green) - Full support

### 4. Monitor Statistics
Check your stats periodically to see your impact:
```
stats
```

### 5. Save Before Major Decisions
Save before spawning rivals or declaring war:
```
save before_war
```

Then you can reload if things go wrong.

### 6. Use Auto-Play for Grinding
Skip boring turns with auto-play:
```
turn auto 20
```

Let 20 turns happen automatically while you relax.

### 7. Experiment with Chaos
Use chaos to inject randomness:
```
chaos
```

Sometimes good things happen!

---

## Common Gameplay Scenarios

### Scenario 1: Peaceful Economic Victory
```
strategy research          # Focus on technology
turn auto 50              # Auto-play 50 turns
status                    # Check your tech level
```

### Scenario 2: Diplomatic Coalition
```
strategy diplomacy
diplomacy ally Rome
diplomacy ally Egypt
diplomacy ally Greece
# Build alliances with multiple civilizations
```

### Scenario 3: Military Conquest
```
strategy expand
rival spawn Barbarians
rival spawn Vandals
rival spawn Huns
# Create rivals then defeat them
```

### Scenario 4: Consciousness Evolution
```
dream interpret
dream integrate
dream trigger
# Develop your federation's internal consciousness
```

### Scenario 5: Prophecy-Driven Strategy
```
prophecy generate
prophecy generate
prophecy generate
# Generate multiple prophecies
# Adjust strategy based on prophecies
```

---

## Game State Visualization

Every status report shows your progress:

```
FEDERATION STATUS REPORT

Morale            [████████░░░░░░░░░░░░░░░░]  40%
Identity          [██████░░░░░░░░░░░░░░░░░░░]  25%
Stability         [███████░░░░░░░░░░░░░░░░░░]  35%
Technology        [████████████████░░░░░░░░░░]  65%
Military Power    [█████████░░░░░░░░░░░░░░░░]  45%

Treasury: 2500 credits
Population: 10000 million
Territory: 150.0 light-years
```

Each bar represents a 0-100% scale. Aim to grow all of them!

---

## Advanced Gameplay

### Hybrid Mode
Mix interactive and auto-play:
```
[Turn 10] Commander> turn auto 10
[Turn 20] Commander> diplomacy ally Rome
[Turn 21] Commander> turn auto 20
# Alternate between automated and manual play
```

### Strategic Checkpoint Saves
```
save strategy_1_turn_50
# Try something, play some turns
turn auto 50
# Not working? Load checkpoint and try differently
load strategy_1_turn_50
save strategy_2_turn_50
```

### Subsystem Focus
Play multiple games with different focuses:

**Game 1: Consciousness Focus**
```
dream interpret
dream integrate
dream trigger
# Keep developing consciousness
```

**Game 2: Diplomacy Focus**
```
diplomacy [propose|ally|negotiate] [civilization]
# Build diplomatic web
```

**Game 3: Conquest Focus**
```
rival spawn [name]
rival simulate
# Create and manage rivals
```

---

## Troubleshooting

### Command Not Found
```
✗ Unknown command: mycommand
ℹ Type 'help' for available commands
```

Solution: Use `help` to see all 14 commands.

### Invalid Strategy
```
✗ Unknown strategy: badstrategy
ℹ Valid strategies: expand, defend, diplomacy, research, culture, hybrid
```

Solution: Use one of the 6 valid strategies.

### Save File Not Found
```
✗ Save file not found: my_game
```

Solution: Use `load` with no arguments to list available saves.

---

## Commands Reference Card

```
CORE              status, strategy, turn, new, exit
DIPLOMACY         diplomacy [propose|ally|declare_war|demand|negotiate|break]
CONSCIOUSNESS     dream [interpret|integrate|trigger]
RIVALS            rival [spawn|simulate|watch|engage]
PROPHECY          prophecy [generate|interpret]
CHAOS             chaos [surprise]
MANAGEMENT        save, load, stats, help
```

---

## What's Next?

After mastering the basics:

1. **Try Different Strategies** - Each has unique effects
2. **Multi-Faction Games** - Create 5+ rivals and manage them
3. **Long Games** - Play 100+ turns and see your federation evolve
4. **Optimization** - What's the fastest way to win?
5. **Roleplay** - Create a narrative for your federation

---

## Getting Help

### In-Game Help
```
help                       # Show all commands
diplomacy                  # Show diplomacy actions
dream                      # Show consciousness actions
rival                      # Show rival actions
prophecy                   # Show prophecy actions
```

### Check Documentation
- `FEDERATION_GAME_CONSOLE_README.md` - Full command reference
- `FEDERATION_GAME_CONSOLE_IMPLEMENTATION.md` - Technical details
- `demo_federation_game_console.py` - Run to see all features

---

## Have Fun!

THE FEDERATION GAME is designed to be:
- **Strategic** - Make meaningful decisions
- **Immersive** - Experience your federation's evolution
- **Flexible** - Play how you want
- **Expandable** - Easy to add new features

Now go forth and lead your federation to glory!

```
[Turn 0] Your Commander>
```

What will be your first action?

---

*Federation Game Console Quick Start*
*Version 1.0 - 2026-02-19*
