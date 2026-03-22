import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = body.sessionId as string | undefined;
    const userId = body.userId as string | undefined;

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: "Missing sessionId or userId." },
        { status: 400 }
      );
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("lecture_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Lecture session not found." },
        { status: 404 }
      );
    }

    const [chunksRes, eventsRes] = await Promise.all([
      supabaseAdmin
        .from("lecture_transcript_chunks")
        .select("*")
        .eq("session_id", sessionId)
        .order("chunk_index", { ascending: true }),

      supabaseAdmin
        .from("lecture_events")
        .select("*")
        .eq("session_id", sessionId)
        .order("started_at_seconds", { ascending: true }),
    ]);

    return NextResponse.json({
      session,
      transcriptChunks: chunksRes.data || [],
      events: eventsRes.data || [],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load lecture session." },
      { status: 500 }
    );
  }
}