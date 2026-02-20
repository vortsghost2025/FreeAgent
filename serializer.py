import json
from dataclasses import asdict
from typing import List, Dict, Any
from models import HiddenHistoryEvent, CreatureTaxonomy, RivalArchetype

class FederationSerializer:
    """Serialize federation models to JSON"""

    @staticmethod
    def rival_to_dict(rival: RivalArchetype) -> Dict[str, Any]:
        """Convert RivalArchetype to dictionary"""
        return asdict(rival)

    @staticmethod
    def creature_to_dict(creature: CreatureTaxonomy) -> Dict[str, Any]:
        """Convert CreatureTaxonomy to dictionary"""
        return asdict(creature)

    @staticmethod
    def event_to_dict(event: HiddenHistoryEvent) -> Dict[str, Any]:
        """Convert HiddenHistoryEvent to dictionary"""
        return asdict(event)

    @staticmethod
    def rivals_to_json(rivals: List[RivalArchetype]) -> str:
        """Serialize list of rivals to JSON"""
        data = [FederationSerializer.rival_to_dict(r) for r in rivals]
        return json.dumps(data, indent=2)

    @staticmethod
    def creatures_to_json(creatures: List[CreatureTaxonomy]) -> str:
        """Serialize list of creatures to JSON"""
        data = [FederationSerializer.creature_to_dict(c) for c in creatures]
        return json.dumps(data, indent=2)

    @staticmethod
    def history_to_json(history: List[HiddenHistoryEvent]) -> str:
        """Serialize list of historical events to JSON"""
        data = [FederationSerializer.event_to_dict(e) for e in history]
        return json.dumps(data, indent=2)

    @staticmethod
    def expansion_results_to_json(results: Dict[str, Any]) -> str:
        """Serialize complete expansion results to JSON"""
        serializable = {
            "metadata": results["metadata"],
            "rivals": [FederationSerializer.rival_to_dict(r) for r in results["rivals"]],
            "creatures": [FederationSerializer.creature_to_dict(c) for c in results["creatures"]],
            "history": [FederationSerializer.event_to_dict(e) for e in results["history"]]
        }
        return json.dumps(serializable, indent=2)

    @staticmethod
    def export_to_file(data: str, filename: str):
        """Export JSON data to file"""
        with open(filename, 'w') as f:
            f.write(data)
        print(f"[OK] Exported to {filename}")

    @staticmethod
    def import_from_file(filename: str) -> Dict[str, Any]:
        """Import JSON data from file"""
        with open(filename, 'r') as f:
            return json.load(f)
