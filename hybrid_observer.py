#!/usr/bin/env python3
"""
Hybrid Observer - Runs alongside trading bot
Monitors behavior, generates alerts, and performs meta-analysis
Does NOT interfere with trading - pure observation mode
"""

import time
import logging
import sys
from datetime import datetime
from institutional_alert_system import get_alert_system
from meta_analysis_engine import get_analysis_engine

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(name)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger("HybridObserver")


class HybridObserver:
    """Observes trading bot behavior and generates insights"""

    def __init__(self, check_interval_seconds: int = 60):
        self.alert_system = get_alert_system()
        self.analysis_engine = get_analysis_engine()
        self.check_interval = check_interval_seconds
        self.start_time = datetime.utcnow()
        self.cycle_count = 0

        logger.info(f"[OBSERVER] Initialized (checking every {check_interval_seconds}s)")

    def run(self):
        """Main observer loop - runs continuously alongside trading bot"""
        logger.info("[OBSERVER] Starting hybrid observation mode")
        logger.info("[OBSERVER] Monitoring: alerts, state transitions, performance patterns")
        logger.info("[OBSERVER] Running in parallel with trading bot (non-blocking)")
        print("\n" + "="*60)
        print("HYBRID OBSERVER ACTIVE")
        print("="*60)
        print("Mode: Parallel observation (trading bot unaffected)")
        print("Monitoring: Alerts, patterns, recommendations")
        print("="*60 + "\n")

        try:
            while True:
                self.cycle_count += 1
                self._run_observation_cycle()
                time.sleep(self.check_interval)

        except KeyboardInterrupt:
            logger.info("[OBSERVER] Received shutdown signal")
            self._generate_final_report()
            print("\n[OBSERVER] Shutting down gracefully...\n")
            sys.exit(0)

    def _run_observation_cycle(self):
        """Run one observation cycle"""
        try:
            # Check for system state changes and generate alerts
            self._monitor_for_alerts()

            # Every 10 cycles (or ~10 minutes), run meta-analysis
            if self.cycle_count % 10 == 0:
                self._run_meta_analysis()

            # Every 30 cycles (or ~30 minutes), print summary
            if self.cycle_count % 30 == 0:
                self._print_observer_summary()

        except Exception as e:
            logger.error(f"[OBSERVER] Error in observation cycle: {e}")

    def _monitor_for_alerts(self):
        """Monitor trading logs for alert-worthy events"""
        try:
            with open("logs/trading_run_24h.log", 'r') as f:
                lines = f.readlines()

            # Check last few lines for important events
            recent_lines = lines[-20:] if len(lines) > 20 else lines

            for line in recent_lines:
                if 'BEARISH' in line and 'Trading paused' not in line:
                    # This is a new bearish detection
                    if 'WARN' in line:
                        self.alert_system.generate_alert(
                            'BEARISH_REGIME_DETECTED',
                            'Bearish market regime detected - trading protection active',
                            {'source': 'market_analyzer', 'trigger': 'RSI < 30'}
                        )

                if 'VOLATILITY' in line and '[VOLATILITY]' in line:
                    self.alert_system.generate_alert(
                        'VOLATILITY_DETECTION',
                        'Low volatility detected - requiring stronger signals',
                        {'source': 'market_analyzer', 'impact': 'higher_signal_threshold'}
                    )

        except Exception as e:
            logger.error(f"[OBSERVER] Error monitoring alerts: {e}")

    def _run_meta_analysis(self):
        """Run meta-analysis on system behavior"""
        logger.info("[OBSERVER] Running meta-analysis on system behavior...")

        report = self.analysis_engine.run_analysis(hours=1)  # Analyze last 1 hour

        # Print readable report
        print(report.to_readable())

        # Save report for later review
        self.analysis_engine.save_report(report)

        # Log key insights
        for insight in report.key_insights:
            logger.info(f"[INSIGHT] {insight}")

        # Log recommendations
        for rec in report.recommendations[:3]:
            logger.info(f"[RECOMMENDATION] [{rec.get('priority')}] {rec.get('description')}")

    def _print_observer_summary(self):
        """Print current observer status"""
        uptime = datetime.utcnow() - self.start_time
        alert_summary = self.alert_system.get_alert_summary()

        print("\n" + "-"*60)
        print(f"HYBRID OBSERVER SUMMARY (Cycle #{self.cycle_count})")
        print("-"*60)
        print(f"Uptime: {uptime}")
        print(f"Alerts (last 1h): {alert_summary['total_alerts_1h']}")
        print(f"  HIGH severity: {alert_summary['severity_distribution'].get('HIGH', 0)}")
        print(f"  MEDIUM severity: {alert_summary['severity_distribution'].get('MEDIUM', 0)}")
        print(f"  LOW severity: {alert_summary['severity_distribution'].get('LOW', 0)}")

        if alert_summary['top_states']:
            print("Top states:")
            for state, count in alert_summary['top_states'][:3]:
                print(f"  • {state}: {count}x")

        print(f"Status: 🟢 ACTIVE (trading bot running in parallel)")
        print("-"*60 + "\n")

    def _generate_final_report(self):
        """Generate final report before shutdown"""
        logger.info("[OBSERVER] Generating final comprehensive report...")

        report = self.analysis_engine.run_analysis(hours=24)
        print("\n" + "="*60)
        print("FINAL ANALYSIS REPORT")
        print("="*60)
        print(report.to_readable())

        self.analysis_engine.save_report(report, "logs/final_meta_analysis.json")
        logger.info("[OBSERVER] Final report saved to logs/final_meta_analysis.json")


def main():
    """Main entry point"""
    observer = HybridObserver(check_interval_seconds=60)
    observer.run()


if __name__ == '__main__':
    main()
