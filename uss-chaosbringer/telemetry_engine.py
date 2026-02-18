#!/usr/bin/env python3
"""
TELEMETRY ENGINE — Fleet-Wide Observability System
Collects, aggregates, and streams metrics from all ships.
Bridges observability to narrative, lore, and multiverse systems.
"""

from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field, asdict
from datetime import datetime
from collections import defaultdict
import json


@dataclass
class ShipMetrics:
    """Per-ship telemetry snapshot"""
    ship_name: str
    threat_level: int
    mode: str
    shields: int
    warp_factor: float
    reactor_temp: float
    event_count: int
    severity_distribution: Dict[str, int]
    last_event_type: Optional[str]
    last_event_time: Optional[float]
    event_rate: float  # events per second
    uptime_seconds: float
    custom_metrics: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FleetMetrics:
    """Aggregated fleet-wide telemetry"""
    timestamp: float
    total_ships: int
    total_events_processed: int
    ships_by_mode: Dict[str, int]
    threat_level_avg: float
    threat_level_max: int
    threat_level_min: int
    severity_distribution: Dict[str, int]
    event_rate: float
    fleet_health_score: float  # 0.0-1.0
    critical_ships: List[str]  # Ships in CRITICAL mode
    ships: Dict[str, ShipMetrics] = field(default_factory=dict)


@dataclass
class TelemetryHookResult:
    """Result from a telemetry hook"""
    hook_name: str
    triggered: bool
    narrative_segment: Optional[str]
    lore_event: Optional[Dict[str, Any]]
    metadata: Dict[str, Any] = field(default_factory=dict)


class TelemetryEngine:
    """
    Central observability system for the entire fleet.

    Responsibilities:
    - Collect per-ship metrics
    - Aggregate fleet-wide statistics
    - Track metric history for trends
    - Execute narrative telemetry hooks
    - Stream metrics to external systems (dashboards, lore engines, etc.)
    """

    def __init__(self, history_window_size: int = 1000):
        """
        Initialize TelemetryEngine.

        Args:
            history_window_size: Max events to keep in rolling history
        """
        self.history_window_size = history_window_size
        self.metric_history: List[FleetMetrics] = []
        self.hooks: Dict[str, Callable] = {}
        self.hook_results_history: List[TelemetryHookResult] = []
        self.timeseries_data: Dict[str, List[Any]] = defaultdict(list)

    def register_hook(self, hook_name: str, hook_fn: Callable):
        """
        Register a telemetry hook (narrative, lore, alert, etc.).

        Hook signature:
            hook_fn(fleet_metrics: FleetMetrics, previous_metrics: Optional[FleetMetrics]) -> TelemetryHookResult

        Examples:
            - Hook triggers narrative events ("Yellow alert", "Reactor critical")
            - Hook triggers lore events ("Chapter: The Crisis Begins")
            - Hook triggers alerts (email, Slack, etc.)
            - Hook tracks personality metrics
        """
        self.hooks[hook_name] = hook_fn

    def collect_fleet_metrics(self, ships: Dict[str, 'Starship']) -> FleetMetrics:
        """
        Collect metrics from all ships and aggregate into fleet snapshot.

        This is the main collection pipeline.
        """
        timestamp = datetime.now().timestamp()
        ships_by_mode = defaultdict(int)
        threat_levels = []
        severity_dist = defaultdict(int)
        total_events = 0
        critical_ships = []
        ships_metrics = {}

        # Collect per-ship metrics
        for ship_name, ship in ships.items():
            ship_metrics = self.collect_ship_metrics(ship)
            ships_metrics[ship_name] = ship_metrics

            # Aggregate
            ships_by_mode[ship_metrics.mode] += 1
            threat_levels.append(ship_metrics.threat_level)
            total_events += ship_metrics.event_count

            for severity, count in ship_metrics.severity_distribution.items():
                severity_dist[severity] += count

            if ship_metrics.mode == 'CRITICAL':
                critical_ships.append(ship_name)

        # Calculate aggregates
        threat_avg = sum(threat_levels) / len(threat_levels) if threat_levels else 0
        threat_max = max(threat_levels) if threat_levels else 0
        threat_min = min(threat_levels) if threat_levels else 0

        # Fleet health score (0.0-1.0)
        # Lower threat = higher health, fewer critical ships = higher health
        threat_component = 1.0 - (threat_avg / 10.0)  # 0-1.0
        critical_component = 1.0 - (len(critical_ships) / max(len(ships), 1))  # 0-1.0
        fleet_health = (threat_component + critical_component) / 2.0

        # Event rate (events per second, based on last window)
        event_rate = sum(m.event_rate for m in ships_metrics.values()) / max(len(ships_metrics), 1)

        fleet_metrics = FleetMetrics(
            timestamp=timestamp,
            total_ships=len(ships),
            total_events_processed=total_events,
            ships_by_mode=dict(ships_by_mode),
            threat_level_avg=threat_avg,
            threat_level_max=threat_max,
            threat_level_min=threat_min,
            severity_distribution=dict(severity_dist),
            event_rate=event_rate,
            fleet_health_score=fleet_health,
            critical_ships=critical_ships,
            ships=ships_metrics
        )

        return fleet_metrics

    def collect_ship_metrics(self, ship: 'Starship') -> ShipMetrics:
        """Collect metrics from a single ship"""
        state = ship.state
        telemetry = ship.telemetry

        # Calculate event rate (events per last 10 seconds, approximate)
        event_rate = telemetry.get('event_count', 0) / max(ship.telemetry.get('uptime_seconds', 1.0), 10.0)

        last_event = telemetry.get('last_event')
        last_event_type = last_event.get('type') if last_event else None
        last_event_time = last_event.get('timestamp') if last_event else None

        ship_metrics = ShipMetrics(
            ship_name=ship.ship_name,
            threat_level=state.get('threat_level', 0),
            mode=state.get('mode', 'UNKNOWN'),
            shields=state.get('shields', 0),
            warp_factor=state.get('warp_factor', 0),
            reactor_temp=state.get('reactor_temp', 0),
            event_count=telemetry.get('event_count', 0),
            severity_distribution=telemetry.get('severity_counts', {}),
            last_event_type=last_event_type,
            last_event_time=last_event_time,
            event_rate=event_rate,
            uptime_seconds=telemetry.get('uptime_seconds', 0.0),
            custom_metrics={
                'cpu_pct': state.get('cpu_pct', 0),
                'mem_pct': state.get('mem_pct', 0),
                'anomalies_detected': state.get('anomalies_detected', 0),
            }
        )

        return ship_metrics

    def update_metrics(self, ships: Dict[str, 'Starship'], previous_metrics: Optional[FleetMetrics] = None):
        """
        Main entry point: collect metrics, store history, execute hooks.

        Call this after each FleetCoordinator event processing cycle.
        """
        # Collect current metrics
        current_metrics = self.collect_fleet_metrics(ships)

        # Store in history
        self.metric_history.append(current_metrics)
        if len(self.metric_history) > self.history_window_size:
            self.metric_history.pop(0)

        # Update timeseries data
        self._update_timeseries(current_metrics)

        # Execute all registered hooks
        hook_results = self._execute_hooks(current_metrics, previous_metrics)

        return current_metrics, hook_results

    def _execute_hooks(
        self,
        current_metrics: FleetMetrics,
        previous_metrics: Optional[FleetMetrics]
    ) -> List[TelemetryHookResult]:
        """Execute all registered telemetry hooks"""
        results = []

        for hook_name, hook_fn in self.hooks.items():
            try:
                result = hook_fn(current_metrics, previous_metrics)
                results.append(result)
                self.hook_results_history.append(result)
            except Exception as e:
                # Hook error, don't fail the whole system
                error_result = TelemetryHookResult(
                    hook_name=hook_name,
                    triggered=False,
                    narrative_segment=None,
                    lore_event=None,
                    metadata={'error': str(e)}
                )
                results.append(error_result)

        return results

    def _update_timeseries(self, metrics: FleetMetrics):
        """Update rolling timeseries data for trend analysis"""
        self.timeseries_data['threat_level_avg'].append({
            'timestamp': metrics.timestamp,
            'value': metrics.threat_level_avg
        })
        self.timeseries_data['fleet_health_score'].append({
            'timestamp': metrics.timestamp,
            'value': metrics.fleet_health_score
        })
        self.timeseries_data['event_rate'].append({
            'timestamp': metrics.timestamp,
            'value': metrics.event_rate
        })

        # Trim if too large
        max_history = 1000
        for key in self.timeseries_data:
            if len(self.timeseries_data[key]) > max_history:
                self.timeseries_data[key] = self.timeseries_data[key][-max_history:]

    def get_latest_metrics(self) -> Optional[FleetMetrics]:
        """Get most recent fleet metrics snapshot"""
        return self.metric_history[-1] if self.metric_history else None

    def get_metric_history(self, window_size: int = 100) -> List[FleetMetrics]:
        """Get recent metric history (for trend analysis)"""
        return self.metric_history[-window_size:]

    def export_metrics_json(self, metrics: FleetMetrics) -> str:
        """Export metrics as JSON (for external systems)"""
        return json.dumps(asdict(metrics), default=str, indent=2)

    def export_csv_row(self, metrics: FleetMetrics) -> str:
        """Export as single CSV row for time-series databases"""
        row_data = [
            metrics.timestamp,
            metrics.total_ships,
            metrics.total_events_processed,
            metrics.threat_level_avg,
            metrics.threat_level_max,
            metrics.fleet_health_score,
            metrics.event_rate,
        ]
        return ','.join(str(x) for x in row_data)

    def get_telemetry_report(self) -> str:
        """Generate human-readable telemetry report"""
        latest = self.get_latest_metrics()
        if not latest:
            return "No telemetry data available"

        report = f"""
╔═══════════════════════════════════════════════════════════════╗
║           FLEET TELEMETRY REPORT                              ║
╚═══════════════════════════════════════════════════════════════╝

TIMESTAMP: {datetime.fromtimestamp(latest.timestamp).isoformat()}

FLEET STATUS
────────────────────────────────────────────────────────────────
  Total Ships: {latest.total_ships}
  Total Events: {latest.total_events_processed}
  Event Rate: {latest.event_rate:.2f} events/sec
  Fleet Health: {latest.fleet_health_score:.1%}

THREAT ANALYSIS
────────────────────────────────────────────────────────────────
  Avg Threat: {latest.threat_level_avg:.1f}/10
  Max Threat: {latest.threat_level_max}/10
  Min Threat: {latest.threat_level_min}/10
  Critical Ships: {len(latest.critical_ships)} {latest.critical_ships if latest.critical_ships else '(none)'}

OPERATIONAL DISTRIBUTION
────────────────────────────────────────────────────────────────
  By Mode: {latest.ships_by_mode}
  By Severity: {latest.severity_distribution}

SHIP-BY-SHIP BREAKDOWN
────────────────────────────────────────────────────────────────
"""
        for ship_name, metrics in latest.ships.items():
            report += f"""
  {ship_name}
    Threat:     {metrics.threat_level}/10
    Mode:       {metrics.mode}
    Shields:    {metrics.shields}%
    Reactor:    {metrics.reactor_temp}°C
    Warp:       {metrics.warp_factor}
    Events:     {metrics.event_count}
    Rate:       {metrics.event_rate:.2f} evt/sec
"""

        report += "\n═════════════════════════════════════════════════════════════════════\n"
        return report

    def __repr__(self):
        latest = self.get_latest_metrics()
        if latest:
            return f"<TelemetryEngine ships={latest.total_ships} health={latest.fleet_health_score:.0%}>"
        return "<TelemetryEngine (no data)>"
