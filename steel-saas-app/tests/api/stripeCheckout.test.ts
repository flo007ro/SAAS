import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), org: vi.fn(), user: vi.fn(), update: vi.fn(),
  customer: vi.fn(), checkout: vi.fn(), stripe: vi.fn(),
}));
vi.mock("../../src/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("../../src/lib/prisma", () => ({ prisma: {
  organization: { findUnique: mocks.org, update: mocks.update },
  user: { findUnique: mocks.user },
} }));
vi.mock("stripe", () => ({ default: mocks.stripe }));
import { POST } from "../../src/app/api/stripe/checkout/route";

const request = (accept = "application/json") => new Request("https://untrusted.example/api/stripe/checkout", {
  method: "POST", headers: { accept },
});
// Invoke through the HTTP handler contract, including the incoming request.
const post = POST as (request: Request) => Promise<Response>;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("BILLING_MODE", "paid");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("STRIPE_PRICE_ID", "price_fixture");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://steel.example/");
  mocks.auth.mockResolvedValue({ user: { userId: "user_1", organizationId: "org_1" } });
  mocks.org.mockResolvedValue({ id: "org_1", name: "Steel", stripeCustomerId: null });
  mocks.user.mockResolvedValue({ email: "user@example.com" });
  mocks.customer.mockResolvedValue({ id: "cus_fixture" });
  mocks.checkout.mockResolvedValue({ url: "https://checkout.stripe.com/fixture" });
  mocks.stripe.mockImplementation(() => ({ customers: { create: mocks.customer }, checkout: { sessions: { create: mocks.checkout } } }));
});
afterEach(() => vi.unstubAllEnvs());

function expectNoBilling() {
  expect(mocks.stripe).not.toHaveBeenCalled();
  expect(mocks.customer).not.toHaveBeenCalled();
  expect(mocks.checkout).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
}

describe("checkout configuration guard", () => {
  it("disables checkout in free beta without constructing Stripe", async () => {
    vi.stubEnv("BILLING_MODE", "free_beta");
    const response = await post(request());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Billing is disabled during free testing." });
    expectNoBilling();
  });

  it("still requires authentication in free beta", async () => {
    vi.stubEnv("BILLING_MODE", "free_beta");
    mocks.auth.mockResolvedValue(null);
    expect((await post(request())).status).toBe(401);
    expectNoBilling();
  });

  it.each(["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID", "NEXT_PUBLIC_APP_URL"])("fails closed when %s is missing or blank", async (key) => {
    for (const value of [undefined, "", "   "]) {
      vi.stubEnv(key, value);
      const response = await post(request());
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "Subscriptions are temporarily unavailable. Please try again later or contact support." });
      expectNoBilling();
    }
  });

  it.each(["not-a-url", "ftp://steel.example", "https://user:pass@steel.example", "https://steel.example/path", "https://steel.example?x=1", "https://steel.example/#fragment"])("rejects invalid canonical URL %s before Stripe", async (url) => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", url);
    expect((await post(request())).status).toBe(503);
    expectNoBilling();
  });

  it("provides a readable browser error without exposing configuration", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", undefined);
    const response = await post(request("text/html,application/xhtml+xml"));
    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("text/html");
    const body = await response.text();
    expect(body).toContain("Subscriptions are temporarily unavailable");
    expect(body).toContain('href="/projects"');
    expect(body).not.toContain("STRIPE_SECRET_KEY");
    expectNoBilling();
  });

  it("preserves authentication before checking configuration", async () => {
    mocks.auth.mockResolvedValue(null);
    vi.stubEnv("STRIPE_SECRET_KEY", undefined);
    expect((await post(request())).status).toBe(401);
    expect(mocks.org).not.toHaveBeenCalled();
    expectNoBilling();
  });

  it.each(["org", "user"] as const)("preserves missing %s checks", async (entity) => {
    mocks[entity].mockResolvedValue(null);
    expect((await post(request())).status).toBe(404);
    expectNoBilling();
  });

  it.each([null, "cus_existing"])("keeps tenant-scoped checkout with customer %s", async (stripeCustomerId) => {
    mocks.org.mockResolvedValue({ id: "org_1", name: "Steel", stripeCustomerId });
    const response = await post(request());
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://checkout.stripe.com/fixture");
    expect(mocks.org).toHaveBeenCalledWith({ where: { id: "org_1" }, select: { id: true, name: true, stripeCustomerId: true } });
    expect(mocks.user).toHaveBeenCalledWith({ where: { id: "user_1" }, select: { email: true } });
    expect(mocks.checkout).toHaveBeenCalledWith({
      customer: stripeCustomerId ?? "cus_fixture", mode: "subscription",
      line_items: [{ price: "price_fixture", quantity: 1 }],
      success_url: "https://steel.example/projects?subscribed=1",
      cancel_url: "https://steel.example/projects", allow_promotion_codes: true,
    });
    if (stripeCustomerId) {
      expect(mocks.customer).not.toHaveBeenCalled();
      expect(mocks.update).not.toHaveBeenCalled();
    } else {
      expect(mocks.customer).toHaveBeenCalledWith({ email: "user@example.com", name: "Steel", metadata: { organizationId: "org_1" } });
      expect(mocks.update).toHaveBeenCalledWith({ where: { id: "org_1" }, data: { stripeCustomerId: "cus_fixture" } });
    }
  });
});
