import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables.");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userId =
      typeof body?.userId === "string" && body.userId.trim()
        ? body.userId.trim()
        : "";

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("user_access")
      .select("id, access_level, plan, status, ends_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          error: "Failed to load access.",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      access: data || null,
    });
  } catch (error) {
    console.error("CURRENT ACCESS ROUTE ERROR:", error);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}