/**
 * Protocol Activator v2
 * Emergency Protocol Activation Engine
 *
 * Implements 5 critical emergency protocols:
 * 1. DKA (Diabetic Ketoacidosis)
 * 2. Anaphylaxis
 * 3. Trauma Primary Survey
 * 4. Pediatric Fever
 * 5. Obstetric Emergencies
 */

export class ProtocolActivatorV2 {
  constructor(standards = {}, options = {}) {
    this.standards = standards;
    this.debug = options.debug || false;
    this.initializeProtocols();
  }

  initializeProtocols() {
    this.protocols = {
      dka: this.createDKAProtocol(),
      anaphylaxis: this.createAnaphylaxisProtocol(),
      traumaSurvey: this.createTraumaPrimarySurveyProtocol(),
      pediatricFever: this.createPediatricFeverProtocol(),
      obstetricEmergency: this.createObstetricEmergencyProtocol()
    };
  }

  /**
   * Protocol 1: Diabetic Ketoacidosis (DKA)
   */
  createDKAProtocol() {
    return {
      name: 'DKA Protocol',
      triggers: {
        primary: [
          { type: 'symptom', value: 'diabetic ketoacidosis' },
          { type: 'symptom', value: 'dka' }
        ],
        secondary: [
          { type: 'lab', key: 'pH', condition: '<7.35' },
          { type: 'lab', key: 'HCO3', condition: '<15' },
          { type: 'symptom', value: 'kussmaul respiration' }
        ]
      },
      activationCriteria: {
        bloodGlucose: '>250',
        pH: '<7.35',
        bicarb: '<15',
        anionGap: '>12',
        ketoneBodies: 'elevated'
      },
      phases: {
        immediate: [
          'Two large-bore IV lines, aggressive fluid resuscitation',
          'STAT: Serum glucose, VBG/ABG, BMP, BUN/Cr, CBC, ketones',
          'Insulin drip: 0.1 units/kg/hr after K+ >3.5',
          'Cardiac monitoring, continuous pulse oximetry',
          'Insert foley catheter, strict I&Os'
        ],
        ongoing: [
          'Recheck glucose q1h initially, then q2-4h',
          'Monitor anion gap closure (goal: resolving metabolic acidosis)',
          'Electrolyte repletion (especially potassium)',
          'Transition to subcutaneous insulin when pH >7.3 and AG normalized',
          'Identify and treat underlying trigger'
        ],
        escalation: [
          'ICU admission criteria: severe acidosis (pH <6.9), altered mental status, cardiogenic shock',
          'Consider CRRT for severe electrolyte derangements',
          'Prepare for possible mechanical ventilation'
        ]
      },
      criticalThresholds: {
        pH: 7.35,
        HCO3: 15,
        potassium: 5.5,
        glucose: 250
      },
      priority: 'CRITICAL',
      estimatedDuration: 12-24 // hours
    };
  }

  /**
   * Protocol 2: Anaphylaxis
   */
  createAnaphylaxisProtocol() {
    return {
      name: 'Anaphylaxis Protocol',
      triggers: {
        primary: [
          { type: 'symptom', value: 'anaphylaxis' },
          { type: 'symptom', value: 'anaphylactic shock' }
        ],
        secondary: [
          { type: 'symptom', value: 'urticaria' },
          { type: 'symptom', value: 'angioedema' },
          { type: 'symptom', value: 'stridor' },
          { type: 'symptom', value: 'hypotension' }
        ]
      },
      activationCriteria: {
        acuteOnset: true,
        multipleOrganSystems: ['skin', 'respiratory', 'cardiovascular', 'gastrointestinal'],
        hypotension: '<90 systolic'
      },
      phases: {
        immediate: [
          'EPINEPHRINE 0.3-0.5 mg IM (1:1000) FIRST LINE - repeat q5-15 min if needed',
          'Establish IV access immediately',
          'Recumbent position with legs elevated (unless pulmonary edema)',
          'High-flow oxygen (non-rebreather, target SpO2 >94%)',
          'Monitor continuous vitals and cardiac rhythm'
        ],
        first5minutes: [
          'Ensure IM epinephrine given - DO NOT DELAY FOR IV ACCESS',
          'Prepare IM epinephrine 0.5 mg syringe for potential second dose',
          'Establish two large-bore IVs',
          'Rapid crystalloid bolus: 20 mL/kg (typically 1-2L in adult)',
          'Remove allergen source if identifiable'
        ],
        afterInitialResponse: [
          'Continue epinephrine IV infusion if hypotension persists (start 1 mcg/min)',
          'Antihistamine: Diphenhydramine 50 mg IV',
          'Corticosteroid: Methylprednisolone 125 mg IV (reduces biphasic reactions)',
          'Consider beta-agonist: Albuterol nebulized for bronchospasm',
          'Consider ondansetron 4 mg IV for GI symptoms'
        ],
        observation: [
          'Observe minimum 4-6 hours after symptom onset',
          'Watch for biphasic anaphylaxis (5-12% of cases)',
          'Discharge with auto-epinephrine prescription (2-pack)',
          'Prescription for antihistamine and corticosteroid course',
          'Referral to allergy/immunology'
        ]
      },
      criticalThresholds: {
        systolicBP: 90,
        oxygenSaturation: 94,
        stridor: 'present'
      },
      priority: 'CRITICAL',
      estimatedDuration: 5-30 // minutes to stabilize
    };
  }

  /**
   * Protocol 3: Trauma Primary Survey
   */
  createTraumaPrimarySurveyProtocol() {
    return {
      name: 'Trauma Primary Survey Protocol',
      triggers: {
        primary: [
          { type: 'symptom', value: 'trauma' },
          { type: 'symptom', value: 'motor vehicle accident' },
          { type: 'symptom', value: 'fall' }
        ],
        secondary: [
          { type: 'vital', key: 'bloodPressure', condition: '<90 systolic' },
          { type: 'vital', key: 'respiratoryRate', condition: '<10 or >29' }
        ]
      },
      activationCriteria: {
        mechanism: 'high-energy',
        vitalsUnstable: true,
        alternateMentalStatus: true
      },
      phases: {
        primarySurvey: {
          A: {
            name: 'Airway',
            assessment: 'Assess airway patency, speak, stridor, pooling blood/secretions',
            intervention: 'Head-tilt/chin-lift or jaw thrust, suction, maintain c-spine',
            escalation: 'Oral/nasal airway, prepare for intubation, emergency cricothyrotomy'
          },
          B: {
            name: 'Breathing',
            assessment: 'Bilateral breath sounds, symmetry, work of breathing, JVD, tracheal shift',
            intervention: 'Supplemental O2, bag-mask ventilation if apneic',
            escalation: 'Needle decompression (2nd ICS midclavicular), chest tube, intubation'
          },
          C: {
            name: 'Circulation',
            assessment: 'Pulse check (carotid), bleeding, perfusion, skin temperature',
            intervention: 'Control visible bleeding (direct pressure), two large-bore IVs, fluids',
            escalation: 'Massive transfusion protocol, REBOA, resuscitative hysterotomy if perimortem'
          },
          D: {
            name: 'Disability',
            assessment: 'AVPU (Alert/Verbal/Pain/Unresponsive), GCS, pupils, gross motor function',
            intervention: 'Protect airway if GCS ≤8, empiric head elevation, avoid hypoxia/hypercapnia',
            escalation: 'Prepare for intubation, head CT, neurosurgery consult'
          },
          E: {
            name: 'Exposure',
            assessment: 'Remove clothing to identify all injuries, prevent hypothermia',
            intervention: 'Blankets, warm fluids, assess for hidden injuries',
            escalation: 'Pelvic binder if pelvic fracture suspected, consider FAST exam'
          }
        },
        resuscitation: [
          'Activate Massive Transfusion Protocol if SBP <90 despite fluids',
          'Permissive hypotension (SBP 80-90) until surgical control in hemorrhage',
          'Target HR <100, UOP 0.5-1 mL/kg/hr as perfusion markers',
          'Ongoing reassessment with repeat primary survey'
        ]
      },
      criticalThresholds: {
        systolicBP: 90,
        heartRate: 120,
        respiratoryRate: { min: 10, max: 29 },
        GCS: 8
      },
      priority: 'CRITICAL',
      estimatedDuration: 5-10 // minutes for primary survey
    };
  }

  /**
   * Protocol 4: Pediatric Fever
   */
  createPediatricFeverProtocol() {
    return {
      name: 'Pediatric Fever Protocol',
      triggers: {
        primary: [
          { type: 'symptom', value: 'fever in child' },
          { type: 'vital', key: 'temperature', condition: '>38.5°C in infant <3 months or >39°C age 3-36 months' }
        ],
        secondary: [
          { type: 'symptom', value: 'irritability' },
          { type: 'symptom', value: 'lethargy' },
          { type: 'symptom', value: 'petechial rash' }
        ]
      },
      activationCriteria: {
        febrile: true,
        ageMonths: '<36',
        appearanceAbnormal: true
      },
      ageBasedApproach: {
        '0-3months': {
          threshold: '≥38°C',
          workup: ['CBC + diff', 'Urinalysis + culture', 'Blood culture', 'Chest X-ray if respiratory symptoms', 'CSF culture if high risk'],
          antibioticsIfUnwellAppearance: 'Ampicillin + gentamicin ± cefotaxime'
        },
        '3-36months': {
          threshold: '≥39°C',
          workup: ['Vital signs', 'Urinalysis', 'Appearance assessment', 'Blood culture if ill-appearing'],
          antibioticsIfUnwellAppearance: 'Empiric third-generation cephalosporin'
        }
      },
      phases: {
        initial: [
          'Accurate temperature measurement (rectal gold standard <3 yrs)',
          'Full physical exam including: meningeal signs, rash assessment, source identification',
          'Assess birth history: preterm, maternal antibiotics, prolonged rupture of membranes',
          'Document antibiotic exposure, immunization status'
        ],
        riskStratification: [
          'Well appearance (pink, normal alertness, plays, drinks, normal cry) → lower risk',
          'Ill appearance (lethargy, poor perfusion, weak cry, inconsolability) → higher risk',
          'Toxic appearance (minimal response, poor perfusion, weak cry) → CRITICAL'
        ],
        investigations: [
          'Always consider SBI (serious bacterial infection) in febrile infants <3 months',
          'Urinalysis highly sensitive for UTI (males >1%, females >5%)',
          'RSV/flu testing if viral symptoms present',
          'Point-of-care procalcitonin/CRP if available'
        ],
        empiricAntibiotics: [
          '<3 months: IV ampicillin + gentamicin ± cefotaxime (pending culture)',
          '3-36 months ill-appearing: IV ceftriaxone ± vancomycin',
          'Meningeal signs: Add vancomycin to coverage'
        ],
        discharge: [
          'Well-appearing, low-risk, reliable follow-up: Consider discharge with oral antibiotics',
          'Ensure 24-hour follow-up arranged before discharge',
          'Prescribe antipyretics (acetaminophen/ibuprofen)',
          'Clear return precautions: petechae, worsening, inability to tolerate PO'
        ]
      },
      redFlags: {
        critical: ['Meningeal signs', 'Petechial/purpuric rash', 'Altered mental status', 'Extreme tachycardia/bradycardia'],
        urgent: ['Lethargy', 'Poor perfusion', 'Weak cry', 'Inability to tolerate PO']
      },
      priority: 'URGENT',
      estimatedDuration: 30-60 // minutes evaluation + treatment
    };
  }

  /**
   * Protocol 5: Obstetric Emergencies
   */
  createObstetricEmergencyProtocol() {
    return {
      name: 'Obstetric Emergency Protocol',
      triggers: {
        primary: [
          { type: 'symptom', value: 'eclampsia' },
          { type: 'symptom', value: 'severe preeclampsia' },
          { type: 'vital', key: 'bloodPressure', condition: '≥160/110 with symptoms' }
        ],
        secondary: [
          { type: 'symptom', value: 'placental abruption' },
          { type: 'symptom', value: 'uterine rupture' },
          { type: 'symptom', value: 'amniotic fluid embolism' },
          { type: 'symptom', value: 'peripartum cardiomyopathy' }
        ]
      },
      activationCriteria: {
        pregnant: true,
        hypertensive: true,
        proteinuria: true
      },
      scenarios: {
        eclampsia: {
          triggers: ['seizure', 'altered mental status', 'severe headache + vision changes + hypertension'],
          immediate: [
            'Seizure precautions, supplemental O2 (target SpO2 >95%)',
            'Two large-bore IVs with normal saline',
            'MAGNESIUM SULFATE 4g IV loading over 20 min (load-lock-lab)',
            'Fetal monitoring if viable gestation',
            'OB notification STAT - delivery is definitive treatment'
          ],
          ongoing: [
            'Magnesium 1g/hr maintenance until seizure-free 24h postpartum',
            'Antihypertensive if SBP ≥160 or DBP ≥110 with symptoms',
            'Check labs: CBC, CMP, LFTs, coagulation studies, uric acid',
            'HELLP syndrome assessment (hemolysis, elevated LFTs, low platelets)',
            'Prepare for urgent obstetric intervention (induction/cesarean)'
          ]
        },
        plascentalAbruption: {
          triggers: ['vaginal bleeding + abdominal pain', 'fetal heart rate abnormality', 'hypertension + proteinuria'],
          immediate: [
            'Fetal monitoring STAT',
            'Two large-bore IVs, type & cross for transfusion',
            'CBC, coagulation studies, fibrinogen (screen for DIC)',
            'If viable: prepare for emergency cesarean',
            'Monitor for maternal hemorrhage, shock'
          ],
          escalation: [
            'Massive transfusion protocol readiness',
            'OB + blood bank coordination',
            'Consider delivery within 15 minutes if category 1 fetal status'
          ]
        },
        uterineRupture: {
          triggers: ['sudden severe abdominal pain', 'loss of fetal heart tones', 'vaginal bleeding + hypovolemic shock'],
          immediate: [
            'Two large-bore IVs, type & cross, activate massive transfusion',
            'Prepare for emergency cesarean',
            'High-flow O2, aggressive fluid resuscitation',
            'Monitor for hemorrhagic shock, amniotic fluid embolism'
          ],
          escalation: [
            'Extreme time urgency - maternal mortality if delayed >10 min',
            'Prepare for hysterectomy',
            'Notify anesthesia + ICU for potential ECMO/massive transfusion'
          ]
        },
        amnioticFluidEmbolism: {
          triggers: ['acute cardiopulmonary collapse during labor', 'severe hypoxia + hypotension + coagulopathy'],
          immediate: [
            'Intubation and mechanical ventilation',
            'Aggressive vasopressor support',
            'Massive transfusion protocol + CRRT for DIC',
            'ECMO candidacy assessment',
            'Emergency cesarean if still pregnant'
          ]
        }
      },
      criticalThresholds: {
        systolicBP: 160,
        diastolicBP: 110,
        proteinuria: '≥1g/24hr',
        magnesiumLevel: 4.8 // mmol/L for seizure prophylaxis
      },
      priority: 'CRITICAL',
      estimatedDuration: 'Variable - minutes to hours'
    };
  }

  /**
   * Evaluate patient data against all protocol triggers
   */
  evaluateProtocolActivation(patientData) {
    const activatedProtocols = [];
    const scores = {};

    for (const [protocolKey, protocol] of Object.entries(this.protocols)) {
      const score = this.scoreProtocolMatch(protocol, patientData);
      scores[protocol.name] = score;

      if (score.activated) {
        // Get immediate actions from either phases (array) or scenarios (object)
        let immediateActions = [];
        if (protocol.phases) {
          if (Array.isArray(protocol.phases.immediate)) {
            immediateActions = protocol.phases.immediate;
          } else if (protocol.phases.primarySurvey) {
            // For trauma survey
            immediateActions = ['Begin primary survey: Airway → Breathing → Circulation → Disability → Exposure'];
          }
        }
        if (protocol.scenarios) {
          // For obstetric - get eclampsia immediate actions as primary
          if (protocol.scenarios.eclampsia && Array.isArray(protocol.scenarios.eclampsia.immediate)) {
            immediateActions = protocol.scenarios.eclampsia.immediate;
          }
        }

        activatedProtocols.push({
          protocol: protocol.name,
          score: score.score,
          triggerType: score.triggerType,
          matchedTriggers: score.matchedTriggers,
          priority: protocol.priority,
          immediateActions: immediateActions
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
   * Score match against protocol triggers
   */
  scoreProtocolMatch(protocol, patientData) {
    let score = 0;
    const matchedTriggers = [];
    let triggerType = 'none';

    // Check primary triggers
    if (protocol.triggers.primary) {
      for (const trigger of protocol.triggers.primary) {
        if (this.matchesTrigger(trigger, patientData)) {
          score += 50;
          matchedTriggers.push(trigger);
          triggerType = 'primary';
        }
      }
    }

    // Check secondary triggers
    if (protocol.triggers.secondary && triggerType !== 'primary') {
      for (const trigger of protocol.triggers.secondary) {
        if (this.matchesTrigger(trigger, patientData)) {
          score += 25;
          matchedTriggers.push(trigger);
          triggerType = 'secondary';
        }
      }
    }

    // Check activation criteria
    if (protocol.activationCriteria) {
      const criteriaScore = this.evaluateActivationCriteria(protocol.activationCriteria, patientData);
      score += criteriaScore;
    }

    const activated = score >= 50 && triggerType !== 'none';

    return {
      score,
      activated,
      triggerType,
      matchedTriggers
    };
  }

  /**
   * Match individual trigger against patient data
   */
  matchesTrigger(trigger, patientData) {
    // Extract symptoms array from nested structure
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
   * Evaluate conditions like ">250", "<7.35", etc
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
   * Evaluate all activation criteria
   */
  evaluateActivationCriteria(criteria, patientData) {
    let score = 0;

    for (const [key, expectedValue] of Object.entries(criteria)) {
      const patientValue = patientData[key];

      if (patientValue === expectedValue) {
        score += 10;
      } else if (typeof expectedValue === 'string' && patientValue?.toString().includes(expectedValue)) {
        score += 5;
      }
    }

    return Math.min(score, 30); // Cap criteria score at 30
  }

  /**
   * Get full protocol details including phases and actions
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

export default ProtocolActivatorV2;
