#!/usr/bin/env python3
"""
INTERNAL HANDLER
Handles internal ship subsystem events (warp core, shields, crew)
"""

from typing import Dict, Any
import sys
import os

# Handle imports
try:
    from event_router import DomainResult
except ImportError:
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from event_router import DomainResult


class InternalHandler:
    """Pure handler for INTERNAL domain events"""

    @staticmethod
    def handle(event: Dict[str, Any], state: Dict[str, Any]) -> DomainResult:
        """
        Handle internal subsystem event and produce state delta.

        Event types:
        - WarpCoreVibrationIncrease
        - ShieldAutoRaiseTriggered
        - RaccoonEngineeringDispatched
        """
        event_type = event.get('type', 'UNKNOWN')
        payload = event.get('payload', {})

        state_delta = {}
        domain_actions = []
        logs = []

        if event_type == 'WarpCoreVibrationIncrease':
            # Warp core vibration increased
            state_delta['warp_vibration'] = payload.get('vibration_level', 0)
            state_delta['warp_vibration_previous'] = payload.get('previous_level', 0)
            domain_actions.append({'type': 'MONITOR_WARP_CORE', 'severity': 'WARNING'})
            logs.append(f"[internal] Warp core vibration increase: {payload.get('vibration_level')} (previous: {payload.get('previous_level')})")

        elif event_type == 'ShieldAutoRaiseTriggered':
            # Auto shield raise triggered
            state_delta['shields'] = payload.get('new_level', 0)
            state_delta['shield_raise_reason'] = payload.get('reason')
            domain_actions.append({'type': 'LOG_SHIELD_RAISE', 'severity': 'INFO'})
            logs.append(f"[internal] Shields auto-raised to {payload.get('new_level')} ({payload.get('reason')})")

        elif event_type == 'RaccoonEngineeringDispatched':
            # Raccoon engineering team dispatched
            state_delta['raccoons_active'] = state.get('raccoons_active', 0) + 1
            state_delta['last_engineering_team'] = payload.get('team_id')
            domain_actions.append({'type': 'LOG_CREW_ACTIVITY', 'severity': 'INFO'})
            logs.append(f"[internal] Raccoon engineering team deployed ({payload.get('reason')})")

        else:
            logs.append(f"[internal] Unknown event type: {event_type}")

        return DomainResult(
            state_delta=state_delta if state_delta else None,
            domain_actions=domain_actions,
            logs=logs
        )
