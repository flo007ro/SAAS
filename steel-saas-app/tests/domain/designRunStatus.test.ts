import { describe, expect, it } from "vitest";
import { canTransitionDesignRunStatus } from "../../src/domain/designRunStatus";

describe("canTransitionDesignRunStatus", () => {
  it("allows the synchronous calculation path", () => {
    expect(canTransitionDesignRunStatus("draft", "calculating")).toBe(true);
    expect(canTransitionDesignRunStatus("calculating", "complete")).toBe(true);
    expect(canTransitionDesignRunStatus("calculating", "failed")).toBe(true);
  });

  it("allows a completed run to be superseded", () => {
    expect(canTransitionDesignRunStatus("complete", "superseded")).toBe(true);
  });

  it("rejects skipping from draft to complete", () => {
    expect(canTransitionDesignRunStatus("draft", "complete")).toBe(false);
  });
});
