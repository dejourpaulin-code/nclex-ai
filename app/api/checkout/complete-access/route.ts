import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables.");
}

const stripe = new Stripe(stripeSecretKey);
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const PLAN_CONFIG = {
  "starter-monthly": {
    mode: "subscription",
    accessLevel: "starter",
  },
  "core-monthly": {
    mode: "subscription",
    accessLevel: "core",
  },
  semester: {
    mode: "payment",
    accessLevel: "semester",
  },
  "three-semester": {
    mode: "payment",
    accessLevel: "three-semester",
  },
  "full-program": {
    mode: "payment",
    accessLevel: "full-program",
  },
} as const;

type PlanKey = keyof typeof PLAN_CONFIG;
type AccessLevel = (typeof PLAN_CONFIG)[PlanKey]["accessLevel"];

function normalizePlan(raw: unknown): PlanKey | null {
  if (typeof raw !== "string") return null;

  const value = raw.trim().toLowerCase();

  const aliases: Record<string, PlanKey> = {
    "starter-monthly": "starter-monthly",
    starter: "starter-monthly",
    "starter monthly": "starter-monthly",
    starter_monthly: "starter-monthly",

    "core-monthly": "core-monthly",
    core: "core-monthly",
    "core monthly": "core-monthly",
    core_monthly: "core-monthly",

    semester: "semester",

    "three-semester": "three-semester",
    "three semester": "three-semester",
    three_semester: "three-semester",

    "full-program": "full-program",
    "full program": "full-program",
    full_program: "full-program",
    fullprogram: "full-program",
  };

  return aliases[value] ?? null;
}

function getEndsAt(plan: PlanKey): string | null {
  const now = new Date();

  if (plan === "semester") {
    now.setDate(now.getDate() + 120);
    return now.toISOString();
  }

  if (plan === "three-semester") {
    now.setDate(now.getDate() + 365);
    return now.toISOString();
  }

  if (plan === "full-program") {
    return null;
  }

  return null;
}

async function findGrantBySessionId(sessionId: string) {
  const { data, error } = await supabase
    .from("user_access")
    .select("id, user_id, email, plan, access_level, status, ends_at, stripe_checkout_session_id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function expireOtherActiveAccess(userId: string, keepSessionId: string) {
  const { error } = await supabase
    .from("user_access")
    .update({
      status: "expired",
      ends_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "active")
    .neq("stripe_checkout_session_id", keepSessionId);

  if (error) {
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const sessionId =
      typeof body?.sessionId === "string" ? body.sessionId.trim() : "";

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required." },
        { status: 400 }
      );
    }

    const existingGrant = await findGrantBySessionId(sessionId);

    if (existingGrant) {
      return NextResponse.json({
        success: true,
        alreadyGranted: true,
        userId: existingGrant.user_id,
        email: existingGrant.email,
        plan: existingGrant.plan,
        accessLevel: existingGrant.access_level,
        status: existingGrant.status,
        endsAt: existingGrant.ends_at,
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const userId =
      typeof session.metadata?.userId === "string" && session.metadata.userId.trim()
        ? session.metadata.userId.trim()
        : null;

    const guestEmail =
      typeof session.metadata?.guestEmail === "string" && session.metadata.guestEmail.trim()
        ? session.metadata.guestEmail.trim().toLowerCase()
        : typeof session.customer_details?.email === "string" && session.customer_details.email.trim()
        ? session.customer_details.email.trim().toLowerCase()
        : null;

    const source =
      typeof session.metadata?.source === "string"
        ? session.metadata.source.trim()
        : "checkout";

    const normalizedPlan = normalizePlan(session.metadata?.plan);

    if (!normalizedPlan) {
      return NextResponse.json(
        {
          error: "Invalid or missing plan in checkout metadata.",
          rawPlan: session.metadata?.plan ?? null,
        },
        { status: 400 }
      );
    }

    if (!userId && !guestEmail) {
      return NextResponse.json(
        {
          error: "No userId or guestEmail found in checkout session metadata.",
        },
        { status: 400 }
      );
    }

    const selectedPlan = PLAN_CONFIG[normalizedPlan];

    if (selectedPlan.mode === "payment") {
      if (session.payment_status !== "paid") {
        return NextResponse.json(
          {
            error: "Payment not completed.",
            paymentStatus: session.payment_status,
          },
          { status: 400 }
        );
      }
    }

    if (selectedPlan.mode === "subscription") {
      const subscription =
        typeof session.subscription === "object" && session.subscription
          ? session.subscription
          : null;

      const subscriptionStatus = subscription?.status || null;

      if (!subscriptionStatus || !["active", "trialing"].includes(subscriptionStatus)) {
        return NextResponse.json(
          {
            error: "Subscription is not active.",
            subscriptionStatus,
          },
          { status: 400 }
        );
      }
    }

    const accessLevel: AccessLevel = selectedPlan.accessLevel;
    const endsAt = getEndsAt(normalizedPlan);

    if (userId) {
      await expireOtherActiveAccess(userId, session.id);
    }

    const insertPayload = {
      user_id: userId,
      email: guestEmail,
      plan: normalizedPlan,
      access_level: accessLevel,
      status: "active",
      source,
      stripe_checkout_session_id: session.id,
      stripe_customer_id:
        typeof session.customer === "string" ? session.customer : null,
      stripe_subscription_id:
        typeof session.subscription === "string"
          ? session.subscription
          : typeof session.subscription === "object" && session.subscription?.id
          ? session.subscription.id
          : null,
      ends_at: endsAt,
    };

    const { error: insertError } = await supabase
      .from("user_access")
      .insert(insertPayload);

    if (insertError) {
      console.error("COMPLETE ACCESS INSERT ERROR:", insertError);

      const maybeGrantedAfterRace = await findGrantBySessionId(sessionId);

      if (maybeGrantedAfterRace) {
        return NextResponse.json({
          success: true,
          alreadyGranted: true,
          userId: maybeGrantedAfterRace.user_id,
          email: maybeGrantedAfterRace.email,
          plan: maybeGrantedAfterRace.plan,
          accessLevel: maybeGrantedAfterRace.access_level,
          status: maybeGrantedAfterRace.status,
          endsAt: maybeGrantedAfterRace.ends_at,
        });
      }

      return NextResponse.json(
        {
          error: "Failed to grant access.",
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId,
      email: guestEmail,
      plan: normalizedPlan,
      accessLevel,
      status: "active",
      endsAt,
    });
  } catch (error) {
    console.error("COMPLETE ACCESS ROUTE ERROR:", error);

    return NextResponse.json(
      {
        error: "Something went wrong.",
      },
      { status: 500 }
    );
  }
}