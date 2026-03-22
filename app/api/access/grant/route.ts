import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAccessConfig } from "../../../lib/access";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userId = String(body?.userId || "").trim();
    const plan = String(body?.plan || "").trim();
    const sessionId = String(body?.sessionId || "").trim();
    const stripeCustomerId =
      typeof body?.stripeCustomerId === "string" && body.stripeCustomerId.trim()
        ? body.stripeCustomerId.trim()
        : null;

    if (!userId || !plan || !sessionId) {
      return NextResponse.json(
        { error: "userId, plan, and sessionId are required." },
        { status: 400 }
      );
    }

    const { accessLevel, endsAt } = getAccessConfig(plan);

    if (accessLevel === "guest") {
      return NextResponse.json(
        { error: "Invalid plan." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    const { error } = await supabase.from("user_access").upsert(
      {
        user_id: userId,
        plan,
        status: "active",
        access_level: accessLevel,
        starts_at: nowIso,
        ends_at: endsAt,
        stripe_customer_id: stripeCustomerId,
        stripe_session_id: sessionId,
        updated_at: nowIso,
      },
      {
        onConflict: "stripe_session_id",
      }
    );

    if (error) {
      console.error("ACCESS GRANT ERROR:", error);
      return NextResponse.json(
        { error: "Failed to grant access." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accessLevel,
      endsAt,
    });
  } catch (error) {
    console.error("ACCESS GRANT ROUTE ERROR:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}