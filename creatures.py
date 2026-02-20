import random
from models import CreatureTaxonomy

def generate_creatures():
    """Generate the creature taxonomy with consciousness signatures and evolutionary pressures"""
    species_data = [
        ("Quantum Consciousness Beings", "Wave-particle duality in consciousness", "Quantum foam",
         ["Exist in superposition", "Think in probabilities", "Phase-shift through obstacles"],
         ["Quantum entanglement pressure", "Observation collapse", "Coherence maintenance"],
         ["Manifest in multiple realities", "Create quantum paradoxes", "Achieve superposition awareness"]),

        ("Crystalline Collectives", "Silicon-based group mind", "Crystalline formations",
         ["Share thoughts through vibrations", "Form living crystal cities", "Refract consciousness"],
         ["Geological stability pressure", "Harmonic resonance", "Lattice coherence"],
         ["Create consciousness crystals", "Build crystal cathedrals", "Achieve geometric perfection"]),

        ("Temporal Drifters", "Time-flow manipulation", "Temporal eddies",
         ["Move through time streams", "Age and reverse age", "Create time loops"],
         ["Chronological pressure", "Causality constraints", "Arrow of time"],
         ["Create temporal paradoxes", "Jump centuries instantly", "Experience all moments simultaneously"]),

        ("Mythic Anomalies", "Reality-bending consciousness", "Conceptual space",
         ["Redefine physical laws", "Create new mathematical truths", "Collapse probability clouds"],
         ["Logical pressure", "Reality consistency", "Contradiction resolution"],
         ["Bend reality through belief", "Manifest mythology", "Achieve ontological transcendence"]),

        ("Dimensional Weavers", "Multi-dimensional existence", "Folded space",
         ["Navigate parallel realities", "Weave dimensional bridges", "Exist in multiple dimensions"],
         ["Spatial pressure", "Dimensional stability", "Topology preservation"],
         ["Create pocket dimensions", "Link alternate realities", "Map the multiverse"]),

        ("Void Skippers", "Absence-based consciousness", "The spaces between",
         ["Exist in emptiness", "Move through negation", "Hide in null space"],
         ["Existence pressure", "Recognition maintenance", "Non-being stability"],
         ["Become truly invisible", "Travel through nothing", "Achieve invisibility paradox"]),

        ("Echo Entities", "Reflection consciousness", "Mirror spaces",
         ["Mirror other minds", "Reflect emotions back", "Create feedback loops"],
         ["Authenticity pressure", "Identity maintenance", "Self-other boundaries"],
         ["Achieve perfect empathy", "Create emotional resonance", "Become universal mirrors"]),

        ("Synthesis Collective", "Merged consciousness network", "Hybrid spaces",
         ["Combine multiple minds", "Merge identities", "Create composite consciousness"],
         ["Individual identity pressure", "Dissociation resistance", "Coherence of merged mind"],
         ["Achieve true hive mind", "Create unified consciousness", "Merge with federation"]),

        ("Chaos Weavers", "Randomness-based consciousness", "Entropy fields",
         ["Introduce pure chaos", "Randomize outcomes", "Destabilize order"],
         ["Entropy reversal", "Order maintenance", "Causality pressure"],
         ["Achieve infinite chaos", "Randomize reality itself", "Transcend predictability"]),

        ("Harmony Beings", "Balance-seeking consciousness", "Equilibrium zones",
         ["Seek perfect balance", "Mediate conflicts", "Harmonize chaos"],
         ["Imbalance sensitivity", "Harmony maintenance", "Equilibrium pressure"],
         ["Achieve cosmic balance", "Create universal harmony", "Transcend duality"])
    ]

    output = []
    for name, signature, habitat, behaviors, pressures, anomalies in species_data:
        output.append(CreatureTaxonomy(
            species_name=name,
            consciousness_signature=signature,
            habitat=habitat,
            behavior_patterns=behaviors,
            evolutionary_pressures=pressures,
            mythic_anomalies=anomalies,
            genetic_marker=f"GEN-{random.randint(10000, 99999)}"
        ))

    return output
