"""Prepare a local, operator-supplied AISC v16.0 workbook; never fetch or connect."""

import argparse
import hashlib
import io
import json
import math
from pathlib import Path
import re
import sys

from openpyxl import load_workbook

SOURCE_URL = "https://www.aisc.org/aisc/publications/steel-construction-manual/aisc-shapes-database-v160/"
FIELDS = ("W", "A", "d", "bf", "tw", "tf", "Sx", "Ix", "rx", "Sy", "Iy", "ry")
MATERIAL = "ASTM_A992_Fy50ksi"


def prepare_catalog(raw: bytes, *, material: str) -> dict:
    if material != MATERIAL:
        raise ValueError("Explicit ASTM_A992_Fy50ksi material assumption required")
    if len(raw) > 10_000_000:
        raise ValueError("Workbook exceeds 10 MB limit")
    book = load_workbook(io.BytesIO(raw), read_only=True, data_only=False, keep_links=False)
    try:
        if "Database v16.0" not in book.sheetnames:
            raise ValueError("Expected official Database v16.0 worksheet")
        sheet = book["Database v16.0"]
        if sheet.max_row > 10001 or sheet.max_column > 200:
            raise ValueError("Unexpected workbook dimensions")
        values = iter(sheet.values)
        headers = next(values, ())
        # AISC repeats property headers for SI. The first block is US customary.
        if tuple(headers[:7]) != ("Type", "EDI_Std_Nomenclature", "AISC_Manual_Label", "T_F", "W", "A", "d"):
            raise ValueError("Unexpected US customary header layout; do not infer units")
        indices = {}
        for field in ("Type", "AISC_Manual_Label", *FIELDS):
            try:
                indices[field] = headers.index(field)
            except ValueError as exc:
                raise ValueError(f"Missing column {field}") from exc
            if indices[field] >= 84:
                raise ValueError(f"Column {field} is outside the US customary block")
        rows = []
        seen = set()
        excluded = 0
        for number, values in enumerate(values, start=2):
            if all(value is None for value in values):
                continue
            shape_type = values[indices["Type"]]
            if not isinstance(shape_type, str) or not shape_type.strip():
                raise ValueError(f"Missing shape type at worksheet row {number}")
            if shape_type != "W":
                excluded += 1
                continue
            label = values[indices["AISC_Manual_Label"]]
            if not isinstance(label, str) or not re.fullmatch(r"W\d+(?:\.\d+)?X\d+(?:\.\d+)?", label, re.IGNORECASE):
                raise ValueError(f"Invalid W designation at worksheet row {number}")
            if label.upper() in seen:
                raise ValueError(f"Duplicate W designation at worksheet row {number}")
            seen.add(label.upper())
            row = {"AISC_Manual_Label": label}
            for field in FIELDS:
                value = values[indices[field]]
                if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
                    raise ValueError(f"Expected positive numeric {field} at worksheet row {number}; formulas are not accepted")
                row[field] = value
            rows.append(row)
        if not rows:
            raise ValueError("No W-shapes found")
        return {
            "format": "steel-saas-aisc-v1",
            "source": {
                "publisher": "AISC", "release": "16.0", "worksheet": "Database v16.0",
                "url": SOURCE_URL, "workbookSha256": hashlib.sha256(raw).hexdigest(),
                "unitSystem": "imperial", "material": material,
                "totalRows": len(rows) + excluded, "excludedNonWRows": excluded,
            },
            "rows": rows,
        }
    finally:
        book.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--material", required=True, choices=[MATERIAL])
    parser.add_argument("--output", type=Path, required=True, help="New local JSON file; existing files are never overwritten")
    args = parser.parse_args()
    if args.workbook.stat().st_size > 10_000_000:
        parser.error("Workbook exceeds 10 MB limit")
    result = prepare_catalog(args.workbook.read_bytes(), material=args.material)
    with args.output.open("x", encoding="utf-8", newline="\n") as target:
        json.dump(result, target, ensure_ascii=True, allow_nan=False, indent=2)
        target.write("\n")
    print(f"Prepared {len(result['rows'])} W-shapes; excluded {result['source']['excludedNonWRows']} non-W rows. No database access.")
    print("Verify source authenticity, material assumption, and commercial data-use rights before importing.", file=sys.stderr)


if __name__ == "__main__":
    main()
