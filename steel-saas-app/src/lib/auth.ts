import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { buildJwtClaims, buildSessionUser, type AppUser } from "./authCallbacks";
import { authorizeCredentials } from "./authorizeCredentials";
import { verifyPassword } from "./passwordHash";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials): Promise<AppUser | null> => {
        return authorizeCredentials(credentials as { email?: string; password?: string }, {
          findUserByEmail: async (email) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (prisma as any).user.findUnique({
              where: { email },
              select: { id: true, email: true, organizationId: true, passwordHash: true },
            }),
          checkPassword: verifyPassword,
        });
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
