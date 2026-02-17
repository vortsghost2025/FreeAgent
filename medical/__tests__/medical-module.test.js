/**
 * COMPREHENSIVE TEST SUITE FOR MEDICAL MODULE
 * Tests all 6 classification types, edge cases, validation, and integration
 */

import { createMedicalOrchestrator } from '../medical-workflows.js';

describe('Medical Module - Complete Test Suite', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = createMedicalOrchestrator();
  });

  // ============================================================================
  // CLASSIFICATION TESTS - All 6 Types
  // ============================================================================

  describe('Classification - Symptoms', () => {
    test('should classify patient-reported symptoms correctly', async () => {
      const input = {
        raw: {
          reportedItems: ['headache', 'fever', 'nausea'],
          severity: 'moderate',
          duration: '2 days',
          onset: 'gradual'
        },
        source: 'patient-portal',
        timestamp: new Date().toISOString()
      };

      const result = await orchestrator.executePipeline(input);

      expect(result.output.classification.type).toBe('symptoms');
      expect(result.output.classification.confidence).toBeGreaterThanOrEqual(0.3);
      expect(result.output.summary.fields.reportedItems).toContain('headache');
      expect(result.output.summary.fields.severity).toBe('moderate');
    });

    test('should handle unstructured symptom text', async () => {
      const input = {
        raw: 'Patient complains of severe chest pain radiating to left arm, started 1 hour ago',
        source: 'ems-notes',
        timestamp: new Date().toISOString()
      };

      const result = await orchestrator.executePipeline(input);

      expect(result.output.classification.type).toBe('symptoms');
      expect(result.output.normalized.content).toContain('chest pain');
    });
  });

  describe('Classification - Lab Results', () => {
    test('should classify structured lab results', async () => {
      const input = {
        raw: {
          testName: 'Complete Blood Count',
          results: [
            { parameter: 'WBC', value: 12.5, unit: '10^3/uL', referenceRange: '4.5-11.0' },
            { parameter: 'Hemoglobin', value: 14.2, unit: 'g/dL', referenceRange: '13.5-17.5' },
            { parameter: 'Platelets', value: 250, unit: '10^3/uL', referenceRange: '150-400' }
          ],
          collectionDate: '2026-02-17T08:00:00Z'
        },
        source: 'lab-system',
        timestamp: new Date().toISOString()
      };

      const result = await orchestrator.executePipeline(input);

      expect(result.output.classification.type).toBe('labs');
      expect(result.output.summary.fields.testName).toBe('Complete Blood Count');
      expect(result.output.summary.fields.results).toHaveLength(3);
    });

    test('should handle lab results with abnormal flags', async () => {
      const input = {
        raw: {
          testName: 'Troponin',
          value: 1.5,
          unit: 'ng/mL',
          referenceRange: '< 0.04',
          abnormalFlag: 'HIGH'
        },
        source: 'lab-system',
        timestamp: new Date().toISOString()
      };

      const result = await orchestrator.executePipeline(input);

      expect(result.output.classification.type).toBe('labs');
      expect(result.output.riskScore.severity).toBe('high');
    });
  });

  describe('Classification - Imaging', () => {
    test('should classify chest X-ray report', async () => {
      const input = {
        raw: {
          studyType: 'Chest X-Ray',
          bodyRegion: 'Chest',
          modality: 'XR',
          indication: 'Suspected pneumonia',
          findings: 'Right lower lobe opacity consistent with consolidation',
          impression: 'Findings consistent with right lower lobe pneumonia'
        },
        source: 'radiology-pacs',
        timestamp: new Date().toISOString()
      };

      const result = await orchestrator.executePipeline(input);

      expect(result.output.classification.type).toBe('imaging');
      expect(result.output.summary.fields.studyType).toBe('Chest X-Ray');
      expect(result.output.summary.fields.impression).toContain('pneumonia');
    });

    test('should handle CT scan with contrast', async () => {
      const input = {
        raw: {
          studyType: 'CT Abdomen/Pelvis with Contrast',
          technique: 'Axial images acquired after IV contrast',
          findings: 'No acute abnormality detected',
          impression: 'Normal CT abdomen and pelvis'
        },
        source: 'radiology-pacs',
        timestamp: new Date().toISOString()
      };

      const result = await orchestrator.executePipeline(input);

      expect(result.output.classification.type).toBe('imaging');
    });
  });

  describe('Classification - Vital Signs', () => {
    test('should classify vital signs with all parameters', async () => {
      const input = {
        raw: {
          measurements: [
            { name: 'BP', value: '145/92', unit: 'mmHg' },
            { name: 'HR', value: 88, unit: 'bpm' },
            { name: 'Temp', value: 98.6, unit: 'F' },
            { name: 'RR', value: 18, unit: 'breaths/min' },
            { name: 'SpO2', value: 97, unit: '%' }
          ],
          measurementSource: 'automated-monitor',
          trendSummary: 'BP elevated from baseline'
        },
        source: 'vital-signs-monitor',
        timestamp: new Date().toISOString()
      };

      const result = await orchestrator.executePipeline(input);

      expect(result.output.classification.type).toBe('vitals');
      expect(result.output.summary.fields.measurements).toHaveLength(5);
    });

    test('should handle critical vital signs', async () => {
      const input = {
        raw: {
          measurements: [
            { name: 'BP', value: '220/130', unit: 'mmHg' },
            { name: 'HR', value: 145, unit: 'bpm' }
          ]
        },
        source: 'ems-monitor',
        timestamp: new Date().toISOString()
      };

      const result = await orchestrator.executePipeline(input);

      expect(result.output.classification.type).toBe('vitals');
      expect(result.output.riskScore.severity).toBe('high');
    });
  });

  describe('Classification - Clinical Notes', () => {
    test('should classify admission note', async () => {
      const input = {
        raw: {
          noteType: 'Admission Note',
          chiefComplaint: 'Chest pain',
          history: 'Patient presents with 2 hours of substernal chest pressure',
          physicalExam: 'Vitals stable, heart sounds regular',
          assessment: 'Possible acute coronary syndrome',
          plan: 'Admit to telemetry, serial troponins, cardiology consult'
        },
        source: 'ehr-system',
        timestamp: new Date().toISOString()
      };

      const result = await orchestrator.executePipeline(input);

      expect(result.output.classification.type).toBe('notes');
      expect(result.output.summary.fields.noteType).toBe('Admission Note');
      expect(result.output.summary.fields.chiefComplaint).toBe('Chest pain');
    });

    test('should handle discharge summary', async () => {
      const input = {
        raw: {
          noteType: 'Discharge Summary',
          admissionDate: '2026-02-15',
          dischargeDate: '2026-02-17',
          diagnosis: 'Pneumonia, resolved',
          dischargeMedications: ['Amoxicillin 500mg TID x 7 days'],
          followUp: 'Primary care in 1 week'
        },
        source: 'ehr-system',
        timestamp: new Date().toISOString()
      };

      const result = await orchestrator.executePipeline(input);

      expect(result.output.classification.type).toBe('notes');
    });
  });

  describe('Classification - Other/Unclassified', () => {
    test('should classify unknown data as other', async () => {
      const input = {
        raw: {
          randomField: 'some random data',
          anotherField: 123
        },
        source: 'unknown',
        timestamp: new Date().toISOString()
      };

      const result = await orchestrator.executePipeline(input);

      expect(result.output.classification.type).toBe('other');
      expect(result.output.summary.extractionMethod).toBe('type-specific:other');
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    test('should handle empty input', async () => {
      const input = {
        raw: {},
        source: 'test',
        timestamp: new Date().toISOString()
      };

      const result = await orchestrator.executePipeline(input);

      expect(result.output.classification.type).toBe('other');
      expect(result.output.normalized.content).toBe('');
    });

    test('should handle null values in structured data', async () => {
      const input = {
        raw: {
          testName: 'Glucose',
          value: null,
          unit: null,
          referenceRange: '70-100'
        },
        source: 'lab-system',
        timestamp: new Date().toISOString()
      };

      const result = await orchestrator.executePipeline(input);

      expect(result.output).toBeDefined();
      expect(result.output.riskScore.severity).toBeDefined();
    });

    test('should handle very large payloads', async () => {
      const largeArray = Array(1000).fill({
        field: 'value',
        data: 'x'.repeat(100)
      });

      const input = {
        raw: {
          largeData: largeArray
        },
        source: 'bulk-import',
        timestamp: new Date().toISOString()
      };

      const result = await orchestrator.executePipeline(input);

      expect(result.output.riskScore.flags).toContainEqual(
        expect.objectContaining({ flag: 'large_payload' })
      );
    });

    test('should handle missing timestamp', async () => {
      const input = {
        raw: {
          testName: 'CBC',
          value: 10
        },
        source: 'test'
        // No timestamp
      };

      const result = await orchestrator.executePipeline(input);

      expect(result.output.normalized.timestamp).toBeDefined();
    });

    test('should handle string input instead of object', async () => {
      const input = 'Patient reports headache';

      const result = await orchestrator.executePipeline(input);

      expect(result.output.normalized.contentType).toBe('text');
      expect(result.output.normalized.content).toContain('headache');
    });
  });

  // ============================================================================
  // VALIDATION TESTS
  // ============================================================================

  describe('Validation', () => {
    test('should reject null input', async () => {
      await expect(orchestrator.executePipeline(null))
        .rejects.toThrow('Invalid input data');
    });

    test('should reject undefined input', async () => {
      await expect(orchestrator.executePipeline(undefined))
        .rejects.toThrow('Invalid input data');
    });

    test('should handle malformed data gracefully', async () => {
      const input = {
        raw: {
          field1: function() {}, // Functions can't be JSON serialized
          field2: Symbol('test') // Symbols can't be JSON serialized
        },
        source: 'test',
        timestamp: new Date().toISOString()
      };

      // Should not throw, but handle gracefully
      const result = await orchestrator.executePipeline(input);
      expect(result.output).toBeDefined();
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance', () => {
    test('should complete pipeline in under 10ms', async () => {
      const input = {
        raw: {
          reportedItems: ['fever', 'cough'],
          severity: 'mild'
        },
        source: 'test',
        timestamp: new Date().toISOString()
      };

      const start = Date.now();
      await orchestrator.executePipeline(input);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10);
    });

    test('should handle concurrent pipelines', async () => {
      const inputs = Array(10).fill(null).map((_, i) => ({
        raw: {
          testName: `Test ${i}`,
          value: i * 10
        },
        source: 'concurrent-test',
        timestamp: new Date().toISOString()
      }));

      const start = Date.now();
      const results = await Promise.all(
        inputs.map(input => orchestrator.executePipeline(input))
      );
      const duration = Date.now() - start;

      expect(results).toHaveLength(10);
      expect(results.every(r => r.output)).toBe(true);
      expect(duration).toBeLessThan(100); // 10 pipelines in under 100ms
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration', () => {
    test('should maintain audit trail through entire pipeline', async () => {
      const input = {
        raw: {
          reportedItems: ['fever'],
          severity: 'high'
        },
        source: 'test',
        timestamp: new Date().toISOString()
      };

      const result = await orchestrator.executePipeline(input);

      expect(result.state.processedBy).toHaveLength(5);
      expect(result.state.processedBy).toContain('ingestion-001');
      expect(result.state.processedBy).toContain('triage-001');
      expect(result.state.processedBy).toContain('summarization-001');
      expect(result.state.processedBy).toContain('risk-001');
      expect(result.state.processedBy).toContain('output-001');
    });

    test('should pass data correctly between agents', async () => {
      const input = {
        raw: {
          studyType: 'MRI Brain',
          findings: 'Normal'
        },
        source: 'test',
        timestamp: new Date().toISOString()
      };

      const result = await orchestrator.executePipeline(input);

      // Check data flows through pipeline
      expect(result.output.normalized).toBeDefined();
      expect(result.output.classification).toBeDefined();
      expect(result.output.summary).toBeDefined();
      expect(result.output.riskScore).toBeDefined();
    });

    test('should preserve original raw data throughout pipeline', async () => {
      const originalData = {
        testName: 'Original Test',
        value: 42,
        nested: { field: 'value' }
      };

      const input = {
        raw: originalData,
        source: 'test',
        timestamp: new Date().toISOString()
      };

      const result = await orchestrator.executePipeline(input);

      expect(result.output.normalized.raw).toEqual(originalData);
    });
  });
});
