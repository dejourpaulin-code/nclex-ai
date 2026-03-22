import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userId = body.userId as string | undefined;
    const sessionId = body.sessionId as string | undefined;

    if (!userId || !sessionId) {
      return NextResponse.json(
        { error: "Missing userId or sessionId." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("live_lecture_chunks")
      .select("*")
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .order("chunk_index", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load session chunks." },
        { status: 500 }
      );
    }

    return NextResponse.json({ chunks: data || [] });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load live lecture session." },
      { status: 500 }
    );
  }
}