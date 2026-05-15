type EnforcementResult =
  | { allowed: true }
  | { allowed: false; httpStatus: 402; message: string };

export function enforceSubscription(
  status: string | null | undefined,
): EnforcementResult {
  if (status === "active") {
    return { allowed: true };
  }
  return {
    allowed: false,
    httpStatus: 402,
    message: "No active subscription. Please subscribe to run calculations.",
  };
}
