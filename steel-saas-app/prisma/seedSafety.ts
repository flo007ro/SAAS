export function assertDevelopmentSeed(environment: Readonly<Record<string, string | undefined>>): void {
  if (environment.NODE_ENV === "production" ||
      environment.VERCEL_ENV === "production" ||
      environment.VERCEL_TARGET_ENV === "production") {
    throw new Error("Demo seeding is disabled in production.");
  }
  if (environment.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Set ALLOW_DEMO_SEED=true only for a disposable development database. This seed creates a publicly known demo password and activates a demo subscription.");
  }
}
