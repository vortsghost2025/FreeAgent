from uss_chaosbringer.starship import Starship
from uss_chaosbringer.handlers.signal_handler import handle_signal_event

class SignalHarvester(Starship):
    """
    Ship class specializing in harvesting, amplifying, and interpreting cosmic signals.
    """
    SHIP_TYPE = "SIGNAL_HARVESTER"
    DOMAIN = "SIGNAL_ENGINE"

    def get_initial_state(self):
        return {
            "mode": "RECEPTIVE",  # Default mode for deterministic output
            "signal_buffer": [],
            "amplification_level": 1.0,
        }

    def _register_handlers(self):
        self.register_domain_handler(self.DOMAIN, handle_signal_event)

    def get_narrator_config(self):
        return {
            "template_matrix": {
                "RECEPTIVE": "SignalHarvester listens intently, amplifying the faintest whispers of the cosmos.",
                "ANALYTICAL": "SignalHarvester decodes and interprets complex signal patterns with precision.",
                "AGITATED": "SignalHarvester's sensors are overwhelmed by signal noise, risking data corruption.",
                "CALM": "SignalHarvester maintains a steady focus, filtering out irrelevant frequencies.",
                "CURIOUS": "SignalHarvester explores new signal bands, seeking unknown transmissions.",
                "GUARDED": "SignalHarvester encrypts its findings, wary of interception.",
                "EXUBERANT": "SignalHarvester celebrates a breakthrough, broadcasting discoveries to the fleet."
            }
        }

    def get_safety_rules(self):
        return [
            "Never amplify unknown signals beyond safe thresholds.",
            "Always log raw signal data before processing.",
            "Encrypt sensitive findings before transmission."
        ]

    def _initialize_narrator(self):
        # Use the base class's narrator initialization
        super()._initialize_narrator()
