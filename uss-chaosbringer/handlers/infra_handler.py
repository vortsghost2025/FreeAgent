#!/usr/bin/env python3
"""
INFRA HANDLER
Handles infrastructure/system health events (latency, CPU, memory, reactor temp, etc.)
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass

# Fallback DomainResult if event_router not available
@dataclass
class DomainResult:
    state_delta: Optional[Dict[str, Any]] = None
    domain_actions: Optional[List[Dict[str, Any]]] = None
    logs: Optional[List[str]] = None

try:
    from event_router import DomainResult
except ImportError:
    pass  # Use fallback defined above


class InfraHandler:
    """Pure handler for INFRA domain events"""

    @staticmethod
    def handle(event: Dict[str, Any], state: Dict[str, Any]) -> DomainResult:
        """
        Handle infrastructure/system health event and produce state delta.

        Event types:
        - LatencySpike
        - CPUOverload
        - MemoryPressure
        - ReactorOverheat
        - ShieldEnergyLow
        """
        event_type = event.get('type', 'UNKNOWN')
        payload = event.get('payload', {})

        state_delta = {}
        domain_actions = []
        logs = []

        if event_type == 'LatencySpike':
            # System latency spike
            state_delta['latency_ms'] = payload.get('latency_ms', 0)
            state_delta['latency_baseline_ms'] = payload.get('baseline_ms', 0)
            domain_actions.append({'type': 'REDUCE_THROUGHPUT', 'severity': 'ALERT'})
            logs.append(f"[infra] Latency spike in {payload.get('component')}: {payload.get('latency_ms')}ms (baseline: {payload.get('baseline_ms')}ms)")

        elif event_type == 'CPUOverload':
            # CPU usage critical
            state_delta['cpu_pct'] = payload.get('cpu_pct', 0)
            state_delta['cpu_process'] = payload.get('process')
            domain_actions.append({'type': 'THROTTLE_PROCESSING', 'severity': 'ALERT'})
            logs.append(f"[infra] CPU overload: {payload.get('cpu_pct')}% on {payload.get('process')} for {payload.get('duration_ms')}ms")

        elif event_type == 'MemoryPressure':
            # Memory usage critical
            state_delta['mem_pct'] = payload.get('mem_pct', 0)
            state_delta['memory_process'] = payload.get('process')
            state_delta['leak_suspected'] = payload.get('leak_suspected', False)
            domain_actions.append({'type': 'PAGE_RACCOONS', 'severity': 'ALERT'})
            logs.append(f"[infra] Memory pressure: {payload.get('mem_pct')}% on {payload.get('process')} (leak suspected: {payload.get('leak_suspected')})")

        elif event_type == 'ReactorOverheat':
            # Reactor core temperature critical
            state_delta['reactor_temp'] = payload.get('core_temp', 0)
            state_delta['reactor_threshold'] = payload.get('threshold', 0)

            # Check if cooling down (negative heat_rate = recovery)
            heat_rate = payload.get('heat_rate')
            if heat_rate is not None and heat_rate < 0:
                # Reactor is cooling - downgrade to ALERT
                domain_actions.append({'type': 'MONITOR_REACTOR_COOLING', 'severity': 'ALERT'})
                logs.append(f"[infra] Reactor cooling: {payload.get('core_temp')}°C (threshold: {payload.get('threshold')}°C, cooling at {heat_rate}°C/s)")
            else:
                # Reactor heating or status unknown - critical
                domain_actions.append({'type': 'COOL_DOWN_REACTOR', 'severity': 'CRITICAL'})
                logs.append(f"[infra] Reactor overheat: {payload.get('core_temp')}°C (threshold: {payload.get('threshold')}°C)")

        elif event_type == 'ShieldEnergyLow':
            # Shield energy depleting
            state_delta['shield_energy'] = payload.get('energy_remaining', 0)
            state_delta['shield_drain_rate'] = payload.get('drain_rate', 0)
            domain_actions.append({'type': 'CONSERVE_SHIELD_POWER', 'severity': 'ALERT'})
            logs.append(f"[infra] Shield energy low: {payload.get('energy_remaining')} remaining (drain rate: {payload.get('drain_rate')})")

        else:
            logs.append(f"[infra] Unknown event type: {event_type}")

        return DomainResult(
            state_delta=state_delta if state_delta else None,
            domain_actions=domain_actions,
            logs=logs
        )
