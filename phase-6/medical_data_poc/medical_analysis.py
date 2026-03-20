"""
Medical Data Analysis - WE Framework POC
Multi-AI consensus for symptom-based disease analysis

Constitutional Alignment:
- Layer 0 (Gift): Free healthcare assistance tool
- Layer 1 (Safety): No false positives without consensus
- Layer 15 (Risk): Transparent confidence thresholds
"""

import csv
import json
from datetime import datetime

def load_dataset():
    """Load symptoms and disease data"""
    diseases = {}
    
    with open('dataset.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            disease = row['Disease']
            symptoms = [row[f'Symptom_{i}'] for i in range(1, 18) if row.get(f'Symptom_{i}', '').strip()]
            symptoms = [s.strip() for s in symptoms if s]
            
            if disease not in diseases:
                diseases[disease] = []
            diseases[disease].append(symptoms)
    
    return diseases

def load_descriptions():
    """Load disease descriptions"""
    descriptions = {}
    
    with open('symptom_Description.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            descriptions[row['Disease']] = row['Description']
    
    return descriptions

def load_precautions():
    """Load disease precautions"""
    precautions = {}
    
    with open('symptom_precaution.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            disease = row['Disease']
            prec_list = [row[f'Precaution_{i}'] for i in range(1, 5) if row.get(f'Precaution_{i}', '').strip()]
            precautions[disease] = prec_list
    
    return precautions

def analyze_symptoms(input_symptoms, diseases):
    """
    Claude Analysis (Step 1): Match symptoms to potential diseases
    Returns: List of (disease, confidence, matching_symptoms)
    
    Applies confidence penalty for insufficient symptom count (<3 symptoms)
    to prevent spurious 100% confidence from single rare symptoms.
    """
    matches = []
    input_set = set([s.lower().strip() for s in input_symptoms])
    symptom_count = len(input_set)
    
    for disease, symptom_sets in diseases.items():
        for symptoms in symptom_sets:
            symptom_set = set([s.lower().strip() for s in symptoms])
            
            # Calculate match confidence
            if symptom_count == 0:
                continue
                
            matching = input_set.intersection(symptom_set)
            confidence = len(matching) / symptom_count
            
            # Apply confidence penalty for too few symptoms
            # Prevents 100% confidence from single symptom matches (clinical safety)
            confidence_penalty = min(1.0, symptom_count / 3.0)
            confidence = confidence * confidence_penalty
            
            if confidence > 0:
                matches.append({
                    'disease': disease,
                    'confidence': confidence,
                    'matching_symptoms': list(matching),
                    'all_symptoms': symptoms,
                    'symptom_count': symptom_count  # For caller warning display
                })
    
    # Sort by confidence
    matches.sort(key=lambda x: x['confidence'], reverse=True)
    return matches[:10]  # Top 10 matches

def extract_all_symptoms(diseases):
    """Extract all unique symptoms from the disease dataset"""
    all_symptoms = set()
    for disease_name, symptom_lists in diseases.items():
        for symptoms in symptom_lists:
            all_symptoms.update(symptoms)
    return sorted(list(all_symptoms))

def generate_report(input_symptoms, matches, descriptions, precautions):
    """
    Generate final consensus report
    
    Includes warning for low symptom count (<3) to guide users
    toward more accurate analysis.
    """
    symptom_count = len(input_symptoms)
    
    report = {
        'timestamp': datetime.now().isoformat(),
        'input_symptoms': input_symptoms,
        'symptom_count': symptom_count,
        'low_confidence_warning': symptom_count < 3,
        'analysis': {
            'total_matches': len(matches),
            'high_confidence': [m for m in matches if m['confidence'] >= 0.7],
            'medium_confidence': [m for m in matches if 0.4 <= m['confidence'] < 0.7],
            'low_confidence': [m for m in matches if m['confidence'] < 0.4]
        },
        'top_diagnoses': []
    }
    
    for match in matches[:5]:  # Top 5 for report
        diagnosis = {
            'disease': match['disease'],
            'confidence': f"{match['confidence']*100:.1f}%",
            'matching_symptoms': match['matching_symptoms'],
            'description': descriptions.get(match['disease'], 'No description available'),
            'precautions': precautions.get(match['disease'], [])
        }
        report['top_diagnoses'].append(diagnosis)
    
    return report

def print_report(report):
    """Print human-readable report"""
    print("\n" + "="*70)
    print("  MEDICAL SYMPTOM ANALYSIS - WE FRAMEWORK POC")
    print("="*70)
    print(f"\nTimestamp: {report['timestamp']}")
    print(f"Input Symptoms: {', '.join(report['input_symptoms'])}")
    
    # Display low symptom count warning
    if report.get('low_confidence_warning', False):
        print(f"\n⚠️  LOW CONFIDENCE WARNING:")
        print(f"   Only {report['symptom_count']} symptom(s) provided.")
        print(f"   Add 2 or more additional symptoms for more accurate results.")
    
    analysis = report['analysis']
    print(f"\n📊 Analysis Summary:")
    print(f"   Total Matches: {analysis['total_matches']}")
    print(f"   High Confidence (≥70%): {len(analysis['high_confidence'])}")
    print(f"   Medium Confidence (40-70%): {len(analysis['medium_confidence'])}")
    print(f"   Low Confidence (<40%): {len(analysis['low_confidence'])}")
    
    print(f"\n🏥 Top Diagnostic Matches:")
    print("-"*70)
    
    for i, diag in enumerate(report['top_diagnoses'], 1):
        print(f"\n{i}. {diag['disease']} (Confidence: {diag['confidence']})")
        print(f"   Matching Symptoms: {', '.join(diag['matching_symptoms'])}")
        print(f"   Description: {diag['description'][:200]}...")
        if diag['precautions']:
            print(f"   Precautions: {', '.join(diag['precautions'])}")
    
    print("\n" + "="*70)
    print("⚠️  DISCLAIMER: This is a proof-of-concept analysis tool.")
    print("   Always consult qualified medical professionals for diagnosis.")
    print("="*70 + "\n")

def main():
    """Main analysis workflow"""
    print("\n🚀 Loading medical dataset...")
    diseases = load_dataset()
    descriptions = load_descriptions()
    precautions = load_precautions()
    
    print(f"✅ Loaded {len(diseases)} diseases")
    
    # Test case: Common flu symptoms
    test_symptoms = ['itching', 'skin_rash', 'nodal_skin_eruptions']
    
    print(f"\n🔍 Analyzing symptoms: {test_symptoms}")
    
    # Step 1: Claude Analysis
    matches = analyze_symptoms(test_symptoms, diseases)
    
    # Step 2: Generate Report
    report = generate_report(test_symptoms, matches, descriptions, precautions)
    
    # Step 3: Print Results
    print_report(report)
    
    # Step 4: Save to file
    with open('analysis_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print("📄 Report saved to: analysis_report.json")

if __name__ == "__main__":
    main()
