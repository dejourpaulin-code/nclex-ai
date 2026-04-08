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
  return transcript.slice(0, 15_000);
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

    // Only send headings/timestamps for chunks — body is already in the transcript
    const chunkOutline = chunks
      .map((c) => `[${c.started_at_seconds ?? 0}s] ${c.heading || "Section"}`)
      .join("\n");

    // Only send label/description for events, skip raw fields
    const eventOutline = events
      .slice(0, 30)
      .map((e) => `[${e.started_at_seconds ?? 0}s] ${e.event_type || ""}: ${e.description || e.label || ""}`)
      .join("\n");

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
          content: `You are Lexi, an elite nursing study guide author. Build a complete, exam-ready study guide from a recorded nursing lecture. This is not a summary — it is a full guide a student can use to prepare for the exact exam their professor will write.

Your guide must:
- Explain every major concept with clinical application
- Identify what the professor emphasized and why it will appear on the test
- Include 5 realistic NCLEX-style practice questions from lecture content
- Include memory hooks (mnemonics, analogies) for hard concepts
- Be comprehensive enough that a student does not need to reread their notes`,
        },
        {
          role: "user",
          content: `Build a full study guide from this nursing lecture.

Lecture title: ${session.title || "Untitled lecture"}

Transcript:
"""
${transcriptText || "No transcript available."}
"""

Section outline:
${chunkOutline || "No sections."}

Professor emphasis signals:
${eventOutline || "None recorded."}

Instructions:
- sessionOverview: 3-5 sentences summarizing what was covered and what students need for the exam.
- majorTopics: 5-10 distinct topics covered.
- conceptBreakdowns: For each major concept — explanation, clinical application, why it matters on NCLEX, memory hook. Aim for 6-10.
- professorEmphasisNarrative: 2-3 paragraphs on what the professor flagged as important and what that means for the exam.
- examNuggets: 6-10 specific testable facts, thresholds, or clinical decision points from the lecture.
- practiceQuestions: Exactly 5 NCLEX-style questions with 4 choices, 1 correct answer (A/B/C/D), and a rationale each.
- studyPlan: 5-7 specific study actions for the next 3 days.
- quickReferenceNotes: 8-12 facts to memorize cold before the exam.`,
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
