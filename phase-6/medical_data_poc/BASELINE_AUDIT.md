# Baseline Audit - Medical Data POC

**Date:** February 10, 2026  
**Scope:** medical_analysis.py, symptom_checker.py, dataset.csv (first 5 lines), Symptom-severity.csv (first 5 lines)

---

## Current Functionality

### medical_analysis.py
- Loads disease-to-symptom mappings from dataset.csv.
- Loads disease descriptions from symptom_Description.csv and precautions from symptom_precaution.csv.
- Matches input symptoms to diseases by overlap ratio (matching count / input count).
- Produces a ranked list (top 10 matches) and generates a report with confidence bands.
- Saves a JSON report to analysis_report.json for a hardcoded test case.

### symptom_checker.py
- Interactive CLI tool to select symptoms from the dataset.
- Uses medical_analysis.py helpers to analyze selected symptoms.
- Generates JSON and Markdown reports per run (analysis_YYYYMMDD_HHMMSS.*).
- Displays results in the terminal with a disclaimer.

---

## Data Structure (Observed)

### dataset.csv
- Columns: Disease, Symptom_1 ... Symptom_17
- Rows: multiple symptom sets per Disease.
- Example row:
  - Disease: Fungal infection
  - Symptoms: itching, skin_rash, nodal_skin_eruptions, dischromic _patches

### Symptom-severity.csv
- Columns: Symptom, weight
- Example rows:
  - itching -> 1
  - skin_rash -> 3

### Other referenced files
- symptom_Description.csv (disease descriptions)
- symptom_precaution.csv (precautions 1-4)

---

## Safety Gaps (Observed)

- No input validation beyond basic numeric parsing in CLI.
- No explicit PII/PHI checks or redaction logic.
- No data provenance verification (assumes CSVs are safe).
- No rate limiting or access controls (CLI only).
- No explicit disclaimer persistence in output files (only in console/markdown report text).

Based on sample lines, dataset.csv and Symptom-severity.csv appear to be symptom/disease labels (no direct PII). This is not full verification of all files.

---

## Reusability Assessment

- Logic is modular enough to wrap in a constitutional/executor class, but would require:
  1. Formal input schema (allowed symptom values only, explicit validation errors).
  2. Provenance checks for CSV inputs (hashes or signed dataset version).
  3. Strict output handling rules (no claims of diagnosis, enforce “informational only” output).
  4. Clear separation between data loading, analysis, and reporting for auditability.

**Recommendation:** Refactor rather than extend in place. Use these scripts as a baseline reference for functionality, then rebuild with explicit safety and audit controls.
