"""
micro_forking_prototype.py: Minimal demo of MemoryGraph snapshot, perturbation, anomaly detection, and divergence scoring.
"""
from anomaly_engine.memory_graph import MemoryGraph
from anomaly_engine.anomaly_detector import AnomalyDetector
import copy
import random

def micro_forking_demo():
    # 1. Create memory graph and record a few events
    mg = MemoryGraph()
    for i in range(5):
        mg.record_event({'event_id': f'evt{i}', 'payload': {'value': i*10}})
    
    # 2. Take a snapshot (fork)
    forked_id = mg.fork_universe()
    
    # 3. Apply a small perturbation to the forked universe
    fork_events = mg.get_events_for_universe(forked_id)
    if fork_events:
        # Perturb the last event
        perturbed = dict(fork_events[-1])
        perturbed['payload']['value'] += random.randint(1, 5)
        fork_events[-1] = perturbed
        mg.universes[forked_id]['events'] = fork_events
    
    # 4. Run anomaly detection on both universes
    detector = AnomalyDetector()
    orig_events = mg.get_events_for_universe()
    fork_events = mg.get_events_for_universe(forked_id)
    anomalies_orig = [detector.detect(e, {}) for e in orig_events]
    detector.clear()
    anomalies_fork = [detector.detect(e, {}) for e in fork_events]
    
    # 5. Compare divergence (simple: count value diffs)
    divergence = sum(1 for o, f in zip(orig_events, fork_events) if o['payload']['value'] != f['payload']['value'])
    
    return {
        'original_events': orig_events,
        'forked_events': fork_events,
        'anomalies_original': anomalies_orig,
        'anomalies_forked': anomalies_fork,
        'divergence_score': divergence,
        'forked_universe_id': forked_id
    }

if __name__ == "__main__":
    result = micro_forking_demo()
    from pprint import pprint
    pprint(result)
