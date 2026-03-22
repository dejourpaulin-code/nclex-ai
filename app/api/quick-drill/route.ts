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

type LearningMemoryRow = {
  topic: string;
  strength_score: number | null;
  weakness_score: number | null;
  mastery_estimate: number | null;
};

function extractJson(text: string) {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");

  if (start === -1 || end === -1) {
    throw new Error("No JSON array found in model response.");
  }

  return cleaned.slice(start, end + 1);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId as string | undefined;
    const requestedCount = Number(body.questionCount) || 5;
    const questionCount = Math.max(3, Math.min(requestedCount, 5));

    if (!userId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    const [weakAreasRes, memoryRes] = await Promise.all([
      supabaseAdmin
        .from("user_weak_areas")
        .select("topic, misses, correct")
        .eq("user_id", userId)
        .order("misses", { ascending: false })
        .limit(5),

      supabaseAdmin
        .from("user_learning_memory")
        .select("topic, strength_score, weakness_score, mastery_estimate")
        .eq("user_id", userId)
        .order("weakness_score", { ascending: false })
        .limit(5),
    ]);

    const weakAreas = (weakAreasRes.data || []) as WeakAreaRow[];
    const learningMemory = (memoryRes.data || []) as LearningMemoryRow[];

    const rankedTopics = new Map<
      string,
      {
        topic: string;
        score: number;
      }
    >();

    weakAreas.forEach((row) => {
      const total = row.correct + row.misses;
      const missRate = total === 0 ? 0 : row.misses / total;
      const score = row.misses * 3 + missRate * 10;

      rankedTopics.set(row.topic, {
        topic: row.topic,
        score: (rankedTopics.get(row.topic)?.score || 0) + score,
      });
    });

    learningMemory.forEach((row) => {
      const weakness = row.weakness_score || 0;
      const mastery = row.mastery_estimate || 0;
      const score = weakness * 2 + (100 - mastery) * 0.08;

      rankedTopics.set(row.topic, {
        topic: row.topic,
        score: (rankedTopics.get(row.topic)?.score || 0) + score,
      });
    });

    const sortedTopics = Array.from(rankedTopics.values())
      .sort((a, b) => b.score - a.score)
      .map((item) => item.topic)
      .slice(0, 3);

    const fallbackTopics = ["Fundamentals", "Pharmacology", "Cardiac"];
    const targetTopics = sortedTopics.length > 0 ? sortedTopics : fallbackTopics;

    const prompt = `
You are an expert NCLEX-RN tutor building a short "Quick Drill" for a nursing student.

Generate exactly ${questionCount} original NCLEX-style questions in VALID JSON only.

Purpose:
- This is a fast 3-minute targeted drill
- Focus mostly on these weak topics: ${targetTopics.join(", ")}
- Prioritize the first topic most heavily
- Questions should be concise, clinically realistic, and high-yield
- Difficulty should be medium
- Mix question styles naturally, but keep all answers in standard A/B/C/D multiple choice format
- Include topic on each question
- Include a concise rationale

Return ONLY valid JSON in this exact format:
[
  {
    "topic": "Cardiac",
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
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const rawText = response.output_text;
    const jsonText = extractJson(rawText);
    const parsed = JSON.parse(jsonText);

    return NextResponse.json({
      topics: targetTopics,
      questions: parsed,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate quick drill." },
      { status: 500 }
    );
  }
}