import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = await (prisma as any).organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, stripeCustomerId: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (prisma as any).user.findUnique({
    where: { id: session.user.userId },
    select: { email: true },
  });

  if (!org || !user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY ?? "");

  let customerId: string = org.stripeCustomerId ?? "";
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: org.name,
      metadata: { organizationId: orgId },
    });
    customerId = customer.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).organization.update({
      where: { id: orgId },
      data: { stripeCustomerId: customerId },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${appUrl}/projects?subscribed=1`,
    cancel_url: `${appUrl}/projects`,
    allow_promotion_codes: true,
  });

  return NextResponse.redirect(checkoutSession.url, 303);
}
