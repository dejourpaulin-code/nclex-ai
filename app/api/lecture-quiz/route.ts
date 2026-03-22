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

function extractJsonArray(text: string) {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  if (firstBracket === -1 || lastBracket === -1) {
    throw new Error("No JSON array found.");
  }

  return cleaned.slice(firstBracket, lastBracket + 1);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const lectureId = body.lectureId as string | undefined;
    const userId = body.userId as string | undefined;
    const questionCount = Math.max(1, Math.min(Number(body.questionCount) || 5, 20));
    const difficulty = (body.difficulty as string) || "Medium";

    if (!lectureId || !userId) {
      return NextResponse.json(
        { error: "Missing lectureId or userId." },
        { status: 400 }
      );
    }

    const { data: lecture, error } = await supabaseAdmin
      .from("lecture_sessions")
      .select("id, title, transcript, summary, key_points, testable_concepts")
      .eq("id", lectureId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !lecture) {
      return NextResponse.json(
        { error: "Lecture not found." },
        { status: 404 }
      );
    }

    const prompt = `
You are Lexi, an adaptive nursing AI tutor and NCLEX question writer.

Create ${questionCount} original NCLEX-style questions from this nursing lecture.

Lecture title:
${lecture.title || "Untitled Lecture"}

Lecture summary:
${lecture.summary || "No summary"}

Key points:
${JSON.stringify(lecture.key_points || [])}

Likely testable concepts:
${JSON.stringify(lecture.testable_concepts || [])}

Transcript:
"""
${lecture.transcript || ""}
"""

Return valid JSON only in this exact format:
[
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
  }
]

Rules:
- Difficulty: ${difficulty}
- Make them clinically realistic
- Only 1 correct answer per question
- Exactly 4 answer choices
- Questions should come from the lecture content
- Prefer NCLEX style when possible
- Return JSON only
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const raw = response.output_text || "";
    const parsed = JSON.parse(extractJsonArray(raw));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate lecture quiz." },
      { status: 500 }
    );
  }
}