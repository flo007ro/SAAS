import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { buildJwtClaims, buildSessionUser, type AppUser } from "./authCallbacks";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (_credentials): Promise<AppUser | null> => {
        // TODO: query User by email, verify passwordHash with verifyPassword()
        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const claims = buildJwtClaims(user as AppUser);
        token.userId = claims.userId;
        token.organizationId = claims.organizationId;
      }
      return token;
    },
    session({ session, token }) {
      session.user = buildSessionUser(session.user, {
        userId: token.userId,
        organizationId: token.organizationId,
      });
      return session;
    },
  },
});
