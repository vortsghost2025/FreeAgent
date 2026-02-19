#!/usr/bin/env python3
"""
ProbabilityWeaver — Specialized Starship Class
Implements advanced probability manipulation, event prediction, and uncertainty navigation.
Integrates with the personality-driven NarratorEngine V2.
"""

from starship import Starship, ShipEvent, ShipEventResult
from typing import Dict, Any, List

class ProbabilityWeaver(Starship):
    def _initialize_narrator(self):
        from narrator_engine import NarratorEngine
        self.narrator = NarratorEngine()
        # Inject custom config into narrator's tone_matrix
        self.narrator.tone_matrix.update(self.get_narrator_config())
    """
    Starship specializing in probability manipulation and uncertainty navigation.
    Domains: PROBABILITY_ENGINE, OBSERVER, INFRA
    Personality-aware narrative templates and event handling.
    """
    def get_initial_state(self) -> Dict[str, Any]:
        state = {
            "threat_level": 0,
            "mode": "CALM",
            "shields": 100,
            "warp_factor": 0,
            "reactor_temp": 20,
            # ProbabilityWeaver-specific fields
            "probability_flux": 0.0,  # -1.0 (chaos) to +1.0 (order)
            "uncertainty_field": 0.5, # 0 (deterministic) to 1 (max uncertainty)
            "prediction_accuracy": 0.0, # 0-1
        }
        return state

    def _register_handlers(self):
        from handlers.observer_handler import ObserverHandler
        from handlers.infra_handler import InfraHandler
        # Probability domain handler would be implemented separately
        from handlers.probability_handler import handle as ProbabilityHandler
        self.handlers["OBSERVER"] = ObserverHandler.handle
        self.handlers["INFRA"] = InfraHandler.handle
        self.handlers["PROBABILITY_ENGINE"] = ProbabilityHandler

    def get_narrator_config(self) -> Dict[str, Any]:
        # Use tuple keys to match NarratorEngine's tone_matrix
        from narrator_engine import NarratorTone
        return {
            ("CALM", "INFO", "PROBABILITY_ENGINE"): {
                "tone": NarratorTone.CALM,
                "templates": [
                    "The ProbabilityWeaver hums softly as quantum threads realign."
                ]
            },
            ("DRAMATIC", "ALERT", "PROBABILITY_ENGINE"): {
                "tone": NarratorTone.ALARMED,
                "templates": [
                    "Probability fields surge! Uncertainty cascades through the hull."
                ]
            },
            # Fallbacks for other domains/severities can be added here
        }

    def get_safety_rules(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "No probability flux below -0.9",
                "condition": lambda s: s["probability_flux"] <= -0.9,
                "action": lambda s: {"probability_flux": -0.9},
                "severity": "ALERT"
            },
            {
                "name": "Uncertainty field must not exceed 0.95",
                "condition": lambda s: s["uncertainty_field"] > 0.95,
                "action": lambda s: {"uncertainty_field": 0.95},
                "severity": "WARNING"
            },
        ]
