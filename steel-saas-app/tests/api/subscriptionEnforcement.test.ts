import { describe, expect, it } from "vitest";
import { enforceSubscription } from "../../src/lib/subscriptionGuard";

describe("enforceSubscription", () => {
  it("allows an active subscription", () => {
    const result = enforceSubscription("active");
    expect(result.allowed).toBe(true);
  });

  it("blocks a past_due subscription with 402", () => {
    const result = enforceSubscription("past_due");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.httpStatus).toBe(402);
      expect(result.message).toMatch(/subscription/i);
    }
  });

  it("blocks a canceled subscription with 402", () => {
    const result = enforceSubscription("canceled");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.httpStatus).toBe(402);
    }
  });

  it("blocks a missing subscription with 402", () => {
    const result = enforceSubscription(null);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.httpStatus).toBe(402);
    }
  });

  it("blocks an undefined subscription status with 402", () => {
    const result = enforceSubscription(undefined);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.httpStatus).toBe(402);
    }
  });
});
