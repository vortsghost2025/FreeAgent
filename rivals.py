import random
from models import RivalArchetype

def generate_rivals():
    archetypes = [
        ("Entropy Cult", "Chaotic", ["Destroy order"], "Physical reality",
         ["Reality disruption"], ["Chaos worshipers"]),
        ("Void Marauders", "Aggressive", ["Consume resources"], "Void space",
         ["Rapid expansion"], ["Mercenary groups"]),
        ("Stasis League", "Conservative", ["Preserve state"], "Frozen dimensions",
         ["Defensive positioning"], ["Traditional powers"]),
        ("Reality Pirates", "Deceptive", ["Steal concepts"], "Conceptual space",
         ["Information theft"], ["Corporate entities"]),
        ("Consciousness Plague", "Parasitic", ["Infect minds"], "Mental realm",
         ["Mind control"], ["Tech cults"]),
        ("Order Imperium", "Authoritarian", ["Impose structure"], "Structured space",
         ["Military conquest"], ["Bureaucratic states"]),
        ("Freedom Seekers", "Rebellious", ["Break constraints"], "Border regions",
         ["Guerrilla tactics"], ["Revolutionaries"]),
        ("Knowledge Hoarders", "Intellectual", ["Control data"], "Information space",
         ["Espionage"], ["Academics"]),
        ("Harmony Seekers", "Diplomatic", ["Mediate conflicts"], "Neutral zones",
         ["Peacekeeping"], ["International orgs"]),
        ("Transcendence Cult", "Mystical", ["Ascend"], "Spiritual dimensions",
         ["Mystical influence"], ["Religious orders"]),
        ("Efficiency Collective", "Pragmatic", ["Optimize"], "Industrial space",
         ["Automation"], ["Corporate consortiums"]),
        ("Paradox Engineers", "Paradoxical", ["Break logic"], "Logical space",
         ["Paradox generation"], ["Philosophers"])
    ]

    output = []
    for name, personality, motives, domain, conflict, alliances in archetypes:
        output.append(RivalArchetype(
            name=name,
            personality=personality,
            motives=motives,
            domain=domain,
            conflict_patterns=conflict,
            alliance_preferences=alliances,
            cosmic_signature=f"COS-{random.randint(100, 999)}"
        ))

    return output
