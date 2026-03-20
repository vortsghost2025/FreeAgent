"""Unit tests for safe_analysis synthetic safeguards."""

import contextlib
import io
import sys
import tempfile
from pathlib import Path
from unittest import TestCase
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

import safe_analysis


class TestSafeAnalysis(TestCase):
    def test_legacy_data_rejection(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            (tmp_path / "dataset.csv").write_text("Disease,Symptom_1\nFlu,fever\n", encoding="utf-8")

            with patch.object(safe_analysis, "SYNTHETIC_DATA_DIR", tmp_path):
                with self.assertRaises(FileNotFoundError) as exc_info:
                    safe_analysis.load_synthetic_data()

            message = str(exc_info.exception)
            self.assertIn("synthetic_dataset.csv", message)
            self.assertIn("Run safe_loader.py", message)

    def test_accepts_synthetic_files_with_legacy_present(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            (tmp_path / "dataset.csv").write_text("Disease,Symptom_1\nFlu,fever\n", encoding="utf-8")
            (tmp_path / "synthetic_dataset.csv").write_text(
                "Disease,Symptom_1\nFlu,fever\n",
                encoding="utf-8",
            )
            (tmp_path / "synthetic_symptom_severity.csv").write_text(
                "Symptom,weight\nfever,5\n",
                encoding="utf-8",
            )
            (tmp_path / "synthetic_descriptions.csv").write_text(
                "Disease,Description\nFlu,Influenza\n",
                encoding="utf-8",
            )
            (tmp_path / "synthetic_precautions.csv").write_text(
                "Disease,Precaution_1,Precaution_2,Precaution_3,Precaution_4\nFlu,Rest,Fluids,Monitor,Followup\n",
                encoding="utf-8",
            )

            with patch.object(safe_analysis, "SYNTHETIC_DATA_DIR", tmp_path):
                data = safe_analysis.load_synthetic_data()

            self.assertIn("diseases", data)
            self.assertIn("descriptions", data)
            self.assertIn("precautions", data)
            self.assertIn("severity", data)
            self.assertIn("Flu", data["diseases"])

    def test_disclaimer_wrapper_in_output(self) -> None:
        report = {
            "timestamp": "2026-02-10T00:00:00",
            "input_symptoms": ["fever"],
            "analysis": {
                "total_matches": 0,
                "high_confidence": [],
                "medium_confidence": [],
                "low_confidence": [],
            },
            "top_diagnoses": [],
        }

        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer):
            safe_analysis.print_report(report)

        output = buffer.getvalue()
        self.assertTrue(output.startswith(safe_analysis.SYNTHETIC_POC_DISCLAIMER))
        self.assertTrue(output.rstrip().endswith(safe_analysis.SYNTHETIC_POC_DISCLAIMER))
