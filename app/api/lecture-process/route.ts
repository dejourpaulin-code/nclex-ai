import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function extractJsonObject(text: string) {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found.");
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

function chunkTranscript(transcript: string, targetWords = 180) {
  const words = transcript.split(/\s+/).filter(Boolean);
  const chunks: { timestampLabel: string; text: string }[] = [];

  let i = 0;
  let chunkIndex = 1;

  while (i < words.length) {
    const slice = words.slice(i, i + targetWords).join(" ");
    chunks.push({
      timestampLabel: `Chunk ${chunkIndex}`,
      text: slice,
    });
    i += targetWords;
    chunkIndex += 1;
  }

  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("audio") as File | null;
    const userId = formData.get("userId") as string | null;
    const title = (formData.get("title") as string | null) || "Lecture Upload";

    if (!file || !userId) {
      return NextResponse.json(
        { error: "Missing audio file or userId." },
        { status: 400 }
      );
    }

    const audioBuffer = Buffer.from(await file.arrayBuffer());
    const audioBlob = new File([audioBuffer], file.name || "lecture.webm", {
      type: file.type || "audio/webm",
    });

    const transcriptResponse = await client.audio.transcriptions.create({
      file: audioBlob,
      model: "gpt-4o-transcribe",
    });

    const transcript = transcriptResponse.text?.trim();

    if (!transcript) {
      return NextResponse.json(
        { error: "No transcript was generated." },
        { status: 500 }
      );
    }

    const transcriptChunks = chunkTranscript(transcript, 180);

    const analysisPrompt = `
You are Lexi, an adaptive nursing AI tutor.

A nursing student uploaded a lecture recording. Analyze the lecture transcript and return valid JSON only.

Transcript:
"""
${transcript}
"""

Transcript chunks:
${JSON.stringify(transcriptChunks, null, 2)}

Return JSON in this exact structure:
{
  "summary": "string",
  "keyPoints": ["string", "string", "string", "string", "string"],
  "testableConcepts": ["string", "string", "string", "string"],
  "extractedTopics": ["Cardiac", "Pharmacology"],
  "studyPlan": {
    "headline": "string",
    "coachMessage": "string",
    "tasks": ["string", "string", "string"],
    "focusTopic": "string",
    "studyMode": "Tutor Mode",
    "estimatedMinutes": 20
  },
  "flashcards": [
    { "front": "string", "back": "string" },
    { "front": "string", "back": "string" },
    { "front": "string", "back": "string" },
    { "front": "string", "back": "string" },
    { "front": "string", "back": "string" }
  ],
  "lectureCompanion": [
    {
      "promptType": "question_to_ask",
      "promptText": "string",
      "promptContext": "string",
      "timestampLabel": "Chunk 1"
    },
    {
      "promptType": "clarify_this",
      "promptText": "string",
      "promptContext": "string",
      "timestampLabel": "Chunk 2"
    },
    {
      "promptType": "class_contribution",
      "promptText": "string",
      "promptContext": "string",
      "timestampLabel": "Chunk 3"
    },
    {
      "promptType": "nclex_angle",
      "promptText": "string",
      "promptContext": "string",
      "timestampLabel": "Chunk 4"
    }
  ],
  "quiz": [
    {
      "question": "string",
      "choices": {
        "A": "string",
        "B": "string",
        "C": "string",
        "D": "string"
      },
      "correctAnswer": "A",
      "rationale": "string"
    },
    {
      "question": "string",
      "choices": {
        "A": "string",
        "B": "string",
        "C": "string",
        "D": "string"
      },
      "correctAnswer": "B",
      "rationale": "string"
    },
    {
      "question": "string",
      "choices": {
        "A": "string",
        "B": "string",
        "C": "string",
        "D": "string"
      },
      "correctAnswer": "C",
      "rationale": "string"
    }
  ]
}

Rules:
- Make the summary clear and student-friendly
- Key points should be concise and useful
- Testable concepts should focus on likely exam material
- extractedTopics should use broad nursing categories when possible
- Flashcards should be high-yield and concise
- lectureCompanion should feel like real classroom side quests
- promptType should be one of:
  question_to_ask, clarify_this, class_contribution, nclex_angle, conversation_starter
- promptText should be something the student could actually say or ask
- promptContext should briefly explain why it matters
- timestampLabel should reference one of the transcript chunks
- Return JSON only
`;

    const analysisResponse = await client.responses.create({
      model: "gpt-4.1-mini",
      input: analysisPrompt,
    });

    const raw = analysisResponse.output_text || "";
    const parsed = JSON.parse(extractJsonObject(raw));

    const payload = {
      user_id: userId,
      title,
      original_filename: file.name,
      transcript,
      summary: parsed.summary || "",
      key_points: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      testable_concepts: Array.isArray(parsed.testableConcepts)
        ? parsed.testableConcepts
        : [],
      extracted_topics: Array.isArray(parsed.extractedTopics)
        ? parsed.extractedTopics
        : [],
      study_plan: parsed.studyPlan || {},
      flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards : [],
      transcript_chunks: transcriptChunks,
      lecture_companion: Array.isArray(parsed.lectureCompanion)
        ? parsed.lectureCompanion
        : [],
      quiz: Array.isArray(parsed.quiz) ? parsed.quiz : [],
    };

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("lecture_sessions")
      .insert(payload)
      .select("*")
      .single();

    if (insertError || !inserted) {
      console.error(insertError);
      return NextResponse.json(
        { error: "Lecture processed but failed to save session." },
        { status: 500 }
      );
    }

    const companionPrompts = Array.isArray(parsed.lectureCompanion)
      ? parsed.lectureCompanion
      : [];

    if (companionPrompts.length > 0) {
      const rows = companionPrompts.map(
        (item: {
          promptType?: string;
          promptText?: string;
          promptContext?: string;
          timestampLabel?: string;
        }) => ({
          lecture_session_id: inserted.id,
          user_id: userId,
          prompt_type: item.promptType || "question_to_ask",
          prompt_text: item.promptText || "",
          prompt_context: item.promptContext || "",
          timestamp_label: item.timestampLabel || "",
        })
      );

      await supabaseAdmin.from("lecture_companion_prompts").insert(rows);
    }

    return NextResponse.json(inserted);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to process lecture audio." },
      { status: 500 }
    );
  }
}