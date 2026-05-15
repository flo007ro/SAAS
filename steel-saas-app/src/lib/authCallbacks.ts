export type AppUser = {
  id: string;
  email: string;
  organizationId: string;
};

export type JwtClaims = {
  userId: string;
  organizationId: string;
};

export type SessionUserBase = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function buildJwtClaims(user: AppUser): JwtClaims {
  return { userId: user.id, organizationId: user.organizationId };
}

export function buildSessionUser(base: SessionUserBase, claims: JwtClaims) {
  return { ...base, ...claims };
}
