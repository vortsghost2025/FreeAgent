from src.advanced.universe_orchestrator import UniverseOrchestrator
from src.advanced.consciousness_layer import SystemConsciousnessLayer
from src.advanced.federation_memory_codex import FederationMemoryCodex
from src.advanced.emergent_myth_compiler import EmergentMythCompiler
from src.advanced.temporal_negotiation import TemporalNegotiationEngine
from src.advanced.cross_epoch_causality import CrossEpochCausalityRouter

class FakeLogger:
    def log(self, *args, **kwargs): pass

class FakeNarrativeEngine:
    def compile(self, event): return "Mythic text"
    def summarize(self, summaries): return "Era summary"


def build_orchestrator():
    consciousness = SystemConsciousnessLayer(FakeLogger())
    codex = FederationMemoryCodex(FakeLogger())
    myth = EmergentMythCompiler(FakeNarrativeEngine(), FakeLogger())
    temporal = TemporalNegotiationEngine([], {}, FakeLogger())
    causality = CrossEpochCausalityRouter({}, temporal, codex, FakeLogger())

    return UniverseOrchestrator(
        consciousness_layer=consciousness,
        codex=codex,
        myth_compiler=myth,
        temporal_engine=temporal,
        causality_router=causality,
    )

if __name__ == "__main__":
    orchestrator = build_orchestrator()

    # Example synthetic inputs
    universe_state = {"epoch": 1, "entropy": 0.12, "narratives": {"coherence": 0.8}, "metrics": {"consistency": 0.9, "timestamp": "2026-02-19"}}
    federation_states = {"F1": {"stability": 0.9}}
    events = [
        {"federation_id": "F1", "event_type": "discovery", "narrative_summary": "summary", "timestamp": "2026-02-19", "source_epoch": 1, "target_epoch": 2}
    ]
    anomalies = [{"type": "temporal_glitch", "severity": 0.3}]

    orchestrator.process_consciousness_events(
        universe_state=universe_state,
        federation_states=federation_states,
        events=events,
        anomalies=anomalies,
    )

    snapshot = orchestrator.get_operator_snapshot()
    print("\n=== OPERATOR SNAPSHOT ===")
    print(snapshot)
