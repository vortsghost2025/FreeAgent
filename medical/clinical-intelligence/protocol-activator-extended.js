/**
 * Protocol Activator Extended
 * 5 Additional Emergency Protocols
 *
 * Protocols:
 * 1. STEMI (ST-Elevation Myocardial Infarction)
 * 2. Sepsis/Septic Shock
 * 3. Status Epilepticus
 * 4. Acute Ischemic Stroke
 * 5. Severe Hypoglycemia
 */

export class ProtocolActivatorExtended {
  constructor(standards = {}, options = {}) {
    this.standards = standards;
    this.debug = options.debug || false;
    this.initializeProtocols();
  }

  initializeProtocols() {
    this.protocols = {
      stemi: this.createSTEMIProtocol(),
      sepsis: this.createSepsisProtocol(),
      statusEpilepticus: this.createStatusEpilepticsProtocol(),
      acuteStroke: this.createAcuteStrokeProtocol(),
      severeHypoglycemia: this.createSevereHypoglycemiaProtocol()
    };
  }

  /**
   * Protocol 1: STEMI (ST-Elevation Myocardial Infarction)
   * Time-critical: Door-to-balloon <90 minutes
   */
  createSTEMIProtocol() {
    return {
      name: 'STEMI Protocol',
      triggers: {
        primary: [
          { type: 'symptom', value: 'STEMI' },
          { type: 'symptom', value: 'chest pain' },
          { type: 'symptom', value: 'acute coronary syndrome' }
        ],
        secondary: [
          { type: 'lab', key: 'Troponin', condition: '>0.04' },
          { type: 'vital', key: 'heartRate', condition: '>100' }
        ]
      },
      activationCriteria: {
        chestPainOnset: '<12 hours',
        ecgSTElevation: true,
        troponinElevated: true
      },
      phases: {
        preHospital: [
          'STAT 12-lead ECG immediately',
          'Aspirin 300-325 mg (unless contraindicated)',
          'Clopidogrel 600 mg loading dose',
          'Activate cath lab - target door-to-balloon <90 minutes',
          'Establish IV access, prepare for transfer',
          'Notify receiving facility of STEMI status'
        ],
        emergency: [
          'STAT cardiology consultation',
          'Activate cardiac catheterization lab',
          'Prepare for primary percutaneous coronary intervention (PCI)',
          'Continuous cardiac monitoring',
          'Oxygen if hypoxic (SpO2 <90%)',
          'Pain control: morphine 2-4 mg IV q5-15 min PRN',
          'Heparin bolus with PCI-based dosing'
        ],
        ongoing: [
          'Support ejection fraction assessment',
          'Monitor for cardiogenic shock (insert pulmonary artery catheter if SBP <90)',
          'Prepare for mechanical support if needed (IABP, Impella, ECMO)',
          'Transfer to cardiac ICU post-intervention',
          'Dual antiplatelet therapy continuation',
          'Beta-blocker, ACE inhibitor, statin loading'
        ]
      },
      criticalThresholds: {
        heartRate: 120,
        systolicBP: 90,
        troponin: 0.04,
        doorToBalloon: 90 // minutes
      },
      priority: 'CRITICAL',
      estimatedDuration: 5 // minutes to activation
    };
  }

  /**
   * Protocol 2: Sepsis/Septic Shock
   * qSOFA-based with immediate broad-spectrum coverage
   */
  createSepsisProtocol() {
    return {
      name: 'Sepsis Protocol',
      triggers: {
        primary: [
          { type: 'symptom', value: 'sepsis' },
          { type: 'symptom', value: 'septic shock' },
          { type: 'symptom', value: 'fever' }
        ],
        secondary: [
          { type: 'vital', key: 'temperature', condition: '>38.5 or <36' },
          { type: 'vital', key: 'heartRate', condition: '>90' },
          { type: 'vital', key: 'respiratoryRate', condition: '>20' }
        ]
      },
      activationCriteria: {
        suspected_infection: true,
        qSOFAScore: '>=2', // Altered mentation, SBP <100, RR >22
        lactate_elevated: true
      },
      qSOFAComponents: {
        one: 'Altered mentation (GCS <15)',
        two: 'Systolic BP <100 mmHg',
        three: 'Respiratory rate >22/min'
      },
      phases: {
        first3Hours: [
          'Draw: Blood cultures, lactate, CBC, CMP, coagulation, procalcitonin',
          'IV access: 2 large-bore lines for potential vasopressor support',
          'Fluid bolus: 30 mL/kg normal saline (balanced crystalloid)',
          'Source control: Identify and manage infection source',
          'Broad-spectrum antibiotics WITHIN 1 HOUR',
          '  • Sepsis: Ceftriaxone + vancomycin + fluoroquinolone',
          '  • Meningitis suspected: Add vancomycin + ceftriaxone + dexamethasone',
          '  • Immunocompromised: Add amphotericin B coverage',
          'Lactate measurement if initial <4 mmol/L'
        ],
        assessment: [
          'qSOFA scoring: 0-1 (low risk) vs ≥2 (high risk)',
          'Lactate >4: Immediate ICU admission',
          'Septic shock criteria: SBP <90 despite fluids, lactate >2',
          'Prepare for vasopressors if hypotensive after 30mL/kg fluids'
        ],
        ongoing: [
          'Vasopressor targets: MAP ≥65 if hypotensive',
          'First choice: Norepinephrine 0.01-0.5 mcg/kg/min',
          'If relative hypotension (refractory): Add vasopressin',
          'Repeat lactate at 2-4 hours (should trend down by >10%)',
          'Reassess fluid status - avoid pulmonary edema',
          'Organ support as needed: mechanical ventilation, RRT, ECMO',
          'Control glucose <180 mg/dL',
          'De-escalate antibiotics after culture results (48-72h)'
        ]
      },
      criticalThresholds: {
        temperature: { high: 38.5, low: 36 },
        heartRate: 90,
        respiratoryRate: 20,
        systolicBP: 100,
        lactate: 2.0,
        qSOFA: 2
      },
      priority: 'CRITICAL',
      estimatedDuration: 'Hours to days (ICU care)'
    };
  }

  /**
   * Protocol 3: Status Epilepticus
   * Seizure lasting >5 minutes or repeated seizures without recovery
   */
  createStatusEpilepticsProtocol() {
    return {
      name: 'Status Epilepticus Protocol',
      triggers: {
        primary: [
          { type: 'symptom', value: 'status epilepticus' },
          { type: 'symptom', value: 'prolonged seizure' },
          { type: 'symptom', value: 'repeated seizure' }
        ],
        secondary: [
          { type: 'vital', key: 'respiratoryRate', condition: '>30' },
          { type: 'symptom', value: 'muscle rigidity' }
        ]
      },
      activationCriteria: {
        seizureDuration: '>5 minutes',
        repeated_seizures: true,
        altered_consciousness: true
      },
      phases: {
        immediate: [
          'Safety: Protect airway, place on side, remove harmful objects',
          'Oxygen: Target SpO2 >94%, prepare for intubation',
          'IV access: 2 large-bore lines',
          'Stat labs: Glucose, CBC, CMP, anti-epileptic drug (AED) levels, toxicology',
          'Stat imaging: STAT head CT (non-contrast) to rule out hemorrhage/mass',
          'ECG, continuous cardiac monitoring',
          'Temperature management (hyperthermia common in prolonged seizures)'
        ],
        first5minutes: [
          'BENZODIAZEPINE - FIRST LINE (seizure duration >5 min):',
          '  • Lorazepam 0.1 mg/kg IV push (max 4 mg), repeat ×1 if needed',
          '  • OR Diazepam 0.15-0.20 mg/kg IV push',
          '  • OR Midazolam 10 mg IM/IN (if no IV access)',
          'Secure airway if needed: Consider RSI once seizure controlled',
          'Finger-stick glucose (treat hypoglycemia with dextrose if seizure seizure persists)'
        ],
        fiveToTwenty: [
          'If seizure continues after benzodiazepine:',
          '  • Phenytoin: 20 mg/kg IV bolus (slow infusion, ECG monitoring)',
          '  • OR Valproate: 20 mg/kg IV over 3-5 minutes',
          '  • OR Levetiracetam: 30-60 mg/kg IV over 3-5 minutes',
          'Prepare for intubation if seizure not controlled'
        ],
        twentyPlus: [
          'Anesthetic induction + mechanical ventilation:',
          '  • Pentobarbital coma: 5-10 mg/kg IV over 1 hour',
          '  • OR Propofol: 1-2 mg/kg IV, then 2-10 mg/kg/hr infusion',
          '  • OR Midazolam: 0.2 mg/kg bolus, then 0.05-0.6 mg/kg/hr',
          'PICU admission with EEG monitoring',
          'Continuous seizure monitoring (bedside or video-EEG)',
          'Identify and treat underlying cause'
        ]
      },
      aedLevels: {
        phenytoin: { therapeutic: '10-20 mcg/mL', toxic: '>20' },
        valproate: { therapeutic: '50-100 mcg/mL', toxic: '>100' },
        levetiracetam: { no_established_range: 'Monitor for efficacy/toxicity' }
      },
      criticalThresholds: {
        seizureDuration: 5,
        respiratoryRate: 30,
        oxygenSaturation: 94
      },
      priority: 'CRITICAL',
      estimatedDuration: 'Minutes to hours (ICU care)'
    };
  }

  /**
   * Protocol 4: Acute Ischemic Stroke
   * Door-to-needle <60 minutes for thrombolytics
   */
  createAcuteStrokeProtocol() {
    return {
      name: 'Acute Stroke Protocol',
      triggers: {
        primary: [
          { type: 'symptom', value: 'stroke' },
          { type: 'symptom', value: 'acute ischemic stroke' },
          { type: 'symptom', value: 'CVA' }
        ],
        secondary: [
          { type: 'symptom', value: 'facial droop' },
          { type: 'symptom', value: 'arm weakness' },
          { type: 'symptom', value: 'speech difficulty' }
        ]
      },
      activationCriteria: {
        symptomOnset: '<4.5 hours',
        neuro_deficit: true,
        ecgAbnomalityPresent: false
      },
      FASTCriteria: {
        F: 'Face drooping - asymmetric smile?',
        A: 'Arm weakness - drift downward?',
        S: 'Speech difficulty - slurring or nonsense?',
        T: 'Time - note onset time'
      },
      phases: {
        preHospital: [
          'Note exact time of symptom onset (or time last known well)',
          'Activate stroke alert - EMS to nearest stroke center',
          'Apply Cincinnati Prehospital Stroke Scale (CPSS)',
          'Maintain NPO (nothing by mouth)',
          'Establish IV access if possible',
          'Transport to designated stroke center'
        ],
        doorTothrombolytic: [
          'STAT 12-lead ECG (rule out MI), cardiac monitor',
          'STAT non-contrast head CT (rule out hemorrhage)',
          'STAT labs: CBC, CMP, coagulation studies, troponin, glucose',
          'Finger-stick glucose (correct if severe hypo/hyperglycemia)',
          'NIH Stroke Scale (NIHSS) assessment',
          'PT/INR, CBC, glucose must be available before thrombolytics'
        ],
        thrombolytic_window: [
          'WITHIN 4.5 HOURS of symptom onset:',
          '  • Alteplase (tPA) 0.9 mg/kg IV (max 90 mg)',
          '    - 10% as bolus over 1 min',
          '    - Remaining 90% over 60 min',
          '  • Preferred if <3 hours from onset',
          'Exclusions: Hemorrhage, recent surgery, INR >1.7, platelets <100K, glucose <50 or >400'
        ],
        mechanical_thrombectomy: [
          'Consider if:',
          '  • Large vessel occlusion (NIHSS >5)',
          '  • Within 24 hours of symptom onset (with imaging criteria)',
          '  • ECST-AMERICA transfer protocol if no intervention capability',
          '  • Neurosurgery standby if hemorrhagic transformation risk'
        ],
        ongoing: [
          'Continuous neuro checks q15 min × 2hr, q30 min × 6hr, q60 min × 16hr',
          'Thrombin trap protocol if hemorrhage develops',
          'HTN management: Maintain SBP <220 (acute: labetalol, nicardipine)',
          'Glucose target <180 mg/dL',
          'Temperature <37°C (avoid hyperthermia)',
          'Consider early mobilization (within 24hr if safe)',
          'Secondary stroke prevention: Aspirin 325 mg at 24 hours post-thrombolysis'
        ]
      },
      criticalThresholds: {
        symptomOnset: 270, // minutes (4.5 hours)
        NIHSSScore: 5,
        systolicBP: 220,
        glucose: { low: 50, high: 400 }
      },
      priority: 'CRITICAL',
      estimatedDuration: '30-60 minutes to intervention'
    };
  }

  /**
   * Protocol 5: Severe Hypoglycemia
   * Blood glucose <40 mg/dL with altered mental status
   */
  createSevereHypoglycemiaProtocol() {
    return {
      name: 'Severe Hypoglycemia Protocol',
      triggers: {
        primary: [
          { type: 'symptom', value: 'severe hypoglycemia' },
          { type: 'symptom', value: 'hypoglycemic' },
          { type: 'lab', key: 'Glucose', condition: '<40' }
        ],
        secondary: [
          { type: 'symptom', value: 'altered mental status' },
          { type: 'symptom', value: 'seizure' },
          { type: 'symptom', value: 'loss of consciousness' }
        ]
      },
      activationCriteria: {
        bloodGlucose: '<40',
        altered_consciousness: true,
        unable_to_self_treat: true
      },
      phases: {
        immediate: [
          'Establish airway if altered consciousness (recovery position)',
          'IV access: 2 large-bore lines',
          'STAT fingerstick glucose - confirm <40 mg/dL',
          'Supplemental oxygen if SpO2 <94%',
          'Continuous cardiac monitoring (risk of arrhythmia)',
          'STAT labs: Glucose, VBG (assess for metabolic acidosis), CBC, CMP'
        ],
        correction: [
          'D50W (50% dextrose): 25-50 mL IV push (12.5-25 grams glucose)',
          'Check glucose response in 5 minutes',
          'ALTERNATIVE if D50W unavailable:',
          '  • D25W: 50 mL IV',
          '  • 10% dextrose: 125-250 mL IV',
          'Repeat glucose check every 5-15 minutes',
          'Target: Raise glucose >100 mg/dL (goal 150-200 mg/dL initially)'
        ],
        sustained: [
          'Continuous glucose infusion to prevent recurrence',
          '10% dextrose: 0.5-1 L over 2-4 hours',
          'Transition to PO carbohydrates once alert',
          'Glucagon 1 mg IM/IV if no IV access and confused (faster onset than PO)',
          'Frequent glucose monitoring × 4 hours post-correction'
        ],
        investigation: [
          'Identify cause:',
          '  • Insulin overdose: Suspect intentional/accidental',
          '  • Medication non-compliance: Patient skipped meal after insulin',
          '  • Alcohol intoxication: High risk, frequently missed',
          '  • Reduced oral intake: Illness, vomiting',
          '  • Renal failure: Impaired glucose handling',
          'Consultation: Endocrine if recurrent or unclear cause',
          'Patient education: Recognition, treatment, prevention'
        ]
      },
      criticalThresholds: {
        bloodGlucose: 40,
        GCS: 14,
        targetGlucose: 150
      },
      priority: 'CRITICAL',
      estimatedDuration: '5-15 minutes to resolution'
    };
  }

  /**
   * Evaluate patient against all extended protocols
   */
  evaluateProtocolActivation(patientData) {
    const activatedProtocols = [];
    const scores = {};

    for (const [protocolKey, protocol] of Object.entries(this.protocols)) {
      const score = this.scoreProtocolMatch(protocol, patientData);
      scores[protocol.name] = score;

      if (score.activated) {
        const immediateActions = protocol.phases.immediate || protocol.phases.preHospital || protocol.phases.first3Hours || [];

        activatedProtocols.push({
          protocol: protocol.name,
          score: score.score,
          triggerType: score.triggerType,
          matchedTriggers: score.matchedTriggers,
          priority: protocol.priority,
          immediateActions: Array.isArray(immediateActions) ? immediateActions : [immediateActions]
        });
      }
    }

    return {
      activatedProtocols: activatedProtocols.sort((a, b) => b.score - a.score),
      allScores: scores,
      primaryProtocol: activatedProtocols[0] || null
    };
  }

  /**
   * Score protocol match
   */
  scoreProtocolMatch(protocol, patientData) {
    let score = 0;
    const matchedTriggers = [];
    let triggerType = 'none';

    if (protocol.triggers.primary) {
      for (const trigger of protocol.triggers.primary) {
        if (this.matchesTrigger(trigger, patientData)) {
          score += 50;
          matchedTriggers.push(trigger);
          triggerType = 'primary';
        }
      }
    }

    if (protocol.triggers.secondary && triggerType !== 'primary') {
      for (const trigger of protocol.triggers.secondary) {
        if (this.matchesTrigger(trigger, patientData)) {
          score += 25;
          matchedTriggers.push(trigger);
          triggerType = 'secondary';
        }
      }
    }

    const activated = score >= 50 && triggerType !== 'none';

    return { score, activated, triggerType, matchedTriggers };
  }

  /**
   * Match trigger against patient data
   */
  matchesTrigger(trigger, patientData) {
    const symptoms = Array.isArray(patientData.symptoms)
      ? patientData.symptoms
      : (patientData.symptoms?.list || []);

    const vitals = patientData.vitals || patientData.vitalSigns || {};
    const labs = patientData.labs || patientData.laboratoryResults?.tests || [];

    if (trigger.type === 'symptom') {
      return symptoms.some(s => {
        const symptomTerm = typeof s === 'string' ? s : (s.term || '');
        return symptomTerm.toLowerCase().includes(trigger.value.toLowerCase());
      });
    }

    if (trigger.type === 'vital') {
      const vitalValue = vitals[trigger.key];
      return this.evaluateCondition(vitalValue, trigger.condition);
    }

    if (trigger.type === 'lab') {
      const labValue = typeof labs === 'object' && !Array.isArray(labs)
        ? labs[trigger.key]
        : labs.find(l => l.testName?.toLowerCase().includes(trigger.key.toLowerCase()))?.value;
      return this.evaluateCondition(labValue, trigger.condition);
    }

    return false;
  }

  /**
   * Evaluate condition
   */
  evaluateCondition(value, condition) {
    if (!value || !condition) return false;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return false;

    if (condition.includes('>')) {
      const threshold = parseFloat(condition.replace('>', ''));
      return numValue > threshold;
    }
    if (condition.includes('<')) {
      const threshold = parseFloat(condition.replace('<', ''));
      return numValue < threshold;
    }
    if (condition.includes('≥')) {
      const threshold = parseFloat(condition.replace('≥', ''));
      return numValue >= threshold;
    }
    if (condition.includes('≤')) {
      const threshold = parseFloat(condition.replace('≤', ''));
      return numValue <= threshold;
    }

    return false;
  }

  /**
   * Get full protocol details
   */
  getProtocolDetails(protocolName) {
    for (const protocol of Object.values(this.protocols)) {
      if (protocol.name === protocolName) {
        return protocol;
      }
    }
    return null;
  }
}

export default ProtocolActivatorExtended;
