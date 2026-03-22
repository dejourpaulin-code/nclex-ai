import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FEATURE_MATRIX } from "../../../../lib/access";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type AccessLevel = keyof typeof FEATURE_MATRIX;

function normalizeGrantType(value: unknown): AccessLevel | null {
  if (typeof value !== "string") return null;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

  if (normalized in FEATURE_MATRIX) {
    return normalized as AccessLevel;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userId = String(body?.userId || "").trim();
    const grantType = normalizeGrantType(body?.grantType);

    if (!userId || !grantType) {
      return NextResponse.json(
        { error: "Missing userId or invalid grantType." },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("user_access").upsert(
      {
        user_id: userId,
        access_level: grantType,
        plan: grantType,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
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
      accessLevel: grantType,
      features: FEATURE_MATRIX[grantType],
    });
  } catch (error) {
    console.error("ACCESS GRANT ROUTE ERROR:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}