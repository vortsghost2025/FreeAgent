"""
captains_log_generator.py: Generates a Captain's Log entry from anomaly, memory, and continuity data.
"""
import random
import datetime

def generate_captains_log(ship_name, events, anomalies, drift_score, continuity_violations):
    now = datetime.datetime.now().isoformat()
    log_lines = [
        f"Captain's Log — {now}",
        f"Ship: {ship_name}",
        f"Total events: {len(events)} | Anomalies: {sum(len(a) for a in anomalies)} | Drift: {max(drift_score):.2f}",
        f"Continuity violations: {len(continuity_violations)}",
        "---",
    ]
    if anomalies and any(anomalies):
        log_lines.append(f"Anomalies detected: {sum(len(a) for a in anomalies)}. Notable: " + ", ".join([
            f"{a[0]['type']} in event {i}" for i, a in enumerate(anomalies) if a
        ]))
    if drift_score and max(drift_score) > 0.7:
        log_lines.append("Warning: Drift score exceeds safe threshold!")
    if continuity_violations:
        log_lines.append(f"Continuity issues: {[v['description'] for v in continuity_violations]}")
    log_lines.append(random.choice([
        "Morale remains high.",
        "Crew is uneasy about the anomalies.",
        "Engineering reports all systems nominal.",
        "Science officer recommends further analysis.",
        "Captain suspects a pattern in the chaos.",
    ]))
    return "\n".join(log_lines)

# Demo usage
if __name__ == "__main__":
    from dashboard_mock_data import generate_memory_timeline, generate_drift_score, generate_continuity_violations
    events = generate_memory_timeline()
    anomalies = [[{'type': 'OUTLIER'}] if i % 4 == 0 else [] for i in range(len(events))]
    drift = generate_drift_score()
    violations = generate_continuity_violations()
    print(generate_captains_log('USS Fun', events, anomalies, drift, violations))
