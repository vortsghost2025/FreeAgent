#!/usr/bin/env python3
"""
CAPTAIN HANDLER
Handles captain commands and overrides (mode switches, manual controls, etc.)
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


class CaptainHandler:
    """Pure handler for CAPTAIN domain events"""

    @staticmethod
    def handle(event: Dict[str, Any], state: Dict[str, Any]) -> DomainResult:
        """
        Handle captain command/override and produce state delta.

        Event types:
        - CaptainOverride
        - ModeSwitch
        - ExperimentalModeActivated
        - ManualShieldAdjustment
        - ManualWarpAdjustment
        """
        event_type = event.get('type', 'UNKNOWN')
        payload = event.get('payload', {})

        state_delta = {}
        domain_actions = []
        logs = []

        if event_type == 'CaptainOverride':
            # Captain manual override
            state_delta['last_override'] = payload.get('override_type')
            state_delta['override_reason'] = payload.get('reason')
            domain_actions.append({'type': 'LOG_OVERRIDE', 'severity': 'WARNING'})
            logs.append(f"[captain] Override issued: {payload.get('override_type')} - {payload.get('reason')}")

        elif event_type == 'ModeSwitch':
            # Captain switching modes
            from_mode = payload.get('from_mode')
            to_mode = payload.get('to_mode')
            state_delta['mode'] = to_mode
            state_delta['mode_switch_reason'] = payload.get('reason')
            domain_actions.append({'type': 'SWITCH_MODE', 'severity': 'INFO'})
            logs.append(f"[captain] Mode switch: {from_mode} → {to_mode} ({payload.get('reason')})")

        elif event_type == 'ExperimentalModeActivated':
            # Captain enabling experimental mode
            state_delta['experimental_mode'] = True
            state_delta['captain_mood'] = payload.get('captain_mood', 'AMBITIOUS')
            domain_actions.append({'type': 'ENABLE_EXPERIMENTAL_GUARDRAILS', 'severity': 'ALERT'})
            logs.append(f"[captain] Experimental mode activated ({payload.get('reason')})")

        elif event_type == 'ManualShieldAdjustment':
            # Captain manually adjusting shields
            state_delta['shields'] = payload.get('target_level', 0)
            domain_actions.append({'type': 'ADJUST_SHIELDS', 'severity': 'INFO'})
            logs.append(f"[captain] Shield adjustment: target level {payload.get('target_level')} ({payload.get('reason')})")

        elif event_type == 'ManualWarpAdjustment':
            # Captain manually adjusting warp factor
            state_delta['warp_factor'] = payload.get('target_factor', 0)
            domain_actions.append({'type': 'ADJUST_WARP', 'severity': 'INFO'})
            logs.append(f"[captain] Warp adjustment: target factor {payload.get('target_factor')} ({payload.get('reason')})")

        else:
            logs.append(f"[captain] Unknown command type: {event_type}")

        return DomainResult(
            state_delta=state_delta if state_delta else None,
            domain_actions=domain_actions,
            logs=logs
        )
