/**
 * WHO Data Normalizer
 *
 * Handles synonyms, multilingual labels, ranges, units, and data quality issues
 * Ensures consistent values before entering the pipeline
 */

/**
 * Comprehensive Symptom Synonym Dictionary (200+ symptoms)
 * Organized by medical specialty for maintainability
 */
const SYMPTOM_SYNONYMS = {
  // Cardiovascular
  'chest pain': ['thoracic pain', 'angina', 'chest discomfort', 'precordial pain', 'substernal pain', 'retrosternal pain'],
  'palpitations': ['heart racing', 'irregular heartbeat', 'rapid heartbeat', 'heart pounding', 'arrhythmia'],
  'shortness of breath': ['dyspnea', 'breathlessness', 'difficulty breathing', 'labored breathing', 'air hunger', 'respiratory distress'],
  'edema': ['swelling', 'fluid retention', 'peripheral edema', 'leg swelling', 'ankle swelling'],
  'syncope': ['fainting', 'loss of consciousness', 'passing out', 'blackout', 'collapse'],
  'cyanosis': ['blue discoloration', 'blue lips', 'blue fingers', 'blue skin'],

  // Respiratory
  'cough': ['tussis', 'hacking cough', 'persistent cough', 'productive cough', 'dry cough'],
  'wheezing': ['whistling breathing', 'noisy breathing', 'stridor'],
  'hemoptysis': ['coughing blood', 'bloody sputum', 'blood in sputum'],
  'chest tightness': ['chest constriction', 'tight chest', 'chest pressure'],
  'sputum production': ['phlegm', 'mucus production', 'expectoration'],

  // Neurological
  'headache': ['cephalalgia', 'head pain', 'cranial pain', 'migraine', 'tension headache'],
  'dizziness': ['vertigo', 'lightheadedness', 'feeling faint', 'unsteady', 'spinning sensation'],
  'confusion': ['disorientation', 'altered mental status', 'delirium', 'mental fog', 'cognitive impairment'],
  'seizure': ['convulsion', 'fit', 'epileptic episode', 'spasm'],
  'weakness': ['muscle weakness', 'paresis', 'loss of strength', 'fatigue'],
  'paralysis': ['plegia', 'loss of movement', 'immobility', 'hemiplegia', 'paraplegia'],
  'tremor': ['shaking', 'trembling', 'involuntary movement', 'quivering'],
  'numbness': ['tingling', 'paresthesia', 'pins and needles', 'loss of sensation'],
  'vision changes': ['blurred vision', 'vision loss', 'diplopia', 'double vision', 'visual disturbance'],
  'speech difficulty': ['dysarthria', 'slurred speech', 'aphasia', 'difficulty speaking'],
  'memory loss': ['amnesia', 'forgetfulness', 'cognitive decline'],
  'altered mental status': ['confusion', 'delirium', 'lethargy', 'obtundation', 'stupor'],

  // Gastrointestinal
  'nausea': ['feeling sick', 'queasy', 'upset stomach', 'sick to stomach'],
  'vomiting': ['emesis', 'throwing up', 'regurgitation', 'retching'],
  'diarrhea': ['loose stools', 'watery stools', 'frequent bowel movements'],
  'constipation': ['hard stools', 'difficult bowel movements', 'infrequent stools'],
  'abdominal pain': ['stomach pain', 'belly pain', 'gastric pain', 'epigastric pain', 'lower abdominal pain'],
  'heartburn': ['acid reflux', 'gerd', 'acid indigestion', 'pyrosis'],
  'bloating': ['abdominal distension', 'gas', 'flatulence', 'fullness'],
  'loss of appetite': ['anorexia', 'decreased appetite', 'poor appetite'],
  'dysphagia': ['difficulty swallowing', 'trouble swallowing', 'painful swallowing', 'odynophagia'],
  'jaundice': ['yellow skin', 'yellowing', 'icterus', 'yellow eyes'],
  'hematemesis': ['vomiting blood', 'bloody vomit', 'coffee ground vomit'],
  'melena': ['black stools', 'tarry stools', 'dark stools'],
  'hematochezia': ['bloody stools', 'rectal bleeding', 'blood in stool'],

  // Musculoskeletal
  'joint pain': ['arthralgia', 'joint ache', 'joint stiffness', 'joint swelling'],
  'muscle pain': ['myalgia', 'muscle ache', 'muscle soreness', 'muscle cramps'],
  'back pain': ['dorsalgia', 'lumbar pain', 'lower back pain', 'upper back pain'],
  'neck pain': ['cervical pain', 'neck stiffness', 'neck ache'],
  'limb pain': ['extremity pain', 'arm pain', 'leg pain'],

  // Infectious/Constitutional
  'fever': ['pyrexia', 'elevated temperature', 'febrile', 'high temperature', 'hyperthermia'],
  'chills': ['rigors', 'shaking chills', 'feeling cold', 'shivering'],
  'night sweats': ['nocturnal sweating', 'excessive sweating at night'],
  'fatigue': ['tiredness', 'exhaustion', 'malaise', 'lethargy', 'weakness', 'lack of energy'],
  'weight loss': ['losing weight', 'unintentional weight loss', 'cachexia', 'wasting'],
  'weight gain': ['gaining weight', 'increased weight'],

  // Dermatological
  'rash': ['skin eruption', 'skin lesion', 'exanthem', 'dermatitis'],
  'itching': ['pruritus', 'skin irritation', 'scratching'],
  'bruising': ['ecchymosis', 'contusion', 'discoloration'],
  'paleness': ['pallor', 'pale skin', 'loss of color'],
  'skin discoloration': ['color change', 'pigmentation change'],

  // Urological/Renal
  'urinary frequency': ['frequent urination', 'polyuria', 'increased urination'],
  'urinary urgency': ['urgent need to urinate', 'sudden urge'],
  'dysuria': ['painful urination', 'burning urination', 'urinary pain'],
  'hematuria': ['blood in urine', 'bloody urine', 'red urine'],
  'decreased urine output': ['oliguria', 'low urine output', 'reduced urination'],
  'urinary retention': ['inability to urinate', 'blocked urination'],
  'incontinence': ['urinary leakage', 'loss of bladder control'],

  // Ophthalmological
  'eye pain': ['ocular pain', 'sore eyes', 'eye discomfort'],
  'red eye': ['conjunctivitis', 'bloodshot eyes', 'eye redness'],
  'eye discharge': ['ocular discharge', 'eye drainage', 'sticky eyes'],
  'photophobia': ['light sensitivity', 'sensitivity to light'],

  // ENT (Ear, Nose, Throat)
  'sore throat': ['pharyngitis', 'throat pain', 'throat irritation'],
  'ear pain': ['otalgia', 'earache', 'ear discomfort'],
  'nasal congestion': ['stuffy nose', 'blocked nose', 'nasal obstruction'],
  'runny nose': ['rhinorrhea', 'nasal discharge', 'sniffles'],
  'hearing loss': ['deafness', 'reduced hearing', 'impaired hearing'],
  'tinnitus': ['ringing in ears', 'ear ringing', 'buzzing in ears'],
  'hoarseness': ['voice changes', 'raspy voice', 'loss of voice', 'laryngitis'],
  'sneezing': ['sternutation'],

  // Psychiatric/Psychological
  'anxiety': ['nervousness', 'worry', 'panic', 'feeling anxious', 'restlessness'],
  'depression': ['low mood', 'sadness', 'feeling down', 'depressed mood'],
  'insomnia': ['difficulty sleeping', 'sleeplessness', 'trouble sleeping', 'sleep disturbance'],
  'agitation': ['restlessness', 'irritability', 'nervousness'],
  'hallucinations': ['seeing things', 'hearing voices', 'false perceptions'],

  // Endocrine/Metabolic
  'excessive thirst': ['polydipsia', 'increased thirst'],
  'excessive urination': ['polyuria', 'frequent urination'],
  'excessive hunger': ['polyphagia', 'increased appetite'],
  'heat intolerance': ['sensitivity to heat', 'feeling hot'],
  'cold intolerance': ['sensitivity to cold', 'feeling cold'],
  'sweating': ['diaphoresis', 'perspiration', 'excessive sweating', 'hyperhidrosis'],

  // Hematological
  'bleeding': ['hemorrhage', 'blood loss', 'bleeding tendency'],
  'easy bruising': ['bruise easily', 'frequent bruising'],
  'petechiae': ['small red spots', 'pinpoint bleeding'],
  'purpura': ['purple spots', 'bruising'],

  // Gynecological
  'vaginal bleeding': ['menstrual bleeding', 'abnormal bleeding', 'hemorrhage'],
  'vaginal discharge': ['leucorrhea', 'discharge'],
  'pelvic pain': ['lower abdominal pain', 'uterine pain'],
  'dysmenorrhea': ['painful periods', 'menstrual cramps', 'period pain'],

  // General/Other
  'malaise': ['general discomfort', 'feeling unwell', 'ill feeling'],
  'anorexia': ['loss of appetite', 'no appetite', 'decreased appetite'],
  'dehydration': ['fluid loss', 'decreased fluids', 'dry'],
  'shock': ['circulatory collapse', 'hypoperfusion', 'cardiovascular collapse']
};

/**
 * Multilingual symptom mappings (English normalization)
 * Supports Spanish (es), French (fr), Chinese (zh), German (de), Portuguese (pt), Arabic (ar)
 */
const MULTILINGUAL_SYMPTOMS = {
  es: {
    'dolor de pecho': 'chest pain',
    'falta de aire': 'shortness of breath',
    'dificultad para respirar': 'shortness of breath',
    'fiebre': 'fever',
    'tos': 'cough',
    'dolor de cabeza': 'headache',
    'mareos': 'dizziness',
    'náuseas': 'nausea',
    'vómitos': 'vomiting',
    'diarrea': 'diarrhea',
    'dolor abdominal': 'abdominal pain',
    'fatiga': 'fatigue',
    'debilidad': 'weakness',
    'confusión': 'confusion',
    'convulsiones': 'seizure',
    'dolor de garganta': 'sore throat',
    'congestión nasal': 'nasal congestion',
    'dolor muscular': 'muscle pain',
    'dolor articular': 'joint pain',
    'erupción cutánea': 'rash',
    'picazón': 'itching',
    'sangrado': 'bleeding',
    'palpitaciones': 'palpitations',
    'hinchazón': 'edema',
    'desmayo': 'syncope'
  },
  fr: {
    'douleur thoracique': 'chest pain',
    'essoufflement': 'shortness of breath',
    'difficulté à respirer': 'shortness of breath',
    'fièvre': 'fever',
    'toux': 'cough',
    'mal de tête': 'headache',
    'vertiges': 'dizziness',
    'nausée': 'nausea',
    'vomissements': 'vomiting',
    'diarrhée': 'diarrhea',
    'douleur abdominale': 'abdominal pain',
    'fatigue': 'fatigue',
    'faiblesse': 'weakness',
    'confusion': 'confusion',
    'convulsions': 'seizure',
    'mal de gorge': 'sore throat',
    'congestion nasale': 'nasal congestion',
    'douleur musculaire': 'muscle pain',
    'douleur articulaire': 'joint pain',
    'éruption cutanée': 'rash',
    'démangeaisons': 'itching',
    'saignement': 'bleeding',
    'palpitations': 'palpitations',
    'œdème': 'edema',
    'évanouissement': 'syncope'
  },
  zh: {
    '胸痛': 'chest pain',
    '胸部疼痛': 'chest pain',
    '呼吸困难': 'shortness of breath',
    '气短': 'shortness of breath',
    '发烧': 'fever',
    '发热': 'fever',
    '咳嗽': 'cough',
    '头痛': 'headache',
    '头晕': 'dizziness',
    '恶心': 'nausea',
    '呕吐': 'vomiting',
    '腹泻': 'diarrhea',
    '腹痛': 'abdominal pain',
    '疲劳': 'fatigue',
    '乏力': 'weakness',
    '意识混乱': 'confusion',
    '癫痫发作': 'seizure',
    '抽搐': 'seizure',
    '喉咙痛': 'sore throat',
    '鼻塞': 'nasal congestion',
    '肌肉疼痛': 'muscle pain',
    '关节痛': 'joint pain',
    '皮疹': 'rash',
    '瘙痒': 'itching',
    '出血': 'bleeding',
    '心悸': 'palpitations',
    '水肿': 'edema',
    '晕厥': 'syncope'
  },
  de: {
    'brustschmerzen': 'chest pain',
    'atemnot': 'shortness of breath',
    'kurzatmigkeit': 'shortness of breath',
    'fieber': 'fever',
    'husten': 'cough',
    'kopfschmerzen': 'headache',
    'schwindel': 'dizziness',
    'übelkeit': 'nausea',
    'erbrechen': 'vomiting',
    'durchfall': 'diarrhea',
    'bauchschmerzen': 'abdominal pain',
    'müdigkeit': 'fatigue',
    'schwäche': 'weakness',
    'verwirrung': 'confusion',
    'krampfanfall': 'seizure',
    'halsschmerzen': 'sore throat',
    'verstopfte nase': 'nasal congestion',
    'muskelschmerzen': 'muscle pain',
    'gelenkschmerzen': 'joint pain',
    'hautausschlag': 'rash',
    'juckreiz': 'itching',
    'blutung': 'bleeding',
    'herzrasen': 'palpitations',
    'schwellung': 'edema',
    'ohnmacht': 'syncope'
  },
  pt: {
    'dor no peito': 'chest pain',
    'falta de ar': 'shortness of breath',
    'dificuldade para respirar': 'shortness of breath',
    'febre': 'fever',
    'tosse': 'cough',
    'dor de cabeça': 'headache',
    'tontura': 'dizziness',
    'náusea': 'nausea',
    'vômito': 'vomiting',
    'diarreia': 'diarrhea',
    'dor abdominal': 'abdominal pain',
    'fadiga': 'fatigue',
    'fraqueza': 'weakness',
    'confusão': 'confusion',
    'convulsão': 'seizure',
    'dor de garganta': 'sore throat',
    'congestão nasal': 'nasal congestion',
    'dor muscular': 'muscle pain',
    'dor nas articulações': 'joint pain',
    'erupção cutânea': 'rash',
    'coceira': 'itching',
    'sangramento': 'bleeding',
    'palpitações': 'palpitations',
    'inchaço': 'edema',
    'desmaio': 'syncope'
  },
  ar: {
    'ألم في الصدر': 'chest pain',
    'ضيق في التنفس': 'shortness of breath',
    'حمى': 'fever',
    'سعال': 'cough',
    'صداع': 'headache',
    'دوخة': 'dizziness',
    'غثيان': 'nausea',
    'قيء': 'vomiting',
    'إسهال': 'diarrhea',
    'ألم في البطن': 'abdominal pain',
    'إرهاق': 'fatigue',
    'ضعف': 'weakness',
    'ارتباك': 'confusion',
    'نوبة': 'seizure',
    'التهاب الحلق': 'sore throat',
    'احتقان الأنف': 'nasal congestion',
    'ألم عضلي': 'muscle pain',
    'ألم المفاصل': 'joint pain',
    'طفح جلدي': 'rash',
    'حكة': 'itching',
    'نزيف': 'bleeding',
    'خفقان': 'palpitations',
    'وذمة': 'edema',
    'إغماء': 'syncope'
  }
};

/**
 * Unit conversions
 */
const UNIT_CONVERSIONS = {
  temperature: {
    'F': (val) => (val - 32) * 5/9,  // Fahrenheit to Celsius
    'K': (val) => val - 273.15        // Kelvin to Celsius
  },
  length: {
    'in': (val) => val * 2.54,        // inches to cm
    'ft': (val) => val * 30.48        // feet to cm
  },
  weight: {
    'lb': (val) => val * 0.453592,    // pounds to kg
    'oz': (val) => val * 0.0283495    // ounces to kg
  }
};

/**
 * Normalize symptom term to canonical form
 */
export function normalizeSymptom(term, language = 'en') {
  let normalized = term.toLowerCase().trim();

  // Handle multilingual input
  if (language !== 'en' && MULTILINGUAL_SYMPTOMS[language]) {
    const translation = MULTILINGUAL_SYMPTOMS[language][normalized];
    if (translation) {
      normalized = translation;
    }
  }

  // Check for synonyms
  for (const [canonical, synonyms] of Object.entries(SYMPTOM_SYNONYMS)) {
    if (normalized === canonical || synonyms.includes(normalized)) {
      return canonical;
    }
  }

  return normalized;
}

/**
 * Normalize severity term
 */
export function normalizeSeverity(severity) {
  if (!severity) return 'unknown';

  const normalized = severity.toLowerCase().trim();
  const severityMap = {
    'critical': 'critical',
    'severe': 'severe',
    'moderate': 'moderate',
    'mild': 'mild',
    'minor': 'mild',
    'major': 'severe',
    'life-threatening': 'critical'
  };

  return severityMap[normalized] || 'unknown';
}

/**
 * Normalize lab test name
 */
export function normalizeLabTest(testName) {
  if (!testName) return '';

  const normalized = testName.toLowerCase().trim();

  // Common test name mappings
  const testMap = {
    'wbc': 'Complete Blood Count',
    'cbc': 'Complete Blood Count',
    'troponin i': 'Troponin',
    'troponin t': 'Troponin',
    'trop': 'Troponin',
    'glucose': 'Blood Glucose',
    'hba1c': 'Hemoglobin A1c',
    'a1c': 'Hemoglobin A1c'
  };

  return testMap[normalized] || testName;
}

/**
 * Convert value with unit normalization
 */
export function normalizeValue(value, unit, targetUnit = null) {
  if (value === null || value === undefined) {
    return { value: null, unit: null };
  }

  // Determine measurement type
  let measurementType = null;
  if (unit && (unit.includes('F') || unit.includes('C') || unit.includes('K'))) {
    measurementType = 'temperature';
  } else if (unit && (unit.includes('in') || unit.includes('ft') || unit.includes('cm'))) {
    measurementType = 'length';
  } else if (unit && (unit.includes('lb') || unit.includes('kg') || unit.includes('oz'))) {
    measurementType = 'weight';
  }

  // Convert if needed
  if (measurementType && UNIT_CONVERSIONS[measurementType]) {
    const conversions = UNIT_CONVERSIONS[measurementType];
    const converter = conversions[unit];

    if (converter) {
      const convertedValue = converter(value);
      const targetUnitMap = {
        temperature: 'C',
        length: 'cm',
        weight: 'kg'
      };
      return {
        value: convertedValue,
        unit: targetUnit || targetUnitMap[measurementType],
        originalValue: value,
        originalUnit: unit
      };
    }
  }

  return { value, unit };
}

/**
 * Parse range string (e.g., "4.5-11.0", "< 0.04", "> 100")
 */
export function parseRange(rangeString) {
  if (!rangeString) return null;

  const range = { min: null, max: null, comparison: null };

  // Handle comparison operators
  if (rangeString.startsWith('<')) {
    range.comparison = '<';
    range.max = parseFloat(rangeString.replace('<', '').trim());
  } else if (rangeString.startsWith('>')) {
    range.comparison = '>';
    range.min = parseFloat(rangeString.replace('>', '').trim());
  } else if (rangeString.includes('-')) {
    // Range like "4.5-11.0"
    const parts = rangeString.split('-').map(p => parseFloat(p.trim()));
    range.min = parts[0];
    range.max = parts[1];
  } else {
    // Single value
    const value = parseFloat(rangeString);
    if (!isNaN(value)) {
      range.min = value;
      range.max = value;
    }
  }

  return range;
}

/**
 * Check if value is abnormal based on reference range
 */
export function isAbnormal(value, referenceRange) {
  if (value === null || value === undefined || !referenceRange) {
    return false;
  }

  const range = parseRange(referenceRange);
  if (!range) return false;

  if (range.comparison === '<') {
    return value >= range.max;
  } else if (range.comparison === '>') {
    return value <= range.min;
  } else if (range.min !== null && range.max !== null) {
    return value < range.min || value > range.max;
  }

  return false;
}

/**
 * Normalize WHO case data (full pipeline)
 */
export function normalizeWHOCase(whoData, options = {}) {
  const { language = 'en', convertUnits = true } = options;

  const normalized = { ...whoData };

  // Normalize symptoms
  if (normalized.symptoms && normalized.symptoms.list) {
    normalized.symptoms.list = normalized.symptoms.list.map(symptom => ({
      ...symptom,
      term: normalizeSymptom(symptom.term, language),
      severity: normalizeSeverity(symptom.severity),
      originalTerm: symptom.term
    }));
  }

  // Normalize lab results
  if (normalized.laboratoryResults && normalized.laboratoryResults.tests) {
    normalized.laboratoryResults.tests = normalized.laboratoryResults.tests.map(test => {
      const normalizedTest = {
        ...test,
        testName: normalizeLabTest(test.testName),
        originalTestName: test.testName
      };

      // Normalize units if requested
      if (convertUnits && test.value !== undefined && test.unit) {
        const converted = normalizeValue(test.value, test.unit);
        normalizedTest.value = converted.value;
        normalizedTest.unit = converted.unit;
        if (converted.originalValue !== undefined) {
          normalizedTest.originalValue = converted.originalValue;
          normalizedTest.originalUnit = converted.originalUnit;
        }
      }

      // Check abnormal status
      if (test.referenceRange) {
        normalizedTest.isAbnormal = isAbnormal(normalizedTest.value, test.referenceRange);
      }

      return normalizedTest;
    });
  }

  return normalized;
}

/**
 * Data quality assessment
 */
export function assessDataQuality(whoData) {
  const quality = {
    completeness: 0,
    issues: [],
    warnings: []
  };

  let totalFields = 0;
  let populatedFields = 0;

  // Check required fields
  const requiredFields = ['source', 'caseId'];
  requiredFields.forEach(field => {
    totalFields++;
    if (whoData[field]) {
      populatedFields++;
    } else {
      quality.issues.push(`Missing required field: ${field}`);
    }
  });

  // Check optional but important fields
  const importantFields = ['reportDate', 'symptoms', 'laboratoryResults'];
  importantFields.forEach(field => {
    totalFields++;
    if (whoData[field]) {
      populatedFields++;
    } else {
      quality.warnings.push(`Missing recommended field: ${field}`);
    }
  });

  quality.completeness = totalFields > 0 ? populatedFields / totalFields : 0;

  return quality;
}

