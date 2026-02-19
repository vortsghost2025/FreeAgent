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



# === NEW TEST HARNESS: FULL PERSONALITY SWEEP ===
PERSONALITY_MODES = [
    'CALM', 'SARCASM', 'NOIR', 'DOCUMENTARY', 'TIRED_ENGINEER', 'CAPTAINS_LOG', 'AI_TRYING_ITS_BEST'
]

def run_full_personality_sweep():
    """Test all personality modes, runtime switching, and fallback logic"""
    from chaosbringer_ship import ChaosBringerShip
    from starship import ShipEvent
    print("\n" + "="*80)
    print("USS CHAOSBRINGER — NARRATOR V2 PERSONALITY SWEEP")
    print("="*80)

    # Demonstration sequence (same as before)
    sequence = [
        {
            'name': '[1/7] CALM: Trading Cycle Completes',
            'event': ShipEvent(
                domain='TRADING_BOT',
                type='CycleCompleted',
                payload={'cycle_id': 'cycle-001', 'duration_ms': 5000}
            )
        },
        {
            'name': '[2/7] SARCASM: Bearish Market Detected',
            'event': ShipEvent(
                domain='TRADING_BOT',
                type='BearishRegimeDetected',
                payload={'market_regime': 'BEARISH', 'confidence': 0.87, 'volatility_pct': 4.2}
            )
        },
        {
            'name': '[3/7] NOIR: High Severity Alert',
            'event': ShipEvent(
                domain='OBSERVER',
                type='HighSeverityAlertReceived',
                payload={'alert_id': 'alert-001', 'alert_type': 'VOLATILITY_SPIKE', 'reason': 'Market volatility exceeds safety threshold'}
            )
        },
        {
            'name': '[4/7] DOCUMENTARY: Reactor Overheat',
            'event': ShipEvent(
                domain='INFRA',
                type='ReactorOverheat',
                payload={'reactor_temp': 92, 'reactor_threshold': 85, 'heat_rate': 2.3}
            )
        },
        {
            'name': '[5/7] TIRED_ENGINEER: Captain Emergency',
            'event': ShipEvent(
                domain='CAPTAIN',
                type='ExperimentalModeActivated',
                payload={'reason': 'Manual override to address multiple threats', 'captain_mood': 'DETERMINED'}
            )
        },
        {
            'name': '[6/7] CAPTAINS_LOG: System Stabilizes',
            'event': ShipEvent(
                domain='INFRA',
                type='ReactorOverheat',
                payload={'reactor_temp': 72, 'reactor_threshold': 85, 'heat_rate': -1.5}
            )
        },
        {
            'name': '[7/7] AI_TRYING_ITS_BEST: Fallback Event',
            'event': ShipEvent(
                domain='UNKNOWN',
                type='UnmappedEvent',
                payload={'misc': 42}
            )
        }
    ]

    # Test per-mode, runtime switching, and fallback
    ship = ChaosBringerShip("ChaosBringer")
    for i, mode in enumerate(PERSONALITY_MODES):
        print(f"\n{'─'*80}")
        print(f"PERSONALITY MODE: {mode}")
        print(f"{'─'*80}")
        ship.set_personality_mode(mode)
        # Process event in this mode
        step = sequence[i]
        result = ship.process_event(step['event'])
        print(f"Event:     {step['event'].domain}.{step['event'].type}")
        print(f"Mode:      {mode}")
        print(f"Narrative: {result.narrative}")
        print(f"Severity:  {result.severity}")
        print(f"Logs:      {result.logs}")

    # Test runtime switching mid-event
    print(f"\n{'─'*80}")
    print("RUNTIME SWITCH: SARCASM → CALM mid-sequence")
    print(f"{'─'*80}")
    ship.set_personality_mode('SARCASM')
    event = ShipEvent(domain='TRADING_BOT', type='CycleCompleted', payload={'cycle_id': 'cycle-999', 'duration_ms': 4000})
    result1 = ship.process_event(event)
    ship.set_personality_mode('CALM')
    result2 = ship.process_event(event)
    print(f"SARCASM: {result1.narrative}")
    print(f"CALM:    {result2.narrative}")

    print(f"\n{'='*80}")
    print("NARRATOR V2 PERSONALITY SWEEP COMPLETE")
    print(f"{'='*80}\n")

if __name__ == '__main__':
    run_full_personality_sweep()

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
