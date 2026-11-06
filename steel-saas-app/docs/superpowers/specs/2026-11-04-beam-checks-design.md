# Beam Classification, Buckling And Deflection

## Approved Direction

The user requested the omitted beam checks and approved the staged release
sequence: simply supported W-beams first, cantilevers next, continuous beams
after a dedicated multi-span analysis. AISC 360-22 and CSA S16-19 and both unit
systems remain the requested final scope, not interchangeable code methods.

## Approaches

1. Extend all structural configurations immediately: larger analysis and
   verification burden, particularly moment envelopes and restraint behavior.
2. Implement simply supported prismatic W members with explicit assumptions
   and service loads first: selected staged approach. Other configurations
   must remain unsupported, never silently reduced to a simple span.

## Inputs And Data

Retain pre-factored moment/shear strength demands. Service deflection requires
separate unfactored dead/live UDL magnitudes, span, stiffness and explicit live
and total deflection limits. Initial analytical service model is full-span UDL,
small-deflection elastic Euler-Bernoulli theory without composite action.

LTB requires unbraced length, code-specific moment-gradient handling and
affirmed restraint/applicability assumptions. Material yield strength must be
explicitly assessed rather than inferred solely from the section designation.
Section data must retain official torsion/plastic properties and tabulated
slenderness; conversions use each property's dimensional exponent. Missing
Canadian properties cannot be manufactured from US shapes.

## Calculation And Results

Per-check states are checked-pass, checked-fail or not-checked with a reason.
Missing/unsupported data cannot produce an overall pass. Factored inputs must
remain visibly factored, service loads visibly unfactored. Unsupported section
classification routes cannot fall through to compact-member equations.

New saved results retain inputs, normalized quantities, all used section
properties, assumptions, statuses, capacity calculations, code/data/engine
versions and references. Existing results remain historically unchanged and
keep their omitted-check warnings. HTML and PDF must tell the same story and
reports regenerate without querying mutable section properties.

## Verification And Release

Verify against primary specifications, applicable errata and published worked
examples, including transition boundaries, absent inputs, noncompact/slender
elements, both units, zero service-load components and arithmetic overflow.
Independent review precedes deployment. Where a primary code reference is not
available, record an explicit incomplete check rather than implement from
memory. AISC access does not justify substituting AISC formulas for CSA.

## Remaining Limitations

These checks do not constitute a complete building/member/connection design.
Load combinations, diaphragm/bracing design, connections, bearing/crippling,
composite behavior, vibration, fire and seismic-system qualification remain
outside this change unless separately specified and validated.
