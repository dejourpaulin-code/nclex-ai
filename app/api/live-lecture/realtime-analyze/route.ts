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
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("No JSON object found.");
  }

  return cleaned.slice(start, end + 1);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId as string | undefined;
    const sessionId = body.sessionId as string | undefined;
    const transcript = body.transcript as string | undefined;
    const title = body.title as string | undefined;

    if (!userId || !sessionId || !transcript) {
      return NextResponse.json(
        { error: "Missing userId, sessionId, or transcript." },
        { status: 400 }
      );
    }

    const trimmedTranscript = transcript.trim().slice(-12000);

    const prompt = `
You are Lexi, a real-time nursing lecture companion.

You are listening to a live nursing lecture transcript in progress.

Your job:
- identify the current core concept
- decide whether the teacher has likely shifted into a NEW topic or subtopic
- detect likely exam nuggets
- detect professor emphasis signals
- write one best question the student could ask the teacher right now
- write one safe answer if the student gets cold-called
- write one sharper follow-up to sound more advanced
- write one natural class contribution line
- identify key points
- generate live side-quest prompts

Lecture title:
${title || "Live nursing lecture"}

Transcript:
${trimmedTranscript}

Return valid JSON only in this exact format:
{
  "summary": "string",
  "keyPoints": ["string", "string", "string"],
  "bestQuestion": "string",
  "safeAnswer": "string",
  "sharperFollowUp": "string",
  "classContribution": "string",
  "topicShift": {
    "shiftDetected": true,
    "previousTopic": "string",
    "currentTopic": "string",
    "confidence": 0,
    "reason": "string",
    "examRelevance": "string"
  },
  "examNuggets": [
    {
      "label": "Priority",
      "whyItMatters": "string",
      "studentUse": "string",
      "confidence": 0
    }
  ],
  "professorEmphasis": {
    "detected": true,
    "headline": "string",
    "emphasizedPoint": "string",
    "whyLexiFlaggedIt": "string",
    "studentAction": "string",
    "confidence": 0
  },
  "prompts": [
    {
      "promptType": "question_to_ask",
      "promptText": "string",
      "promptContext": "string"
    },
    {
      "promptType": "clarify_this",
      "promptText": "string",
      "promptContext": "string"
    },
    {
      "promptType": "class_contribution",
      "promptText": "string",
      "promptContext": "string"
    },
    {
      "promptType": "nclex_angle",
      "promptText": "string",
      "promptContext": "string"
    }
  ]
}

Rules:
- keep it practical and student-usable
- make the answer lines sound natural in real class
- avoid sounding robotic
- focus on nursing and testable lecture material
- "shiftDetected" should be true only if the lecture appears to genuinely move into a different concept, section, system, or high-yield subtopic
- confidence must be a number from 0 to 100
- exam nuggets should only be included when there is a real testable signal
- professor emphasis should only be marked detected if the professor appears to repeat, stress, frame as important, or hint that something matters
- professor emphasis headline should be short and strong, like "This sounds important" or "Professor emphasis detected"
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const raw = response.output_text || "";
    const parsed = JSON.parse(extractJsonObject(raw));

    await supabaseAdmin.from("live_lecture_chunks").insert({
      session_id: sessionId,
      chunk_index: 999999,
      original_filename: "live-transcript-window",
      transcript: trimmedTranscript,
      key_points: parsed.keyPoints || [],
      companion_prompts: parsed.prompts || [],
      suggested_question: parsed.bestQuestion || null,
    });

    return NextResponse.json(parsed);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to analyze live lecture transcript." },
      { status: 500 }
    );
  }
}