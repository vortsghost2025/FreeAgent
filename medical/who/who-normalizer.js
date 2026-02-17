/**
 * WHO Data Normalizer
 *
 * Handles synonyms, multilingual labels, ranges, units, and data quality issues
 * Ensures consistent values before entering the pipeline
 */

/**
 * Symptom synonym dictionary
 */
const SYMPTOM_SYNONYMS = {
  'chest pain': ['thoracic pain', 'angina', 'chest discomfort'],
  'shortness of breath': ['dyspnea', 'breathlessness', 'difficulty breathing'],
  'fever': ['pyrexia', 'elevated temperature', 'febrile'],
  'headache': ['cephalalgia', 'head pain'],
  'cough': ['tussis'],
  'fatigue': ['tiredness', 'exhaustion', 'malaise']
};

/**
 * Multilingual symptom mappings (English normalization)
 */
const MULTILINGUAL_SYMPTOMS = {
  es: {
    'dolor de pecho': 'chest pain',
    'falta de aire': 'shortness of breath',
    'fiebre': 'fever',
    'tos': 'cough'
  },
  fr: {
    'douleur thoracique': 'chest pain',
    'essoufflement': 'shortness of breath',
    'fièvre': 'fever',
    'toux': 'cough'
  },
  zh: {
    '胸痛': 'chest pain',
    '呼吸困难': 'shortness of breath',
    '发烧': 'fever'
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

