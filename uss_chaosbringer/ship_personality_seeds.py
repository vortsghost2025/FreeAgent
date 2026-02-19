"""
ship_personality_seeds.py: Defines personality vectors for ships and applies per-ship anomaly weighting.
"""
PERSONALITY_SEEDS = {
    'cautious':    [0.9, 0.1, 0.2, 0.1, 0.2],
    'chaotic':     [0.2, 0.9, 0.7, 0.8, 0.3],
    'curious':     [0.3, 0.4, 0.9, 0.2, 0.7],
    'aggressive':  [0.7, 0.8, 0.2, 0.9, 0.1],
    'introspective':[0.4, 0.2, 0.8, 0.1, 0.9],
}

PERSONALITY_LABELS = ['risk_aversion', 'impulsivity', 'exploration', 'assertiveness', 'reflection']

# Example: get anomaly weighting for a ship

def get_personality_vector(ship_name: str) -> dict:
    # Map ship_name to a seed (demo: hash mod)
    keys = list(PERSONALITY_SEEDS.keys())
    idx = abs(hash(ship_name)) % len(keys)
    label = keys[idx]
    vector = PERSONALITY_SEEDS[label]
    return {'label': label, 'vector': dict(zip(PERSONALITY_LABELS, vector))}

# Example: weight anomaly recommendations

def weight_anomaly_score(base_score: float, ship_name: str) -> float:
    vec = get_personality_vector(ship_name)['vector']
    # Demo: cautious ships downweight, chaotic upweight
    if vec['risk_aversion'] > 0.7:
        return base_score * 0.7
    if vec['impulsivity'] > 0.7:
        return base_score * 1.3
    return base_score

if __name__ == "__main__":
    for name in ['USS Cautious', 'USS Chaos', 'USS Curious', 'USS Aggro', 'USS Introspect']:
        print(name, get_personality_vector(name))
        print('Weighted anomaly:', weight_anomaly_score(1.0, name))
