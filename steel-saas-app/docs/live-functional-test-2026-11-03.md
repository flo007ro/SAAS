# Live Functional Test

Target: https://saas-psi-sage.vercel.app

## Verified in browser

- Enabled production BILLING_MODE=free_beta and initiated deployment BHL2EXCV8sbsKQAiQM9fXg5y7Qsx after user verification.
- Created Beauce Design, client Montreal, AISC 360-22, Imperial. Project ID cmw1il3100001lg083ozx5adz.
- Beam sample: W12x40, factored moment 50 kip-ft, shear 10 kip. Saved run cmw1ilt710001kw08nwldbyk0. Displayed capacities 193.1 kip-ft and 96.2 kip.
- Column sample: W12x40, compression 100 kip, KL 120 in. Saved run cmw1inul60003kw08f0j9cptn. Displayed capacity 398 kip and ratio 0.251.
- Base plate sample: W12x40, compression 100 kip, N 18 in, B 16 in, concrete 4 ksi, plate Fy 36 ksi. Saved run cmw1ip0tt0005kw08kj09ht6s. Displayed required thickness 0.70 in and bearing ratio 0.157.

These are functional observations, not independent engineering validation.

## Issues found

- Result pass/no-warning badges conceal unimplemented engineering checks even though calculation detail states limitations. Fix delegated.
- AISC beam/column demand summary labels use CSA notation. Fix delegated.
- Back navigation shows stale project run list until full refresh. Cache invalidation fix delegated.
- Only one AISC section is selectable. Official catalog expansion under investigation.
- PDF download clicked, but downloaded artifact not yet verified. Do not claim PDF workflow passed.

## Outstanding

Metric/AISC, Metric/CSA, Imperial/CSA, brace workflows, negative/invalid inputs, verified PDF download, mobile/canvas checks, and post-fix deployment regression.
