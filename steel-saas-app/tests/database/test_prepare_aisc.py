import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from openpyxl import Workbook

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("prepare_aisc", ROOT / "prisma" / "prepare_aisc.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def workbook_bytes(*, invalid=False, duplicate=False):
    book = Workbook()
    sheet = book.active
    sheet.title = "Database v16.0"
    sheet.append(["Type", "EDI_Std_Nomenclature", "AISC_Manual_Label", "T_F", "W", "A", "d",
                  "bf", "tw", "tf", "Sx", "Ix", "rx", "Sy", "Iy", "ry", "AISC_Manual_Label", "W"])
    row = ["W", "W10X20", "W10X20", "F", 20, 6, 10, 6, 0.2, 0.3, 20, 100, 4, 6, 18, 1.7,
           "W250X30", 30]
    if invalid:
        row[5] = "=1+5"
    sheet.append(row)
    sheet.append(["HSS", "HSS-test", "HSS-test"])
    if duplicate:
        sheet.append(row)
    stream = io.BytesIO()
    book.save(stream)
    return stream.getvalue()


class PrepareAiscTests(unittest.TestCase):
    def test_reads_first_us_headers_excludes_non_w_and_hashes_exact_workbook(self):
        import hashlib
        raw = workbook_bytes()
        result = module.prepare_catalog(raw, material="ASTM_A992_Fy50ksi")
        self.assertEqual(len(result["rows"]), 1)
        self.assertEqual(result["rows"][0]["AISC_Manual_Label"], "W10X20")
        self.assertEqual(result["rows"][0]["W"], 20)
        self.assertEqual(result["source"]["excludedNonWRows"], 1)
        self.assertEqual(result["source"]["totalRows"], 2)
        self.assertEqual(result["source"]["workbookSha256"], hashlib.sha256(raw).hexdigest())

    def test_refuses_formula_cells_duplicate_shapes_and_unconfirmed_material(self):
        for raw in [workbook_bytes(invalid=True), workbook_bytes(duplicate=True)]:
            with self.assertRaises(ValueError):
                module.prepare_catalog(raw, material="ASTM_A992_Fy50ksi")
        with self.assertRaises(ValueError):
            module.prepare_catalog(workbook_bytes(), material="unknown")

    def test_cli_prepares_a_local_workbook_and_typescript_preview_without_a_database(self):
        with tempfile.TemporaryDirectory(prefix="steel-saas-aisc-test-") as directory:
            workbook = Path(directory) / "synthetic.xlsx"
            output = Path(directory) / "catalog.json"
            workbook.write_bytes(workbook_bytes())
            command = [sys.executable, "-B", str(ROOT / "prisma" / "prepare_aisc.py"), str(workbook),
                       "--material", "ASTM_A992_Fy50ksi", "--output", str(output)]
            converted = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(converted.returncode, 0, converted.stderr)
            preview = subprocess.run(["node", "--import", "tsx", "prisma/importSections.ts",
                                      "--aisc-catalog", str(output)], cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(preview.returncode, 0, preview.stderr)
            result = json.loads(preview.stdout)
            self.assertEqual(result["mode"], "offline-preview")
            self.assertEqual(result["datasetRows"], 1)
            self.assertEqual(result["designations"], ["W10x20"])
            self.assertTrue(result["sectionDbVersion"].startswith("aisc-16.0-us-a992-50ksi-"))
            # Preparation is fail-closed about replacing an existing local output.
            repeated = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
            self.assertNotEqual(repeated.returncode, 0)


if __name__ == "__main__":
    unittest.main()
