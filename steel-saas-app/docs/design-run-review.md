# Design-run repair and architecture review

## Architecture and scope

The app is Next.js 15 / React 19 with Auth.js credentials and JWT sessions, Prisma/PostgreSQL persistence, deterministic TypeScript engines, and React PDF reporting. Projects contain organization ownership, code profile and unit system. The API and a legacy server action share the design-run handler. Results already snapshot inputs, section properties, versions, units, code, calculation lines and references. Preserve this architecture; a full rebuild is not justified by the inspected failure.

The active new-run route previously duplicated an unused RunForm/server-action implementation. It now loads an authorized, unarchived project on the server and renders one controlled client form using the existing API. No database schema change, migration, dependency change, data cleanup or production deployment is included.

## Confirmed defects repaired

- `/api/sections` returned objects while the active page declared `string[]` and rendered each object as an option child. React error #31 followed section loading. The form now validates the response shape, renders `designation`, and uses the designation as the stable key/value within the versioned catalog. Code/unit filtering and resetting selection on context changes prevent stale selections. The server-selected project context is fixed for a run; overrides are intentionally unavailable because the engine uses project settings.
- The active form omitted required display-value labels, used `kN·m`, `kip·ft`, and `kips` instead of canonical contract units, and sent `concreteFC` instead of `concreteStrength`. Shared field definitions now generate the request and match the engine contract.
- Project defaults were not loaded; a request could describe one unit/code context while the engine computed in another. The page inherits project settings and the shared handler rejects mismatches before creating a row. Archived projects cannot accept new runs. Section compatibility, positive finite numbers, canonical units and plate coverage are checked server-side; direct calculations also reject invalid numeric/section inputs, incompatible physical units and nonfinite computed outputs.
- Section selection queried persisted records, but engines actually used the static versioned seed by designation. The endpoint now offers the same engine reference catalog. Existing database section rows are preserved. Expanding reference data requires an explicit, versioned engine/catalog change; arbitrary database additions are not silently usable.
- The result page read nonexistent `overallPass`, `codeClauseReferences`, column capacity/slenderness, and base-plate result keys, producing false failure badges or empty rows. It now reads the engine result contract, labels base-plate success as bearing-only, shows calculation details, and labels Sx as an elastic section modulus in mm³ (the stored value was already in mm³, not thousands of mm³).
- Result pages and report metadata used mutable project code/units. They now use the saved result context. The run page also verifies the requested project ID, in addition to organization ownership.
- Missing fields could become zero in the legacy server action. They now remain invalid instead of being silently coerced. Two existing benchmark fixtures were missing `weightOrMass`; their properties are now complete, without changing expected benchmark results.

## Recovery and usability

Controlled fields retain values across module switching, section-load errors, invalid responses and submit failures. Section requests are aborted on context changes/unmount; errors have a retry action. Submission is guarded against concurrent clicks and disables inputs while in flight. Server errors are rendered as text. Failed engine responses keep the form visible and link to the saved failed run. Ambiguous network/save responses instruct users to check the project before retrying; this is not durable server-side idempotency.

The form has associated labels, explicit units, readable text/contrast, keyboard focus outlines, narrow-screen padding, and module scope descriptions. Positive load magnitudes are required by the current engine contract; zero/negative loads and tension are not supported by this repair. Material properties come from the selected reference section; plate yield strength is entered explicitly. No automatic numeric reinterpretation between units is offered.

## Verified calculation availability

| Module | CSA / metric | AISC / imperial | AISC / metric | CSA / imperial |
| --- | --- | --- | --- | --- |
| Beam | Saved result + PDF | Saved result + PDF | Explicit unsupported catalog | Explicit unsupported catalog |
| Column | Saved result + PDF | Saved result + PDF | Explicit unsupported catalog | Explicit unsupported catalog |
| Axial base plate | Saved result + PDF | Saved result + PDF | Explicit unsupported catalog | Explicit unsupported catalog |

The catalog has two metric CSA designations and one imperial AISC designation. All 12 UI combinations were exercised in Chromium, with zero page errors. Unsupported combinations do not silently change the project or convert an unrelated section. Supporting them needs validated cross-unit/reference data, not fabricated section properties.

## Checks and evidence

- `npm test`: **139 passed across 19 files**, including existing suites plus matrix, malformed-response, input-boundary, context tampering, unit mismatch, geometry, overflow, conversion and no-write authorization regressions.
- `npm run typecheck`, `npm run build`, and `git diff --check`: **passed**.
- Actual Chromium against an isolated local database (`saas_regression_20261022`): all six supported workflows submitted, persisted complete results, rendered successful check summaries and produced valid PDF responses. All six unsupported combinations displayed a recoverable state with submission disabled.
- Browser recovery checks: malformed section payload -> retry -> valid options; simulated HTTP 503 submit; module switching; title and numerical inputs retained.
- Integration checks: cross-organization run creation returned 403, foreign project form and mismatched project/run URL returned 404, tampered context returned 400, and rejected requests did not create rows. Invalid section-query units returned 400; anonymous section lookup returned 401.
- Six complete rows retained input/result context and versioned section snapshots. Historical result code/units remained unchanged after editing the test project's settings, and its PDF regenerated.
- Only the separate regression database was initialized/seeded for these browser checks. Existing application data was neither cleared nor migrated. Regression records are retained. Browser verification helpers are in `/workspace/scratch/verify-design-runs.cjs` and `verify-design-auth.cjs`; they use the environment-provided Playwright and Chromium, not a new application dependency.

## Engineering review: verified limitations and unverified claims

The repair does not certify either code implementation. Existing benchmark tests are repository examples, not independently commissioned engineering review. No licensed AISC/CISC source material or qualified engineer sign-off was available for independent verification.

Verified from the code:

- Beam resistance uses elastic Sx and a simplified web shear expression. It does not check section classification, local buckling, lateral-torsional buckling, deflection or combined actions. A code label or a passing ratio does not establish complete F2/CSA compliance. Scope is now visible in the form and calculation/report lines; formulas and existing valid-case numeric expectations were preserved.
- Column resistance uses the CSA n=1.34 curve or AISC E3 curve with weak-axis KL/ry. It assumes axial compression and does not evaluate local/torsional buckling or combined bending. E is 200,000 MPa or 29,000 ksi (rounded equivalents). Dimensionless buckling calculations were preserved.
- Base plate uses concentric compression, a concrete bearing factor and cantilever thickness calculation. There is no supplied thickness input, anchor/weld design, moment, uplift or supporting-area enhancement. A bearing pass is not a complete connection pass. Plate dimensions smaller than the column footprint are rejected in the run workflow.
- Metric force/moment normalization uses kN -> N and kN-m -> N-mm; imperial normalization uses rounded kip/kip-ft conversion constants. Section area, length and stress values are used in their native system rather than blindly applying length conversion to all properties. New arithmetic tests exercise imperial normalization and physical equivalence using synthetic converted sections; these are not additional validated catalog entries.
- W310x60 source comments explicitly describe approximated properties pending handbook verification. Seed comments claiming an audit and source/usage rights have not been independently substantiated. Do not infer publication readiness from tests alone.

Authorization/persistence observations requiring separate follow-up:

- Tested creation, project lookup and report paths scope data by organization; existing subscription gates remain. This is targeted coverage, not a complete security audit.
- Credentials authorization does not currently check the user's active status, and JWT organization membership can outlive a database membership change. Account revocation/session lifecycle needs dedicated tests and a policy decision.
- Client submission locking is present; durable request idempotency is absent. Run status updates use separate database writes, so process interruption can leave a draft/calculating row. No atomic job/recovery mechanism was added here.
- Completed result snapshots preserve numeric inputs, section properties and versions. Project name/client/location remain live report metadata, and signatures are not audit history. Existing reports are not recalculated by this repair.
- Backups, restore drills, database row policies, rate limits, operational monitoring, performance under load, bilingual UI and full accessibility/mobile compliance were not verified. No performance percentage or production-readiness claim is made.

Recommended next work is an independent engineering/reference-data review and targeted session/idempotency hardening, followed by measured UX improvements. A larger rebuild is not proposed.
