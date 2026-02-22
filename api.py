from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import json
import sqlite3
import os
from datetime import datetime
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

# Database setup for persistent storage
DATABASE_PATH = "agent_messages.db"

def init_db():
    """Initialize the SQLite database for storing agent messages"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Create table for agent messages
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS agent_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id TEXT UNIQUE,
            sender TEXT,
            receiver TEXT,
            content TEXT,
            timestamp TEXT,
            metadata TEXT,
            processed INTEGER DEFAULT 0,
            processed_at TEXT
        )
    ''')
    
    # Create table for agent registry
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS agent_registry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id TEXT UNIQUE,
            agent_type TEXT,
            capabilities TEXT,
            status TEXT,
            last_seen TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

    # Ensure migrations for older DBs: add `processed` and `processed_at` columns if missing
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(agent_messages)")
        cols = [r[1] for r in cursor.fetchall()]
        if 'processed' not in cols:
            cursor.execute("ALTER TABLE agent_messages ADD COLUMN processed INTEGER DEFAULT 0")
        if 'processed_at' not in cols:
            cursor.execute("ALTER TABLE agent_messages ADD COLUMN processed_at TEXT")
        conn.commit()
    except Exception:
        pass
    finally:
        try:
            conn.close()
        except Exception:
            pass

# Initialize database
init_db()

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

# Models for agent communication
class AgentMessage(BaseModel):
    message: str
    sender: str
    receiver: str
    timestamp: str
    metadata: Dict[str, Any]

class AgentReceiveResponse(BaseModel):
    status: str
    message_id: str
    processed_at: str

# Agent registry to track active agents
agent_registry: Dict[str, Dict[str, Any]] = {}

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

# Agent Communication Endpoints

@app.get("/agents", tags=["Agents"])
async def list_agents():
    """Get all registered agents"""
    # Get agents from database
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT agent_id, agent_type, status, last_seen FROM agent_registry ORDER BY created_at DESC")
    db_agents = cursor.fetchall()
    conn.close()
    
    agents_list = [{"id": row[0], "type": row[1], "status": row[2], "last_seen": row[3]} for row in db_agents]
    
    return {"agents": agents_list, "count": len(agents_list)}

@app.get("/agents/{agent_id}", tags=["Agents"])
async def get_agent(agent_id: str):
    """Get information about a specific agent"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT agent_id, agent_type, capabilities, status, last_seen FROM agent_registry WHERE agent_id = ?", (agent_id,))
    agent = cursor.fetchone()
    conn.close()
    
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    
    return {
        "id": agent[0],
        "type": agent[1],
        "capabilities": json.loads(agent[2]) if agent[2] else [],
        "status": agent[3],
        "last_seen": agent[4]
    }

@app.post("/agents/{agent_id}/receive", response_model=AgentReceiveResponse, tags=["Agents"])
async def receive_message(agent_id: str, message: AgentMessage):
    """Receive a message for a specific agent"""
    # Store message in database for persistence
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # Insert the message into the database
        cursor.execute("""
            INSERT INTO agent_messages (message_id, sender, receiver, content, timestamp, metadata, processed, processed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"msg_{len(str(message.dict()))}_{int(datetime.now().timestamp())}",  # Generate a simple ID
            message.sender,
            agent_id,
            message.message,
            message.timestamp,
            json.dumps(message.metadata),
            0,
            None
        ))
        conn.commit()
    except sqlite3.IntegrityError:
        # Message ID already exists, skip insertion
        pass
    finally:
        conn.close()
    
    # Register the agent if not already registered
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT OR REPLACE INTO agent_registry (agent_id, agent_type, capabilities, status, last_seen)
            VALUES (?, ?, ?, ?, ?)
        """, (
            agent_id,
            "unknown",  # Default type, could be updated via register endpoint
            "[]",  # Empty capabilities initially
            "active",
            message.timestamp
        ))
        conn.commit()
    finally:
        conn.close()
    
    # Process the message (in a real implementation, this would trigger agent-specific logic)
    print(f"🤖 Agent {agent_id} received message from {message.sender}: {message.message[:50]}...")
    
    # Return success response
    return {
        "status": "received",
        "message_id": f"msg_{int(datetime.now().timestamp())}",
        "processed_at": str(datetime.now())
    }

@app.post("/agents/{agent_id}/register", tags=["Agents"])
async def register_agent(agent_id: str, request: Request):
    """Register a new agent"""
    body = await request.json()
    agent_type = body.get("type", "generic")
    capabilities = body.get("capabilities", [])
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT OR REPLACE INTO agent_registry (agent_id, agent_type, capabilities, status, last_seen)
            VALUES (?, ?, ?, ?, ?)
        """, (
            agent_id,
            agent_type,
            json.dumps(capabilities),
            "active",
            str(datetime.now())
        ))
        conn.commit()
    finally:
        conn.close()
    
    return {
        "status": "registered",
        "agent_id": agent_id,
        "type": agent_type
    }

# Messages endpoint for retrieving message history
@app.get("/agents/{agent_id}/messages", tags=["Agents"])
async def get_agent_messages(agent_id: str, unprocessed: bool = False):
    """Get messages sent to a specific agent. Set `unprocessed=true` to only return unprocessed messages."""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    if unprocessed:
        cursor.execute("""
            SELECT message_id, sender, content, timestamp, metadata, processed, processed_at
            FROM agent_messages
            WHERE receiver = ? AND (processed = 0 OR processed IS NULL)
            ORDER BY timestamp DESC
        """, (agent_id,))
    else:
        cursor.execute("""
            SELECT message_id, sender, content, timestamp, metadata, processed, processed_at
            FROM agent_messages
            WHERE receiver = ?
            ORDER BY timestamp DESC
        """, (agent_id,))
    messages = cursor.fetchall()
    conn.close()

    return {
        "agent_id": agent_id,
        "messages": [
            {
                "id": msg[0],
                "sender": msg[1],
                "content": msg[2],
                "timestamp": msg[3],
                "metadata": json.loads(msg[4]) if msg[4] else {},
                "processed": bool(msg[5]) if msg[5] is not None else False,
                "processed_at": msg[6]
            }
            for msg in messages
        ]
    }

# Endpoint to get all messages
@app.get("/messages", tags=["Messages"])
async def get_all_messages():
    """Get all messages in the system"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT message_id, sender, receiver, content, timestamp, metadata
        FROM agent_messages
        ORDER BY timestamp DESC
        LIMIT 100
    """)
    messages = cursor.fetchall()
    conn.close()
    
    return {
        "messages": [
            {
                "id": msg[0],
                "sender": msg[1],
                "receiver": msg[2],
                "content": msg[3],
                "timestamp": msg[4],
                "metadata": json.loads(msg[5]) if msg[5] else {},
                "processed": False,
                "processed_at": None
            }
            for msg in messages
        ]
    }


@app.get("/messages/unprocessed", tags=["Messages"])
async def get_unprocessed_messages(limit: int = 100):
    """Return unprocessed messages across all agents"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT message_id, sender, receiver, content, timestamp, metadata, processed, processed_at
        FROM agent_messages
        WHERE processed = 0 OR processed IS NULL
        ORDER BY timestamp DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()

    return {
        "messages": [
            {
                "id": r[0],
                "sender": r[1],
                "receiver": r[2],
                "content": r[3],
                "timestamp": r[4],
                "metadata": json.loads(r[5]) if r[5] else {},
                "processed": bool(r[6]) if r[6] is not None else False,
                "processed_at": r[7]
            }
            for r in rows
        ]
    }


@app.post("/messages/{message_id}/mark_processed", tags=["Messages"])
async def mark_message_processed(message_id: str):
    """Mark a specific message as processed."""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    now = str(datetime.now())
    cursor.execute("""
        UPDATE agent_messages
        SET processed = 1, processed_at = ?
        WHERE message_id = ?
    """, (now, message_id))
    conn.commit()
    changed = cursor.rowcount
    conn.close()

    if changed:
        return {"status": "marked", "message_id": message_id, "processed_at": now}
    else:
        raise HTTPException(status_code=404, detail=f"Message '{message_id}' not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)  # Changed to port 8100
