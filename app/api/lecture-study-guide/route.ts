import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const openai = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });

const supabaseAdmin = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY")
);

type ExamQuestion = {
  question: string;
  choices: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
  rationale: string;
};

type ConceptBreakdown = {
  concept: string;
  explanation: string;
  clinicalApplication: string;
  whyItMatters: string;
  memoryHook: string;
};

type StudyGuideResponse = {
  lectureTitle: string;
  sessionOverview: string;
  majorTopics: string[];
  conceptBreakdowns: ConceptBreakdown[];
  professorEmphasisNarrative: string;
  examNuggets: { point: string; whyTestable: string }[];
  practiceQuestions: ExamQuestion[];
  studyPlan: string[];
  quickReferenceNotes: string[];
};

const studyGuideSchema = {
  name: "lecture_study_guide_v2",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      lectureTitle: { type: "string" },
      sessionOverview: { type: "string" },
      majorTopics: { type: "array", items: { type: "string" } },
      conceptBreakdowns: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            concept: { type: "string" },
            explanation: { type: "string" },
            clinicalApplication: { type: "string" },
            whyItMatters: { type: "string" },
            memoryHook: { type: "string" },
          },
          required: ["concept", "explanation", "clinicalApplication", "whyItMatters", "memoryHook"],
        },
      },
      professorEmphasisNarrative: { type: "string" },
      examNuggets: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            point: { type: "string" },
            whyTestable: { type: "string" },
          },
          required: ["point", "whyTestable"],
        },
      },
      practiceQuestions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            question: { type: "string" },
            choices: {
              type: "object",
              additionalProperties: false,
              properties: {
                A: { type: "string" },
                B: { type: "string" },
                C: { type: "string" },
                D: { type: "string" },
              },
              required: ["A", "B", "C", "D"],
            },
            correctAnswer: { type: "string" },
            rationale: { type: "string" },
          },
          required: ["question", "choices", "correctAnswer", "rationale"],
        },
      },
      studyPlan: { type: "array", items: { type: "string" } },
      quickReferenceNotes: { type: "array", items: { type: "string" } },
    },
    required: [
      "lectureTitle",
      "sessionOverview",
      "majorTopics",
      "conceptBreakdowns",
      "professorEmphasisNarrative",
      "examNuggets",
      "practiceQuestions",
      "studyPlan",
      "quickReferenceNotes",
    ],
  },
} as const;

function buildTranscriptText(sessionTranscript: string | null, chunks: { body: string | null }[]) {
  const transcript =
    typeof sessionTranscript === "string" && sessionTranscript.trim()
      ? sessionTranscript.trim()
      : chunks.map((c) => c.body || "").filter(Boolean).join("\n\n").trim();
  return transcript.slice(0, 40_000);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId = String(body?.sessionId || "").trim();
    const userId = String(body?.userId || "").trim();

    if (!sessionId || !userId) {
      return NextResponse.json({ error: "sessionId and userId are required." }, { status: 400 });
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
        .select("event_type, label, description, confidence, started_at_seconds, ended_at_seconds")
        .eq("lecture_session_id", sessionId)
        .order("started_at_seconds", { ascending: true }),
    ]);

    if (sessionRes.error || !sessionRes.data) {
      return NextResponse.json({ error: "Lecture session not found." }, { status: 404 });
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
          content: `You are Lexi, an elite nursing study guide author. You are building a complete, detailed, exam-ready study guide from a recorded nursing lecture. This is not a summary — it is a full study guide a student can use to prepare for the exact exam their professor will write.

Your guide must:
- Explain every major concept in detail with clinical application
- Write each concept breakdown as if tutoring a student who is struggling
- Identify exactly what the professor emphasized and why it will appear on the test
- Include 5 realistic NCLEX-style practice questions built directly from lecture content
- Write a specific, actionable study plan for the week
- Include memory hooks (mnemonics, analogies, clinical stories) for hard concepts
- Be comprehensive enough that a student does not need to reread their notes

Be specific, clinical, and thorough. Long, detailed explanations are better than short ones here.`,
        },
        {
          role: "user",
          content: `Build a full study guide from this nursing lecture.

Lecture title: ${session.title || "Untitled lecture"}

Full transcript:
"""
${transcriptText || "No transcript available."}
"""

Timeline events (professor emphasis signals):
${JSON.stringify(events, null, 2)}

Transcript chunks with headings:
${JSON.stringify(chunks, null, 2)}

Instructions:
- sessionOverview: Write 3-5 sentences summarizing what this lecture covered and what students need to know going into the exam.
- majorTopics: List every distinct topic covered (5-10 items).
- conceptBreakdowns: For EACH major concept, write a full breakdown — explanation (2-3 sentences), clinical application (specific patient scenario), why it matters on the NCLEX, and a memory hook. Aim for 6-10 concepts.
- professorEmphasisNarrative: Write 2-3 paragraphs describing what the professor kept coming back to, what they flagged as important, and what that means for the exam.
- examNuggets: List 6-10 specific testable points from this lecture — exact facts, thresholds, clinical decision points the professor mentioned.
- practiceQuestions: Write exactly 5 NCLEX-style questions drawn directly from this lecture's content. Each must have 4 choices, 1 correct answer (A/B/C/D), and a rationale.
- studyPlan: Write 5-7 specific study actions for the next 3 days before the exam.
- quickReferenceNotes: 8-12 bullet-point facts a student should memorize cold before the exam.`,
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content?.trim() || "";
    if (!rawContent) {
      return NextResponse.json({ error: "Model returned no content." }, { status: 500 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return NextResponse.json({ error: "Model returned invalid JSON." }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to generate study guide.";
    console.error("lecture-study-guide error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
