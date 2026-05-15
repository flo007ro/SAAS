import { describe, expect, it } from "vitest";
import { isProtectedPath, shouldBlock } from "../../src/lib/middlewareGuard";

describe("isProtectedPath", () => {
  it("matches /api/design-runs and sub-paths", () => {
    expect(isProtectedPath("/api/design-runs")).toBe(true);
    expect(isProtectedPath("/api/design-runs/run_1")).toBe(true);
  });

  it("does not match auth or other api routes", () => {
    expect(isProtectedPath("/api/auth/signin")).toBe(false);
    expect(isProtectedPath("/api/auth/callback/credentials")).toBe(false);
    expect(isProtectedPath("/projects")).toBe(false);
  });
});

describe("shouldBlock", () => {
  it("blocks unauthenticated requests to protected paths", () => {
    expect(shouldBlock("/api/design-runs", false)).toBe(true);
    expect(shouldBlock("/api/design-runs/run_1", false)).toBe(true);
  });

  it("allows authenticated requests to protected paths", () => {
    expect(shouldBlock("/api/design-runs", true)).toBe(false);
  });

  it("allows unauthenticated requests to public paths", () => {
    expect(shouldBlock("/api/auth/signin", false)).toBe(false);
    expect(shouldBlock("/projects", false)).toBe(false);
  });
});
