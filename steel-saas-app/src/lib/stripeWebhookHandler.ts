type StripeEventSubset = {
  type: string;
  data: { object: { customer: string; status: string } };
};

export type StripeWebhookDeps = {
  constructEvent: (rawBody: string, sig: string) => StripeEventSubset;
  findOrgByStripeCustomer: (customerId: string) => Promise<{ id: string } | null>;
  updateSubscriptionStatus: (orgId: string, status: string) => Promise<void>;
};

export type WebhookResult =
  | { ok: true }
  | { ok: false; httpStatus: 400 | 404; error: string };

const HANDLED_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

// ── status mapping ────────────────────────────────────────────────────────────

export function mapStripeStatus(eventType: string, stripeStatus: string): string | null {
  if (eventType === "customer.subscription.created") return "active";
  if (eventType === "customer.subscription.deleted") return "canceled";
  // customer.subscription.updated — map Stripe status
  switch (stripeStatus) {
    case "active":    return "active";
    case "past_due":  return "past_due";
    case "canceled":
    case "unpaid":    return "canceled";
    default:          return null; // trialing, incomplete, etc. — no-op
  }
}

// ── handler ───────────────────────────────────────────────────────────────────

export async function handleStripeWebhook(
  rawBody: string,
  signature: string | null,
  deps: StripeWebhookDeps,
): Promise<WebhookResult> {
  if (!signature) {
    return { ok: false, httpStatus: 400, error: "Missing Stripe-Signature header." };
  }

  let event: StripeEventSubset;
  try {
    event = deps.constructEvent(rawBody, signature);
  } catch {
    return { ok: false, httpStatus: 400, error: "Invalid webhook signature." };
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return { ok: true }; // acknowledge without processing
  }

  const customerId = event.data.object.customer;
  const newStatus = mapStripeStatus(event.type, event.data.object.status);

  if (!newStatus) {
    return { ok: true }; // unrecognised Stripe status — no-op
  }

  const org = await deps.findOrgByStripeCustomer(customerId);
  if (!org) {
    return { ok: false, httpStatus: 404, error: `No organisation found for customer ${customerId}.` };
  }

  await deps.updateSubscriptionStatus(org.id, newStatus);
  return { ok: true };
}
