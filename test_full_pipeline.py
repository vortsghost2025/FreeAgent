#!/usr/bin/env python3
"""
INTEGRATION TEST — Full end-to-end pipeline validation
Tests the complete USS Chaosbringer control plane:
EventRouter → Domain Handlers → SafetyEngine → StateMachine → BridgeControl
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import os
import json
from typing import Dict, Any, List

# CRITICAL: Set up path BEFORE any imports from uss-chaosbringer
# This prevents import conflicts
original_path = sys.path.copy()
sys.path = [p for p in sys.path if 'c:\\workspace' not in p.lower() or 'site-packages' in p.lower()]
sys.path.insert(0, r'c:\workspace\uss-chaosbringer')

# Now import
from event_router import get_event_router, DomainResult


class IntegrationTest:
    """Full pipeline integration test"""

    def __init__(self):
        self.router = get_event_router()
        self.test_results = []
        self.state = self._init_state()

    def _init_state(self) -> Dict[str, Any]:
        """Initialize test state"""
        return {
            'mode': 'NORMAL',
            'threat_level': 2,
            'cycle_count': 0,
            'market_regime': 'BULLISH',
            'shields': 5000,
            'warp_factor': 2.5,
            'reactor_temp': 65,
            'high_severity_alerts': 0,
            'trading_paused': False
        }

    def test_event_sequence(self):
        """Test a realistic event sequence through the full pipeline"""

        print("\n" + "="*80)
        print("USS CHAOSBRINGER — FULL PIPELINE INTEGRATION TEST")
        print("="*80)
        print("\nInitial State:")
        self._print_state(self.state)

        # Event Sequence
        events = [
            {
                'name': 'Trading Cycle Completed',
                'event': {
                    'id': 'evt-001',
                    'domain': 'TRADING_BOT',
                    'type': 'CycleCompleted',
                    'timestamp': 1705604400000,
                    'payload': {
                        'cycle_id': 'cycle-001',
                        'duration_ms': 5000,
                        'assets_analyzed': ['SOL/USDT', 'BTC/USDT', 'ETH/USDT'],
                        'regimes_detected': ['BULLISH']
                    }
                }
            },
            {
                'name': 'Bearish Regime Detected',
                'event': {
                    'id': 'evt-002',
                    'domain': 'TRADING_BOT',
                    'type': 'BearishRegimeDetected',
                    'timestamp': 1705604410000,
                    'payload': {
                        'regime': 'BEARISH',
                        'confidence': 0.87,
                        'volatility_pct': 4.2,
                        'rsi_value': 28
                    }
                }
            },
            {
                'name': 'High Severity Alert Received',
                'event': {
                    'id': 'evt-003',
                    'domain': 'OBSERVER',
                    'type': 'HighSeverityAlertReceived',
                    'timestamp': 1705604420000,
                    'payload': {
                        'alert_id': 'alert-001',
                        'type': 'VOLATILITY_SPIKE',
                        'reason': 'Market volatility exceeds safety threshold',
                        'affected_systems': ['TRADING', 'WARP_CORE']
                    }
                }
            },
            {
                'name': 'Reactor Overheat Detected',
                'event': {
                    'id': 'evt-004',
                    'domain': 'INFRA',
                    'type': 'ReactorOverheat',
                    'timestamp': 1705604430000,
                    'payload': {
                        'core_temp': 92,
                        'threshold': 85,
                        'heat_rate': 2.3
                    }
                }
            },
            {
                'name': 'Captain Issues Emergency Mode',
                'event': {
                    'id': 'evt-005',
                    'domain': 'CAPTAIN',
                    'type': 'ModeSwitch',
                    'timestamp': 1705604440000,
                    'payload': {
                        'from_mode': 'NORMAL',
                        'to_mode': 'CRITICAL',
                        'reason': 'Manual override: Multiple threats detected'
                    }
                }
            },
            {
                'name': 'System Recovery - Threat Cleared',
                'event': {
                    'id': 'evt-006',
                    'domain': 'INFRA',
                    'type': 'ReactorOverheat',  # But this time showing recovery
                    'timestamp': 1705604450000,
                    'payload': {
                        'core_temp': 72,
                        'threshold': 85,
                        'heat_rate': -1.5
                    }
                }
            }
        ]

        # Process each event
        for i, test_case in enumerate(events, 1):
            print(f"\n{'─'*80}")
            print(f"EVENT {i}: {test_case['name']}")
            print(f"{'─'*80}")

            event = test_case['event']
            print(f"Event Type: {event['domain']}.{event['type']}")
            print(f"Payload: {json.dumps(event['payload'], indent=2)}")

            # Route through EventRouter
            result = self.router.route(event, self.state)

            print(f"\nRouter Result:")
            print(f"  State Delta: {result.state_delta}")
            print(f"  Domain Actions: {[a['type'] for a in result.domain_actions]}")
            print(f"  Logs: {result.logs}")

            # Apply state delta
            if result.state_delta:
                self.state.update(result.state_delta)

            # Track action severity for safety decisions
            max_severity = 'INFO'
            for action in result.domain_actions:
                if action.get('severity') == 'CRITICAL':
                    max_severity = 'CRITICAL'
                elif action.get('severity') == 'ALERT' and max_severity != 'CRITICAL':
                    max_severity = 'ALERT'
                elif action.get('severity') == 'WARNING' and max_severity in ['INFO', 'WARNING']:
                    max_severity = 'WARNING'

            print(f"\nState After Event:")
            self._print_state(self.state)

            # Store test result
            self.test_results.append({
                'event_num': i,
                'event_name': test_case['name'],
                'event_type': f"{event['domain']}.{event['type']}",
                'domain_actions_count': len(result.domain_actions),
                'max_severity': max_severity,
                'state_updated': bool(result.state_delta)
            })

        self._print_summary()

    def _print_state(self, state: Dict[str, Any]):
        """Pretty print current state"""
        print(f"  Mode: {state.get('mode', 'UNKNOWN')}")
        print(f"  Threat Level: {state.get('threat_level', 0)}/10")
        print(f"  Market Regime: {state.get('market_regime', 'UNKNOWN')}")
        print(f"  Shields: {state.get('shields', 0)}")
        print(f"  Warp Factor: {state.get('warp_factor', 0)}")
        print(f"  Reactor Temp: {state.get('reactor_temp', 0)}C")
        print(f"  Trading Paused: {state.get('trading_paused', False)}")
        print(f"  High Severity Alerts: {state.get('high_severity_alerts', 0)}")

    def _print_summary(self):
        """Print test summary"""
        print(f"\n{'='*80}")
        print("INTEGRATION TEST SUMMARY")
        print(f"{'='*80}")

        print(f"\nProcessed {len(self.test_results)} events:\n")

        for result in self.test_results:
            print(f"[{result['event_num']}] {result['event_name']}")
            print(f"    Type: {result['event_type']}")
            print(f"    Actions: {result['domain_actions_count']}")
            print(f"    Max Severity: {result['max_severity']}")
            print(f"    State Updated: {'Yes' if result['state_updated'] else 'No'}")
            print()

        # Final validation
        print(f"{'─'*80}")
        print("VALIDATION RESULTS")
        print(f"{'─'*80}")

        validations = [
            ("EventRouter routing", len(self.test_results) > 0),
            ("Domain handlers executed", any(r['domain_actions_count'] > 0 for r in self.test_results)),
            ("State mutations tracked", any(r['state_updated'] for r in self.test_results)),
            ("Severity escalation detected", any(r['max_severity'] in ['ALERT', 'CRITICAL'] for r in self.test_results)),
            ("Final state is valid", self._validate_final_state())
        ]

        all_pass = True
        for validation_name, passed in validations:
            status = "[PASS]" if passed else "[FAIL]"
            print(f"{status} {validation_name}")
            if not passed:
                all_pass = False

        print(f"\n{'='*80}")
        if all_pass:
            print("INTEGRATION TEST: ALL CHECKS PASSED")
        else:
            print("INTEGRATION TEST: SOME CHECKS FAILED")
        print(f"{'='*80}\n")

        return all_pass

    def _validate_final_state(self) -> bool:
        """Validate that final state is consistent"""
        # Basic sanity checks
        checks = [
            self.state.get('threat_level', 0) >= 0,
            self.state.get('threat_level', 0) <= 10,
            self.state.get('shields', 0) >= 0,
            self.state.get('warp_factor', 0) >= 0,
            self.state.get('reactor_temp', 0) >= 0,
            self.state.get('mode') in ['NORMAL', 'ELEVATED_ALERT', 'CRITICAL', 'SAFE_MODE', 'EXPERIMENTAL'],
        ]
        return all(checks)


def main():
    """Run the integration test"""
    test = IntegrationTest()
    test.test_event_sequence()


if __name__ == '__main__':
    main()
