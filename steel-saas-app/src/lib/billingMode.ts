// Server-side opt-in only. Unknown or missing values retain paid enforcement.
export function isFreeBeta(): boolean {
  return process.env.BILLING_MODE === "free_beta";
}
