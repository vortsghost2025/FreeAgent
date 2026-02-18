#!/usr/bin/env python3
"""
TRADING HANDLER
Handles trading bot events (cycles, regimes, execution errors, etc.)
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


class TradingHandler:
    """Pure handler for TRADING_BOT domain events"""

    @staticmethod
    def handle(event: Dict[str, Any], state: Dict[str, Any]) -> DomainResult:
        """
        Handle trading bot event and produce state delta.

        Event types:
        - CycleCompleted
        - BullishRegimeDetected
        - BearishRegimeDetected
        - VolatilitySpike
        - TradeExecutionError
        - TradingPaused
        - TradingResumed
        """
        event_type = event.get('type', 'UNKNOWN')
        payload = event.get('payload', {})

        state_delta = {}
        domain_actions = []
        logs = []

        if event_type == 'CycleCompleted':
            # Trading cycle completed successfully
            state_delta['last_cycle_id'] = payload.get('cycle_id')
            state_delta['cycle_count'] = state.get('cycle_count', 0) + 1
            logs.append(f"[trading] Cycle {payload.get('cycle_id')} completed in {payload.get('duration_ms')}ms")

        elif event_type == 'BullishRegimeDetected':
            # Bullish market detected
            state_delta['market_regime'] = 'BULLISH'
            state_delta['regime_confidence'] = payload.get('confidence', 0.0)
            domain_actions.append({'type': 'MAINTAIN_POSITION', 'severity': 'INFO'})
            logs.append(f"[trading] Bullish regime detected (confidence: {payload.get('confidence')})")

        elif event_type == 'BearishRegimeDetected':
            # Bearish market detected
            state_delta['market_regime'] = 'BEARISH'
            state_delta['regime_confidence'] = payload.get('confidence', 0.0)
            domain_actions.append({'type': 'REDUCE_EXPOSURE', 'severity': 'ALERT'})
            logs.append(f"[trading] Bearish regime detected (confidence: {payload.get('confidence')})")

        elif event_type == 'VolatilitySpike':
            # Market volatility spike
            state_delta['volatility_pct'] = payload.get('volatility_pct', 0.0)
            domain_actions.append({'type': 'MONITOR_VOLATILITY', 'severity': 'ALERT'})
            logs.append(f"[trading] Volatility spike: {payload.get('volatility_pct')}%")

        elif event_type == 'TradeExecutionError':
            # Trade execution failed
            state_delta['last_error'] = payload.get('reason')
            state_delta['error_count'] = state.get('error_count', 0) + 1
            domain_actions.append({'type': 'LOG_ERROR', 'severity': 'CRITICAL'})
            logs.append(f"[trading] Execution error: {payload.get('reason')} (retry count: {payload.get('retry_count')})")

        elif event_type == 'TradingPaused':
            # Trading paused
            state_delta['trading_paused'] = True
            state_delta['pause_reason'] = payload.get('reason')
            domain_actions.append({'type': 'HALT_TRADING', 'severity': 'WARNING'})
            logs.append(f"[trading] Trading paused: {payload.get('reason')}")

        elif event_type == 'TradingResumed':
            # Trading resumed
            state_delta['trading_paused'] = False
            state_delta['pause_reason'] = None
            domain_actions.append({'type': 'RESUME_TRADING', 'severity': 'INFO'})
            logs.append(f"[trading] Trading resumed")

        else:
            logs.append(f"[trading] Unknown event type: {event_type}")

        return DomainResult(
            state_delta=state_delta if state_delta else None,
            domain_actions=domain_actions,
            logs=logs
        )
