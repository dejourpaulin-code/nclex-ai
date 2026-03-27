import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
}

const stripe = new Stripe(stripeSecretKey);

function normalizeInternalPath(value: string | null | undefined) {
  if (!value) return "/dashboard";
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//")) return "/dashboard";
  return value;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId = String(body?.sessionId || "").trim();

    console.log("SESSION DETAILS sessionId:", sessionId);
    console.log(
      "Stripe key mode:",
      stripeSecretKey.startsWith("sk_test_") ? "test" : "live"
    );

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required." },
        { status: 400 }
      );
    }

    if (!sessionId.startsWith("cs_")) {
      return NextResponse.json(
        { error: `Invalid Stripe session ID format: ${sessionId}` },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      source: session.metadata?.source || "unknown",
      plan: session.metadata?.plan || "semester",
      returnTo: normalizeInternalPath(session.metadata?.returnTo),
      amount:
        typeof session.amount_total === "number"
          ? session.amount_total / 100
          : 0,
      currency: session.currency || "usd",
      customerId:
        typeof session.customer === "string" ? session.customer : null,
      customerEmail:
        typeof session.customer_details?.email === "string"
          ? session.customer_details.email
          : typeof session.metadata?.guestEmail === "string" && session.metadata.guestEmail.trim()
          ? session.metadata.guestEmail.trim()
          : typeof session.metadata?.email === "string" && session.metadata.email.trim()
          ? session.metadata.email.trim()
          : null,
    });
  } catch (error: any) {
    console.error("SESSION DETAILS ROUTE ERROR:", {
      message: error?.message,
      type: error?.type,
      code: error?.code,
      statusCode: error?.statusCode,
      raw: error,
    });

    return NextResponse.json(
      {
        error: "Failed to load checkout session details.",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}