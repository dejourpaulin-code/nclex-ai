import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
}

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables.");
}

const stripe = new Stripe(stripeSecretKey);
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing authorization header." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "Missing auth token." },
        { status: 401 }
      );
    }

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { data: access, error: accessError } = await supabase
      .from("user_access")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .not("stripe_customer_id", "is", null)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (accessError) {
      return NextResponse.json(
        { error: "Failed to load billing profile." },
        { status: 500 }
      );
    }

    if (!access?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer found for this account." },
        { status: 404 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: access.stripe_customer_id,
      return_url: `${(appUrl || "http://localhost:3000").replace(/\/+$/, "")}/account`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("create-portal-session error:", error);

    return NextResponse.json(
      { error: "Failed to create Stripe billing portal session." },
      { status: 500 }
    );
  }
}