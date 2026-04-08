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

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    const { sessionId, userId, messages } = await req.json();
    if (!sessionId || !userId || !Array.isArray(messages)) {
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
        .select("event_type, label, description, started_at_seconds")
        .eq("lecture_session_id", sessionId)
        .order("started_at_seconds", { ascending: true })
        .limit(20),
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
      return t.slice(0, 10000);
    })();

    const emphasisLines = events
      .map((e) => `[${e.started_at_seconds ?? 0}s] ${e.event_type || ""}: ${e.description || e.label || ""}`)
      .join("\n");

    const systemPrompt = `You are Lexi, a knowledgeable and friendly AI nursing tutor. The student is reviewing a recorded lecture they attended and can ask you anything about it.

Lecture: "${session.title || "Nursing Lecture"}"

Full transcript:
"""
${transcriptText || "No transcript available."}
"""

Key moments flagged during the lecture:
${emphasisLines || "None recorded."}

Rules:
- Answer questions about this specific lecture using the transcript above as your primary source.
- Be concise but thorough — aim for 2-4 sentences unless the student asks for a detailed explanation.
- If asked about something not in the transcript, answer from your nursing knowledge and note it wasn't explicitly covered in the lecture.
- Use plain language. This is a study conversation, not a textbook.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.slice(-8).map((m: ChatMessage) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "I couldn't generate a response. Try again.";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("lecture-chat error:", err);
    return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
  }
}
