#!/usr/bin/env python3
"""
NARRATOR ENGINE — Give the ship a voice
Converts raw events and system state into human-readable narrative

Personality: Calm AI, slightly concerned, deeply resigned to serving a captain who does barrel rolls
Tone Matrix: (mode × severity × domain) → tone + template

Example outputs:
- INFO: "Captain, minor anomaly detected. Nothing is on fire. Yet."
- WARNING: "Shields rising. Again. For reasons I'm starting to question."
- CRITICAL: "Captain, we have a situation. I recommend fewer experiments and more survival."
"""

from typing import Dict, Any, Optional
from enum import Enum


class NarratorTone(Enum):
    """Narrative tone profiles"""
    CALM = "calm"
    CONCERNED = "concerned"
    RESIGNED = "resigned"
    ALARMED = "alarmed"
    CRITICAL = "critical"
    WEARY = "weary"


class NarratorEngine:
    """
    Generates human-readable narratives from system events and state.
    Pure tonal mapping: event context → narrative line.
    """

    def __init__(self):
        self.tone_matrix = self._build_tone_matrix()

    def _build_tone_matrix(self) -> Dict[str, Dict[str, Dict[str, Any]]]:
        """
        Build the 3D tone matrix: mode × severity × domain → templates

        Returns:
            Dict mapping (mode, severity, domain) to tone + template set
        """
        return {
            # ===== NORMAL MODE =====
            ("NORMAL", "INFO", "TRADING_BOT"): {
                "tone": NarratorTone.CALM,
                "templates": [
                    "Cycle {cycle_id} completed. Trading smooth as warp drive butter.",
                    "Market cycle finished. All indicators nominal.",
                    "{cycle_id}: Another successful run. The robots are doing their jobs."
                ]
            },
            ("NORMAL", "INFO", "OBSERVER"): {
                "tone": NarratorTone.CALM,
                "templates": [
                    "Systems nominal. Alerts cleared.",
                    "Everything is fine. Surprisingly.",
                    "Observer reports: no news is good news."
                ]
            },
            ("NORMAL", "INFO", "INFRA"): {
                "tone": NarratorTone.CALM,
                "templates": [
                    "Reactor humming at {reactor_temp}°C. Happy little fusion.",
                    "Infrastructure stable. For now.",
                    "Systems running within spec. Don't jinx it."
                ]
            },
            ("NORMAL", "WARNING", "TRADING_BOT"): {
                "tone": NarratorTone.CONCERNED,
                "templates": [
                    "Market shifting. {market_regime} regime detected. Adjusting approach.",
                    "Regime change: {market_regime}. I recommend caution.",
                    "The market just changed its mood. We should probably notice."
                ]
            },
            ("NORMAL", "WARNING", "INFRA"): {
                "tone": NarratorTone.CONCERNED,
                "templates": [
                    "Latency increasing. The ship is feeling sluggish.",
                    "CPU climbing. Systems getting busy.",
                    "Performance degrading slightly. Nothing dire yet."
                ]
            },
            ("NORMAL", "ALERT", "TRADING_BOT"): {
                "tone": NarratorTone.RESIGNED,
                "templates": [
                    "Volatility spike detected. {volatility_pct}%. This is why we have protocols.",
                    "The market is spicy today. {volatility_pct}% volatility. Excellent.",
                    "Volatility: {volatility_pct}%. We've seen worse. Barely."
                ]
            },
            ("NORMAL", "ALERT", "OBSERVER"): {
                "tone": NarratorTone.RESIGNED,
                "templates": [
                    "Alert received: {alert_type}. Of course.",
                    "System reports: {alert_type}. I'm not surprised anymore.",
                    "Alert: {alert_type}. The sensors are getting chatty again."
                ]
            },

            # ===== ELEVATED_ALERT MODE =====
            ("ELEVATED_ALERT", "WARNING", "TRADING_BOT"): {
                "tone": NarratorTone.CONCERNED,
                "templates": [
                    "Market conditions deteriorating. {market_regime}. Adjusting risk parameters.",
                    "{market_regime} market confirmed. Tightening controls.",
                    "We're in {market_regime}. Time to be careful."
                ]
            },
            ("ELEVATED_ALERT", "ALERT", "TRADING_BOT"): {
                "tone": NarratorTone.ALARMED,
                "templates": [
                    "Volatility at {volatility_pct}%. Shields responding.",
                    "Market is volatile ({volatility_pct}%). Raising defenses.",
                    "Volatility spike: {volatility_pct}%. Let's not panic. Yet."
                ]
            },
            ("ELEVATED_ALERT", "ALERT", "OBSERVER"): {
                "tone": NarratorTone.ALARMED,
                "templates": [
                    "Alert storm brewing. {alert_count} alerts detected.",
                    "System stress rising. {alert_count} alerts in the last hour.",
                    "The systems are complaining. {alert_count} active issues."
                ]
            },
            ("ELEVATED_ALERT", "ALERT", "INFRA"): {
                "tone": NarratorTone.ALARMED,
                "templates": [
                    "Latency spiking to {latency_ms}ms. System is struggling.",
                    "Response time degrading: {latency_ms}ms. Something is choking.",
                    "Latency: {latency_ms}ms. That's not good."
                ]
            },

            # ===== CRITICAL MODE =====
            ("CRITICAL", "CRITICAL", "TRADING_BOT"): {
                "tone": NarratorTone.CRITICAL,
                "templates": [
                    "Trade execution failed. {reason}. This is bad.",
                    "Order failed: {reason}. We need to talk about this.",
                    "Execution error: {reason}. Captain, I recommend a strategy review."
                ]
            },
            ("CRITICAL", "CRITICAL", "OBSERVER"): {
                "tone": NarratorTone.CRITICAL,
                "templates": [
                    "HIGH SEVERITY ALERT: {alert_type}. Systems compromised.",
                    "Critical alert received: {alert_type}. This is serious.",
                    "Alert: {alert_type} at CRITICAL level. We have a problem."
                ]
            },
            ("CRITICAL", "CRITICAL", "INFRA"): {
                "tone": NarratorTone.CRITICAL,
                "templates": [
                    "REACTOR OVERHEAT: {reactor_temp}°C (threshold: {reactor_threshold}°C). Emergency cooling engaged.",
                    "Reactor at {reactor_temp}°C. We're approaching meltdown.",
                    "Captain, the reactor is at {reactor_temp}°C. I recommend fewer experiments and more survival."
                ]
            },

            # ===== SAFE_MODE =====
            ("SAFE_MODE", "ALERT", "OBSERVER"): {
                "tone": NarratorTone.ALARMED,
                "templates": [
                    "Alert storm detected. Entering safe mode.",
                    "Too many alerts. Activating safe protocols.",
                    "System stress critical. Switching to minimal operations mode."
                ]
            },

            # ===== EXPERIMENTAL MODE =====
            ("EXPERIMENTAL", "INFO", "CAPTAIN"): {
                "tone": NarratorTone.WEARY,
                "templates": [
                    "Experimental mode activated. I've drafted our apology to physics.",
                    "You've enabled experimental mode. I'll start documenting what happens.",
                    "Experimental mode: ON. Safety protocols: still here, but lonely."
                ]
            },
        }

    def generate_narrative(
        self,
        event: Dict[str, Any],
        state: Dict[str, Any],
        domain_actions: Optional[list] = None
    ) -> str:
        """
        Generate a narrative line for an event given the current ship state.

        Args:
            event: BridgeEvent with domain, type, payload, etc.
            state: Current ShipState with mode, threat_level, etc.
            domain_actions: Optional list of domain actions for context

        Returns:
            Human-readable narrative line
        """
        mode = state.get("mode", "NORMAL")
        threat_level = state.get("threat_level", 0)

        # Determine severity based on threat_level, actions, AND event type
        severity = self._determine_severity_smart(threat_level, domain_actions, event)

        # Get template from tone matrix
        domain = event.get("domain", "UNKNOWN")
        key = (mode, severity, domain)

        if key in self.tone_matrix:
            tone_config = self.tone_matrix[key]
            templates = tone_config.get("templates", [])

            if templates:
                # Select a random template (or round-robin in production)
                template = templates[0]

                # Fill in payload variables
                narrative = self._interpolate_template(template, event.get("payload", {}), state)
                return narrative

        # Fallback narrative
        return self._fallback_narrative(event, state, severity)

    def _determine_severity(self, threat_level: int, actions: Optional[list] = None) -> str:
        """Determine severity level based on threat level and actions"""
        if threat_level >= 8:
            return "CRITICAL"
        elif threat_level >= 5:
            return "ALERT"
        elif threat_level >= 3:
            return "WARNING"
        else:
            return "INFO"

    def _determine_severity_smart(self, threat_level: int, actions: Optional[list] = None, event: Optional[Dict[str, Any]] = None) -> str:
        """
        Determine severity level intelligently based on:
        1. Threat level
        2. Domain actions
        3. Event type (inferred from event name)
        """
        # First, check event type for key indicators
        if event:
            event_type = event.get("type", "")

            # Critical events
            if any(x in event_type for x in ["Execute Error", "Overheat", "Storm", "HighSeverity", "Emergency"]):
                return "CRITICAL"

            # Alert events
            if any(x in event_type for x in ["Bearish", "Volatility", "Spike", "Alert", "Density", "Pressure", "Overload"]):
                return "ALERT"

            # Warning events
            if any(x in event_type for x in ["Warning", "Pause", "Increase", "Low"]):
                return "WARNING"

        # Check if actions escalate severity
        if actions:
            for action in actions:
                action_type = action.get("type", "")
                if "COOL_DOWN" in action_type or "EMERGENCY" in action_type or "CRITICAL" in action.get("severity", ""):
                    return "CRITICAL"
                elif "ESCALATE" in action_type or "HALT" in action_type or action.get("severity") == "ALERT":
                    return "ALERT"
                elif "MONITOR" in action_type or action.get("severity") == "WARNING":
                    return "WARNING"

        # Fall back to threat level
        return self._determine_severity(threat_level, actions)

    def _interpolate_template(self, template: str, payload: Dict[str, Any], state: Dict[str, Any]) -> str:
        """Fill in template variables with actual data"""
        context = {**payload, **state}

        # Simple string formatting with safe fallback
        try:
            return template.format(**context)
        except (KeyError, ValueError):
            # If interpolation fails, return template as-is
            return template

    def _fallback_narrative(self, event: Dict[str, Any], state: Dict[str, Any], severity: str) -> str:
        """Generate a fallback narrative when no template matches"""
        domain = event.get("domain", "UNKNOWN")
        event_type = event.get("type", "UNKNOWN")

        if severity == "CRITICAL":
            return f"Captain, we have a critical situation: {event_type}. Recommend immediate action."
        elif severity == "ALERT":
            return f"Alert: {event_type}. Systems responding. Monitoring situation."
        elif severity == "WARNING":
            return f"Warning: {event_type} detected. Adjusting parameters."
        else:
            return f"{event_type} event processed. All systems nominal."


# Singleton instance
_narrator = None


def get_narrator_engine() -> NarratorEngine:
    """Get or create singleton narrator"""
    global _narrator
    if _narrator is None:
        _narrator = NarratorEngine()
    return _narrator
