"""
Safe loader for synthetic medical POC datasets.

- Enforces strict allowlist schemas
- Rejects any file with PII/PHI-like columns
- Generates fresh synthetic outputs
- Logs SHA-256 provenance for template inputs
"""

import argparse
import csv
import hashlib
import json
import os
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

SCHEMA_VERSION = "v1.0-synthetic"
ROW_COUNT_DEFAULT = 500
AUDIT_LOG_DEFAULT = "loader_audit.log"

DATASET_HEADERS = ["Disease"] + [f"Symptom_{i}" for i in range(1, 18)]
SEVERITY_HEADERS = ["Symptom", "weight"]
DESCRIPTION_HEADERS = ["Disease", "Description"]
PRECAUTION_HEADERS = ["Disease"] + [f"Precaution_{i}" for i in range(1, 5)]

PII_TOKENS = [
    "name",
    "ssn",
    "phone",
    "email",
    "address",
    "dob",
    "birth",
    "mrn",
    "patientid",
    "patient_id",
    "memberid",
]


def normalize_header(value: str) -> str:
    return "".join(ch.lower() for ch in value if ch.isalnum())


def has_pii_like_header(headers: Sequence[str]) -> Optional[str]:
    for header in headers:
        normalized = normalize_header(header)
        for token in PII_TOKENS:
            token_norm = normalize_header(token)
            if token_norm and token_norm in normalized:
                return header
    return None


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def log_audit(log_path: Path, entry: Dict[str, str]) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, sort_keys=True) + "\n")


def read_headers(path: Path) -> List[str]:
    with path.open("r", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        headers = next(reader, None)
    if not headers:
        raise ValueError(f"{path.name} is missing headers")
    return [h.strip() for h in headers]


def validate_headers(path: Path, expected: Sequence[str]) -> None:
    headers = read_headers(path)
    if has_pii_like_header(headers):
        bad = has_pii_like_header(headers)
        raise ValueError(f"{path.name} rejected: PII-like column detected: {bad}")
    if list(headers) != list(expected):
        raise ValueError(
            f"{path.name} rejected: headers do not match allowlist. "
            f"Expected {expected}, got {headers}"
        )


def load_dataset_templates(path: Path) -> Tuple[List[str], List[str]]:
    diseases: List[str] = []
    symptoms: List[str] = []

    with path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            disease = row.get("Disease", "").strip()
            if disease and disease not in diseases:
                diseases.append(disease)
            for i in range(1, 18):
                value = row.get(f"Symptom_{i}", "").strip()
                if value and value not in symptoms:
                    symptoms.append(value)

    if not diseases:
        raise ValueError("dataset.csv has no diseases")
    if not symptoms:
        raise ValueError("dataset.csv has no symptoms")
    return diseases, symptoms


def load_severity_templates(path: Path) -> Dict[str, int]:
    severities: Dict[str, int] = {}
    with path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            symptom = row.get("Symptom", "").strip()
            weight_raw = row.get("weight", "").strip()
            if not symptom:
                continue
            try:
                weight = int(weight_raw)
            except ValueError as exc:
                raise ValueError(f"Invalid weight for symptom {symptom}") from exc
            if not 1 <= weight <= 7:
                raise ValueError(f"Weight out of range for symptom {symptom}")
            severities[symptom] = weight
    return severities


def generate_synthetic_dataset(
    diseases: Sequence[str],
    symptoms: Sequence[str],
    row_count: int,
) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    for _ in range(row_count):
        disease = random.choice(diseases)
        symptom_count = random.randint(1, min(6, len(symptoms)))
        chosen = random.sample(symptoms, symptom_count)
        row: Dict[str, str] = {"Disease": disease}
        for i in range(1, 18):
            row[f"Symptom_{i}"] = chosen[i - 1] if i <= len(chosen) else ""
        rows.append(row)
    return rows


def generate_synthetic_severity(symptoms: Sequence[str]) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    for symptom in sorted(symptoms):
        rows.append({"Symptom": symptom, "weight": str(random.randint(1, 5))})
    return rows


def generate_synthetic_descriptions(diseases: Sequence[str]) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    for disease in sorted(diseases):
        rows.append({
            "Disease": disease,
            "Description": f"Synthetic description for {disease}.",
        })
    return rows


def generate_synthetic_precautions(diseases: Sequence[str]) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    for disease in sorted(diseases):
        rows.append({
            "Disease": disease,
            "Precaution_1": "Synthetic precaution 1",
            "Precaution_2": "Synthetic precaution 2",
            "Precaution_3": "Synthetic precaution 3",
            "Precaution_4": "Synthetic precaution 4",
        })
    return rows


def write_csv(path: Path, headers: Sequence[str], rows: Iterable[Dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(headers))
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def validate_optional_file(path: Path, headers: Sequence[str]) -> None:
    if path.exists():
        validate_headers(path, headers)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate synthetic medical POC datasets.")
    parser.add_argument("--row-count", type=int, default=ROW_COUNT_DEFAULT)
    parser.add_argument("--schema-version", type=str, default=SCHEMA_VERSION)
    parser.add_argument("--audit-log", type=str, default=AUDIT_LOG_DEFAULT)
    parser.add_argument("--seed", type=int, default=None)
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)

    base_dir = Path(__file__).resolve().parent

    dataset_path = base_dir / "dataset.csv"
    severity_path = base_dir / "Symptom-severity.csv"
    description_path = base_dir / "symptom_Description.csv"
    precaution_path = base_dir / "symptom_precaution.csv"

    validate_headers(dataset_path, DATASET_HEADERS)
    validate_headers(severity_path, SEVERITY_HEADERS)
    validate_optional_file(description_path, DESCRIPTION_HEADERS)
    validate_optional_file(precaution_path, PRECAUTION_HEADERS)

    diseases, symptoms = load_dataset_templates(dataset_path)
    load_severity_templates(severity_path)

    audit_log_path = base_dir / args.audit_log
    timestamp = datetime.now(timezone.utc).isoformat()

    for path in [dataset_path, severity_path, description_path, precaution_path]:
        if not path.exists():
            continue
        entry = {
            "timestamp": timestamp,
            "schema_version": args.schema_version,
            "file": path.name,
            "sha256": sha256_file(path),
        }
        log_audit(audit_log_path, entry)

    synthetic_dataset = generate_synthetic_dataset(diseases, symptoms, args.row_count)
    synthetic_severity = generate_synthetic_severity(symptoms)
    synthetic_descriptions = generate_synthetic_descriptions(diseases)
    synthetic_precautions = generate_synthetic_precautions(diseases)

    write_csv(base_dir / "synthetic_dataset.csv", DATASET_HEADERS, synthetic_dataset)
    write_csv(base_dir / "synthetic_symptom_severity.csv", SEVERITY_HEADERS, synthetic_severity)
    write_csv(base_dir / "synthetic_descriptions.csv", DESCRIPTION_HEADERS, synthetic_descriptions)
    write_csv(base_dir / "synthetic_precautions.csv", PRECAUTION_HEADERS, synthetic_precautions)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
