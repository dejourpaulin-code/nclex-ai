import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userId = body?.userId;
    const sessionId = body?.sessionId;

    if (!userId || !sessionId) {
      return NextResponse.json(
        { error: "Missing userId or sessionId" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("user_access")
      .select("*")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: "Purchase not found." },
        { status: 404 }
      );
    }

    if (data.user_id) {
      return NextResponse.json({
        success: true,
        alreadyClaimed: true,
      });
    }

    const { error: updateError } = await supabase
      .from("user_access")
      .update({
        user_id: userId,
        guest_email: null,
        guest_token: null,
      })
      .eq("stripe_checkout_session_id", sessionId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to claim access." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}