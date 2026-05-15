import { describe, expect, it } from "vitest";
import { validateFactoredDemandInput } from "../../src/domain/demandInputHandling";

describe("validateFactoredDemandInput", () => {
  it("accepts visible factored labels with units", () => {
    const result = validateFactoredDemandInput({
      key: "factoredMoment",
      label: "Factored moment, M_f",
      value: 125,
      unit: "kN-m",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects labels that hide factored status", () => {
    const result = validateFactoredDemandInput({
      key: "moment",
      label: "Moment",
      value: 125,
      unit: "kN-m",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Demand label must visibly include 'Factored'.");
  });

  it("rejects non-positive factored demand values", () => {
    const result = validateFactoredDemandInput({
      key: "factoredShear",
      label: "Factored shear, V_f",
      value: 0,
      unit: "kN",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Demand value must be greater than zero.");
  });
});
