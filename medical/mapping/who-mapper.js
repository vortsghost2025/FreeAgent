/**
 * WHO → Internal Mapping Layer
 * 
 * Transforms WHO-formatted data into the internal pipeline format.
 * Keeps core pipeline stable even when WHO formats change.
 * 
 * Usage:
 *   import { mapWHOToInternal } from './who-mapper.js';
 *   const internalFormat = mapWHOToInternal(whoData);
 */

/**
 * Map WHO data to internal format
 */
export function mapWHOToInternal(whoData) {
  // Extract source and metadata
  const source = whoData.source || 'who-unknown';
  const timestamp = whoData.reportDate || new Date().toISOString();
  
  // Build internal raw object
  const raw = {};
  
  // Map symptoms
  if (whoData.symptoms) {
    if (whoData.symptoms.list && whoData.symptoms.list.length > 0) {
      raw.reportedItems = whoData.symptoms.list.map(s => s.term);
      
      // Extract severity if available (take highest)
      const severities = whoData.symptoms.list
        .map(s => s.severity)
        .filter(Boolean);
      if (severities.length > 0) {
        raw.severity = getMostSevere(severities);
      }
    }
    
    if (whoData.symptoms.freeText) {
      raw.symptomText = whoData.symptoms.freeText;
    }
  }
  
  // Map laboratory results
  if (whoData.laboratoryResults && whoData.laboratoryResults.tests) {
    const tests = whoData.laboratoryResults.tests;
    
    if (tests.length === 1) {
      // Single test - flatten to top level
      const test = tests[0];
      raw.testName = test.testName;
      raw.result = test.result;
      if (test.value !== undefined) raw.value = test.value;
      if (test.unit) raw.unit = test.unit;
      if (test.referenceRange) raw.referenceRange = test.referenceRange;
    } else if (tests.length > 1) {
      // Multiple tests - keep as array
      raw.results = tests.map(test => ({
        parameter: test.testName,
        value: test.value,
        unit: test.unit,
        result: test.result
      }));
    }
  }
  
  // Map imaging
  if (whoData.imaging && whoData.imaging.studies && whoData.imaging.studies.length > 0) {
    const study = whoData.imaging.studies[0]; // Take first study
    raw.studyType = study.studyType;
    raw.modality = study.modality;
    raw.bodyRegion = study.bodyRegion;
    raw.findings = study.findings;
  }
  
  // Map vitals
  if (whoData.vitals && whoData.vitals.measurements) {
    raw.measurements = whoData.vitals.measurements.map(m => ({
      name: normalizeVitalType(m.type),
      value: m.value,
      unit: m.unit
    }));
  }
  
  // Map clinical notes
  if (whoData.clinicalNotes) {
    const notes = whoData.clinicalNotes;
    if (notes.chiefComplaint) raw.chiefComplaint = notes.chiefComplaint;
    if (notes.assessment) raw.assessment = notes.assessment;
    if (notes.plan) raw.plan = notes.plan;
  }
  
  // Add WHO-specific metadata
  const metadata = {
    whoSource: source,
    caseId: whoData.caseId,
    country: whoData.country,
    standardsVersion: whoData.metadata?.standardsVersion || 'unknown'
  };
  
  return {
    raw,
    source,
    timestamp,
    metadata
  };
}

/**
 * Get most severe from list of severities
 */
function getMostSevere(severities) {
  const order = { 'critical': 3, 'severe': 2, 'moderate': 1, 'mild': 0 };
  return severities.reduce((max, s) => {
    const sLower = s.toLowerCase();
    return (order[sLower] || 0) > (order[max] || 0) ? sLower : max;
  }, 'mild');
}

/**
 * Normalize vital sign type names
 */
function normalizeVitalType(type) {
  const mapping = {
    'temperature': 'Temp',
    'bloodPressure': 'BP',
    'heartRate': 'HR',
    'respiratoryRate': 'RR',
    'oxygenSaturation': 'SpO2',
    'weight': 'Weight',
    'height': 'Height'
  };
  return mapping[type] || type;
}

/**
 * Reverse mapping: Internal → WHO format
 * Useful for round-trip testing
 */
export function mapInternalToWHO(internalData) {
  const whoData = {
    source: internalData.metadata?.whoSource || internalData.source,
    reportDate: internalData.timestamp
  };
  
  const raw = internalData.raw;
  
  // Map symptoms back
  if (raw.reportedItems) {
    whoData.symptoms = {
      list: raw.reportedItems.map(term => ({
        term,
        severity: raw.severity || 'unknown'
      }))
    };
  }
  
  // Map labs back
  if (raw.testName) {
    whoData.laboratoryResults = {
      tests: [{
        testName: raw.testName,
        value: raw.value,
        unit: raw.unit,
        result: raw.result
      }]
    };
  } else if (raw.results) {
    whoData.laboratoryResults = {
      tests: raw.results.map(r => ({
        testName: r.parameter,
        value: r.value,
        unit: r.unit
      }))
    };
  }
  
  // Add metadata
  if (internalData.metadata) {
    whoData.caseId = internalData.metadata.caseId;
    whoData.country = internalData.metadata.country;
    whoData.metadata = {
      standardsVersion: internalData.metadata.standardsVersion
    };
  }
  
  return whoData;
}

/**
 * Validate WHO data against schema (stub - requires AJV or Zod)
 */
export function validateWHOData(whoData) {
  // TODO: Implement with AJV using who-schema.json
  // For now, basic validation
  if (!whoData || typeof whoData !== 'object') {
    return { valid: false, errors: ['Data must be an object'] };
  }
  
  if (!whoData.source) {
    return { valid: false, errors: ['Missing required field: source'] };
  }
  
  return { valid: true, errors: [] };
}
