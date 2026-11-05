# AISC Catalog Import And Integration Handoff

## Activation Update - 2026-11-04

The operator supplied `aisc-shapes-database-v160-3.xlsx` and confirmed data-use
permission in chat. Preparation and offline import validation accepted 289 W-shapes
and excluded 2010 unsupported non-W rows. The activated build-time catalog version
is `aisc-16.0-us-a992-50ksi-e08bea15bbe4`; both unit views derive from these rows.
This records the operator's confirmation, not independent legal verification.
The source workbook is not committed. No SQL import is needed for the shared
application catalog. Canadian sections remain the two reference shapes; A1085 HSS
is not enabled. Historical handoff limitations below describe the pre-activation
state and are superseded by this update where they say the catalog is null.

## Official Source And Rights

[AISC Shapes Database v16.0](https://www.aisc.org/aisc/publications/steel-construction-manual/aisc-shapes-database-v160/)
is the first-party download page. AISC describes an Excel workbook with US
customary and metric dimensions/properties consistent with its 16th Edition Manual.
The current workbook was not retrieved here: the AISC page/historical download
returned a browser challenge, and the older cloud download returned 404.
No third-party mirror was substituted, no official rows were bundled, and no full
catalog row count or property audit is claimed.

Free download does not establish permission for this SaaS to redistribute or
commercially serve the catalog. [AISC site terms, section 5](https://www.aisc.org/aisc/about-aisc/terms-conditions/)
limit site use and do not provide a clear commercial redistribution grant.
[Copyright permissions](https://www.aisc.org/aisc/publications/copyright-permissions/)
describes requesting reproduction permissions. These are evidence of unresolved
rights, not a legal determination about factual property values. Obtain appropriate
rights confirmation before commercial activation; do not treat a CLI flag as a license.

## Prepare And Preview

Use Python with the isolated tooling dependency in `prisma/requirements-aisc.txt`.
The Codex bundled Python currently has openpyxl 3.1.5; the system Python does not.
Download the official workbook manually and retain its original Readme/notices.
Do not commit the source workbook or generated catalog while rights are unresolved.
Use a temporary directory outside the repository for generated files.

```powershell
python prisma/prepare_aisc.py C:/path/to/official.xlsx --material ASTM_A992_Fy50ksi --output C:/path/to/local-aisc.json
node --import tsx prisma/importSections.ts --aisc-catalog C:/path/to/local-aisc.json
```

Preparation checks the v16.0 sheet/header layout, selects the first (US customary)
occurrence of duplicated property headers, excludes non-W families, rejects formula
or invalid property cells, and records SHA-256 of the exact source workbook bytes.
The JSON retains source column names and input/exclusion counts. The TS importer
validates the JSON again, normalizes `W12X40` to `W12x40`, and maps properties without
rounding or geometry-derived replacements. Its dataset version includes the release,
unit/material policy, and a workbook-hash prefix. The full workbook hash is preserved
in each imported row's source note. A hash establishes identity, not authenticity;
the JSON is not signed and its claimed origin must be reviewed independently.

Only an authorized operator, after reviewing the target database and rights, may use:

```powershell
node --import tsx prisma/importSections.ts --aisc-catalog C:/path/to/local-aisc.json --apply --acknowledge-provenance-limitations --confirm-data-use-rights
```

This touches only SteelSection in a serializable transaction, skips matching rows,
and refuses duplicate or conflicting identities. It neither creates demo accounts
nor activates subscriptions. No writes or production connection were performed here.
Without `--aisc-catalog`, the existing three-fixture command remains unchanged.

## Unit And Material Compatibility

Only native W-shapes / AISC_360_22 / imperial are extracted from the workbook. Properties are in inches, in2,
in3, in4 and lb/ft. Fy=50 ksi is an explicit ASTM A992 material assumption required
at preparation, not a value supplied by the shapes workbook. A shape designation
alone does not verify a member's material grade; confirm project material documents.

The workbook's SI block is intentionally not directly ingested. A naive mapping is unsafe:
SI section moduli and inertias use scaled table units, which must be verified against
the official Readme before direct ingestion. Instead, the shared application catalog
derives dimensionally equivalent metric views from the original US values, and
imperial views from native CSA metric references. Length scales by 25.4, area by
25.4 squared, elastic modulus of section by 25.4 cubed, inertia by 25.4 to the fourth,
Fy by 6.894757293168361 MPa per ksi, and lb/ft to kg/m by 0.45359237/0.3048 (inverse
factors for the reverse direction). No rounding is applied to catalog properties.
Designation, code standard, dataset version and original provenance are retained;
the source note identifies the converted view. This is not relabelling CSA as AISC.
AISC metric and CSA imperial therefore use the same physical source sections, not
different fabricated catalogs. Source-native rows remain unchanged and SQL imports
store source-native properties; the application derives both unit views consistently.
Current engine nominal E values (200000 MPa / 29000 ksi) are independently rounded,
so exact column/brace capacity identity is not claimed by property-conversion tests.
Non-W families are excluded because the current domain/engines support W geometry.
An expanded catalog also does not expand the engines' supported limit states.

## Shared Application Catalog

Database population alone has **no effect on application choices**. These consumers
all import `sectionSeedV1`, which now resolves through `sectionCatalog.ts` and the
validated build-time `aiscCatalog.generated.json`:

- `src/app/api/sections/route.ts`
- `src/engine/runInputValidation.ts`
- `src/app/(app)/projects/[projectId]/runs/new/RunForm.tsx`
- `src/components/profiles/ProfileExplorer.tsx`

The checked-in JSON is `null`: no unverified/unlicensed full catalog is enabled.
After source and rights review, an authorized operator can activate the prepared
catalog locally for all four consumers together:

```powershell
node --import tsx prisma/activateAiscCatalog.ts C:/path/to/local-aisc.json --confirm-data-use-rights
```

Activation validates first and atomically replaces only the build-time JSON. It
does not import SQL or deploy. A rebuild/restart is required; deployment remains
the parent task's responsibility. The shared export retains CSA references and
replaces, rather than mixes, AISC imperial fixture rows. Invalid activated data
fails closed instead of silently falling back. All consumers retain the same
project code/unit filters and geometry/versioned inputs. `sectionFixturesV1`
remains separately exported for fixture-specific tests and the legacy importer.
Do not change just the API to return SQL designations: that would break consistency.

The current ProfileExplorer component groups by standard without a unit filter;
the parent UI owner should select/filter by both standard and unit system to avoid
duplicate designation options after unit expansion. The run form, API and engine
already filter by both code and units. No UI files are changed in this task.

## Verification

```powershell
node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit
python -m unittest discover -s tests/database -p test_prepare_aisc.py
```

Workbook tests use synthetic values, not a redistributed AISC dataset. They prove
header selection, hashing, exclusion, validation and mapping behavior; they do not
prove compatibility with a current downloaded official workbook or live database.
