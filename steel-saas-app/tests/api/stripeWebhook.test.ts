import { describe, expect, it } from "vitest";
import {
  handleStripeWebhook,
  mapStripeStatus,
  type StripeWebhookDeps,
} from "../../src/lib/stripeWebhookHandler";

// ── helpers ───────────────────────────────────────────────────────────────────

const CUSTOMER_ID = "cus_test123";
const fakeOrg = { id: "org_1" };

function makeRawEvent(type: string, status: string): string {
  return JSON.stringify({ type, data: { object: { customer: CUSTOMER_ID, status } } });
}

// Default deps: signature always passes, org always found, updates captured
function makeDeps(overrides: Partial<StripeWebhookDeps> = {}): StripeWebhookDeps {
  return {
    constructEvent: (body) => JSON.parse(body),
    findOrgByStripeCustomer: async () => fakeOrg,
    updateSubscriptionStatus: async () => {},
    ...overrides,
  };
}

// ── mapStripeStatus ───────────────────────────────────────────────────────────

describe("mapStripeStatus", () => {
  describe.each(["customer.subscription.created", "customer.subscription.updated"])("%s", (eventType) => {
    it.each([
      ["active", "active"], ["past_due", "past_due"],
      ["canceled", "canceled"], ["unpaid", "canceled"],
      ["incomplete", "canceled"], ["incomplete_expired", "canceled"],
      ["trialing", null], ["unknown", null],
    ])("maps %s to %s", (status, expected) => {
      expect(mapStripeStatus(eventType, status)).toBe(expected);
    });
  });

  it("deleted event always maps to 'canceled' regardless of Stripe status", () => {
    expect(mapStripeStatus("customer.subscription.deleted", "canceled")).toBe("canceled");
    expect(mapStripeStatus("customer.subscription.deleted", "active")).toBe("canceled");
  });

  it("updated event maps Stripe status correctly", () => {
    expect(mapStripeStatus("customer.subscription.updated", "active")).toBe("active");
    expect(mapStripeStatus("customer.subscription.updated", "past_due")).toBe("past_due");
    expect(mapStripeStatus("customer.subscription.updated", "canceled")).toBe("canceled");
    expect(mapStripeStatus("customer.subscription.updated", "unpaid")).toBe("canceled");
  });

  it("updated event with unhandled Stripe status returns null (no-op)", () => {
    expect(mapStripeStatus("customer.subscription.updated", "trialing")).toBeNull();
    expect(mapStripeStatus("customer.subscription.updated", "unknown")).toBeNull();
  });
});

// ── handleStripeWebhook ───────────────────────────────────────────────────────

describe("handleStripeWebhook", () => {
  describe.each(["customer.subscription.created", "customer.subscription.updated"])("%s", (eventType) => {
    it.each(["unpaid", "incomplete", "incomplete_expired"])("revokes active access for %s", async (stripeStatus) => {
      let status = "active";
      const result = await handleStripeWebhook(
        makeRawEvent(eventType, stripeStatus), "valid-sig",
        makeDeps({ updateSubscriptionStatus: async (_orgId, next) => { status = next; } }),
      );
      expect(result).toEqual({ ok: true });
      expect(status).toBe("canceled");
    });

    it("preserves trialing as a no-op", async () => {
      const updates: string[] = [];
      const result = await handleStripeWebhook(
        makeRawEvent(eventType, "trialing"), "valid-sig",
        makeDeps({ updateSubscriptionStatus: async (_orgId, status) => { updates.push(status); } }),
      );
      expect(result).toEqual({ ok: true });
      expect(updates).toEqual([]);
    });
  });
  it("returns 400 when Stripe-Signature header is missing", async () => {
    const result = await handleStripeWebhook("body", null, makeDeps());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(400);
  });

  it("returns 400 when signature verification throws (wrong secret)", async () => {
    const result = await handleStripeWebhook(
      "body",
      "bad-signature",
      makeDeps({
        constructEvent: () => { throw new Error("No signatures found matching the expected signature"); },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(400);
  });

  it("returns 404 when no organisation matches the Stripe customer ID", async () => {
    const result = await handleStripeWebhook(
      makeRawEvent("customer.subscription.created", "active"),
      "valid-sig",
      makeDeps({ findOrgByStripeCustomer: async () => null }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(404);
  });

  it("customer.subscription.created sets status to 'active'", async () => {
    const updates: { orgId: string; status: string }[] = [];
    const result = await handleStripeWebhook(
      makeRawEvent("customer.subscription.created", "active"),
      "valid-sig",
      makeDeps({
        updateSubscriptionStatus: async (orgId, status) => { updates.push({ orgId, status }); },
      }),
    );
    expect(result.ok).toBe(true);
    expect(updates).toEqual([{ orgId: "org_1", status: "active" }]);
  });

  it("customer.subscription.updated maps 'past_due' → 'past_due'", async () => {
    const updates: { orgId: string; status: string }[] = [];
    const result = await handleStripeWebhook(
      makeRawEvent("customer.subscription.updated", "past_due"),
      "valid-sig",
      makeDeps({
        updateSubscriptionStatus: async (orgId, status) => { updates.push({ orgId, status }); },
      }),
    );
    expect(result.ok).toBe(true);
    expect(updates).toEqual([{ orgId: "org_1", status: "past_due" }]);
  });

  it("customer.subscription.updated maps 'unpaid' → 'canceled'", async () => {
    const updates: { orgId: string; status: string }[] = [];
    await handleStripeWebhook(
      makeRawEvent("customer.subscription.updated", "unpaid"),
      "valid-sig",
      makeDeps({
        updateSubscriptionStatus: async (orgId, status) => { updates.push({ orgId, status }); },
      }),
    );
    expect(updates[0]?.status).toBe("canceled");
  });

  it("customer.subscription.deleted sets status to 'canceled'", async () => {
    const updates: { orgId: string; status: string }[] = [];
    const result = await handleStripeWebhook(
      makeRawEvent("customer.subscription.deleted", "active"),
      "valid-sig",
      makeDeps({
        updateSubscriptionStatus: async (orgId, status) => { updates.push({ orgId, status }); },
      }),
    );
    expect(result.ok).toBe(true);
    expect(updates).toEqual([{ orgId: "org_1", status: "canceled" }]);
  });

  it("acknowledges unhandled event types without writing to the DB", async () => {
    const updates: string[] = [];
    const result = await handleStripeWebhook(
      makeRawEvent("payment_intent.succeeded", "active"),
      "valid-sig",
      makeDeps({
        updateSubscriptionStatus: async () => { updates.push("called"); },
      }),
    );
    expect(result.ok).toBe(true);
    expect(updates).toHaveLength(0);
  });

  it("customer.subscription.updated with unhandled Stripe status is a no-op", async () => {
    const updates: string[] = [];
    const result = await handleStripeWebhook(
      makeRawEvent("customer.subscription.updated", "trialing"),
      "valid-sig",
      makeDeps({
        updateSubscriptionStatus: async () => { updates.push("called"); },
      }),
    );
    expect(result.ok).toBe(true);
    expect(updates).toHaveLength(0);
  });
});
