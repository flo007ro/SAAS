import { describe, expect, it } from "vitest";
import { assertDevelopmentSeed } from "../../prisma/seedSafety";

describe("development seed safety", () => {
  it("requires explicit opt-in", () => {
    expect(() => assertDevelopmentSeed({})).toThrow("ALLOW_DEMO_SEED");
  });
  it("allows an explicitly requested development seed", () => {
    expect(() => assertDevelopmentSeed({ ALLOW_DEMO_SEED: "true" })).not.toThrow();
  });
  it.each([
    { NODE_ENV: "production" },
    { VERCEL_ENV: "production" },
    { VERCEL_TARGET_ENV: "production" },
  ])("rejects production even with opt-in: %j", (environment) => {
    expect(() => assertDevelopmentSeed({ ...environment, ALLOW_DEMO_SEED: "true" }))
      .toThrow("production");
  });
});
