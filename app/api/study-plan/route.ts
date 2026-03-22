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

type WeakAreaRow = {
  topic: string;
  misses: number;
  correct: number;
};

type HistoryRow = {
  topic: string;
  difficulty: string | null;
  is_correct: boolean | null;
  created_at: string;
};

type MemoryRow = {
  topic: string;
  strength_score: number | null;
  weakness_score: number | null;
  mastery_estimate: number | null;
};

function extractJson(text: string) {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object found in model response.");
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId as string | undefined;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    const [weakAreasRes, historyRes, memoryRes] = await Promise.all([
      supabaseAdmin
        .from("user_weak_areas")
        .select("topic, misses, correct")
        .eq("user_id", userId)
        .order("misses", { ascending: false })
        .limit(6),

      supabaseAdmin
        .from("quiz_history")
        .select("topic, difficulty, is_correct, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),

      supabaseAdmin
        .from("user_learning_memory")
        .select("topic, strength_score, weakness_score, mastery_estimate")
        .eq("user_id", userId)
        .limit(10),
    ]);

    const weakAreas = (weakAreasRes.data || []) as WeakAreaRow[];
    const history = (historyRes.data || []) as HistoryRow[];
    const memory = (memoryRes.data || []) as MemoryRow[];

    const totalAnswered = history.length;
    const totalCorrect = history.filter((row) => row.is_correct).length;
    const accuracy =
      totalAnswered === 0 ? 0 : Math.round((totalCorrect / totalAnswered) * 100);

    const topWeakTopics = weakAreas.slice(0, 3).map((row) => row.topic);
    const strongestTopics = [...memory]
      .sort((a, b) => (b.mastery_estimate || 0) - (a.mastery_estimate || 0))
      .slice(0, 2)
      .map((row) => row.topic);

    const prompt = `
You are Lexi, an adaptive nursing AI tutor.

Create a short daily study plan for a nursing student.

Student performance snapshot:
- Total answered: ${totalAnswered}
- Accuracy: ${accuracy}%
- Top weak topics: ${topWeakTopics.join(", ") || "None yet"}
- Stronger topics: ${strongestTopics.join(", ") || "None yet"}

Return valid JSON only in this exact format:
{
  "headline": "string",
  "coachMessage": "string",
  "tasks": [
    "string",
    "string",
    "string"
  ],
  "focusTopic": "string",
  "studyMode": "Tutor Mode" or "Exam Mode",
  "estimatedMinutes": number
}

Rules:
- Keep it practical
- Make it sound like Lexi coaching the student
- If data is low, create a beginner-friendly baseline plan
- Tasks must be actionable, short, and specific
- Estimated minutes should usually be between 10 and 30
- focusTopic should be one topic, not a sentence
- studyMode must be exactly "Tutor Mode" or "Exam Mode"
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const raw = response.output_text || "";
    const jsonText = extractJson(raw);
    const parsed = JSON.parse(jsonText);

    return NextResponse.json({
      headline: parsed.headline || "Today’s Recommended Plan",
      coachMessage:
        parsed.coachMessage ||
        "Let’s focus your energy where it will help the most today.",
      tasks:
        Array.isArray(parsed.tasks) && parsed.tasks.length > 0
          ? parsed.tasks.slice(0, 3)
          : [
              "Run a short targeted quiz.",
              "Review one weak topic with Lexi.",
              "Finish with a confidence-building mixed set.",
            ],
      focusTopic: parsed.focusTopic || topWeakTopics[0] || "General Review",
      studyMode:
        parsed.studyMode === "Exam Mode" ? "Exam Mode" : "Tutor Mode",
      estimatedMinutes:
        typeof parsed.estimatedMinutes === "number"
          ? parsed.estimatedMinutes
          : 15,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to generate study plan." },
      { status: 500 }
    );
  }
}