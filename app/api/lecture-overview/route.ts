import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { sessionId, userId } = await req.json();
    if (!sessionId || !userId) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const [sessionRes, chunksRes, eventsRes] = await Promise.all([
      supabase
        .from("lecture_sessions")
        .select("id, title, summary, transcript")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("lecture_transcript_chunks")
        .select("chunk_index, heading, body, started_at_seconds")
        .eq("lecture_session_id", sessionId)
        .order("chunk_index", { ascending: true }),
      supabase
        .from("lecture_timeline_events")
        .select("event_type, label, description, started_at_seconds, confidence")
        .eq("lecture_session_id", sessionId)
        .order("confidence", { ascending: false })
        .limit(15),
    ]);

    if (!sessionRes.data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const session = sessionRes.data;
    const chunks = chunksRes.data || [];
    const events = eventsRes.data || [];

    const transcriptText = (() => {
      const t =
        typeof session.transcript === "string" && session.transcript.trim()
          ? session.transcript.trim()
          : chunks
              .map((c) => c.body || "")
              .filter(Boolean)
              .join("\n\n")
              .trim();
      return t.slice(0, 12000);
    })();

    const emphasisLines = events
      .map((e) => `- ${e.description || e.label || ""}`)
      .filter((l) => l.length > 2)
      .join("\n");

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are Lexi, an AI nursing tutor. Return valid JSON with exactly two keys:
- "summary": a 3-5 sentence paragraph summarizing the lecture's core content in plain, student-friendly language. Cover what was taught and what students need to know for the exam.
- "keyPoints": an array of 5-7 strings. Each string is one short, specific, testable fact or clinical point from the lecture (one sentence max). These should be the most important things a student must remember.`,
        },
        {
          role: "user",
          content: `Lecture title: ${session.title || "Nursing Lecture"}

Transcript:
"""
${transcriptText || "No transcript available."}
"""

Professor emphasis signals:
${emphasisLines || "None recorded."}`,
        },
      ],
    });

    const raw = res.choices[0]?.message?.content || "{}";
    let parsed: { summary?: string; keyPoints?: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    return NextResponse.json({
      summary: parsed.summary || "",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    });
  } catch (err) {
    console.error("lecture-overview error:", err);
    return NextResponse.json({ error: "Failed to generate overview" }, { status: 500 });
  }
}
