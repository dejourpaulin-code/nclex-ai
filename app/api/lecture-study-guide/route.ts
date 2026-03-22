import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const openai = new OpenAI({
  apiKey: requireEnv("OPENAI_API_KEY"),
});

const supabaseAdmin = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY")
);

type StudyGuideResponse = {
  sessionSummary: string;
  topConcepts: string[];
  examNuggets: {
    concept: string;
    whyItMatters: string;
    howToThinkAboutIt: string;
  }[];
  professorEmphasis: string[];
  topQuestionsToReview: string[];
  quickStudyPlan: string[];
};

const studyGuideSchema = {
  name: "lecture_study_guide",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      sessionSummary: { type: "string" },
      topConcepts: {
        type: "array",
        items: { type: "string" },
      },
      examNuggets: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            concept: { type: "string" },
            whyItMatters: { type: "string" },
            howToThinkAboutIt: { type: "string" },
          },
          required: ["concept", "whyItMatters", "howToThinkAboutIt"],
        },
      },
      professorEmphasis: {
        type: "array",
        items: { type: "string" },
      },
      topQuestionsToReview: {
        type: "array",
        items: { type: "string" },
      },
      quickStudyPlan: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: [
      "sessionSummary",
      "topConcepts",
      "examNuggets",
      "professorEmphasis",
      "topQuestionsToReview",
      "quickStudyPlan",
    ],
  },
} as const;

function cleanStringArray(value: unknown, maxItems = 10): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeStudyGuide(value: unknown, fallbackSummary: string): StudyGuideResponse | null {
  if (!value || typeof value !== "object") return null;

  const obj = value as Partial<StudyGuideResponse>;

  const sessionSummary =
    typeof obj.sessionSummary === "string" && obj.sessionSummary.trim()
      ? obj.sessionSummary.trim()
      : fallbackSummary;

  const examNuggets = Array.isArray(obj.examNuggets)
    ? obj.examNuggets
        .map((item) => {
          if (!item || typeof item !== "object") return null;

          const nugget = item as {
            concept?: unknown;
            whyItMatters?: unknown;
            howToThinkAboutIt?: unknown;
          };

          const concept =
            typeof nugget.concept === "string" ? nugget.concept.trim() : "";
          const whyItMatters =
            typeof nugget.whyItMatters === "string"
              ? nugget.whyItMatters.trim()
              : "";
          const howToThinkAboutIt =
            typeof nugget.howToThinkAboutIt === "string"
              ? nugget.howToThinkAboutIt.trim()
              : "";

          if (!concept) return null;

          return {
            concept,
            whyItMatters,
            howToThinkAboutIt,
          };
        })
        .filter(
          (
            item
          ): item is {
            concept: string;
            whyItMatters: string;
            howToThinkAboutIt: string;
          } => Boolean(item)
        )
        .slice(0, 8)
    : [];

  return {
    sessionSummary,
    topConcepts: cleanStringArray(obj.topConcepts, 8),
    examNuggets,
    professorEmphasis: cleanStringArray(obj.professorEmphasis, 8),
    topQuestionsToReview: cleanStringArray(obj.topQuestionsToReview, 8),
    quickStudyPlan: cleanStringArray(obj.quickStudyPlan, 8),
  };
}

function buildTranscriptText(sessionTranscript: string | null, chunks: { body: string | null }[]) {
  const transcript =
    typeof sessionTranscript === "string" && sessionTranscript.trim()
      ? sessionTranscript.trim()
      : chunks
          .map((chunk) => chunk.body || "")
          .filter(Boolean)
          .join("\n\n")
          .trim();

  return transcript.slice(0, 120_000);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const sessionId = String(body?.sessionId || "").trim();
    const userId = String(body?.userId || "").trim();

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: "sessionId and userId are required." },
        { status: 400 }
      );
    }

    const [sessionRes, chunksRes, eventsRes] = await Promise.all([
      supabaseAdmin
        .from("lecture_sessions")
        .select("id, user_id, title, summary, transcript, created_at")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .maybeSingle(),

      supabaseAdmin
        .from("lecture_transcript_chunks")
        .select("chunk_index, heading, body, started_at_seconds, ended_at_seconds")
        .eq("lecture_session_id", sessionId)
        .order("chunk_index", { ascending: true }),

      supabaseAdmin
        .from("lecture_timeline_events")
        .select(
          "event_type, label, description, confidence, started_at_seconds, ended_at_seconds"
        )
        .eq("lecture_session_id", sessionId)
        .order("started_at_seconds", { ascending: true }),
    ]);

    if (sessionRes.error || !sessionRes.data) {
      return NextResponse.json(
        { error: "Lecture session not found." },
        { status: 404 }
      );
    }

    const session = sessionRes.data;
    const chunks = chunksRes.data || [];
    const events = eventsRes.data || [];

    const transcriptText = buildTranscriptText(session.transcript, chunks);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: studyGuideSchema,
      },
      messages: [
        {
          role: "system",
          content: [
            "You are Lexi, an elite nursing lecture study-guide builder.",
            "Build a high-value study guide from a saved nursing lecture.",
            "Focus on NCLEX relevance, professor emphasis, likely exam traps, and practical review structure.",
            "Be concise, specific, and useful.",
          ].join(" "),
        },
        {
          role: "user",
          content: `
Lecture title:
${session.title || "Untitled lecture"}

Existing session summary:
${session.summary || "No summary yet."}

Transcript:
"""
${transcriptText || "No transcript available."}
"""

Timeline events:
${JSON.stringify(events, null, 2)}

Transcript chunks:
${JSON.stringify(chunks, null, 2)}
          `.trim(),
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content?.trim() || "";

    if (!rawContent) {
      return NextResponse.json(
        { error: "Model returned no text content." },
        { status: 500 }
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON.", raw: rawContent },
        { status: 500 }
      );
    }

    const safeResponse = normalizeStudyGuide(
      parsedJson,
      session.summary || "No study guide summary generated yet."
    );

    if (!safeResponse) {
      return NextResponse.json(
        { error: "Model returned unusable study guide JSON.", raw: rawContent },
        { status: 500 }
      );
    }

    return NextResponse.json(safeResponse);
  } catch (error: any) {
    console.error("lecture-study-guide route crash:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to generate study guide." },
      { status: 500 }
    );
  }
}