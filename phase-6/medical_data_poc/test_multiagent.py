"""Test multi-agent analysis with sample symptoms"""
import safe_analysis

# Test symptoms: Fever, cough, fatigue
test_symptoms = ['high_fever', 'cough', 'fatigue']

print("\n" + "="*70)
print("  TESTING MULTI-AGENT WE FRAMEWORK")
print("="*70)
print(f"\nTest Symptoms: {test_symptoms}")
print("\nLoading synthetic data...")

# Load data
data = safe_analysis.load_synthetic_data()
diseases = data["diseases"]
descriptions = data["descriptions"]
precautions = data["precautions"]

print(f"Loaded {len(diseases)} diseases")

# Analyze
print("\n[*] Running analysis...")
matches = safe_analysis.analyze_symptoms(test_symptoms, diseases)
report = safe_analysis.generate_report(
    test_symptoms,
    matches,
    descriptions,
    precautions
)

print(f"\n[RESULTS] Found {report['analysis']['total_matches']} matches")
print(f"          High confidence: {len(report['analysis']['high_confidence'])}")

# Display top matches
if report['top_diagnoses']:
    print("\n" + "="*70)
    print("  TOP MATCHES")
    print("="*70)
    for i, diagnosis in enumerate(report['top_diagnoses'][:5], 1):
        print(f"\n{i}. {diagnosis['disease']}")
        print(f"   Confidence: {diagnosis['confidence']}")
        print(f"   Matching Symptoms: {', '.join(diagnosis['matching_symptoms'][:3])}...")

print("\n" + "="*70)
print("  TEST COMPLETE")
print("="*70)
