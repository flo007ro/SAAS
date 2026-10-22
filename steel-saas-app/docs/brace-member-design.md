# Brace member checks: first implementation

## Delivered scope

Brace is now a distinct persisted run type, using the existing organization authorization, subscription gate, project context, request validation, result snapshots, 3D profile visualization and PDF pipeline. The build script regenerates Prisma Client to prevent stale enum metadata in deployment caches; it does not migrate the database. Existing beam, column and base-plate runs remain readable and their engines are unchanged apart from exporting the existing compression-curve helpers for reuse.

Supported catalog paths are CSA S16-19 / metric and AISC 360-22 / imperial. Cross-unit catalog combinations remain explicitly unsupported; this implementation does not invent reference sections. All brace results are preliminary member checks with `designStatus=requires_engineering_review`. Brace results expose `calculatedChecksMet` and deliberately omit an overall `pass` field. A completed database run is not an overall brace, connection or seismic-system approval. The UI, project list and PDF preserve that distinction.

The module evaluates separate tension and compression envelope demands; zero is permitted for an unapplied load sense, but both cannot be zero. Inputs include member length, effective lengths about both axes, net area An, engineer-selected shear-lag factor U, ultimate strength Fu, project slenderness screening thresholds, and ordinary/seismic demand category. Reference gross area, Fy, rx and ry come from the selected versioned W-shape.

Calculation basis implemented:

- Gross section tensile yielding resistance: 0.90 Ag Fy.
- Effective net-area tensile rupture resistance: 0.75 Ae Fu, with Ae = U An.
- Tensile resistance is the lesser of yielding and rupture; demand/capacity is calculated separately from compression.
- Compression uses max(Kx Lx / rx, Ky Ly / ry), not an assumed weak-axis governing mode. The AISC E3 inelastic/elastic curve and CSA n=1.34 flexural-buckling curve reuse the established column helpers. Native section units are maintained and metric forces are converted N -> kN.
- Tension L/min(rx,ry) and governing compression KL/r are compared to explicitly labeled project screening criteria. Defaults of 300 and 200 are conveniences, not determinations of code-required limits or exceptions.
- Seismic demand produces an explicit review flag and warning. It does not add a seismic resistance factor or claim ductility qualification.

Code-reference labels identify AISC 360-22 D2/E3 and CSA S16-19 13.2/13.3.1 as the member resistance basis. Regression arithmetic is not independent verification of all provisions or applicability. Licensed standards, material certification, section classification and qualified engineering review remain necessary before engineering release. The current W310x60 reference-data source itself records that its properties need handbook verification.

## Explicit exclusions

Local/torsional buckling, built-up members, HSS/angle brace families, connection/block shear, hole deduction and shear-lag derivation, eccentricity, combined bending, fatigue, gusset stability, cyclic buckling/fracture, expected strength, connection overstrength, compactness and seismic system qualification are not evaluated. Tension and compression demands are independent envelope cases, not simultaneous signed actions.

The result snapshots include original display inputs (An, U, Fu, demands, lengths, thresholds and seismic category), gross section/material properties including both radii, versions, code, units, intermediate values and references. Old reports do not recalculate against new engine data.

## Database rollout: additive, no data replacement

`prisma/schema.prisma` adds `brace` to DesignRunType. The repository has no existing migration baseline, so this change provides a small standalone idempotent SQL update instead of introducing an unsafe migration-history reset:

```sql
ALTER TYPE "DesignRunType" ADD VALUE IF NOT EXISTS 'brace';
```

Run `npm run db:enable-brace` from `steel-saas-app` with `DATABASE_URL` securely set to the intended database. It uses `prisma/sql/add-brace-type.sql`. Never substitute a production URL into a committed file, log or chat. The command does not delete/update records or rebuild tables. It is intentionally separate from build/start scripts and is not silently run during deployment. Do not use `db push --accept-data-loss`, reset, or migrate-baseline workarounds.

The active form checks the database enum before offering brace runs, and the API rejects brace creation with a recoverable 501 if storage is not enabled. Existing modules continue operating. A rolling deployment can therefore precede the enum update without offering a broken calculation option. After the update, reopen the form; no restart is needed for the availability check.

The update was executed twice against the existing local `saas_regression_20261022` database. Its six existing runs remained unchanged. Brace browser cases were added during development and local production-build validation, without clearing any records. No production database update has been executed from this workspace: production credentials/access are not available here.

## Validation

Automated regression coverage includes both code paths, explicit yielding/rupture arithmetic, AISC inelastic/elastic behavior, strong-axis governing compression, tension-only/compression-only envelopes, all-zero rejection, net-area/U/Fu boundaries, invalid/nonfinite demands, unit/context mismatch, catalog incompatibility, project screening failures, seismic flags, tenant isolation, pre-update gating and versioned persistence. PDF coverage verifies that a numerical check pass does not produce a PASS badge or design approval for a brace.

Chromium integration checks exercised the storage gate before the SQL update; both AISC imperial and CSA metric brace submissions after it; saved input/result snapshots; 3D profile rendering; extracted PDF text with engineering/seismic warnings and no PASS claim; invalid-input recovery without new rows; cross-tenant and anonymous denial; unchanged hashes/data for every pre-existing run; and mobile module-catalog overflow. The environment-specific helper and screenshots are under `/workspace/scratch/verify-brace-workflow.cjs` and `brace-*-result.png`.

## Remaining modules and next work

`/modules` now documents all four increments and required inputs. Connections, composite beams and moment base plates are still labeled planned, not implemented calculators. Their scope is centralized in `src/domain/engineeringModules.ts`.

Next acceptance work for braces is independent standards/reference-data review, additional section families/classification, connection/block shear and gusset checks, then seismic system qualification. Connection design needs verified bolt/weld and faying-surface data plus concentric/eccentric connection benchmarks. Composite design needs slab/deck/stud and construction-stage models. Moment base plates need compression-only contact equilibrium, validated anchor force distribution, anchor steel/concrete limit states and concrete-standard benchmarks.

Final validation: 168 tests passed across 21 files; TypeScript checking, production compilation and whitespace checks passed. The local production build also passed both native code/unit browser workflows, persisted snapshots and extracted PDF warning checks, with no browser errors or modifications to pre-existing records. The refreshed build command additionally verifies Prisma Client generation before compilation.
