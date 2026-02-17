/**
 * Clinical Red-Flag Detector
 *
 * Identifies immediately life-threatening conditions requiring emergent intervention
 * Safety-critical module for detecting unstable patients
 */

/**
 * Red Flag Detector
 * Scans patient data for critical safety concerns
 */
export class ClinicalRedFlagDetector {
  constructor(options = {}) {
    this.debug = options.debug || false;
  }

  /**
   * Detect all red flags in patient data
   * Returns array of critical findings requiring immediate action
   */
  detectRedFlags(patientData) {
    const flags = [];

    // Extract data
    const symptoms = this.extractSymptoms(patientData);
    const labs = this.extractLabs(patientData);
    const vitals = patientData.vitalSigns || {};

    // 1. Airway/Breathing Red Flags
    flags.push(...this.checkAirwayBreathing(symptoms, vitals));

    // 2. Circulation/Shock Red Flags
    flags.push(...this.checkCirculation(symptoms, vitals, labs));

    // 3. Neurological Red Flags
    flags.push(...this.checkNeurological(symptoms, vitals, labs));

    // 4. Critical Lab Red Flags
    flags.push(...this.checkCriticalLabs(labs));

    // 5. Electrolyte Emergencies
    flags.push(...this.checkElectrolytes(labs));

    // 6. Metabolic/Endocrine Emergencies
    flags.push(...this.checkMetabolic(labs, symptoms));

    // 7. Hemorrhagic/Hematologic Emergencies
    flags.push(...this.checkHematologic(labs, symptoms));

    // 8. Toxicological Red Flags
    flags.push(...this.checkToxicological(symptoms, labs));

    // 9. Infectious/Sepsis Red Flags
    flags.push(...this.checkInfectious(symptoms, vitals, labs));

    // 10. Obstetric Emergencies (if applicable)
    flags.push(...this.checkObstetric(patientData, vitals));

    // Sort by severity
    flags.sort((a, b) => this.getSeverityScore(b.category) - this.getSeverityScore(a.category));

    if (this.debug) {
      console.log(`[RedFlags] Detected ${flags.length} red flag(s)`);
    }

    return flags;
  }

  /**
   * Check airway and breathing red flags
   */
  checkAirwayBreathing(symptoms, vitals) {
    const flags = [];

    // Severe hypoxia
    if (vitals.oxygenSaturation && vitals.oxygenSaturation < 88) {
      flags.push({
        category: 'airway-breathing',
        severity: 'critical',
        flag: 'Severe Hypoxia',
        value: `O2 Sat: ${vitals.oxygenSaturation}%`,
        action: 'IMMEDIATE: High-flow oxygen, consider intubation',
        abcCategory: 'A/B'
      });
    } else if (vitals.oxygenSaturation && vitals.oxygenSaturation < 90) {
      flags.push({
        category: 'airway-breathing',
        severity: 'urgent',
        flag: 'Critical Hypoxia',
        value: `O2 Sat: ${vitals.oxygenSaturation}%`,
        action: 'Supplemental oxygen immediately',
        abcCategory: 'B'
      });
    }

    // Respiratory distress patterns
    const distressSymptoms = symptoms.filter(s =>
      s.term.toLowerCase().includes('respiratory distress') ||
      s.term.toLowerCase().includes('difficulty breathing') ||
      s.term.toLowerCase().includes('can\'t breathe')
    );

    if (distressSymptoms.length > 0 && vitals.respiratoryRate && vitals.respiratoryRate > 30) {
      flags.push({
        category: 'airway-breathing',
        severity: 'critical',
        flag: 'Severe Respiratory Distress',
        value: `RR: ${vitals.respiratoryRate}, severe dyspnea`,
        action: 'IMMEDIATE: Consider airway support, prepare for intubation',
        abcCategory: 'B'
      });
    }

    // Severe tachypnea alone
    if (vitals.respiratoryRate && vitals.respiratoryRate >= 35) {
      flags.push({
        category: 'airway-breathing',
        severity: 'urgent',
        flag: 'Severe Tachypnea',
        value: `RR: ${vitals.respiratoryRate}`,
        action: 'Assess for respiratory failure',
        abcCategory: 'B'
      });
    }

    // Bradypnea (ominous sign)
    if (vitals.respiratoryRate && vitals.respiratoryRate <= 8) {
      flags.push({
        category: 'airway-breathing',
        severity: 'critical',
        flag: 'Severe Bradypnea',
        value: `RR: ${vitals.respiratoryRate}`,
        action: 'IMMEDIATE: Risk of respiratory arrest, prepare to bag',
        abcCategory: 'B'
      });
    }

    return flags;
  }

  /**
   * Check circulation and shock red flags
   */
  checkCirculation(symptoms, vitals, labs) {
    const flags = [];

    // Shock states
    if (vitals.bloodPressure && vitals.bloodPressure.systolic <= 70) {
      flags.push({
        category: 'circulation-shock',
        severity: 'critical',
        flag: 'Shock State',
        value: `SBP: ${vitals.bloodPressure.systolic}`,
        action: 'IMMEDIATE: 2 large-bore IVs, fluids, vasopressors',
        abcCategory: 'C'
      });
    } else if (vitals.bloodPressure && vitals.bloodPressure.systolic <= 90) {
      flags.push({
        category: 'circulation-shock',
        severity: 'urgent',
        flag: 'Hypotension',
        value: `SBP: ${vitals.bloodPressure.systolic}`,
        action: 'Fluid resuscitation, assess for shock',
        abcCategory: 'C'
      });
    }

    // Severe tachycardia with hypotension = shock
    if (vitals.heartRate && vitals.heartRate >= 130 &&
        vitals.bloodPressure && vitals.bloodPressure.systolic < 90) {
      flags.push({
        category: 'circulation-shock',
        severity: 'critical',
        flag: 'Decompensated Shock',
        value: `HR: ${vitals.heartRate}, SBP: ${vitals.bloodPressure.systolic}`,
        action: 'IMMEDIATE: Aggressive resuscitation, identify shock type',
        abcCategory: 'C'
      });
    }

    // Severe bradycardia
    if (vitals.heartRate && vitals.heartRate <= 40) {
      flags.push({
        category: 'circulation-shock',
        severity: 'critical',
        flag: 'Severe Bradycardia',
        value: `HR: ${vitals.heartRate}`,
        action: 'IMMEDIATE: Consider atropine, pacing pads',
        abcCategory: 'C'
      });
    }

    // Lactate elevation (shock marker)
    const lactate = labs.find(l => l.testName.toLowerCase().includes('lactate'));
    if (lactate && lactate.value >= 4.0) {
      flags.push({
        category: 'circulation-shock',
        severity: 'critical',
        flag: 'Severe Lactic Acidosis',
        value: `Lactate: ${lactate.value} ${lactate.unit}`,
        action: 'Sepsis/shock protocol, source control',
        abcCategory: 'C'
      });
    }

    return flags;
  }

  /**
   * Check neurological red flags
   */
  checkNeurological(symptoms, vitals, labs) {
    const flags = [];

    // Altered mental status
    const alteredMS = symptoms.filter(s =>
      s.term.toLowerCase().includes('altered mental status') ||
      s.term.toLowerCase().includes('unconscious') ||
      s.term.toLowerCase().includes('unresponsive') ||
      s.term.toLowerCase().includes('confusion') ||
      s.term.toLowerCase().includes('delirium')
    );

    if (alteredMS.some(s => s.term.toLowerCase().includes('unconscious') ||
                            s.term.toLowerCase().includes('unresponsive'))) {
      flags.push({
        category: 'neurological',
        severity: 'critical',
        flag: 'Unresponsive/Unconscious',
        value: 'Altered level of consciousness',
        action: 'IMMEDIATE: Airway protection, glucose, naloxone, head CT',
        abcCategory: 'D'
      });
    } else if (alteredMS.length > 0) {
      flags.push({
        category: 'neurological',
        severity: 'urgent',
        flag: 'Altered Mental Status',
        value: 'Confusion/delirium',
        action: 'Assess for stroke, infection, metabolic causes',
        abcCategory: 'D'
      });
    }

    // Seizure
    const seizure = symptoms.filter(s => s.term.toLowerCase().includes('seizure'));
    if (seizure.length > 0) {
      flags.push({
        category: 'neurological',
        severity: 'critical',
        flag: 'Seizure Activity',
        value: 'Active or recent seizure',
        action: 'IMMEDIATE: Airway protection, benzodiazepines if ongoing',
        abcCategory: 'D'
      });
    }

    // Stroke symptoms
    const strokeSymptoms = symptoms.filter(s =>
      s.term.toLowerCase().includes('weakness') ||
      s.term.toLowerCase().includes('paralysis') ||
      s.term.toLowerCase().includes('speech difficulty')
    );

    if (strokeSymptoms.length >= 2) {
      flags.push({
        category: 'neurological',
        severity: 'critical',
        flag: 'Acute Stroke Syndrome',
        value: 'Focal neurological deficits',
        action: 'IMMEDIATE: STAT head CT, neurology, determine time last known well',
        abcCategory: 'D'
      });
    }

    // Severe hyponatremia (seizure risk)
    const sodium = labs.find(l => l.testName.toLowerCase().includes('sodium'));
    if (sodium && sodium.value < 120) {
      flags.push({
        category: 'neurological',
        severity: 'critical',
        flag: 'Severe Hyponatremia',
        value: `Na: ${sodium.value} ${sodium.unit}`,
        action: 'IMMEDIATE: Seizure precautions, hypertonic saline',
        abcCategory: 'D'
      });
    }

    return flags;
  }

  /**
   * Check critical lab values
   */
  checkCriticalLabs(labs) {
    const flags = [];

    // Critical troponin
    const troponin = labs.find(l => l.testName.toLowerCase().includes('troponin'));
    if (troponin && troponin.value >= 10.0) {
      flags.push({
        category: 'critical-labs',
        severity: 'critical',
        flag: 'Critical Troponin',
        value: `Troponin: ${troponin.value} ${troponin.unit}`,
        action: 'IMMEDIATE: Cardiology consult, STEMI protocol if indicated'
      });
    }

    // Critical glucose
    const glucose = labs.find(l => l.testName.toLowerCase().includes('glucose'));
    if (glucose) {
      if (glucose.value < 50) {
        flags.push({
          category: 'critical-labs',
          severity: 'critical',
          flag: 'Severe Hypoglycemia',
          value: `Glucose: ${glucose.value} ${glucose.unit}`,
          action: 'IMMEDIATE: D50 or dextrose IV push'
        });
      } else if (glucose.value >= 500) {
        flags.push({
          category: 'critical-labs',
          severity: 'critical',
          flag: 'Severe Hyperglycemia',
          value: `Glucose: ${glucose.value} ${glucose.unit}`,
          action: 'IMMEDIATE: Rule out DKA/HHS, insulin drip'
        });
      }
    }

    // Critical hemoglobin
    const hgb = labs.find(l => l.testName.toLowerCase().includes('hemoglobin'));
    if (hgb && hgb.value < 7.0) {
      flags.push({
        category: 'critical-labs',
        severity: 'critical',
        flag: 'Severe Anemia',
        value: `Hgb: ${hgb.value} ${hgb.unit}`,
        action: 'IMMEDIATE: Type & cross, consider transfusion'
      });
    }

    // Critical platelets
    const platelets = labs.find(l => l.testName.toLowerCase().includes('platelet'));
    if (platelets && platelets.value < 20) {
      flags.push({
        category: 'critical-labs',
        severity: 'critical',
        flag: 'Severe Thrombocytopenia',
        value: `Platelets: ${platelets.value} ${platelets.unit}`,
        action: 'IMMEDIATE: Bleeding precautions, hematology consult'
      });
    }

    return flags;
  }

  /**
   * Check electrolyte emergencies
   */
  checkElectrolytes(labs) {
    const flags = [];

    // Critical potassium
    const potassium = labs.find(l => l.testName.toLowerCase().includes('potassium'));
    if (potassium) {
      if (potassium.value >= 6.5) {
        flags.push({
          category: 'electrolyte-emergency',
          severity: 'critical',
          flag: 'Severe Hyperkalemia',
          value: `K: ${potassium.value} ${potassium.unit}`,
          action: 'IMMEDIATE: Cardiac monitor, calcium gluconate, insulin/D50, kayexalate'
        });
      } else if (potassium.value <= 2.5) {
        flags.push({
          category: 'electrolyte-emergency',
          severity: 'critical',
          flag: 'Severe Hypokalemia',
          value: `K: ${potassium.value} ${potassium.unit}`,
          action: 'IMMEDIATE: Cardiac monitor, IV potassium replacement'
        });
      }
    }

    // Critical calcium
    const calcium = labs.find(l => l.testName.toLowerCase().includes('calcium'));
    if (calcium && calcium.value >= 14.0) {
      flags.push({
        category: 'electrolyte-emergency',
        severity: 'critical',
        flag: 'Hypercalcemic Crisis',
        value: `Ca: ${calcium.value} ${calcium.unit}`,
        action: 'IMMEDIATE: Aggressive IV fluids, calcitonin, bisphosphonates'
      });
    }

    return flags;
  }

  /**
   * Check metabolic/endocrine emergencies
   */
  checkMetabolic(labs, symptoms) {
    const flags = [];

    // Ammonia (hepatic encephalopathy)
    const ammonia = labs.find(l => l.testName.toLowerCase().includes('ammonia'));
    if (ammonia && ammonia.value >= 200) {
      flags.push({
        category: 'metabolic-emergency',
        severity: 'critical',
        flag: 'Severe Hyperammonemia',
        value: `Ammonia: ${ammonia.value} ${ammonia.unit}`,
        action: 'IMMEDIATE: Lactulose, rifaximin, hepatology consult'
      });
    }

    return flags;
  }

  /**
   * Check hematologic emergencies
   */
  checkHematologic(labs, symptoms) {
    const flags = [];

    // Critical INR
    const inr = labs.find(l => l.testName.toLowerCase().includes('inr'));
    const bleeding = symptoms.filter(s => s.term.toLowerCase().includes('bleeding'));

    if (inr && inr.value >= 5.0 && bleeding.length > 0) {
      flags.push({
        category: 'hematologic-emergency',
        severity: 'critical',
        flag: 'Coagulopathy with Active Bleeding',
        value: `INR: ${inr.value}, active bleeding`,
        action: 'IMMEDIATE: Vitamin K, FFP, PCC, stop anticoagulation'
      });
    }

    return flags;
  }

  /**
   * Check toxicological red flags
   */
  checkToxicological(symptoms, labs) {
    const flags = [];

    // Suspected overdose
    const overdose = symptoms.filter(s =>
      s.term.toLowerCase().includes('overdose') ||
      s.term.toLowerCase().includes('poisoning') ||
      s.term.toLowerCase().includes('ingestion')
    );

    if (overdose.length > 0) {
      flags.push({
        category: 'toxicological',
        severity: 'critical',
        flag: 'Suspected Overdose/Poisoning',
        value: 'Toxic ingestion',
        action: 'IMMEDIATE: Airway protection, toxicology consult, consider antidotes'
      });
    }

    return flags;
  }

  /**
   * Check infectious/sepsis red flags
   */
  checkInfectious(symptoms, vitals, labs) {
    const flags = [];

    // Fever + hypotension + tachycardia = septic shock
    const fever = symptoms.filter(s => s.term.toLowerCase().includes('fever'));
    const hasFever = fever.length > 0 || (vitals.temperature && vitals.temperature >= 38.0);

    if (hasFever &&
        vitals.bloodPressure && vitals.bloodPressure.systolic < 90 &&
        vitals.heartRate && vitals.heartRate > 100) {

      const lactate = labs.find(l => l.testName.toLowerCase().includes('lactate'));
      const lactateValue = lactate ? lactate.value : 'pending';

      flags.push({
        category: 'sepsis',
        severity: 'critical',
        flag: 'Septic Shock',
        value: `Fever, hypotension, tachycardia, lactate: ${lactateValue}`,
        action: 'IMMEDIATE: Sepsis bundle - cultures, antibiotics, fluids, vasopressors'
      });
    }

    // High procalcitonin
    const procalcitonin = labs.find(l => l.testName.toLowerCase().includes('procalcitonin'));
    if (procalcitonin && procalcitonin.value >= 10.0) {
      flags.push({
        category: 'sepsis',
        severity: 'critical',
        flag: 'Severe Sepsis',
        value: `Procalcitonin: ${procalcitonin.value} ${procalcitonin.unit}`,
        action: 'Sepsis protocol, source control'
      });
    }

    return flags;
  }

  /**
   * Check obstetric emergencies
   */
  checkObstetric(patientData, vitals) {
    const flags = [];

    // Check if patient is pregnant
    const isPregnant = patientData.patientDemographics &&
                       patientData.patientDemographics.sex === 'F' &&
                       patientData.pregnancy;

    if (!isPregnant) return flags;

    // Eclampsia (seizure + pregnancy + hypertension)
    if (vitals.bloodPressure && vitals.bloodPressure.systolic >= 160) {
      flags.push({
        category: 'obstetric-emergency',
        severity: 'critical',
        flag: 'Severe Preeclampsia/Eclampsia',
        value: `SBP: ${vitals.bloodPressure.systolic}, pregnant`,
        action: 'IMMEDIATE: MgSO4, antihypertensives, OB consult, consider delivery'
      });
    }

    return flags;
  }

  /**
   * Get severity score for sorting
   */
  getSeverityScore(category) {
    const scores = {
      'airway-breathing': 100,
      'circulation-shock': 95,
      'neurological': 90,
      'electrolyte-emergency': 85,
      'critical-labs': 80,
      'metabolic-emergency': 75,
      'sepsis': 90,
      'hematologic-emergency': 70,
      'toxicological': 85,
      'obstetric-emergency': 90
    };
    return scores[category] || 50;
  }

  /**
   * Extract symptoms from patient data
   */
  extractSymptoms(patientData) {
    return patientData.symptoms?.list || [];
  }

  /**
   * Extract labs from patient data
   */
  extractLabs(patientData) {
    return patientData.laboratoryResults?.tests || [];
  }

  /**
   * Format red flags for display
   */
  formatRedFlags(flags) {
    if (flags.length === 0) {
      return '\n✅ NO CRITICAL RED FLAGS DETECTED\n';
    }

    const lines = [];
    lines.push('\n🚨 ========================================');
    lines.push('   CRITICAL RED FLAGS DETECTED');
    lines.push('========================================\n');

    const critical = flags.filter(f => f.severity === 'critical');
    const urgent = flags.filter(f => f.severity === 'urgent');

    if (critical.length > 0) {
      lines.push(`CRITICAL (${critical.length}):`);
      critical.forEach((flag, i) => {
        lines.push(`\n${i + 1}. ${flag.flag}`);
        lines.push(`   Category: ${flag.category.toUpperCase()}`);
        if (flag.abcCategory) {
          lines.push(`   ABC: ${flag.abcCategory}`);
        }
        lines.push(`   Value: ${flag.value}`);
        lines.push(`   ACTION: ${flag.action}`);
      });
    }

    if (urgent.length > 0) {
      lines.push(`\nURGENT (${urgent.length}):`);
      urgent.forEach((flag, i) => {
        lines.push(`\n${i + 1}. ${flag.flag}`);
        lines.push(`   Value: ${flag.value}`);
        lines.push(`   Action: ${flag.action}`);
      });
    }

    lines.push('\n========================================\n');
    return lines.join('\n');
  }
}

export default ClinicalRedFlagDetector;
