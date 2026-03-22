import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const rawEmail = String(body?.email || "").trim().toLowerCase();
    const source = String(body?.source || "unknown").trim();

    if (!rawEmail) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(rawEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const { data: existingSignup, error: existingError } = await supabase
      .from("waitlist_signups")
      .select("id")
      .eq("email", rawEmail)
      .maybeSingle();

    if (existingError) {
      console.error("WAITLIST EXISTING SIGNUP CHECK ERROR:", existingError);
      return NextResponse.json(
        { error: "Failed to check waitlist status." },
        { status: 500 }
      );
    }

    if (existingSignup) {
      return NextResponse.json({
        success: true,
        alreadyJoined: true,
        message: "You’re already on the waitlist.",
      });
    }

    const { error: insertError } = await supabase
      .from("waitlist_signups")
      .insert({
        email: rawEmail,
        source,
      });

    if (insertError) {
      console.error("WAITLIST INSERT ERROR:", insertError);
      return NextResponse.json(
        { error: "Failed to join waitlist." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyJoined: false,
      message: "You’re on the waitlist.",
    });
  } catch (error) {
    console.error("WAITLIST ROUTE ERROR:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}