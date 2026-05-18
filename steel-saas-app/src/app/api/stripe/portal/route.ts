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
    select: { stripeCustomerId: true },
  });

  if (!org?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found." }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY ?? "");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${appUrl}/projects`,
  });

  return NextResponse.redirect(portalSession.url, 303);
}
