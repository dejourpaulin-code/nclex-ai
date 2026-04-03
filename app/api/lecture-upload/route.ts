import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 120;

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

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY")
);

type LectureUploadAIResult = {
  summary: string;
  keyPoints: string[];
  likelyTestableConcepts: string[];
  studyPlan: string[];
  quizQuestions: string[];
};

const lectureUploadSchema = {
  name: "lecture_upload_analysis",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: {
        type: "string",
      },
      keyPoints: {
        type: "array",
        items: { type: "string" },
      },
      likelyTestableConcepts: {
        type: "array",
        items: { type: "string" },
      },
      studyPlan: {
        type: "array",
        items: { type: "string" },
      },
      quizQuestions: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: [
      "summary",
      "keyPoints",
      "likelyTestableConcepts",
      "studyPlan",
      "quizQuestions",
    ],
  },
} as const;

function cleanStringArray(value: unknown, maxItems = 12): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeLectureUploadResult(value: unknown): LectureUploadAIResult | null {
  if (!value || typeof value !== "object") return null;

  const obj = value as Partial<LectureUploadAIResult>;

  if (typeof obj.summary !== "string" || !obj.summary.trim()) {
    return null;
  }

  return {
    summary: obj.summary.trim(),
    keyPoints: cleanStringArray(obj.keyPoints, 10),
    likelyTestableConcepts: cleanStringArray(obj.likelyTestableConcepts, 10),
    studyPlan: cleanStringArray(obj.studyPlan, 10),
    quizQuestions: cleanStringArray(obj.quizQuestions, 10),
  };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const audio = formData.get("audio");
    const userId = String(formData.get("userId") || "").trim();
    const title = String(formData.get("title") || "Lecture Upload Session").trim();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    if (!audio || !(audio instanceof File)) {
      return NextResponse.json({ error: "Missing audio file." }, { status: 400 });
    }

    const arrayBuffer = await audio.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer.length) {
      return NextResponse.json(
        { error: "Uploaded audio file is empty." },
        { status: 400 }
      );
    }

    const audioFile = new File([buffer], audio.name || "lecture-audio.webm", {
      type: audio.type || "audio/webm",
    });

    const transcribePrompt = [
      "This is a recorded nursing classroom lecture.",
      title ? `Lecture title: ${title}.` : "",
      "Use accurate clinical spelling. Clinical vocabulary: tachycardia, bradycardia, dysrhythmia, myocardial infarction, atrial fibrillation, pulmonary embolism, heart failure, hypertension, COPD, pneumonia, anaphylaxis, sepsis, DKA, hypoglycemia, hypothyroidism, hyperthyroidism, pyelonephritis, hepatitis, stroke, TIA, heparin, warfarin, metformin, insulin, digoxin, furosemide, lisinopril, metoprolol, albuterol, morphine, SpO2, CBC, BMP, ABG, SBAR, NPO, PRN, STAT.",
    ].filter(Boolean).join(" ");

    let transcript = "";
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "gpt-4o-transcribe",
        prompt: transcribePrompt,
      });
      transcript = transcription.text?.trim() ?? "";
    } catch (primaryErr) {
      console.warn("gpt-4o-transcribe failed, falling back to whisper-1:", primaryErr);
      const fallback = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        prompt: transcribePrompt,
      });
      transcript = fallback.text?.trim() ?? "";
    }

    if (!transcript) {
      return NextResponse.json(
        { error: "Transcription returned no text." },
        { status: 500 }
      );
    }

    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: lectureUploadSchema,
      },
      messages: [
        {
          role: "system",
          content: [
            "You are helping a nursing student study from a lecture transcript.",
            "Return concise, high-yield nursing-school output.",
            "Focus on NCLEX relevance, likely professor-tested material, and actionable review.",
          ].join(" "),
        },
        {
          role: "user",
          content: transcript,
        },
      ],
    });

    const rawContent = analysisResponse.choices[0]?.message?.content?.trim() || "";

    if (!rawContent) {
      return NextResponse.json(
        { error: "Lecture analysis returned no content." },
        { status: 500 }
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      return NextResponse.json(
        {
          error: "Lecture analysis returned invalid JSON.",
          raw: rawContent,
        },
        { status: 500 }
      );
    }

    const parsed = normalizeLectureUploadResult(parsedJson);

    if (!parsed) {
      return NextResponse.json(
        {
          error: "Lecture analysis JSON was missing required fields.",
          raw: rawContent,
        },
        { status: 500 }
      );
    }

    const sessionInsert = await supabase
      .from("lecture_sessions")
      .insert({
        user_id: userId,
        title,
        summary: parsed.summary,
        transcript,
        original_filename: audio.name || null,
      })
      .select("id")
      .single();

    if (sessionInsert.error || !sessionInsert.data) {
      console.error("LECTURE SESSION INSERT ERROR:", sessionInsert.error);

      return NextResponse.json(
        { error: "Lecture processed, but failed to save session." },
        { status: 500 }
      );
    }

    const lectureSessionId = sessionInsert.data.id;

    const chunkInsert = await supabase
      .from("lecture_transcript_chunks")
      .insert({
        lecture_session_id: lectureSessionId,
        chunk_index: 0,
        started_at_seconds: 0,
        ended_at_seconds: 0,
        heading: title,
        body: transcript,
      })
      .select("id")
      .single();

    if (chunkInsert.error) {
      console.error("LECTURE CHUNK INSERT ERROR:", chunkInsert.error);
    }

    const transcriptChunkId = chunkInsert.data?.id || null;

    const timelineEvents = [
      ...parsed.likelyTestableConcepts.map((item) => ({
        lecture_session_id: lectureSessionId,
        transcript_chunk_id: transcriptChunkId,
        transcript_chunk_index: 0,
        event_type: "exam_nugget",
        label: "Likely Testable Concept",
        description: item,
        confidence: 80,
        started_at_seconds: 0,
        ended_at_seconds: 0,
      })),
      ...parsed.keyPoints.slice(0, 5).map((item) => ({
        lecture_session_id: lectureSessionId,
        transcript_chunk_id: transcriptChunkId,
        transcript_chunk_index: 0,
        event_type: "key_point",
        label: "Key Point",
        description: item,
        confidence: 75,
        started_at_seconds: 0,
        ended_at_seconds: 0,
      })),
    ];

    if (timelineEvents.length > 0) {
      const eventsInsert = await supabase
        .from("lecture_timeline_events")
        .insert(timelineEvents);

      if (eventsInsert.error) {
        console.error("LECTURE EVENTS INSERT ERROR:", eventsInsert.error);
      }
    }

    return NextResponse.json({
      success: true,
      sessionId: lectureSessionId,
      transcript,
      summary: parsed.summary,
      keyPoints: parsed.keyPoints,
      likelyTestableConcepts: parsed.likelyTestableConcepts,
      studyPlan: parsed.studyPlan,
      quizQuestions: parsed.quizQuestions,
    });
  } catch (error) {
    console.error("LECTURE UPLOAD ROUTE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to process lecture upload." },
      { status: 500 }
    );
  }
}