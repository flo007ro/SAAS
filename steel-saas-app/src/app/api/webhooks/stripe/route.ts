import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "../../../../lib/prisma";
import { handleStripeWebhook } from "../../../../lib/stripeWebhookHandler";

export async function POST(req: Request) {
  // Lazy-init: avoids Stripe constructor running at build time with no API key
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripeClient = new (Stripe as any)(process.env.STRIPE_SECRET_KEY ?? "");

  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  const result = await handleStripeWebhook(rawBody, signature, {
    constructEvent: (body, sig) =>
      stripeClient.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET ?? "",
      ),

    findOrgByStripeCustomer: async (customerId) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma as any).organization.findFirst({
        where: { stripeCustomerId: customerId },
        select: { id: true },
      }),

    updateSubscriptionStatus: async (orgId, status) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).organization.update({
        where: { id: orgId },
        data: { subscriptionStatus: status },
      });
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  }

  return NextResponse.json({ received: true });
}
