# Federation Expansion Engine

**Wild Creative Expansion System** - A comprehensive generator for rival archetypes, creature taxonomy, and federation hidden history.

## System Components

### Core Modules

- **models.py** - Data structures for all systems
- **rivals.py** - Generate 12 rival archetypes
- **creatures.py** - Generate 10 creature species
- **history.py** - Generate 100 years of federation history (2387-2487)
- **wild_expansion.py** - Main orchestrator

### Utility Modules

- **serializer.py** - JSON serialization
- **cli.py** - Command-line interface

### Backend & Frontend

- **api.py** - FastAPI REST backend
- **expansion-explorer.html** - Interactive dashboard

## Generated Data

- **12 Rival Archetypes**
- **10 Creature Species**
- **100 Historical Events** across 6 eras

## Quick Start

```bash
# Run expansion
python wild_expansion.py

# CLI commands
python cli.py status
python cli.py export rivals
python cli.py export all --output federation.json

# Start API
python api.py
```

## Requirements

fastapi>=0.104.1
uvicorn>=0.24.0
pydantic>=2.5.0
