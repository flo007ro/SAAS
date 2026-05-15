import type { AppUser } from "./authCallbacks";

type UserRow = {
  id: string;
  email: string;
  organizationId: string;
  passwordHash: string | null;
};

export type AuthorizeDeps = {
  findUserByEmail: (email: string) => Promise<UserRow | null>;
  checkPassword: (plain: string, hashed: string) => Promise<boolean>;
};

export async function authorizeCredentials(
  credentials: { email?: string; password?: string } | undefined,
  deps: AuthorizeDeps,
): Promise<AppUser | null> {
  if (!credentials?.email || !credentials?.password) return null;

  const user = await deps.findUserByEmail(credentials.email);
  if (!user || !user.passwordHash) return null;

  const valid = await deps.checkPassword(credentials.password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, email: user.email, organizationId: user.organizationId };
}
