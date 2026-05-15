import { describe, expect, it } from "vitest";
import { buildJwtClaims, buildSessionUser } from "../../src/lib/authCallbacks";

describe("authCallbacks", () => {
  it("extracts userId and organizationId from user into JWT claims", () => {
    const claims = buildJwtClaims({
      id: "user_1",
      email: "alice@example.com",
      organizationId: "org_1",
    });
    expect(claims.userId).toBe("user_1");
    expect(claims.organizationId).toBe("org_1");
  });

  it("merges JWT claims onto the session user", () => {
    const user = buildSessionUser(
      { email: "alice@example.com", name: "Alice", image: null },
      { userId: "user_1", organizationId: "org_1" },
    );
    expect(user.userId).toBe("user_1");
    expect(user.organizationId).toBe("org_1");
    expect(user.email).toBe("alice@example.com");
  });
});
