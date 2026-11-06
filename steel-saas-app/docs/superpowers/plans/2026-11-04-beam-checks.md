# Beam Checks Implementation Plan

**Goal:** Add section classification/local buckling, lateral-torsional buckling,
and service-load deflection to the existing AISC/CSA beam workflow in both units.

**Architecture:** Keep the existing factored-demand workflow. Add an explicit
simply supported W-beam assessment with separate service loads and restraint
inputs, versioned section properties and self-contained saved results. Legacy
runs retain their original limitations; missing information cannot imply pass.

**Approved scope:** Simply supported prismatic W-beams first. Cantilevers and
continuous beams require subsequent separately validated analysis. Serviceability
starts with full-span uniformly distributed dead/live loads; other loading must
be explicitly unsupported rather than approximated without disclosure.

## Tasks

- [ ] Verify primary AISC/CSA clauses and published benchmark cases. AISC verified;
  CSA primary reference remains outstanding. No recalled
  or cross-code-substituted equations. Record unavailable authoritative material.
- [x] Retain official section properties for classification and buckling;
  test dimensional conversions and regenerate the activated AISC catalog.
- [x] Test and implement simply supported UDL deflection with separate service
  dead/live loads and engineer-selected live/total limits. Never factor these.
- [ ] Test and implement code-specific classification and buckling applicability
  (AISC supported F2/F3-1 done; CSA pending),
  branch boundaries and governing capacities with complete source provenance.
- [x] Integrate explicit beam inputs, server validation, unit conversions,
  per-check statuses and self-contained result/PDF snapshots. Missing input or
  unsupported case is not checked, not pass. Preserve legacy result warnings.
- [x] Verify supported AISC strength/shared deflection benchmark values, both unit systems, invalid/overflow inputs,
  unsupported cases, saved-run regeneration, form/PDF presentation and build.
- [ ] Independently review before publication and verify live behavior.

Local release evidence: 997 TypeScript tests and four Python workbook tests pass.
Code review and desktop/mobile form inspection are complete. CSA strength remains
open above; it is visibly not checked, not silently represented as implemented.

## Validation Gates

Engineering assumptions and applicability must be visible in results. A catalog
expansion alone does not validate calculations. Do not publish unavailable CSA
formulas, assume all W sections compact, approximate missing torsion properties,
or silently use factored strength demands for deflection. Live testing and green
tests are not independent professional engineering certification.
