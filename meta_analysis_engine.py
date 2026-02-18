"""
Meta-Analysis Engine
Analyzes trading bot behavior to identify patterns and recommend improvements
Runs independently and learns from system behavior
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple
import json

logger = logging.getLogger("MetaAnalysisEngine")


class MetaAnalysisReport:
    """Analysis report with findings and recommendations"""

    def __init__(self):
        self.timestamp = datetime.utcnow().isoformat()
        self.analysis_period_hours = 0
        self.total_events = 0
        self.state_distribution = {}
        self.pause_frequency = 0.0
        self.top_pause_reasons = []
        self.recommendations = []
        self.key_insights = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            'timestamp': self.timestamp,
            'analysis_period_hours': self.analysis_period_hours,
            'total_events': self.total_events,
            'state_distribution': self.state_distribution,
            'pause_frequency': self.pause_frequency,
            'top_pause_reasons': self.top_pause_reasons[:5],
            'recommendations': self.recommendations,
            'key_insights': self.key_insights
        }

    def to_readable(self) -> str:
        """Format report as human-readable text"""
        lines = [
            f"\n{'='*60}",
            f"META-ANALYSIS REPORT",
            f"{'='*60}",
            f"Generated: {self.timestamp}",
            f"Period: Last {self.analysis_period_hours} hours",
            f"Total events analyzed: {self.total_events}",
            f"\nSTATE DISTRIBUTION:",
            *[f"  {state}: {count} events" for state, count in sorted(self.state_distribution.items(), key=lambda x: x[1], reverse=True)[:5]],
            f"\nPAUSE ANALYSIS:",
            f"  Pause frequency: {self.pause_frequency*100:.1f}% of all events",
            f"  Top reasons:",
            *[f"    {i+1}. {reason} ({count}x)" for i, (reason, count) in enumerate(self.top_pause_reasons[:3])],
            f"\nKEY INSIGHTS:",
            *[f"  • {insight}" for insight in self.key_insights],
            f"\nRECOMMENDATIONS ({len(self.recommendations)}):",
            *[f"  [{rec.get('priority', 'INFO')}] {rec.get('description', 'N/A')}" for rec in self.recommendations[:5]],
            f"{'='*60}\n"
        ]
        return '\n'.join(lines)


class MetaAnalysisEngine:
    """
    Analyzes system logs to understand behavior patterns
    Self-teaching: learns what works and what doesn't
    """

    def __init__(self, log_dir: str = "logs"):
        self.log_dir = log_dir
        self.trading_log = f"{log_dir}/trading_run_24h.log"
        self.alerts_log = f"{log_dir}/alerts.jsonl"
        self.analysis_cache = {}

        logger.info("[META-ANALYSIS] Engine initialized")

    def run_analysis(self, hours: int = 24) -> MetaAnalysisReport:
        """Run comprehensive analysis on recent system behavior"""
        report = MetaAnalysisReport()
        report.analysis_period_hours = hours

        try:
            # Parse trading logs
            events = self._parse_trading_logs(hours)
            report.total_events = len(events)

            if report.total_events == 0:
                logger.warning("[META-ANALYSIS] No events found in log period")
                report.key_insights.append("No trading events recorded in analysis period")
                return report

            # Analyze state distribution
            report.state_distribution = self._analyze_state_distribution(events)

            # Analyze pause patterns
            pause_data = self._analyze_pause_patterns(events)
            report.pause_frequency = pause_data['frequency']
            report.top_pause_reasons = pause_data['top_reasons']

            # Generate insights
            report.key_insights = self._generate_insights(events, pause_data)

            # Generate recommendations
            report.recommendations = self._generate_recommendations(events, pause_data, report)

            logger.info(f"[META-ANALYSIS] Analysis complete: {report.total_events} events, "
                       f"{len(report.recommendations)} recommendations")

        except Exception as e:
            logger.error(f"[META-ANALYSIS] Error during analysis: {e}")
            report.key_insights.append(f"Analysis error: {str(e)}")

        return report

    def _parse_trading_logs(self, hours: int) -> List[Dict[str, Any]]:
        """Parse trading bot logs and extract structured events"""
        events = []
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        try:
            with open(self.trading_log, 'r') as f:
                for line in f:
                    try:
                        # Extract timestamp and key info
                        if '[' in line and ']' in line:
                            timestamp_str = line.split(']')[0].replace('[', '').strip()
                            try:
                                event_time = datetime.fromisoformat(timestamp_str)
                                if event_time >= cutoff_time:
                                    # Categorize event
                                    event_type = self._categorize_event(line)
                                    if event_type:
                                        events.append({
                                            'timestamp': event_time,
                                            'type': event_type,
                                            'raw': line.strip()
                                        })
                            except ValueError:
                                pass
                    except Exception:
                        continue
        except FileNotFoundError:
            logger.warning(f"[META-ANALYSIS] Trading log not found: {self.trading_log}")

        return events

    def _categorize_event(self, line: str) -> str:
        """Categorize log line into event type"""
        if 'BEARISH_LOCKOUT' in line or 'BEARISH' in line:
            return 'BEARISH_DETECTED'
        elif 'Trading paused' in line or 'FREEZE' in line:
            return 'TRADING_PAUSED'
        elif 'VOLATILITY' in line:
            return 'VOLATILITY_CHECK'
        elif 'Entry timing' in line:
            return 'ENTRY_TIMING'
        elif 'Analyzing' in line:
            return 'ANALYSIS'
        elif 'WIN_RATE' in line or 'Win Rate' in line:
            return 'BACKTEST_RESULT'
        elif 'Asset adjustment' in line or 'ASSET' in line:
            return 'ASSET_CONFIG'
        elif 'Completed' in line:
            return 'CYCLE_COMPLETE'
        return None

    def _analyze_state_distribution(self, events: List[Dict[str, Any]]) -> Dict[str, int]:
        """Count occurrences of each event type"""
        distribution = {}
        for event in events:
            event_type = event.get('type', 'UNKNOWN')
            distribution[event_type] = distribution.get(event_type, 0) + 1
        return distribution

    def _analyze_pause_patterns(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze when and why trading pauses"""
        pause_events = [e for e in events if e['type'] in ['TRADING_PAUSED', 'BEARISH_DETECTED']]

        pause_reasons = {}
        for event in pause_events:
            # Extract reason from raw log
            raw = event.get('raw', '')
            if 'BEARISH' in raw:
                reason = 'BEARISH_REGIME'
            elif 'VOLATILITY' in raw:
                reason = 'HIGH_VOLATILITY'
            elif 'Entry timing' in raw:
                reason = 'ENTRY_TIMING'
            else:
                reason = 'OTHER'

            pause_reasons[reason] = pause_reasons.get(reason, 0) + 1

        frequency = len(pause_events) / max(len(events), 1)
        top_reasons = sorted(pause_reasons.items(), key=lambda x: x[1], reverse=True)

        return {
            'total_pauses': len(pause_events),
            'frequency': frequency,
            'top_reasons': top_reasons
        }

    def _generate_insights(self, events: List[Dict[str, Any]], pause_data: Dict[str, Any]) -> List[str]:
        """Generate key insights from behavior patterns"""
        insights = []

        # Insight 1: Pause frequency
        pause_freq = pause_data['frequency']
        if pause_freq > 0.5:
            insights.append(f"🔴 OBSERVATION: Trading paused in >{pause_freq*100:.0f}% of cycles (high caution)")
        elif pause_freq > 0.25:
            insights.append(f"🟡 OBSERVATION: Trading paused in >{pause_freq*100:.0f}% of cycles (moderate caution)")
        else:
            insights.append(f"🟢 OBSERVATION: Trading conditions favorable ({(1-pause_freq)*100:.0f}% of cycles)")

        # Insight 2: Most common pause reason
        if pause_data['top_reasons']:
            top_reason = pause_data['top_reasons'][0][0]
            count = pause_data['top_reasons'][0][1]
            insights.append(f"📊 ROOT CAUSE: '{top_reason}' triggered {count}x (most common pause reason)")

        # Insight 3: Asset behavior
        if any('BTC' in e.get('raw', '') for e in events):
            insights.append("💰 ASSET OBSERVATION: BTC trading activity detected")
        if any('ETH' in e.get('raw', '') for e in events):
            insights.append("💰 ASSET OBSERVATION: ETH trading activity detected")

        return insights

    def _generate_recommendations(self, events: List[Dict[str, Any]], pause_data: Dict[str, Any],
                                  report: MetaAnalysisReport) -> List[Dict[str, str]]:
        """Generate actionable recommendations"""
        recommendations = []

        # Recommendation 1: High pause frequency
        if pause_data['frequency'] > 0.4:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'OPTIMIZATION',
                'description': f"High pause frequency ({pause_data['frequency']*100:.0f}%) - consider relaxing regime detection thresholds",
                'action': "Adjust downtrend_threshold from -5% to -7% to allow more trades in declining markets"
            })

        # Recommendation 2: Top pause reason
        if pause_data['top_reasons']:
            top_reason, count = pause_data['top_reasons'][0]
            if top_reason == 'BEARISH_REGIME' and count > 20:
                recommendations.append({
                    'priority': 'HIGH',
                    'category': 'SIGNAL_QUALITY',
                    'description': f"Bearish regime detected {count}x - verify if threshold is appropriate",
                    'action': "Review bearish detection logic (RSI < 30) - may be too sensitive"
                })

        # Recommendation 3: Entry timing
        entry_timing_events = [e for e in events if e['type'] == 'ENTRY_TIMING']
        if len(entry_timing_events) > len(events) * 0.7:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'ENTRY_STRATEGY',
                'description': f"Entry timing validation blocking {len(entry_timing_events)} orders",
                'action': "Consider reducing reversal threshold from 0.1% to 0.05% for faster entry"
            })

        # Recommendation 4: Asset performance
        recommendations.append({
            'priority': 'INFO',
            'category': 'MONITORING',
            'description': 'Continue monitoring asset-specific performance metrics',
            'action': 'Track win rates per asset to validate BTC/ETH performance factors'
        })

        return recommendations

    def save_report(self, report: MetaAnalysisReport, filename: str = None):
        """Save analysis report to file"""
        if filename is None:
            filename = f"{self.log_dir}/meta_analysis_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"

        try:
            with open(filename, 'w') as f:
                json.dump(report.to_dict(), f, indent=2, default=str)
            logger.info(f"[META-ANALYSIS] Report saved: {filename}")
        except Exception as e:
            logger.error(f"[META-ANALYSIS] Failed to save report: {e}")


# Singleton instance
_analysis_engine = None


def get_analysis_engine() -> MetaAnalysisEngine:
    """Get or create singleton analysis engine"""
    global _analysis_engine
    if _analysis_engine is None:
        _analysis_engine = MetaAnalysisEngine()
    return _analysis_engine
