#!/usr/bin/env python3
"""
PHASE XXXI - EXTERNAL CIVILIZATION DETECTOR
Detects, classifies, and tracks external civilizations across the galaxy.
Implements threat assessment, expansion prediction, and contact protocols.
PATH I: Outward Expansion - Federation detects surrounding civilizations.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple
from datetime import datetime
from enum import Enum


class CivilizationType(Enum):
    """Classification of external civilization types"""
    SILICON_BASED = "silicon_based"
    CARBON_BASED = "carbon_based"
    ENERGY_BASED = "energy_based"
    HIVE_MIND = "hive_mind"
    POST_BIOLOGICAL = "post_biological"
    UNKNOWN = "unknown"


class TechLevel(Enum):
    """Civilization technological advancement scale (Type I-V Kardashev)"""
    PRE_INDUSTRIAL = "pre_industrial"          # Type 0.x - Pre-industrial
    INDUSTRIAL = "industrial"                   # Type I - Planetary
    PLANETARY = "planetary"                     # Type I+ - Full planet harness
    STELLAR = "stellar"                         # Type II - Star harnessing
    GALACTIC = "galactic"                       # Type III - Galaxy wide
    UNIVERSAL = "universal"                     # Type IV+ - Beyond galaxy


class ThreatLevel(Enum):
    """Assessment of civilization threat classification"""
    BENIGN = "benign"                          # Peaceful, compatible
    NEUTRAL = "neutral"                        # No apparent threat
    CAUTIOUS = "cautious"                      # Unknown intentions
    HOSTILE = "hostile"                        # Confirmed aggressive
    CRITICAL = "critical"                      # Immediate danger


class ContactStatus(Enum):
    """Status of contact with civilization"""
    UNDETECTED = "undetected"                  # Not yet found
    SIGNAL_DETECTED = "signal_detected"        # Radio/signal confirmed
    IDENTIFIED = "identified"                  # Classification complete
    MONITORED = "monitored"                    # Active surveillance
    CONTACTED = "contacted"                    # Direct communication
    ALLIANCE = "alliance"                      # Formal agreement
    CONFLICT = "conflict"                      # Active hostility


@dataclass
class SignalDetection:
    """Record of detected signal from external source"""
    signal_id: str
    source_coordinates: Tuple[float, float, float]  # x, y, z coordinates
    signal_strength: float                    # 0-1 normalized signal power
    frequency_range: Tuple[float, float]      # Min-max frequency (Hz)
    pattern_complexity: float                 # 0-1 artificial pattern score
    detection_timestamp: float
    duration_seconds: float                   # How long signal was detected


@dataclass
class CivilizationCharacteristics:
    """Detailed characteristics of detected civilization"""
    species_type: CivilizationType
    technology_level: TechLevel
    estimated_population: int                 # Approximate population
    resource_consumption_rate: float          # Relative to federation baseline
    signal_frequency_preference: float        # Preferred communication freq
    cultural_indicators: List[str]            # Observable cultural traits
    military_capability: float                # 0-1 estimated threat potential
    terraforming_activity: bool               # Evidence of planetary engineering


@dataclass
class ExpansionPattern:
    """Predicted expansion trajectory of civilization"""
    pattern_id: str
    current_sphere_radius: float              # Light-years from origin
    expansion_rate_ly_per_year: float        # Expansion velocity
    predicted_5yr_radius: float               # 5-year projection
    predicted_10yr_radius: float              # 10-year projection
    expansion_direction: str                  # Radial, targeted, random
    confidence: float                         # 0-1 prediction confidence
    calculation_timestamp: float


@dataclass
class ExternalCivilization:
    """Complete record of external civilization"""
    civilization_id: str
    name: str                                 # Identifier/designation
    species_type: CivilizationType
    technology_level: TechLevel
    threat_assessment: ThreatLevel
    contact_status: ContactStatus

    # Location and movement
    origin_coordinates: Tuple[float, float, float]
    current_distance_ly: float                # Light-years from federation origin
    last_detected_timestamp: float

    # Characteristics and behavior
    characteristics: CivilizationCharacteristics
    expansion_pattern: Optional[ExpansionPattern] = None
    contact_attempts: int = 0
    successful_communications: int = 0

    # Tracking and monitoring
    signal_detections: List[SignalDetection] = field(default_factory=list)
    behavior_history: List[str] = field(default_factory=list)
    confidence_score: float = 0.5             # 0-1 classification confidence
    creation_timestamp: float = field(default_factory=lambda: datetime.now().timestamp())


@dataclass
class DetectorStatus:
    """Comprehensive status report of detection system"""
    total_civilizations_detected: int
    total_signals_logged: int
    civilizations_by_threat_level: Dict[str, int]
    civilizations_by_contact_status: Dict[str, int]
    closest_civilization: Optional[str]       # ID of nearest civilization
    closest_distance_ly: float
    most_advanced_civilization: Optional[str] # ID of highest tech level
    detection_system_efficiency: float        # 0-1 signal detection accuracy
    scan_coverage_percentage: float           # % of galaxy scanned
    last_system_scan: float                   # Timestamp of last full scan


class CivilizationDetector:
    """
    Detects, classifies, and tracks external civilizations.
    Implements threat assessment and expansion prediction.
    """

    def __init__(self):
        self.civilizations: Dict[str, ExternalCivilization] = {}
        self.all_signals: List[SignalDetection] = []
        self.scan_history: List[float] = []

        self._id_counters = {
            "civilization": 0,
            "signal": 0,
            "expansion": 0,
        }

        # System calibration
        self.detection_sensitivity: float = 0.7  # Signal detection threshold
        self.threat_calculation_version: int = 2  # Algorithm version
        self.last_full_scan: Optional[float] = None
        self.scan_radius_ly: float = 1000.0  # Scan range in light-years

    def _generate_id(self, entity_type: str) -> str:
        """Generate unique identifier for entity"""
        self._id_counters[entity_type] += 1
        return f"{entity_type}_{self._id_counters[entity_type]:04d}"

    # ===== SIGNAL SCANNING =====

    def scan_for_signals(
        self,
        scan_radius_ly: float = None,
        signal_threshold: float = None,
    ) -> Dict[str, object]:
        """
        Scan galaxy for external signals within specified radius.

        Args:
            scan_radius_ly: Scan range in light-years (overrides default)
            signal_threshold: Signal strength minimum (0-1)

        Returns:
            Dict with scan results and detected signals
        """
        if scan_radius_ly is not None:
            self.scan_radius_ly = scan_radius_ly
        if signal_threshold is None:
            signal_threshold = self.detection_sensitivity

        # Simulate signal scan
        scan_timestamp = datetime.now().timestamp()
        self.scan_history.append(scan_timestamp)
        self.last_full_scan = scan_timestamp

        # Generate detection probability based on scan setup
        detection_count = self._simulate_signal_detections(
            scan_radius_ly or self.scan_radius_ly,
            signal_threshold
        )

        return {
            "scan_timestamp": scan_timestamp,
            "scan_radius_ly": self.scan_radius_ly,
            "signals_detected": detection_count,
            "total_scan_count": len(self.scan_history),
            "system_efficiency": min(1.0, 0.6 + (len(self.scan_history) * 0.02)),
            "new_civilizations_identified": detection_count,
        }

    def _simulate_signal_detections(
        self,
        scan_radius: float,
        threshold: float,
    ) -> int:
        """Simulate realistic signal detection based on parameters"""
        # Formula: base detection * radius factor * threshold quality
        base_rate = 0.3
        radius_factor = min(1.5, scan_radius / 500.0)
        threshold_factor = (1.0 - threshold) * 0.8 + 0.2  # Better detection with lower threshold

        import random

        # Probabilistic detection
        detection_probability = base_rate * radius_factor * threshold_factor
        detected_signals = sum(
            1 for _ in range(int(scan_radius / 100))
            if random.random() < detection_probability
        )

        # Create signal records for detected signals
        for _ in range(detected_signals):
            signal = SignalDetection(
                signal_id=self._generate_id("signal"),
                source_coordinates=(
                    random.uniform(-scan_radius, scan_radius),
                    random.uniform(-scan_radius, scan_radius),
                    random.uniform(-scan_radius, scan_radius),
                ),
                signal_strength=random.uniform(threshold, 1.0),
                frequency_range=(1e9, 1e12),  # GHz range
                pattern_complexity=random.uniform(0.6, 0.99),  # Clearly artificial
                detection_timestamp=datetime.now().timestamp(),
                duration_seconds=random.uniform(60, 86400),
            )
            self.all_signals.append(signal)

        return detected_signals

    # ===== CIVILIZATION CLASSIFICATION =====

    def classify_civilization(
        self,
        signal: SignalDetection,
        detected_characteristics: Optional[Dict] = None,
    ) -> ExternalCivilization:
        """
        Classify detected signal as specific civilization.

        Args:
            signal: SignalDetection record
            detected_characteristics: Optional dict with observed traits

        Returns:
            ExternalCivilization object with classification
        """
        civ_id = self._generate_id("civilization")

        # Classify civilization type
        civ_type = self._classify_species_type(signal)

        # Estimate technology level
        tech_level = self._estimate_technology_level(signal, civ_type)

        # Initial threat assessment (basic, before we know more about civilization)
        threat = self._initial_threat_from_tech(tech_level)

        # Build characteristics
        characteristics = CivilizationCharacteristics(
            species_type=civ_type,
            technology_level=tech_level,
            estimated_population=self._estimate_population(tech_level),
            resource_consumption_rate=self._estimate_consumption(tech_level),
            signal_frequency_preference=self._extract_frequency(signal),
            cultural_indicators=self._detect_cultural_traits(signal),
            military_capability=self._estimate_military_threat(tech_level, signal),
            terraforming_activity=self._detect_terraforming(signal),
        )

        # Calculate distance
        distance = self._calculate_distance(signal.source_coordinates)

        civilization = ExternalCivilization(
            civilization_id=civ_id,
            name=f"External_Civ_{civ_id.split('_')[1]}",
            species_type=civ_type,
            technology_level=tech_level,
            threat_assessment=threat,
            contact_status=ContactStatus.SIGNAL_DETECTED,
            origin_coordinates=signal.source_coordinates,
            current_distance_ly=distance,
            last_detected_timestamp=signal.detection_timestamp,
            characteristics=characteristics,
            confidence_score=min(1.0, signal.pattern_complexity * 0.95),
        )

        civilization.signal_detections.append(signal)
        self.civilizations[civ_id] = civilization

        return civilization

    def _classify_species_type(self, signal: SignalDetection) -> CivilizationType:
        """Infer species type from signal characteristics"""
        # Higher frequency patterns suggest silicon-based AI
        avg_freq = (signal.frequency_range[0] + signal.frequency_range[1]) / 2

        if avg_freq > 1e11:  # Very high frequency = post-biological
            return CivilizationType.POST_BIOLOGICAL
        elif signal.pattern_complexity > 0.95:
            return CivilizationType.HIVE_MIND
        elif signal.duration_seconds > 10000:  # Long-duration suggests energy-based
            return CivilizationType.ENERGY_BASED
        elif signal.pattern_complexity > 0.85:
            return CivilizationType.SILICON_BASED
        else:
            return CivilizationType.CARBON_BASED

    def _initial_threat_from_tech(self, tech_level: TechLevel) -> ThreatLevel:
        """Estimate initial threat level based on technology alone (before behavior data)"""
        # Higher tech = potentially more dangerous
        tech_idx = list(TechLevel).index(tech_level)
        fed_tech_idx = 3  # Assume federation is Stellar

        if tech_idx > fed_tech_idx + 1:
            return ThreatLevel.CAUTIOUS
        elif tech_idx == fed_tech_idx:
            return ThreatLevel.NEUTRAL
        else:
            return ThreatLevel.BENIGN

    def _estimate_technology_level(
        self,
        signal: SignalDetection,
        civ_type: CivilizationType,
    ) -> TechLevel:
        """Estimate technology level from signal properties"""
        # Combine pattern complexity and signal strength
        tech_score = (signal.pattern_complexity * 0.6 + signal.signal_strength * 0.4)

        if civ_type == CivilizationType.POST_BIOLOGICAL:
            base_level = TechLevel.GALACTIC
        elif civ_type == CivilizationType.HIVE_MIND:
            base_level = TechLevel.STELLAR
        elif civ_type == CivilizationType.SILICON_BASED:
            base_level = TechLevel.PLANETARY
        else:
            base_level = TechLevel.INDUSTRIAL

        # Adjust based on tech_score
        if tech_score > 0.9:
            if base_level != TechLevel.GALACTIC:
                return TechLevel(list(TechLevel)[min(5, list(TechLevel).index(base_level) + 1)])
        elif tech_score < 0.7 and base_level != TechLevel.PRE_INDUSTRIAL:
            return TechLevel(list(TechLevel)[max(0, list(TechLevel).index(base_level) - 1)])

        return base_level

    def _detect_cultural_traits(self, signal: SignalDetection) -> List[str]:
        """Detect cultural patterns from signal analysis"""
        traits = []

        if signal.pattern_complexity > 0.95:
            traits.append("highly_organized")
        if signal.duration_seconds > 50000:
            traits.append("patient_communicators")
        if signal.signal_strength > 0.8:
            traits.append("confident_civilization")
        if signal.frequency_range[1] > 1e11:
            traits.append("advanced_physics")

        return traits or ["unknown_composition"]

    def _detect_terraforming(self, signal: SignalDetection) -> bool:
        """Detect evidence of planetary engineering"""
        # Heuristic: signals that sweep across multiple frequencies
        freq_range = signal.frequency_range[1] - signal.frequency_range[0]
        return freq_range > 1e10  # Large frequency sweep suggests engineering

    def _estimate_population(self, tech_level: TechLevel) -> int:
        """Estimate civilization population from technology level"""
        estimates = {
            TechLevel.PRE_INDUSTRIAL: 1_000_000_000,
            TechLevel.INDUSTRIAL: 5_000_000_000,
            TechLevel.PLANETARY: 20_000_000_000,
            TechLevel.STELLAR: 1_000_000_000_000,
            TechLevel.GALACTIC: 1_000_000_000_000_000,
            TechLevel.UNIVERSAL: 1_000_000_000_000_000_000,
        }
        return estimates.get(tech_level, 1_000_000_000)

    def _estimate_consumption(self, tech_level: TechLevel) -> float:
        """Estimate resource consumption as multiple of federation baseline"""
        multipliers = {
            TechLevel.PRE_INDUSTRIAL: 0.001,
            TechLevel.INDUSTRIAL: 0.01,
            TechLevel.PLANETARY: 0.1,
            TechLevel.STELLAR: 1.0,
            TechLevel.GALACTIC: 100.0,
            TechLevel.UNIVERSAL: 10000.0,
        }
        return multipliers.get(tech_level, 1.0)

    def _estimate_military_threat(
        self,
        tech_level: TechLevel,
        signal: SignalDetection,
    ) -> float:
        """Calculate military threat capability (0-1)"""
        level_score = list(TechLevel).index(tech_level) / len(TechLevel)
        signal_aggression = signal.signal_strength  # Stronger signals = more confident
        return min(1.0, (level_score * 0.7 + signal_aggression * 0.3))

    def _extract_frequency(self, signal: SignalDetection) -> float:
        """Extract primary communication frequency"""
        return (signal.frequency_range[0] + signal.frequency_range[1]) / 2

    def _calculate_distance(self, coordinates: Tuple[float, float, float]) -> float:
        """Calculate distance from origin in light-years"""
        import math
        x, y, z = coordinates
        return math.sqrt(x**2 + y**2 + z**2)

    # ===== THREAT ASSESSMENT =====

    def assess_threat_level(self, civilization_id: str) -> ThreatLevel:
        """
        Calculate comprehensive threat level for civilization.
        Updates civilization's threat_assessment and returns value.
        """
        if civilization_id not in self.civilizations:
            return ThreatLevel.BENIGN

        civ = self.civilizations[civilization_id]
        threat = self._calculate_threat(civ)

        civ.threat_assessment = threat
        return threat

    def _calculate_threat(self, civ: ExternalCivilization) -> ThreatLevel:
        """Internal threat calculation engine"""
        # Factor 1: Technology gap (are they advanced?)
        fed_tech_level = 3  # Assume federation is Stellar
        their_tech = list(TechLevel).index(civ.technology_level)
        tech_gap = their_tech - fed_tech_level

        # Factor 2: Military capability
        military = civ.characteristics.military_capability

        # Factor 3: Distance (closer = more dangerous)
        distance_factor = max(0.0, 1.0 - (civ.current_distance_ly / 500.0))

        # Factor 4: Prior hostile behavior
        hostile_behaviors = sum(1 for b in civ.behavior_history if "attack" in b.lower())
        hostility = min(1.0, hostile_behaviors * 0.2)

        # Combined threat score
        threat_score = (
            max(0.0, tech_gap) * 0.3 +
            military * 0.3 +
            distance_factor * 0.2 +
            hostility * 0.2
        )

        # Classify into levels
        if hostility > 0.5 or (threat_score > 0.75 and distance_factor > 0.8):
            return ThreatLevel.CRITICAL
        elif threat_score > 0.6 or hostile_behaviors > 0:
            return ThreatLevel.HOSTILE
        elif threat_score > 0.4:
            return ThreatLevel.CAUTIOUS
        elif tech_gap > 1:
            return ThreatLevel.NEUTRAL  # More advanced but not necessarily hostile
        else:
            return ThreatLevel.BENIGN

    def update_threat_assessment(
        self,
        civilization_id: str,
        behavior_observation: str,
    ) -> ThreatLevel:
        """
        Record behavior observation and recalculate threat.

        Args:
            civilization_id: Which civilization to update
            behavior_observation: Description of observed behavior
        """
        if civilization_id not in self.civilizations:
            return ThreatLevel.BENIGN

        civ = self.civilizations[civilization_id]
        civ.behavior_history.append(behavior_observation)

        # Recalculate threat with new information
        return self.assess_threat_level(civilization_id)

    # ===== CIVILIZATION TRACKING =====

    def track_civilization(
        self,
        civilization_id: str,
        new_signal: SignalDetection,
    ) -> bool:
        """
        Update tracking information for known civilization.

        Args:
            civilization_id: Which civilization to update
            new_signal: New signal detection for this civilization

        Returns:
            True if update successful
        """
        if civilization_id not in self.civilizations:
            return False

        civ = self.civilizations[civilization_id]

        # Record signal
        civ.signal_detections.append(new_signal)

        # Update last detected time
        civ.last_detected_timestamp = new_signal.detection_timestamp

        # Refine distance estimate
        new_distance = self._calculate_distance(new_signal.source_coordinates)
        # Average with previous estimate for stability
        civ.current_distance_ly = (civ.current_distance_ly + new_distance) / 2

        # Improve confidence with additional signals
        num_detections = len(civ.signal_detections)
        civ.confidence_score = min(0.99, 0.5 + (num_detections * 0.08))

        # Update contact status
        if num_detections > 5:
            civ.contact_status = ContactStatus.IDENTIFIED
        elif num_detections > 10:
            civ.contact_status = ContactStatus.MONITORED

        return True

    def initiate_contact(self, civilization_id: str) -> Dict[str, object]:
        """
        Initiate contact protocol with civilization.

        Returns:
            Dict with contact result information
        """
        if civilization_id not in self.civilizations:
            return {"success": False, "reason": "civilization_not_found"}

        civ = self.civilizations[civilization_id]
        civ.contact_status = ContactStatus.CONTACTED
        civ.contact_attempts += 1

        # Base success on threat level and technology level
        success_probability = 0.5
        if civ.threat_assessment == ThreatLevel.CRITICAL:
            success_probability = 0.1
        elif civ.threat_assessment == ThreatLevel.BENIGN:
            success_probability = 0.8

        import random
        if random.random() < success_probability:
            civ.successful_communications += 1
            civ.contact_status = ContactStatus.ALLIANCE
            return {
                "success": True,
                "message": "Contact established",
                "civilization_name": civ.name,
                "contact_count": civ.successful_communications,
            }

        return {
            "success": False,
            "message": "Contact failed",
            "reason": "no_response",
            "attempt_count": civ.contact_attempts,
        }

    # ===== EXPANSION PREDICTION =====

    def predict_expansion(self, civilization_id: str) -> Optional[ExpansionPattern]:
        """
        Predict expansion trajectory of civilization.

        Args:
            civilization_id: Which civilization to analyze

        Returns:
            ExpansionPattern with projections, or None if insufficient data
        """
        if civilization_id not in self.civilizations:
            return None

        civ = self.civilizations[civilization_id]

        # Require multiple detections for pattern analysis
        if len(civ.signal_detections) < 2:
            return None

        pattern_id = self._generate_id("expansion")

        # Calculate expansion rate from signal history
        detections = civ.signal_detections
        if len(detections) >= 2:
            # Compare oldest and newest detections
            time_diff = (detections[-1].detection_timestamp - detections[0].detection_timestamp) / (365.25 * 86400)  # Convert to years
            if time_diff < 0.01:  # Insufficient time data
                time_diff = 1.0

            distance_diff = (
                self._calculate_distance(detections[-1].source_coordinates) -
                self._calculate_distance(detections[0].source_coordinates)
            )
            expansion_rate = distance_diff / max(0.1, time_diff)
        else:
            expansion_rate = 1.0

        current_radius = civ.current_distance_ly

        pattern = ExpansionPattern(
            pattern_id=pattern_id,
            current_sphere_radius=current_radius,
            expansion_rate_ly_per_year=expansion_rate,
            predicted_5yr_radius=current_radius + (expansion_rate * 5),
            predicted_10yr_radius=current_radius + (expansion_rate * 10),
            expansion_direction=self._determine_expansion_direction(civ),
            confidence=min(0.95, civ.confidence_score),
            calculation_timestamp=datetime.now().timestamp(),
        )

        civ.expansion_pattern = pattern
        return pattern

    def _determine_expansion_direction(self, civ: ExternalCivilization) -> str:
        """Determine if expansion is radial, targeted, or random"""
        if len(civ.signal_detections) < 3:
            return "unknown"

        # Simplified: check signal variance
        signals = civ.signal_detections
        import statistics

        x_coords = [s.source_coordinates[0] for s in signals]
        y_coords = [s.source_coordinates[1] for s in signals]
        z_coords = [s.source_coordinates[2] for s in signals]

        try:
            x_var = statistics.variance(x_coords) if len(x_coords) > 1 else 0
            y_var = statistics.variance(y_coords) if len(y_coords) > 1 else 0
            z_var = statistics.variance(z_coords) if len(z_coords) > 1 else 0
        except:
            return "random"

        total_var = x_var + y_var + z_var
        if total_var < 0.1:
            return "targeted"  # Low variance = focused direction
        elif total_var > 1.0:
            return "radial"  # High variance = all directions
        else:
            return "mixed"

    # ===== STATUS REPORTING =====

    def get_detector_status(self) -> DetectorStatus:
        """
        Generate comprehensive detector system status report.

        Returns:
            DetectorStatus with complete system metrics
        """
        # Count civilizations by threat level
        by_threat = {}
        for threat_level in ThreatLevel:
            count = sum(
                1 for c in self.civilizations.values()
                if c.threat_assessment == threat_level
            )
            by_threat[threat_level.value] = count

        # Count by contact status
        by_contact = {}
        for contact_status in ContactStatus:
            count = sum(
                1 for c in self.civilizations.values()
                if c.contact_status == contact_status
            )
            by_contact[contact_status.value] = count

        # Find closest and most advanced
        closest_civ = None
        closest_dist = float('inf')
        most_advanced_civ = None
        max_tech_level = -1

        for civ in self.civilizations.values():
            if civ.current_distance_ly < closest_dist:
                closest_dist = civ.current_distance_ly
                closest_civ = civ.civilization_id

            tech_idx = list(TechLevel).index(civ.technology_level)
            if tech_idx > max_tech_level:
                max_tech_level = tech_idx
                most_advanced_civ = civ.civilization_id

        # System efficiency metrics
        if len(self.scan_history) > 0:
            recent_detections = len([s for s in self.all_signals if s.detection_timestamp > self.scan_history[-1] - 86400])
            efficiency = min(1.0, 0.5 + (recent_detections / max(1, len(self.civilizations))))
        else:
            efficiency = 0.0

        scan_coverage = min(1.0, (len(self.scan_history) / 100.0 if self.scan_history else 0.0))

        return DetectorStatus(
            total_civilizations_detected=len(self.civilizations),
            total_signals_logged=len(self.all_signals),
            civilizations_by_threat_level=by_threat,
            civilizations_by_contact_status=by_contact,
            closest_civilization=closest_civ,
            closest_distance_ly=closest_dist if closest_dist != float('inf') else 0.0,
            most_advanced_civilization=most_advanced_civ,
            detection_system_efficiency=efficiency,
            scan_coverage_percentage=scan_coverage,
            last_system_scan=self.last_full_scan or 0.0,
        )

    def get_civilization_dossier(self, civilization_id: str) -> Optional[Dict]:
        """Get complete information dossier for civilization"""
        if civilization_id not in self.civilizations:
            return None

        civ = self.civilizations[civilization_id]

        return {
            "civilization_id": civ.civilization_id,
            "name": civ.name,
            "species_type": civ.species_type.value,
            "technology_level": civ.technology_level.value,
            "threat_assessment": civ.threat_assessment.value,
            "contact_status": civ.contact_status.value,
            "origin_coordinates": civ.origin_coordinates,
            "current_distance_ly": civ.current_distance_ly,
            "last_detected": civ.last_detected_timestamp,
            "total_detections": len(civ.signal_detections),
            "confidence_score": civ.confidence_score,
            "characteristics": {
                "population": civ.characteristics.estimated_population,
                "resource_consumption": civ.characteristics.resource_consumption_rate,
                "military_capability": civ.characteristics.military_capability,
                "terraforming_activity": civ.characteristics.terraforming_activity,
                "cultural_traits": civ.characteristics.cultural_indicators,
            },
            "expansion_pattern": civ.expansion_pattern.pattern_id if civ.expansion_pattern else None,
            "contact_history": {
                "contact_attempts": civ.contact_attempts,
                "successful_communications": civ.successful_communications,
            },
            "behavior_history": civ.behavior_history[-10:],  # Last 10 observations
        }

    def list_civilizations(
        self,
        filter_by_threat: Optional[ThreatLevel] = None,
        filter_by_contact: Optional[ContactStatus] = None,
    ) -> List[str]:
        """
        List civilization IDs with optional filtering.

        Returns:
            List of civilization IDs matching filters
        """
        results = []

        for civ_id, civ in self.civilizations.items():
            if filter_by_threat and civ.threat_assessment != filter_by_threat:
                continue
            if filter_by_contact and civ.contact_status != filter_by_contact:
                continue
            results.append(civ_id)

        return results
