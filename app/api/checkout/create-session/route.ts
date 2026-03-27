import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
}

const stripe = new Stripe(stripeSecretKey);

const PLAN_CONFIG = {
  "starter-monthly": {
    mode: "subscription",
    priceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    accessLevel: "starter",
  },
  "core-monthly": {
    mode: "subscription",
    priceId: process.env.STRIPE_CORE_MONTHLY_PRICE_ID,
    accessLevel: "core",
  },
  semester: {
    mode: "payment",
    priceId: process.env.STRIPE_SEMESTER_PRICE_ID,
    accessLevel: "semester",
  },
  "three-semester": {
    mode: "payment",
    priceId: process.env.STRIPE_THREE_SEMESTER_PRICE_ID,
    accessLevel: "three-semester",
  },
  "full-program": {
    mode: "payment",
    priceId: process.env.STRIPE_FULL_PROGRAM_PRICE_ID,
    accessLevel: "full-program",
  },
} as const satisfies Record<
  string,
  {
    mode: "subscription" | "payment";
    priceId: string | undefined;
    accessLevel:
      | "starter"
      | "core"
      | "semester"
      | "three-semester"
      | "full-program";
  }
>;

type PlanKey = keyof typeof PLAN_CONFIG;

function isPlanKey(value: string): value is PlanKey {
  return value in PLAN_CONFIG;
}

function getAppUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!rawUrl) {
    return "http://localhost:3000";
  }

  return rawUrl.replace(/\/+$/, "");
}

function normalizeInternalPath(value: unknown) {
  if (typeof value !== "string") return "/checkout";

  const trimmed = value.trim();

  if (!trimmed.startsWith("/")) return "/checkout";
  if (trimmed.startsWith("//")) return "/checkout";

  return trimmed;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim().toLowerCase();

  if (!trimmed || !trimmed.includes("@")) {
    return null;
  }

  return trimmed;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const rawPlan =
      typeof body?.plan === "string" && body.plan.trim()
        ? body.plan.trim()
        : "starter-monthly";

    const source =
      typeof body?.source === "string" && body.source.trim()
        ? body.source.trim()
        : "unknown";

    const userId =
      typeof body?.userId === "string" && body.userId.trim()
        ? body.userId.trim()
        : null;

    const email = normalizeEmail(body?.email);

    const returnTo = normalizeInternalPath(body?.returnTo);

    if (!userId && !email) {
      return NextResponse.json(
        { error: "You must be logged in or provide an email before checkout." },
        { status: 400 }
      );
    }

    if (!isPlanKey(rawPlan)) {
      return NextResponse.json(
        { error: "Invalid plan selected." },
        { status: 400 }
      );
    }

    const selectedPlan = PLAN_CONFIG[rawPlan];

    if (!selectedPlan.priceId) {
      return NextResponse.json(
        { error: `Missing Stripe price ID for plan: ${rawPlan}` },
        { status: 500 }
      );
    }

    const appUrl = getAppUrl();

    const successUrl =
      `${appUrl}/success` +
      `?session_id={CHECKOUT_SESSION_ID}` +
      `&plan=${encodeURIComponent(rawPlan)}` +
      `&source=${encodeURIComponent(source)}` +
      `&returnTo=${encodeURIComponent(returnTo)}`;

    const cancelUrl =
      `${appUrl}/checkout` +
      `?plan=${encodeURIComponent(rawPlan)}` +
      `&source=${encodeURIComponent(source)}` +
      `&returnTo=${encodeURIComponent(returnTo)}`;

    const session = await stripe.checkout.sessions.create({
      mode: selectedPlan.mode,
      payment_method_types: ["card"],
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email || undefined,
      metadata: {
        userId: userId || "",
        email: email || "",
        guestEmail: email || "",
        plan: rawPlan,
        source,
        accessLevel: selectedPlan.accessLevel,
        billingMode: selectedPlan.mode,
        returnTo,
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe checkout session did not return a URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("create-session error:", error);

    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}