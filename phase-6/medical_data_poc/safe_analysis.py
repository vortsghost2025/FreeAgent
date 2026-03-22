"""
Safe analysis workflow for synthetic medical POC datasets.

- Loads only synthetic_*.csv files
- Wraps outputs with a mandatory disclaimer
- Avoids legacy dataset.csv as an input
"""

import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Sequence

SYNTHETIC_POC_DISCLAIMER = """
================================================================================
WARNING: SYNTHETIC DATA / PROOF OF CONCEPT ONLY

This analysis uses SYNTHETIC medical data created for demonstration purposes.
It is NOT based on real patient data and MUST NOT be used for medical decisions.

For real medical concerns, consult a qualified healthcare professional.
================================================================================
""".strip()

SYNTHETIC_DATA_DIR = Path(__file__).resolve().parent
REQUIRED_SYNTHETIC_FILES = {
    "synthetic_dataset.csv": "Disease dataset",
    "synthetic_symptom_severity.csv": "Symptom severity mappings",
    "synthetic_descriptions.csv": "Disease descriptions",
    "synthetic_precautions.csv": "Disease precautions",
}


def wrap_output(analysis_result: str) -> str:
    """Wrap analysis result with the mandatory disclaimer."""
    return f"{SYNTHETIC_POC_DISCLAIMER}\n\n{analysis_result}\n\n{SYNTHETIC_POC_DISCLAIMER}"


def _require_synthetic_files(base_dir: Path) -> Dict[str, Path]:
    missing: List[str] = []
    resolved: Dict[str, Path] = {}

    for filename, description in REQUIRED_SYNTHETIC_FILES.items():
        path = base_dir / filename
        if not path.exists():
            missing.append(f"{filename} ({description})")
        resolved[filename] = path

    if missing:
        message = "Required synthetic data files missing:\n"
        message += "\n".join(f"  - {name}" for name in missing)
        message += "\nRun safe_loader.py to generate these files first."
        raise FileNotFoundError(message)

    return resolved


def _load_dataset(path: Path) -> Dict[str, List[List[str]]]:
    diseases: Dict[str, List[List[str]]] = {}

    with path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            disease = row.get("Disease", "").strip()
            if not disease:
                continue
            symptoms = [
                row.get(f"Symptom_{i}", "").strip()
                for i in range(1, 18)
                if row.get(f"Symptom_{i}", "").strip()
            ]
            if disease not in diseases:
                diseases[disease] = []
            diseases[disease].append(symptoms)

    return diseases


def _load_descriptions(path: Path) -> Dict[str, str]:
    descriptions: Dict[str, str] = {}

    with path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            disease = row.get("Disease", "").strip()
            description = row.get("Description", "").strip()
            if disease:
                descriptions[disease] = description

    return descriptions


def _load_precautions(path: Path) -> Dict[str, List[str]]:
    precautions: Dict[str, List[str]] = {}

    with path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            disease = row.get("Disease", "").strip()
            if not disease:
                continue
            items = [
                row.get(f"Precaution_{i}", "").strip()
                for i in range(1, 5)
                if row.get(f"Precaution_{i}", "").strip()
            ]
            precautions[disease] = items

    return precautions


def _load_severity(path: Path) -> Dict[str, int]:
    severity: Dict[str, int] = {}

    with path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            symptom = row.get("Symptom", "").strip()
            weight_raw = row.get("weight", "").strip()
            if not symptom:
                continue
            try:
                weight = int(weight_raw)
            except ValueError:
                continue
            severity[symptom] = weight

    return severity


def load_synthetic_data(base_dir: Optional[Path] = None) -> Dict[str, object]:
    """Load and return synthetic datasets only."""
    data_dir = base_dir or SYNTHETIC_DATA_DIR
    resolved = _require_synthetic_files(data_dir)

    dataset = _load_dataset(resolved["synthetic_dataset.csv"])
    descriptions = _load_descriptions(resolved["synthetic_descriptions.csv"])
    precautions = _load_precautions(resolved["synthetic_precautions.csv"])
    severity = _load_severity(resolved["synthetic_symptom_severity.csv"])

    return {
        "diseases": dataset,
        "descriptions": descriptions,
        "precautions": precautions,
        "severity": severity,
    }


def analyze_symptoms(input_symptoms: Sequence[str], diseases: Dict[str, List[List[str]]]) -> List[Dict[str, object]]:
    """Match symptoms to potential diseases."""
    matches: List[Dict[str, object]] = []
    input_set = {symptom.lower().strip() for symptom in input_symptoms}

    for disease, symptom_sets in diseases.items():
        for symptoms in symptom_sets:
            symptom_set = {symptom.lower().strip() for symptom in symptoms}
            if not input_set:
                continue

            matching = input_set.intersection(symptom_set)
            confidence = len(matching) / len(input_set)

            if confidence > 0:
                matches.append({
                    "disease": disease,
                    "confidence": confidence,
                    "matching_symptoms": sorted(matching),
                    "all_symptoms": symptoms,
                })

    matches.sort(key=lambda item: item["confidence"], reverse=True)
    return matches[:10]


def generate_report(
    input_symptoms: Sequence[str],
    matches: Sequence[Dict[str, object]],
    descriptions: Dict[str, str],
    precautions: Dict[str, List[str]],
) -> Dict[str, object]:
    """Generate report data for the analysis."""
    report: Dict[str, object] = {
        "timestamp": datetime.now().isoformat(),
        "input_symptoms": list(input_symptoms),
        "analysis": {
            "total_matches": len(matches),
            "high_confidence": [m for m in matches if m["confidence"] >= 0.7],
            "medium_confidence": [m for m in matches if 0.4 <= m["confidence"] < 0.7],
            "low_confidence": [m for m in matches if m["confidence"] < 0.4],
        },
        "top_diagnoses": [],
    }

    top_diagnoses: List[Dict[str, object]] = []
    for match in matches[:5]:
        diagnosis = {
            "disease": match["disease"],
            "confidence": f"{match['confidence'] * 100:.1f}%",
            "matching_symptoms": match["matching_symptoms"],
            "description": descriptions.get(match["disease"], "No description available"),
            "precautions": precautions.get(match["disease"], []),
        }
        top_diagnoses.append(diagnosis)

    report["top_diagnoses"] = top_diagnoses
    return report


def render_report(report: Dict[str, object]) -> str:
    """Render a human-readable report string."""
    lines: List[str] = []
    lines.append("=" * 70)
    lines.append("  MEDICAL SYMPTOM ANALYSIS - SYNTHETIC POC")
    lines.append("=" * 70)
    lines.append("")
    lines.append(f"Timestamp: {report['timestamp']}")
    lines.append(f"Input Symptoms: {', '.join(report['input_symptoms'])}")

    analysis = report["analysis"]
    lines.append("")
    lines.append("Analysis Summary:")
    lines.append(f"  Total Matches: {analysis['total_matches']}")
    lines.append(f"  High Confidence (>=70%): {len(analysis['high_confidence'])}")
    lines.append(f"  Medium Confidence (40-70%): {len(analysis['medium_confidence'])}")
    lines.append(f"  Low Confidence (<40%): {len(analysis['low_confidence'])}")

    lines.append("")
    lines.append("Top Diagnostic Matches:")
    lines.append("-" * 70)

    for idx, diagnosis in enumerate(report["top_diagnoses"], 1):
        lines.append("")
        lines.append(f"{idx}. {diagnosis['disease']} (Confidence: {diagnosis['confidence']})")
        lines.append("   Matching Symptoms: " + ", ".join(diagnosis["matching_symptoms"]))
        lines.append("   Description: " + str(diagnosis["description"])[:200] + "...")
        if diagnosis["precautions"]:
            lines.append("   Precautions: " + ", ".join(diagnosis["precautions"]))

    lines.append("")
    lines.append("=" * 70)
    return "\n".join(lines)


def print_report(report: Dict[str, object]) -> None:
    """Print wrapped report output."""
    rendered = render_report(report)
    wrapped = wrap_output(rendered)
    print(wrapped)


def main() -> int:
    """Run a sample analysis using synthetic datasets."""
    print("Loading synthetic medical dataset...")
    data = load_synthetic_data()

    diseases = data["diseases"]
    descriptions = data["descriptions"]
    precautions = data["precautions"]

    print(f"Loaded {len(diseases)} diseases")

    test_symptoms = ["itching", "skin_rash", "nodal_skin_eruptions"]
    print(f"Analyzing symptoms: {test_symptoms}")

    matches = analyze_symptoms(test_symptoms, diseases)
    report = generate_report(test_symptoms, matches, descriptions, precautions)

    print_report(report)

    output_path = SYNTHETIC_DATA_DIR / "analysis_report.json"
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    print(f"Report saved to: {output_path.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
