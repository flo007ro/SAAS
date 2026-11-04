import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), org: vi.fn(), projects: vi.fn() }));
vi.mock("../../src/lib/auth", () => ({ auth: mocks.auth, signIn: vi.fn() }));
vi.mock("next-auth", () => ({ AuthError: class extends Error {} }));
vi.mock("../../src/lib/prisma", () => ({ prisma: {
  organization: { findUnique: mocks.org }, project: { findMany: mocks.projects },
} }));
import ProjectsPage from "../../src/app/(app)/projects/page";
import SignUpPage from "../../src/app/signup/page";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { userId: "user_1", organizationId: "org_1" } });
  mocks.projects.mockResolvedValue([]);
  mocks.org.mockResolvedValue({ subscriptionStatus: "none", stripeCustomerId: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("billing UI", () => {
  it.each(["none", "active"])("hides billing controls and paid messaging in free beta for %s", async (status) => {
    vi.stubEnv("BILLING_MODE", "free_beta");
    mocks.org.mockResolvedValue({ subscriptionStatus: status, stripeCustomerId: "cus_existing" });
    const html = renderToStaticMarkup(await ProjectsPage({ searchParams: Promise.resolve({ subscribed: "1" }) }));
    expect(html).toContain("Free testing access");
    expect(html).not.toContain("/api/stripe/");
    expect(html).not.toContain("Subscription active");
    expect(html).not.toContain("subscription is required");
  });

  it("does not advertise testing access for a missing org", async () => {
    vi.stubEnv("BILLING_MODE", "free_beta");
    mocks.org.mockResolvedValue(null);
    const html = renderToStaticMarkup(await ProjectsPage({ searchParams: Promise.resolve({}) }));
    expect(html).not.toContain("Free testing access");
    expect(html).not.toContain("/api/stripe/");
  });

  it("preserves paid subscribe and manage controls", async () => {
    vi.stubEnv("BILLING_MODE", "paid");
    const render = async () => renderToStaticMarkup(await ProjectsPage({ searchParams: Promise.resolve({}) }));
    expect(await render()).toContain("/api/stripe/checkout");
    mocks.org.mockResolvedValue({ subscriptionStatus: "active", stripeCustomerId: "cus_existing" });
    expect(await render()).toContain("/api/stripe/portal");
  });

  it("shows free signup messaging only in explicit free beta", async () => {
    vi.stubEnv("BILLING_MODE", "free_beta");
    const render = async () => renderToStaticMarkup(await SignUpPage({ searchParams: Promise.resolve({}) }));
    const free = await render();
    expect(free).toContain("Free testing access");
    expect(free).not.toContain("subscription is required");
    vi.stubEnv("BILLING_MODE", "paid");
    expect(await render()).toContain("subscription is required");
  });
});
