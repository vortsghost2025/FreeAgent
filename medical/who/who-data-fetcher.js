/**
 * WHO Data Fetcher
 *
 * Simulates fetching data from WHO APIs and databases
 * In production, this would integrate with actual WHO surveillance systems
 */

/**
 * Mock WHO Data Generator
 * Simulates realistic clinical cases from WHO surveillance data
 */
class WHODataFetcher {
  constructor(options = {}) {
    this.apiEndpoint = options.apiEndpoint || 'https://api.who.int/surveillance';
    this.apiKey = options.apiKey || null;
    this.mockMode = options.mockMode !== false; // Default to mock mode
    this.caseCounter = 1;
  }

  /**
   * Fetch case from WHO surveillance system
   * @param {string} caseId - WHO case identifier
   */
  async fetchCase(caseId) {
    if (this.mockMode) {
      return this.generateMockCase(caseId);
    }

    // In production: fetch from actual WHO API
    try {
      const response = await fetch(`${this.apiEndpoint}/cases/${caseId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`WHO API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch WHO case ${caseId}:`, error);
      return null;
    }
  }

  /**
   * Fetch batch of cases from WHO surveillance system
   * @param {Object} filters - Filter criteria
   */
  async fetchCases(filters = {}) {
    if (this.mockMode) {
      const count = filters.limit || 10;
      const cases = [];
      for (let i = 0; i < count; i++) {
        cases.push(this.generateMockCase(`WHO-${Date.now()}-${i}`));
      }
      return cases;
    }

    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(`${this.apiEndpoint}/cases?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`WHO API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch WHO cases:', error);
      return [];
    }
  }

  /**
   * Generate realistic mock WHO case data
   * Simulates diverse clinical scenarios
   */
  generateMockCase(caseId = null) {
    const id = caseId || `WHO-MOCK-${Date.now()}-${this.caseCounter++}`;

    // Clinical scenario templates
    const scenarios = [
      this.generateAcuteCoronarySyndrome,
      this.generateSepsis,
      this.generateStroke,
      this.generatePulmonaryEmbolism,
      this.generateDiabeticKetoacidosis,
      this.generateAcutePancreatitis,
      this.generateMeningitis,
      this.generateAcuteHeartFailure,
      this.generateAcuteKidneyInjury,
      this.generateRespiratoryDistress
    ];

    // Select random scenario
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    const caseData = scenario.call(this);

    return {
      caseId: id,
      source: 'who-surveillance',
      country: this.randomCountry(),
      facility: this.randomFacility(),
      reportDate: new Date().toISOString(),
      ...caseData
    };
  }

  /**
   * Scenario: Acute Coronary Syndrome (Heart Attack)
   */
  generateAcuteCoronarySyndrome() {
    return {
      patientDemographics: {
        age: 55 + Math.floor(Math.random() * 20),
        sex: Math.random() > 0.4 ? 'M' : 'F',
        comorbidities: ['hypertension', 'diabetes', 'hyperlipidemia']
      },
      symptoms: {
        list: [
          { term: 'severe chest pain', severity: 'critical', duration: '30 min' },
          { term: 'shortness of breath', severity: 'severe' },
          { term: 'diaphoresis', severity: 'severe' },
          { term: 'nausea', severity: 'moderate' }
        ]
      },
      vitalSigns: {
        heartRate: 105,
        bloodPressure: { systolic: 160, diastolic: 95 },
        respiratoryRate: 22,
        temperature: 37.2,
        oxygenSaturation: 94
      },
      laboratoryResults: {
        tests: [
          { testName: 'Troponin I', value: 8.5 + Math.random() * 10, unit: 'ng/mL', referenceRange: '< 0.04' },
          { testName: 'CK-MB', value: 45, unit: 'ng/mL' },
          { testName: 'BNP', value: 250, unit: 'pg/mL' },
          { testName: 'D-dimer', value: 450, unit: 'ng/mL' }
        ]
      },
      riskFactors: {
        smoking: true,
        familyHistory: true
      }
    };
  }

  /**
   * Scenario: Sepsis
   */
  generateSepsis() {
    return {
      patientDemographics: {
        age: 65 + Math.floor(Math.random() * 20),
        sex: Math.random() > 0.5 ? 'M' : 'F',
        comorbidities: ['diabetes', 'chronic kidney disease']
      },
      symptoms: {
        list: [
          { term: 'fever', severity: 'severe' },
          { term: 'confusion', severity: 'severe' },
          { term: 'weakness', severity: 'severe' },
          { term: 'rapid heartbeat', severity: 'critical' }
        ]
      },
      vitalSigns: {
        heartRate: 125,
        bloodPressure: { systolic: 85, diastolic: 55 },
        respiratoryRate: 28,
        temperature: 39.5,
        oxygenSaturation: 91
      },
      laboratoryResults: {
        tests: [
          { testName: 'WBC', value: 18.5, unit: 'K/uL', referenceRange: '4.5-11.0' },
          { testName: 'Lactate', value: 3.5, unit: 'mmol/L', referenceRange: '< 2.0' },
          { testName: 'Procalcitonin', value: 5.2, unit: 'ng/mL', referenceRange: '< 0.5' },
          { testName: 'Creatinine', value: 2.1, unit: 'mg/dL', referenceRange: '0.6-1.2' },
          { testName: 'CRP', value: 185, unit: 'mg/L', referenceRange: '< 10' }
        ]
      },
      infectionSource: 'urinary tract'
    };
  }

  /**
   * Scenario: Stroke
   */
  generateStroke() {
    return {
      patientDemographics: {
        age: 70 + Math.floor(Math.random() * 15),
        sex: Math.random() > 0.5 ? 'M' : 'F',
        comorbidities: ['atrial fibrillation', 'hypertension']
      },
      symptoms: {
        list: [
          { term: 'altered mental status', severity: 'critical' },
          { term: 'weakness', severity: 'critical', location: 'left side' },
          { term: 'speech difficulty', severity: 'severe' },
          { term: 'facial drooping', severity: 'severe' }
        ]
      },
      vitalSigns: {
        heartRate: 88,
        bloodPressure: { systolic: 185, diastolic: 105 },
        respiratoryRate: 18,
        temperature: 37.0,
        oxygenSaturation: 97
      },
      laboratoryResults: {
        tests: [
          { testName: 'Glucose', value: 145, unit: 'mg/dL' },
          { testName: 'INR', value: 1.1 },
          { testName: 'Platelets', value: 210, unit: 'K/uL' }
        ]
      },
      symptomOnset: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      timeWindow: 'within-treatment-window'
    };
  }

  /**
   * Scenario: Pulmonary Embolism
   */
  generatePulmonaryEmbolism() {
    return {
      patientDemographics: {
        age: 45 + Math.floor(Math.random() * 30),
        sex: Math.random() > 0.5 ? 'M' : 'F',
        comorbidities: ['recent surgery', 'prolonged immobility']
      },
      symptoms: {
        list: [
          { term: 'chest pain', severity: 'severe', characteristics: 'pleuritic' },
          { term: 'shortness of breath', severity: 'critical' },
          { term: 'hemoptysis', severity: 'moderate' },
          { term: 'syncope', severity: 'severe' }
        ]
      },
      vitalSigns: {
        heartRate: 115,
        bloodPressure: { systolic: 110, diastolic: 70 },
        respiratoryRate: 26,
        temperature: 37.8,
        oxygenSaturation: 88
      },
      laboratoryResults: {
        tests: [
          { testName: 'D-dimer', value: 1850, unit: 'ng/mL', referenceRange: '< 500' },
          { testName: 'Troponin', value: 0.12, unit: 'ng/mL' },
          { testName: 'BNP', value: 180, unit: 'pg/mL' }
        ]
      }
    };
  }

  /**
   * Scenario: Diabetic Ketoacidosis
   */
  generateDiabeticKetoacidosis() {
    return {
      patientDemographics: {
        age: 25 + Math.floor(Math.random() * 50),
        sex: Math.random() > 0.5 ? 'M' : 'F',
        comorbidities: ['type 1 diabetes']
      },
      symptoms: {
        list: [
          { term: 'nausea', severity: 'severe' },
          { term: 'vomiting', severity: 'severe' },
          { term: 'abdominal pain', severity: 'severe' },
          { term: 'confusion', severity: 'moderate' },
          { term: 'excessive thirst', severity: 'severe' }
        ]
      },
      vitalSigns: {
        heartRate: 118,
        bloodPressure: { systolic: 95, diastolic: 60 },
        respiratoryRate: 30,
        temperature: 37.5,
        oxygenSaturation: 99
      },
      laboratoryResults: {
        tests: [
          { testName: 'Glucose', value: 480, unit: 'mg/dL', referenceRange: '70-100' },
          { testName: 'pH', value: 7.15, referenceRange: '7.35-7.45' },
          { testName: 'Bicarbonate', value: 10, unit: 'mEq/L', referenceRange: '22-28' },
          { testName: 'Potassium', value: 5.8, unit: 'mEq/L' },
          { testName: 'Sodium', value: 128, unit: 'mEq/L' },
          { testName: 'Anion gap', value: 28, referenceRange: '8-12' }
        ]
      }
    };
  }

  /**
   * Scenario: Acute Pancreatitis
   */
  generateAcutePancreatitis() {
    return {
      patientDemographics: {
        age: 45 + Math.floor(Math.random() * 25),
        sex: Math.random() > 0.5 ? 'M' : 'F',
        comorbidities: ['alcohol use', 'gallstones']
      },
      symptoms: {
        list: [
          { term: 'severe abdominal pain', severity: 'critical', location: 'epigastric', radiation: 'back' },
          { term: 'nausea', severity: 'severe' },
          { term: 'vomiting', severity: 'severe' }
        ]
      },
      vitalSigns: {
        heartRate: 108,
        bloodPressure: { systolic: 100, diastolic: 65 },
        respiratoryRate: 22,
        temperature: 38.5,
        oxygenSaturation: 96
      },
      laboratoryResults: {
        tests: [
          { testName: 'Lipase', value: 850, unit: 'U/L', referenceRange: '< 60' },
          { testName: 'Amylase', value: 420, unit: 'U/L' },
          { testName: 'WBC', value: 16.5, unit: 'K/uL' },
          { testName: 'Calcium', value: 7.8, unit: 'mg/dL' },
          { testName: 'ALT', value: 180, unit: 'U/L' }
        ]
      }
    };
  }

  /**
   * Scenario: Meningitis
   */
  generateMeningitis() {
    return {
      patientDemographics: {
        age: 20 + Math.floor(Math.random() * 40),
        sex: Math.random() > 0.5 ? 'M' : 'F',
        comorbidities: []
      },
      symptoms: {
        list: [
          { term: 'fever', severity: 'critical' },
          { term: 'severe headache', severity: 'critical' },
          { term: 'neck stiffness', severity: 'severe' },
          { term: 'photophobia', severity: 'severe' },
          { term: 'confusion', severity: 'severe' }
        ]
      },
      vitalSigns: {
        heartRate: 115,
        bloodPressure: { systolic: 105, diastolic: 68 },
        respiratoryRate: 24,
        temperature: 40.2,
        oxygenSaturation: 97
      },
      laboratoryResults: {
        tests: [
          { testName: 'WBC', value: 19.5, unit: 'K/uL' },
          { testName: 'CRP', value: 220, unit: 'mg/L' },
          { testName: 'Procalcitonin', value: 8.5, unit: 'ng/mL' }
        ]
      },
      csfAnalysis: {
        pressure: 'elevated',
        wbc: 2500,
        protein: 180,
        glucose: 20
      }
    };
  }

  /**
   * Scenario: Acute Heart Failure
   */
  generateAcuteHeartFailure() {
    return {
      patientDemographics: {
        age: 70 + Math.floor(Math.random() * 15),
        sex: Math.random() > 0.5 ? 'M' : 'F',
        comorbidities: ['heart disease', 'hypertension', 'atrial fibrillation']
      },
      symptoms: {
        list: [
          { term: 'shortness of breath', severity: 'critical' },
          { term: 'edema', severity: 'severe', location: 'bilateral legs' },
          { term: 'orthopnea', severity: 'severe' },
          { term: 'paroxysmal nocturnal dyspnea', severity: 'severe' }
        ]
      },
      vitalSigns: {
        heartRate: 98,
        bloodPressure: { systolic: 160, diastolic: 95 },
        respiratoryRate: 28,
        temperature: 37.0,
        oxygenSaturation: 89
      },
      laboratoryResults: {
        tests: [
          { testName: 'BNP', value: 1850, unit: 'pg/mL', referenceRange: '< 100' },
          { testName: 'Troponin', value: 0.08, unit: 'ng/mL' },
          { testName: 'Creatinine', value: 1.6, unit: 'mg/dL' },
          { testName: 'Sodium', value: 132, unit: 'mEq/L' }
        ]
      }
    };
  }

  /**
   * Scenario: Acute Kidney Injury
   */
  generateAcuteKidneyInjury() {
    return {
      patientDemographics: {
        age: 60 + Math.floor(Math.random() * 20),
        sex: Math.random() > 0.5 ? 'M' : 'F',
        comorbidities: ['diabetes', 'hypertension']
      },
      symptoms: {
        list: [
          { term: 'decreased urine output', severity: 'severe' },
          { term: 'confusion', severity: 'moderate' },
          { term: 'nausea', severity: 'moderate' },
          { term: 'edema', severity: 'moderate' }
        ]
      },
      vitalSigns: {
        heartRate: 92,
        bloodPressure: { systolic: 145, diastolic: 88 },
        respiratoryRate: 20,
        temperature: 37.1,
        oxygenSaturation: 96
      },
      laboratoryResults: {
        tests: [
          { testName: 'Creatinine', value: 4.2, unit: 'mg/dL', referenceRange: '0.6-1.2' },
          { testName: 'BUN', value: 68, unit: 'mg/dL', referenceRange: '7-20' },
          { testName: 'Potassium', value: 6.8, unit: 'mEq/L', referenceRange: '3.5-5.0' },
          { testName: 'Bicarbonate', value: 16, unit: 'mEq/L' },
          { testName: 'pH', value: 7.25 }
        ]
      }
    };
  }

  /**
   * Scenario: Respiratory Distress
   */
  generateRespiratoryDistress() {
    return {
      patientDemographics: {
        age: 55 + Math.floor(Math.random() * 25),
        sex: Math.random() > 0.5 ? 'M' : 'F',
        comorbidities: ['COPD', 'smoking']
      },
      symptoms: {
        list: [
          { term: 'difficulty breathing', severity: 'critical' },
          { term: 'wheezing', severity: 'severe' },
          { term: 'cough', severity: 'severe' },
          { term: 'chest tightness', severity: 'severe' }
        ]
      },
      vitalSigns: {
        heartRate: 110,
        bloodPressure: { systolic: 135, diastolic: 82 },
        respiratoryRate: 32,
        temperature: 37.8,
        oxygenSaturation: 85
      },
      laboratoryResults: {
        tests: [
          { testName: 'pH', value: 7.30, referenceRange: '7.35-7.45' },
          { testName: 'pCO2', value: 58, unit: 'mmHg', referenceRange: '35-45' },
          { testName: 'pO2', value: 55, unit: 'mmHg', referenceRange: '75-100' },
          { testName: 'WBC', value: 13.5, unit: 'K/uL' },
          { testName: 'Procalcitonin', value: 1.2, unit: 'ng/mL' }
        ]
      }
    };
  }

  // Helper methods
  randomCountry() {
    const countries = [
      'United States', 'United Kingdom', 'Germany', 'France', 'Italy',
      'Spain', 'Canada', 'Australia', 'Japan', 'South Korea',
      'Brazil', 'Mexico', 'India', 'South Africa', 'Nigeria'
    ];
    return countries[Math.floor(Math.random() * countries.length)];
  }

  randomFacility() {
    const types = ['General Hospital', 'Emergency Department', 'Medical Center', 'Clinic', 'University Hospital'];
    const type = types[Math.floor(Math.random() * types.length)];
    return `${type} - ${Math.floor(Math.random() * 500) + 1}`;
  }
}

export default WHODataFetcher;
