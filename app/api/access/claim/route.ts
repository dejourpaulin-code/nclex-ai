import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  const value = raw.trim().toLowerCase();
  if (!value || !value.includes("@")) return null;

  return value;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userId =
      typeof body?.userId === "string" && body.userId.trim()
        ? body.userId.trim()
        : null;

    const email = normalizeEmail(body?.email);

    if (!userId || !email) {
      return NextResponse.json(
        { error: "userId and email are required." },
        { status: 400 }
      );
    }

    const { data: rows, error: lookupError } = await supabase
      .from("user_access")
      .select("id, user_id, email, status, access_level, plan, ends_at")
      .eq("email", email)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (lookupError) {
      return NextResponse.json(
        {
          error: "Failed to load access records.",
          details: lookupError.message,
        },
        { status: 500 }
      );
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        success: true,
        claimed: false,
        message: "No active purchased access found for this email.",
      });
    }

    const alreadyOwned = rows.find((row) => row.user_id === userId);
    if (alreadyOwned) {
      return NextResponse.json({
        success: true,
        claimed: false,
        alreadyLinked: true,
        accessLevel: alreadyOwned.access_level,
        plan: alreadyOwned.plan,
        endsAt: alreadyOwned.ends_at,
      });
    }

    const unclaimed = rows.find((row) => !row.user_id);

    if (!unclaimed) {
      return NextResponse.json({
        success: true,
        claimed: false,
        message: "Access exists for this email but is already linked to another account.",
      });
    }

    const { error: updateError } = await supabase
      .from("user_access")
      .update({
        user_id: userId,
      })
      .eq("id", unclaimed.id);

    if (updateError) {
      return NextResponse.json(
        {
          error: "Failed to claim access.",
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      claimed: true,
      accessLevel: unclaimed.access_level,
      plan: unclaimed.plan,
      endsAt: unclaimed.ends_at,
    });
  } catch (error) {
    console.error("CLAIM ACCESS ROUTE ERROR:", error);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}