# Free Testing Release

Set the server environment variable `BILLING_MODE=free_beta` in the target Vercel environment and deploy the free-testing code together. Until this variable is set, paid enforcement remains the default.

Authenticated users in existing organizations can create projects, calculate, and download reports without an active subscription. Login and tenant ownership checks remain enforced. Missing organizations remain denied. Checkout and billing portal endpoints reject requests in free-testing mode; subscription controls are hidden.

This setting does not change database subscription statuses or cancel existing Stripe subscriptions.

After deployment, verify a signed-in organization with subscription status `none` sees Free testing access, creates a project, and can reach the calculation/report workflow. Confirm direct billing requests are rejected and unauthenticated or foreign-organization requests remain denied.

To restore paid access later, configure and verify Stripe first, then change BILLING_MODE to paid and redeploy.

Local verification: 239 tests passed, TypeScript passed, and independent review found no release-blocking regression in the changed free-testing surface. Live deployment verification remains outstanding.
