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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const audio = formData.get("audio") as File | null;
    const userId = formData.get("userId") as string | null;
    const sessionId = formData.get("sessionId") as string | null;

    if (!audio || !userId || !sessionId) {
      return NextResponse.json(
        { error: "Missing audio, userId, or sessionId." },
        { status: 400 }
      );
    }

    const { count } = await supabaseAdmin
      .from("live_lecture_chunks")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("user_id", userId);

    const chunkIndex = (count || 0) + 1;

    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    const audioBlob = new File([audioBuffer], audio.name || "live_chunk.webm", {
      type: audio.type || "audio/webm",
    });

    const transcriptResponse = await client.audio.transcriptions.create({
      file: audioBlob,
      model: "gpt-4o-transcribe",
    });

    const transcript = transcriptResponse.text?.trim();

    if (!transcript) {
      return NextResponse.json(
        { error: "No transcript generated." },
        { status: 500 }
      );
    }

    const prompt = `
You are Lexi, a real-time nursing lecture companion.

A student is in class and uploaded one live lecture chunk.

Transcript chunk:
"""
${transcript}
"""

Return valid JSON only in this exact format:
{
  "keyPoints": ["string", "string", "string"],
  "companionPrompts": [
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
    }
  ],
  "suggestedQuestion": "string"
}

Rules:
- Keep prompts practical and classroom-appropriate
- promptType must be one of:
  question_to_ask, clarify_this, class_contribution, nclex_angle, conversation_starter
- suggestedQuestion should be the single best question to ask the teacher right now
- focus on nursing relevance, clarity, and likely exam value
- return JSON only
`;

    const analysisResponse = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const parsed = JSON.parse(extractJsonObject(analysisResponse.output_text || ""));

    const { data, error } = await supabaseAdmin
      .from("live_lecture_chunks")
      .insert({
        session_id: sessionId,
        user_id: userId,
        chunk_index: chunkIndex,
        original_filename: audio.name,
        transcript,
        key_points: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        companion_prompts: Array.isArray(parsed.companionPrompts)
          ? parsed.companionPrompts
          : [],
        suggested_question: parsed.suggestedQuestion || "",
      })
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Processed chunk but failed to save it." },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to process live lecture chunk." },
      { status: 500 }
    );
  }
}