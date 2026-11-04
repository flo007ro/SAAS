import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { isFreeBeta } from "../../../../lib/billingMode";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isFreeBeta()) {
    return NextResponse.json({ error: "Billing is disabled during free testing." }, { status: 403 });
  }

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

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const priceId = process.env.STRIPE_PRICE_ID?.trim();
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  let appUrl: string | undefined;
  try {
    const url = new URL(configuredUrl ?? "");
    if (
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username && !url.password && url.pathname === "/" &&
      !url.search && !url.hash
    ) {
      appUrl = url.origin;
    }
  } catch {
    // An absent or malformed canonical URL must not fall back to the request host.
  }

  if (!secretKey || !priceId || !appUrl) {
    const error = "Subscriptions are temporarily unavailable. Please try again later or contact support.";
    const headers = { "Cache-Control": "no-store" };
    if (request.headers.get("accept")?.includes("text/html")) {
      return new NextResponse(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Subscription unavailable</title></head><body><main><h1>Subscription unavailable</h1><p>${error}</p><a href="/projects">Return to projects</a></main></body></html>`,
        { status: 503, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } },
      );
    }
    return NextResponse.json({ error }, { status: 503, headers });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripe = new (Stripe as any)(secretKey);

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

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/projects?subscribed=1`,
    cancel_url: `${appUrl}/projects`,
    allow_promotion_codes: true,
  });

  return NextResponse.redirect(checkoutSession.url, 303);
}
