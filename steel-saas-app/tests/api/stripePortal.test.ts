import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), org: vi.fn(), stripe: vi.fn(), portal: vi.fn() }));
vi.mock("../../src/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("../../src/lib/prisma", () => ({ prisma: { organization: { findUnique: mocks.org } } }));
vi.mock("stripe", () => ({ default: mocks.stripe }));
import { POST } from "../../src/app/api/stripe/portal/route";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("BILLING_MODE", "paid");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://steel.example");
  mocks.auth.mockResolvedValue({ user: { organizationId: "org_1" } });
  mocks.org.mockResolvedValue({ stripeCustomerId: "cus_fixture" });
  mocks.portal.mockResolvedValue({ url: "https://billing.stripe.com/fixture" });
  mocks.stripe.mockImplementation(() => ({ billingPortal: { sessions: { create: mocks.portal } } }));
});
afterEach(() => vi.unstubAllEnvs());

describe("billing portal modes", () => {
  it("blocks free beta before Stripe even with an existing billing customer", async () => {
    vi.stubEnv("BILLING_MODE", "free_beta");
    const response = await POST();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Billing is disabled during free testing." });
    expect(mocks.stripe).not.toHaveBeenCalled();
    expect(mocks.portal).not.toHaveBeenCalled();
  });

  it("still requires login in free beta", async () => {
    vi.stubEnv("BILLING_MODE", "free_beta");
    mocks.auth.mockResolvedValue(null);
    expect((await POST()).status).toBe(401);
    expect(mocks.stripe).not.toHaveBeenCalled();
  });

  it("preserves paid tenant-scoped portal access", async () => {
    const response = await POST();
    expect(response.status).toBe(303);
    expect(mocks.org).toHaveBeenCalledWith({ where: { id: "org_1" }, select: { stripeCustomerId: true } });
    expect(mocks.portal).toHaveBeenCalledWith({ customer: "cus_fixture", return_url: "https://steel.example/projects" });
  });
});
