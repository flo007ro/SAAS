import { describe, expect, it } from "vitest";
import { authorizeCredentials, type AuthorizeDeps } from "../../src/lib/authorizeCredentials";

// ── fixtures ─────────────────────────────────────────────────────────────────

const CORRECT_PASSWORD = "hunter2";

const fakeUser = {
  id: "user_1",
  email: "alice@example.com",
  organizationId: "org_1",
  passwordHash: "$2b$12$fake-hash",   // value doesn't matter — checkPassword is mocked
};

const deps: AuthorizeDeps = {
  findUserByEmail: async (email) => email === fakeUser.email ? fakeUser : null,
  checkPassword: async (plain, _hashed) => plain === CORRECT_PASSWORD,
};

// ── tests ─────────────────────────────────────────────────────────────────────

describe("authorizeCredentials", () => {
  it("returns null for an unknown email", async () => {
    const result = await authorizeCredentials(
      { email: "nobody@example.com", password: CORRECT_PASSWORD },
      deps,
    );
    expect(result).toBeNull();
  });

  it("returns null for a wrong password", async () => {
    const result = await authorizeCredentials(
      { email: fakeUser.email, password: "wrong-password" },
      deps,
    );
    expect(result).toBeNull();
  });

  it("returns the user shape for correct credentials", async () => {
    const result = await authorizeCredentials(
      { email: fakeUser.email, password: CORRECT_PASSWORD },
      deps,
    );
    expect(result).toEqual({ id: "user_1", email: "alice@example.com", organizationId: "org_1" });
  });

  it("returns null when credentials are missing or empty", async () => {
    expect(await authorizeCredentials(undefined, deps)).toBeNull();
    expect(await authorizeCredentials({ email: "", password: CORRECT_PASSWORD }, deps)).toBeNull();
    expect(await authorizeCredentials({ email: fakeUser.email }, deps)).toBeNull();
  });

  it("returns null when the user has no passwordHash (account not yet activated)", async () => {
    const depsNoHash: AuthorizeDeps = {
      ...deps,
      findUserByEmail: async () => ({ ...fakeUser, passwordHash: null }),
    };
    const result = await authorizeCredentials(
      { email: fakeUser.email, password: CORRECT_PASSWORD },
      depsNoHash,
    );
    expect(result).toBeNull();
  });
});
