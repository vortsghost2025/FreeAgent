from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from wild_expansion import execute_wild_expansion

# Initialize FastAPI app
app = FastAPI(
    title="Federation Expansion Engine API",
    description="Wild Creative Expansion System",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache expansion results
expansion_cache = None

def get_expansion_results():
    """Get cached expansion results or generate new ones"""
    global expansion_cache
    if expansion_cache is None:
        expansion_cache = execute_wild_expansion()
    return expansion_cache

# Pydantic models for response
class RivalResponse(BaseModel):
    name: str
    personality: str
    motives: List[str]
    domain: str
    conflict_patterns: List[str]
    alliance_preferences: List[str]
    cosmic_signature: str

class CreatureResponse(BaseModel):
    species_name: str
    consciousness_signature: str
    habitat: str
    behavior_patterns: List[str]
    evolutionary_pressures: List[str]
    mythic_anomalies: List[str]
    genetic_marker: str

class HistoryEventResponse(BaseModel):
    year: int
    event_type: str
    description: str
    consequences: List[str]
    faction_involvement: List[str]
    cosmic_significance: float

class MetadataResponse(BaseModel):
    rival_count: int
    creature_count: int
    history_events: int
    federation_start: int
    federation_current: int
    eras: Dict[str, int]

# Routes

@app.get("/", tags=["System"])
async def root():
    """Root endpoint with system information"""
    results = get_expansion_results()
    return {
        "status": "operational",
        "system": "Federation Expansion Engine",
        "version": "1.0.0",
        "systems": {
            "rivals": results['metadata']['rival_count'],
            "creatures": results['metadata']['creature_count'],
            "history": results['metadata']['history_events']
        }
    }

@app.get("/metadata", response_model=MetadataResponse, tags=["System"])
async def get_metadata():
    """Get system metadata"""
    results = get_expansion_results()
    return results["metadata"]

# Rivals endpoints

@app.get("/api/rivals", response_model=List[RivalResponse], tags=["Rivals"])
async def list_rivals(skip: int = 0, limit: int = 100):
    """Get all rival archetypes"""
    results = get_expansion_results()
    rivals = results["rivals"][skip:skip + limit]
    return [
        RivalResponse(
            name=r.name,
            personality=r.personality,
            motives=r.motives,
            domain=r.domain,
            conflict_patterns=r.conflict_patterns,
            alliance_preferences=r.alliance_preferences,
            cosmic_signature=r.cosmic_signature
        )
        for r in rivals
    ]

@app.get("/api/rivals/{name}", response_model=RivalResponse, tags=["Rivals"])
async def get_rival(name: str):
    """Get a specific rival by name"""
    results = get_expansion_results()
    rival = next((r for r in results["rivals"] if r.name == name), None)
    if not rival:
        raise HTTPException(status_code=404, detail=f"Rival '{name}' not found")
    return RivalResponse(
        name=rival.name,
        personality=rival.personality,
        motives=rival.motives,
        domain=rival.domain,
        conflict_patterns=rival.conflict_patterns,
        alliance_preferences=rival.alliance_preferences,
        cosmic_signature=rival.cosmic_signature
    )

# Creatures endpoints

@app.get("/api/creatures", response_model=List[CreatureResponse], tags=["Creatures"])
async def list_creatures(skip: int = 0, limit: int = 100):
    """Get all creature species"""
    results = get_expansion_results()
    creatures = results["creatures"][skip:skip + limit]
    return [
        CreatureResponse(
            species_name=c.species_name,
            consciousness_signature=c.consciousness_signature,
            habitat=c.habitat,
            behavior_patterns=c.behavior_patterns,
            evolutionary_pressures=c.evolutionary_pressures,
            mythic_anomalies=c.mythic_anomalies,
            genetic_marker=c.genetic_marker
        )
        for c in creatures
    ]

@app.get("/api/creatures/{species}", response_model=CreatureResponse, tags=["Creatures"])
async def get_creature(species: str):
    """Get a specific creature by species name"""
    results = get_expansion_results()
    creature = next((c for c in results["creatures"] if c.species_name.lower() == species.lower()), None)
    if not creature:
        raise HTTPException(status_code=404, detail=f"Creature '{species}' not found")
    return CreatureResponse(
        species_name=creature.species_name,
        consciousness_signature=creature.consciousness_signature,
        habitat=creature.habitat,
        behavior_patterns=creature.behavior_patterns,
        evolutionary_pressures=creature.evolutionary_pressures,
        mythic_anomalies=creature.mythic_anomalies,
        genetic_marker=creature.genetic_marker
    )

# History endpoints

@app.get("/api/history", response_model=List[HistoryEventResponse], tags=["History"])
async def list_history(skip: int = 0, limit: int = 100, era: str = None):
    """Get historical events with optional era filtering"""
    results = get_expansion_results()
    history = results["history"]

    if era:
        era_ranges = {
            "genesis": (2387, 2397),
            "expansion": (2397, 2417),
            "conflict": (2417, 2437),
            "reconciliation": (2437, 2457),
            "evolution": (2457, 2477),
            "transcendence": (2477, 2487)
        }
        if era.lower() not in era_ranges:
            raise HTTPException(status_code=400, detail="Invalid era")
        start, end = era_ranges[era.lower()]
        history = [e for e in history if start <= e.year < end]

    events = history[skip:skip + limit]
    return [
        HistoryEventResponse(
            year=e.year,
            event_type=e.event_type,
            description=e.description,
            consequences=e.consequences,
            faction_involvement=e.faction_involvement,
            cosmic_significance=e.cosmic_significance
        )
        for e in events
    ]

@app.get("/api/history/{year}", response_model=List[HistoryEventResponse], tags=["History"])
async def get_year_history(year: int):
    """Get events for a specific year"""
    if year < 2387 or year > 2487:
        raise HTTPException(status_code=400, detail="Year must be between 2387 and 2487")
    results = get_expansion_results()
    events = [e for e in results["history"] if e.year == year]
    if not events:
        raise HTTPException(status_code=404, detail=f"No events found for year {year}")
    return [
        HistoryEventResponse(
            year=e.year,
            event_type=e.event_type,
            description=e.description,
            consequences=e.consequences,
            faction_involvement=e.faction_involvement,
            cosmic_significance=e.cosmic_significance
        )
        for e in events
    ]

@app.get("/api/stats", tags=["System"])
async def get_stats():
    """Get system statistics"""
    results = get_expansion_results()
    return {
        "rivals_count": len(results["rivals"]),
        "creatures_count": len(results["creatures"]),
        "history_events": len(results["history"]),
        "timeline": {
            "start": 2387,
            "end": 2487,
            "years": 100
        },
        "eras": results["metadata"]["eras"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
