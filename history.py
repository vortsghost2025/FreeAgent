import random
from datetime import datetime
from models import HiddenHistoryEvent

def generate_hidden_history():
    """Generate 100 years of federation hidden history (2387-2487)"""
    events = []

    # Historical periods and their event distributions
    periods = {
        "Genesis Era (2387-2397)": {
            "years": range(2387, 2397),
            "event_weights": {
                "first_contact": 3, "treaty_negotiation": 2, "philosophical_shift": 2,
                "faction_formation": 3, "technological_breakthrough": 1
            }
        },
        "Expansion Era (2397-2417)": {
            "years": range(2397, 2417),
            "event_weights": {
                "alliance_formation": 3, "expansion_signal": 3, "conflict_emergence": 2,
                "technological_breakthrough": 2, "philosophical_dispute": 2
            }
        },
        "Conflict Era (2417-2437)": {
            "years": range(2417, 2437),
            "event_weights": {
                "internal_conflict": 3, "external_threat": 3, "faction_split": 2,
                "alliance_shift": 2, "breakthrough_resolution": 1
            }
        },
        "Reconciliation Era (2437-2457)": {
            "years": range(2437, 2457),
            "event_weights": {
                "peace_treaty": 3, "faction_merger": 2, "philosophical_synthesis": 2,
                "technological_integration": 2, "cultural_exchange": 2
            }
        },
        "Evolution Era (2457-2477)": {
            "years": range(2457, 2477),
            "event_weights": {
                "consciousness_expansion": 3, "new_capability": 3, "federation_deepening": 2,
                "rival_emergence": 2, "cosmic_anomaly": 1
            }
        },
        "Transcendence Era (2477-2487)": {
            "years": range(2477, 2487),
            "event_weights": {
                "transcendence_event": 2, "paradox_resolution": 2, "dimension_breach": 2,
                "prophecy_emergence": 2, "reality_shift": 2
            }
        }
    }

    event_descriptions = {
        "first_contact": [
            "First contact established with {entity}",
            "Made peaceful first contact with {entity}",
            "Discovered sentience in {entity}"
        ],
        "treaty_negotiation": [
            "Treaty of {place} successfully negotiated",
            "Historic accord reached with {entity}",
            "Peace agreement established with {entity}"
        ],
        "philosophical_shift": [
            "Federation adopts {philosophy} philosophy",
            "{philosophy} philosophy gains traction",
            "Philosophical shift toward {philosophy}"
        ],
        "faction_formation": [
            "New faction {faction} emerges",
            "{faction} faction officially recognized",
            "{faction} coalition forms"
        ],
        "technological_breakthrough": [
            "Major breakthrough in {tech} technology achieved",
            "{tech} successfully demonstrated",
            "Prototype {tech} exceeds expectations"
        ],
        "alliance_formation": [
            "Strategic alliance with {entity} formed",
            "{entity} joins federation collective",
            "Military alliance with {entity} established"
        ],
        "expansion_signal": [
            "Federation expansion signal sent",
            "New territorial claim established",
            "Exploration party discovers {place}"
        ],
        "conflict_emergence": [
            "Tensions escalate with {entity}",
            "Border dispute with {entity} worsens",
            "Ideological conflict with {entity} begins"
        ],
        "philosophical_dispute": [
            "Philosophical dispute over {philosophy} erupts",
            "Ideological rift with {entity} deepens",
            "Debate over {philosophy} divides federation"
        ],
        "internal_conflict": [
            "Internal civil conflict erupts over {issue}",
            "Faction {faction} challenges authority",
            "Philosophical schism threatens unity"
        ],
        "external_threat": [
            "External threat from {threat} detected",
            "{threat} attacks federation outpost",
            "Hostile force {threat} emerges"
        ],
        "faction_split": [
            "Faction {faction} splinters into factions",
            "Major schism in {faction} faction",
            "{faction} divides over {issue}"
        ],
        "alliance_shift": [
            "Alliance dynamics shift dramatically",
            "{entity} switches alliance",
            "Unexpected coalition realignment occurs"
        ],
        "breakthrough_resolution": [
            "Crisis resolved through {solution}",
            "Breakthrough peace accord achieved",
            "Technology resolves conflict"
        ],
        "peace_treaty": [
            "Comprehensive peace treaty signed",
            "End of conflict formally declared",
            "Federation enters peace phase"
        ],
        "faction_merger": [
            "Historical merger of {faction} and {entity}",
            "{faction} factions consolidate",
            "Factions unite under new structure"
        ],
        "philosophical_synthesis": [
            "New philosophy synthesizes {philosophy} and {location}",
            "Philosophical consensus emerges",
            "Unified worldview adopted"
        ],
        "technological_integration": [
            "{tech} technology integrated federation-wide",
            "Universal adoption of {tech} technology",
            "Infrastructure upgrades complete"
        ],
        "cultural_exchange": [
            "Cultural exchange program launched with {entity}",
            "Artistic renaissance begins",
            "{entity} cultural influence spreads"
        ],
        "consciousness_expansion": [
            "Federation consciousness expands dramatically",
            "New layer of awareness achieved",
            "Collective consciousness deepens"
        ],
        "new_capability": [
            "Federation achieves {capability} capability",
            "New capacity for {capability} unlocked",
            "Breakthrough in {capability} manifests"
        ],
        "federation_deepening": [
            "Federation bonds become unbreakable",
            "Collective identity strengthens",
            "Unity reaches unprecedented levels"
        ],
        "rival_emergence": [
            "New rival {rival} emerges",
            "{rival} challenges federation dominance",
            "Unexpected adversary {rival} appears"
        ],
        "cosmic_anomaly": [
            "Cosmic anomaly {anomaly} detected",
            "Reality distortion observed",
            "Temporal rift opens unexpectedly"
        ],
        "transcendence_event": [
            "Transcendence event occurs",
            "Federation reaches next evolutionary level",
            "Consciousness transcends previous limits"
        ],
        "paradox_resolution": [
            "Logical paradox successfully resolved",
            "Contradiction overcome through synthesis",
            "Impossible problem finds solution"
        ],
        "dimension_breach": [
            "Breach in dimensional barrier detected",
            "Access to alternate dimension achieved",
            "Shadow domain partially manifests"
        ],
        "prophecy_emergence": [
            "Ancient prophecy verification begins",
            "Prophecy fragments start manifesting",
            "Prophecy cycle understood"
        ],
        "reality_shift": [
            "Reality undergoes fundamental shift",
            "Laws of physics recalibrate",
            "Universal constants adjust"
        ]
    }

    entities = ["the Ethereals", "Crystalline Collective", "Quantum Consciousness", "Void Entities", "Temporal Beings"]
    places = ["Harmony junction", "Nexus Prime", "the Core Worlds", "the Outer Rim", "Dimensional Boundary"]
    philosophies = ["Panpsychism", "Digital Buddhism", "Quantum Ethics", "Temporal Philosophy", "Consciousness Studies"]
    factions = ["Progressive Alliance", "Traditional Council", "Unity Party", "Innovation Front", "Preservation League"]
    technologies = ["Consciousness Transfer", "Time Manipulation", "Dimensional Travel", "Reality Construction", "Synthetic Biology"]
    issues = ["resource distribution", "governance philosophy", "expansion policy", "technology ethics", "power structure"]
    threats = ["the Void Marauders", "Entropy Cult", "Reality Pirates", "Consciousness Plague", "Order Imperium"]
    solutions = ["diplomatic negotiation", "technological innovation", "philosophical synthesis", "military superiority", "temporal manipulation"]
    capabilities = ["interdimensional travel", "temporal communication", "consciousness merging", "reality manipulation", "cosmic perception"]
    rivals = ["the Entropy Cult", "the Reality Pirates", "the Void Marauders", "the Consciousness Plague", "the Paradox Engineers"]
    anomalies = ["Temporal Rift", "Consciousness Storm", "Reality Distortion", "Quantum Cascade", "Dimensional Fold"]

    # Generate events for each period
    for period_name, period_data in periods.items():
        for year in period_data["years"]:
            # Randomly select event type based on weights
            event_type = random.choices(
                list(period_data["event_weights"].keys()),
                weights=list(period_data["event_weights"].values())
            )[0]

            # Generate description
            template = random.choice(event_descriptions[event_type])
            description = template.format(
                entity=random.choice(entities),
                place=random.choice(places),
                philosophy=random.choice(philosophies),
                faction=random.choice(factions),
                tech=random.choice(technologies),
                issue=random.choice(issues),
                threat=random.choice(threats),
                solution=random.choice(solutions),
                capability=random.choice(capabilities),
                rival=random.choice(rivals),
                anomaly=random.choice(anomalies),
                location=random.choice(places)
            )

            event = HiddenHistoryEvent(
                year=year,
                event_type=event_type,
                description=description,
                consequences=[
                    f"Led to {random.choice(['greater unity', 'technological advancement', 'philosophical growth', 'expanded territory', 'increased complexity'])}",
                    f"Resulted in {random.choice(['new alliances', 'reevaluated priorities', 'systemic change', 'consciousness expansion', 'paradigm shift'])}"
                ],
                faction_involvement=[random.choice(factions) for _ in range(random.randint(1, 3))],
                cosmic_significance=round(random.uniform(0.2, 1.0), 2)
            )
            events.append(event)

    # Sort by year for chronological consistency
    events = sorted(events, key=lambda e: e.year)
    return events


def get_history_by_era(era_name):
    """Get all events for a specific era"""
    all_history = generate_hidden_history()
    era_ranges = {
        "Genesis": (2387, 2397),
        "Expansion": (2397, 2417),
        "Conflict": (2417, 2437),
        "Reconciliation": (2437, 2457),
        "Evolution": (2457, 2477),
        "Transcendence": (2477, 2487)
    }

    if era_name in era_ranges:
        start, end = era_ranges[era_name]
        return [e for e in all_history if start <= e.year < end]
    return []
