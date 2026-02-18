#!/usr/bin/env python3
"""
NARRATOR DEMONSTRATION
Shows the USS Chaosbringer speaking through a crisis and recovery sequence

The ship experiences:
1. Calm trading cycle → "nothing is on fire yet"
2. Bearish market → "I recommend caution"
3. High severity alert → "I'm not surprised anymore"
4. Reactor overheat → "I recommend fewer experiments and more survival"
5. Captain intervention → "experimental mode active"
6. System recovery → "breathing easier"
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import os
import json

# Set up path
sys.path = [p for p in sys.path if 'c:\\workspace' not in p.lower() or 'site-packages' in p.lower()]
sys.path.insert(0, r'c:\workspace\uss-chaosbringer')

from event_router import get_event_router, DomainResult
from narrator_engine import get_narrator_engine


class NarratorDemonstration:
    """Demonstrate the NarratorEngine across a realistic crisis sequence"""

    def __init__(self):
        self.router = get_event_router()
        self.narrator = get_narrator_engine()
        self.state = self._init_state()

    def _init_state(self):
        """Initialize ship state"""
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

    def run_demonstration(self):
        """Run the full narrative arc demonstration"""

        print("\n" + "="*80)
        print("USS CHAOSBRINGER — NARRATOR DEMONSTRATION")
        print("The ship speaks through a crisis and recovery")
        print("="*80)

        # The demonstration sequence
        sequence = [
            {
                'name': '[1/6] CALM: Trading Cycle Completes',
                'event': {
                    'domain': 'TRADING_BOT',
                    'type': 'CycleCompleted',
                    'payload': {
                        'cycle_id': 'cycle-001',
                        'duration_ms': 5000,
                    }
                }
            },
            {
                'name': '[2/6] UNEASY: Bearish Market Detected',
                'event': {
                    'domain': 'TRADING_BOT',
                    'type': 'BearishRegimeDetected',
                    'payload': {
                        'market_regime': 'BEARISH',
                        'confidence': 0.87,
                        'volatility_pct': 4.2,
                    }
                }
            },
            {
                'name': '[3/6] ALARMED: High Severity Alert',
                'event': {
                    'domain': 'OBSERVER',
                    'type': 'HighSeverityAlertReceived',
                    'payload': {
                        'alert_id': 'alert-001',
                        'alert_type': 'VOLATILITY_SPIKE',
                        'reason': 'Market volatility exceeds safety threshold',
                    }
                }
            },
            {
                'name': '[4/6] CRITICAL: Reactor Overheat',
                'event': {
                    'domain': 'INFRA',
                    'type': 'ReactorOverheat',
                    'payload': {
                        'reactor_temp': 92,
                        'reactor_threshold': 85,
                        'heat_rate': 2.3
                    }
                }
            },
            {
                'name': '[5/6] CAPTAIN TAKES CONTROL: Emergency Mode',
                'event': {
                    'domain': 'CAPTAIN',
                    'type': 'ExperimentalModeActivated',
                    'payload': {
                        'reason': 'Manual override to address multiple threats',
                        'captain_mood': 'DETERMINED'
                    }
                }
            },
            {
                'name': '[6/6] RECOVERY: System Stabilizes',
                'event': {
                    'domain': 'INFRA',
                    'type': 'ReactorOverheat',
                    'payload': {
                        'reactor_temp': 72,
                        'reactor_threshold': 85,
                        'heat_rate': -1.5
                    }
                }
            }
        ]

        # Process each event and narrate
        for i, step in enumerate(sequence, 1):
            print(f"\n{'─'*80}")
            print(f"{step['name']}")
            print(f"{'─'*80}")

            event = step['event']

            # Route through EventRouter to get domain delta
            result = self.router.route(event, self.state)

            # Update state
            if result.state_delta:
                self.state.update(result.state_delta)

            # Generate narrative
            narrative = self.narrator.generate_narrative(event, self.state, result.domain_actions)

            # Display everything
            print(f"Event:     {event['domain']}.{event['type']}")
            print(f"Severity:  {self._get_severity_label(self.state['threat_level'])}")
            print(f"Mode:      {self.state['mode']}")
            print(f"Threat:    {self.state['threat_level']}/10")
            print(f"\n{narrative}")
            print()
            print(f"Ship Status:")
            print(f"  - Market: {self.state.get('market_regime', 'UNKNOWN')}")
            print(f"  - Reactor: {self.state.get('reactor_temp', 0)}°C")
            print(f"  - Shields: {self.state.get('shields', 0)}")
            print(f"  - Warp: {self.state.get('warp_factor', 0)}")

        # Final summary
        self._print_summary()

    def _get_severity_label(self, threat_level: int) -> str:
        """Get severity label from threat level"""
        if threat_level >= 8:
            return "CRITICAL"
        elif threat_level >= 5:
            return "ALERT"
        elif threat_level >= 3:
            return "WARNING"
        else:
            return "INFO"

    def _print_summary(self):
        """Print final summary"""
        print(f"\n{'='*80}")
        print("NARRATOR DEMONSTRATION COMPLETE")
        print(f"{'='*80}")
        print("\nThe ship spoke through its crisis and recovery.")
        print("Each event was translated into a narrative that reflects:")
        print("  - The current operational mode (NORMAL, ELEVATED_ALERT, CRITICAL)")
        print("  - The threat severity (INFO, WARNING, ALERT, CRITICAL)")
        print("  - The domain that triggered the event (TRADING, OBSERVER, INFRA, CAPTAIN)")
        print("\nThe NarratorEngine is now operational.")
        print(f"{'='*80}\n")


def main():
    """Run the narrator demonstration"""
    demo = NarratorDemonstration()
    demo.run_demonstration()


if __name__ == '__main__':
    main()
