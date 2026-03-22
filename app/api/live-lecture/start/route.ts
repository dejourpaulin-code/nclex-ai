import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const supabaseAdmin = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY")
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userId =
      typeof body?.userId === "string" ? body.userId.trim() : "";

    const title =
      typeof body?.title === "string" && body.title.trim()
        ? body.title.trim()
        : "Live Lecture Session";

    if (!userId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("lecture_sessions")
      .insert({
        user_id: userId,
        title,
        summary: null,
        transcript: null,
        original_filename: null,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Failed to start live lecture session:", error);

      return NextResponse.json(
        { error: "Failed to start live lecture session." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: data.id,
    });
  } catch (error) {
    console.error("live lecture start route error:", error);

    return NextResponse.json(
      { error: "Failed to start live lecture session." },
      { status: 500 }
    );
  }
}