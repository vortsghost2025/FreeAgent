"""
dashboard_mock_data.py: Generates backend-only mock data for dashboard visualizations.
"""
import random
import datetime

def generate_anomaly_heatmap(num_ships=4, num_timesteps=10):
    # Matrix: ships x timesteps, values = anomaly count
    return [[random.randint(0, 3) for _ in range(num_timesteps)] for _ in range(num_ships)]

def generate_memory_timeline(num_events=20):
    now = datetime.datetime.now()
    return [
        {
            'event_id': f'evt{i}',
            'timestamp': (now + datetime.timedelta(seconds=i*60)).isoformat(),
            'summary': f'Event {i}',
            'ship': f'Ship-{random.randint(1,4)}',
            'anomaly': bool(random.getrandbits(1)),
        }
        for i in range(num_events)
    ]

def generate_drift_score(num_points=15):
    # Simulate drift score over time (0.0-1.0)
    return [round(random.uniform(0, 1), 2) for _ in range(num_points)]

def generate_continuity_violations(num_violations=5):
    now = datetime.datetime.now()
    return [
        {
            'violation_id': f'cv{i}',
            'timestamp': (now + datetime.timedelta(minutes=i*7)).isoformat(),
            'description': f'Continuity violation {i}',
            'severity': random.choice(['LOW', 'MEDIUM', 'HIGH'])
        }
        for i in range(num_violations)
    ]

def generate_dashboard_mock_data():
    return {
        'anomaly_heatmap': generate_anomaly_heatmap(),
        'memory_timeline': generate_memory_timeline(),
        'drift_score': generate_drift_score(),
        'continuity_violations': generate_continuity_violations(),
    }

if __name__ == "__main__":
    from pprint import pprint
    pprint(generate_dashboard_mock_data())
