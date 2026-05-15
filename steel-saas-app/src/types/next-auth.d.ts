import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    organizationId: string;
  }

  interface Session {
    user: {
      userId: string;
      organizationId: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    organizationId: string;
  }
}
