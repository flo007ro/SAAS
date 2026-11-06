# Beam Assessment Verification And Remaining Scope

## Implemented Locally

- AISC rolled doubly symmetric W-beam major-axis LRFD flexure: B4 classification,
  F2 yielding/inelastic/elastic LTB, F3-1 noncompact-flange local buckling.
- Separate LTB and governing flexural capacities prevent misattributing local
  buckling failure to LTB. Noncompact/slender webs and slender flanges remain
  unsupported, with no fallback capacity.
- Full-span UDL, simply supported prismatic Euler-Bernoulli deflection, separate
  unfactored dead/live loads and engineer-selected live/total limits, both units.
- Explicit load/restraint assumptions, finite-range guards, unknown restraint
  handling, versioned input/property snapshots, HTML/PDF per-check statuses.
- The simplified legacy shear result is diagnostic only. It cannot establish a
  modern shear pass, so the overall assessment remains partial/review-required.

## Source And Review Evidence

The AISC implementation uses the published 360-22 baseline and official v16.0
worked examples F.1-1B, F.1-2B and F.1-3B. Tests compare plastic, inelastic and
elastic LTB strengths with the published results, allowing documented rounding.
The deflection formula was checked against BCSA publication 55/13, General
Design Data, simply supported beam with full-span uniform load.

The official AISC corrections listing identifies January 23, 2025 and September
23, 2026 specification errata. Both January pages and the September page were
visually inspected through the browser. There are no changes to the supported
B4/F2/F3 provisions. January's F5 and F7 corrections concern unsupported branches;
its second page concerns commentary weld-access/fire figures. September changes
concern other definitions, H/I provisions, appendix units and fire commentary.

- https://www.aisc.org/aisc/publications/revisions-and-errata/
- https://www.aisc.org/media/b2fhqynp/errata_360-22_01232025.pdf
- https://www.aisc.org/media/kgjb33g5/errata_360-22_09232026.pdf
- https://vpn2.modernsteel.com/globalassets/product-files-not-searched/publications/standards/a360-22w.pdf
- https://www.aisc.org/media/kybevlwy/first-semester-design-examples-v160.pdf
- https://www.steelconstruction.info/images/6/65/Handbook_of_Structural_Steelwork_EE_55-13.pdf

Independent code review checked equations, branch boundaries, Mp caps, unit
conversions and unsupported cases. An extreme nonphysical elastic-LTB overflow
was reproduced with a failing regression and fixed by validating intermediates
before applying the plastic-moment cap. PDF checks include schema preservation,
text extraction and separate parser/render inspection. The new form was viewed
at desktop and mobile sizes; the temporary preview route was removed.

This software/code review is not certification by a licensed engineer and does
not replace project-specific engineering examination or verification.

## Still Incomplete

CSA S16-19 classification/LTB require an accessible licensed primary reference
and Canadian section properties. They remain explicitly not checked; AISC rules
are never substituted. Canadian catalog expansion, HSS calculations, cantilevers,
continuous beams, complete shear design and professional validation remain open.
No automatic load combinations, self-weight, camber or composite action are added.

## Live Supported-Release Evidence

Commit `e88188b` reached Vercel Ready. A synthetic W18x50 assessment saved as
`cmw5buj0x0001jr07ub5gutg6` under the existing Beauce Design test project.
Inputs: span 240 in, Lb 120 in, Fy 50 ksi, Cb 1, factored moment 100 kip-ft,
factored shear 20 kip, unfactored dead/live UDL 0.1/0.2 kip/ft, limits L/360
live and L/240 total. Classification, flexure, LTB and deflection were checked;
the overall verdict remained engineering-review-required because shear was not
verified. The saved result reported governing flexural resistance 324.21252
kip-ft, live deflection 0.0310264 in and total deflection 0.0465396 in.
The authenticated PDF endpoint generated a four-page report.

Visual inspection of that real PDF exposed long fingerprint text overflowing
the value column. Printed SHA-256 fingerprints are now grouped into 16-character
chunks for wrapping, with every original character preserved and no change to
the stored input/property provenance. Two focused regressions cover grouping
and unchanged ordinary values; the complete suite passes 999 tests.
