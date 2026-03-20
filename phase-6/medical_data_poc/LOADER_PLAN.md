# Loader Plan - Medical Data POC

**Date:** February 10, 2026  
**Purpose:** Define a strict, safe, and auditable loader for synthetic medical POC data.

---

## Scope

This plan describes a loader that only accepts synthetic datasets that match a strict schema, rejects any file with potential PII/PHI columns, and records provenance via SHA-256 hashing.

---

## Requirements (Boring, Non-Negotiable)

1. **Strict Schema**
   - Reject any file that does not match the expected columns and types.
   - No column inference, no best-effort parsing.

2. **No PHI / PII**
   - Reject any file containing columns that resemble PII/PHI (example: Name, SSN, Phone, Email, Address, DOB, MRN, PatientID).
   - Use a strict allowlist of approved columns rather than a blacklist.

3. **Synthetic Only**
   - Generate fresh synthetic data using existing CSVs as templates.
   - Do not trust legacy CSVs as canonical input.

4. **Provenance**
   - Compute SHA-256 hash of each input file.
   - Log hash + timestamp + schema version in an audit log.

---

## Proposed Schema (Allowlist)

### Dataset Schema (CSV)
- **Disease**: string (non-empty)
- **Symptom_1..Symptom_17**: string (optional, may be empty)

### Symptom Severity Schema (CSV)
- **Symptom**: string (non-empty)
- **weight**: integer (1-5)

### Optional Description Schema (CSV)
- **Disease**: string (non-empty)
- **Description**: string (non-empty)

### Optional Precaution Schema (CSV)
- **Disease**: string (non-empty)
- **Precaution_1..Precaution_4**: string (optional)

---

## Loader Workflow

1. **Schema Version Pin**
   - Define schema version string in code (e.g., "v1.0").

2. **Load Input File**
   - Read CSV with strict headers.
   - Reject if any column is missing or unexpected.

3. **PII/PHI Guard**
   - Reject if any column not in allowlist.
   - Reject if any column name matches common PII patterns (Name, SSN, Phone, Email, Address, DOB, MRN, PatientID).

4. **Type Validation**
   - Ensure string fields are strings.
   - Ensure numeric fields are numeric and within range.

5. **Synthetic Data Generation**
   - Generate a fresh synthetic dataset using the allowlisted schema.
   - Use existing symptom lists as templates, but do not preserve row-level data.

6. **Provenance Logging**
   - Compute SHA-256 of input template file(s).
   - Record hash + timestamp + schema version in audit log file.

7. **Output**
   - Write synthetic dataset to a new file with a deterministic name.
   - Store audit log in a separate file (immutable append).

---

## Deliverables

- `synthetic_dataset.csv`
- `synthetic_symptom_severity.csv`
- `synthetic_descriptions.csv`
- `synthetic_precautions.csv`
- `loader_audit_log.jsonl`

---

## Open Questions (For Human Approval)

- Approved schema version string
- Final allowlist for column names
- Synthetic data volume (row count)
- Audit log storage location and retention policy

---

## Next Step

Implement loader only after human approval of this plan.
