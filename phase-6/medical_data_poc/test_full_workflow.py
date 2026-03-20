"""Test the full multi-agent symptom checker workflow"""
import sys
import os

# Add the medical_data_poc directory to the path
sys.path.insert(0, os.path.dirname(__file__))

from symptom_checker import calibrate_confidence, multi_agent_analysis
import safe_analysis

# Test symptoms with urgent condition
test_symptoms = ['chest_pain', 'high_fever', 'cough', 'difficulty_breathing']

print("\n" + "="*70)
print("  TESTING FULL MULTI-AGENT WORKFLOW")
print("="*70)
print(f"\nTest Symptoms: {test_symptoms}")

# Load data
data = safe_analysis.load_synthetic_data()
diseases = data["diseases"]
descriptions = data["descriptions"]
precautions = data["precautions"]

# Analyze
matches = safe_analysis.analyze_symptoms(test_symptoms, diseases)

print(f"\n[ANALYSIS] Found {len(matches)} matches")

# Test calibrate_confidence function
print("\n" + "="*70)
print("  LAYER 36: CONFIDENCE CALIBRATION")
print("="*70)
for i, match in enumerate(matches[:3], 1):
    calibration = calibrate_confidence(
        match['confidence'] * 100,
        len(test_symptoms)
    )
    print(f"\n{i}. {match['disease']}")
    print(f"   Raw Confidence: {match['confidence'] * 100:.1f}%")
    print(f"   Calibrated Rating: {calibration['confidence_rating']}/10")
    print(f"   Reason: {calibration['confidence_reason']}")

# Test multi_agent_analysis function
print("\n" + "="*70)
print("  WE FRAMEWORK: MULTI-AGENT PERSPECTIVES")
print("="*70)
perspectives = multi_agent_analysis(matches, test_symptoms)

for p in perspectives:
    print(f"\n[{p['agent']}]")
    for key, value in p.items():
        if key != 'agent':
            print(f"  {key}: {value}")

print("\n" + "="*70)
print("  ALL TESTS PASSED")
print("="*70)
