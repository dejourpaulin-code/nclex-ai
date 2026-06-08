import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { difficulty = "mixed" } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: buildPrompt(difficulty) }],
      response_format: { type: "json_object" },
      temperature: 0.75,
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json(data);
  } catch (error) {
    console.error("Clinical questions generate error:", error);
    return NextResponse.json({ error: "Failed to generate case." }, { status: 500 });
  }
}

function buildPrompt(difficulty: string): string {
  const diffGuide =
    difficulty === "easy"
      ? "Straightforward case with clear findings. Each question has one clearly best answer based on foundational nursing knowledge."
      : difficulty === "hard"
      ? "Complex case with subtle, atypical, or competing findings. Questions should require synthesis of pathophysiology, pharmacology, and clinical judgment. Distractors must be clinically plausible."
      : "Moderate complexity. Mix of pattern recognition and applied reasoning. At least one question should require knowing a complication or teaching priority that students often overlook.";

  return `
You are an expert NCLEX-RN educator using Socratic questioning to build clinical reasoning in nursing students.

Generate a rich patient case with exactly 5 clinical thinking questions. Questions should push students beyond memorization into applied clinical reasoning — pathophysiology, teaching priorities, assessment interpretation, and anticipating complications.

Difficulty: ${difficulty}
Guidance: ${diffGuide}

Include exactly these 5 question types (in order):
1. priority_assessment — "Which finding concerns you most and requires immediate attention?"
2. priority_action — "What is your priority nursing action right now?"
3. patient_education — "What is the most important thing to teach this patient before discharge?"
4. physician_notification — "Which finding should be reported to the physician immediately?"
5. complication_watch — "Which complication is this patient at highest risk for?"

Return ONLY valid JSON:
{
  "scenario": "4-5 sentences. Rich, detailed case with patient name, age, sex, diagnosis, presenting symptoms, relevant vitals, key physical exam findings, relevant labs or imaging, and current medications. Include enough clinical detail to answer all 5 questions — do not withhold relevant information. Use varied conditions: COPD, renal failure, liver disease, post-surgical, OB, CHF, stroke, DKA, sepsis, etc.",
  "questions": [
    {
      "question": "string — starts with 'Which', 'What', 'The nurse notes...', or similar. Reads like an NCLEX question.",
      "questionType": "string (one of: priority_assessment, priority_action, patient_education, physician_notification, complication_watch)",
      "choices": [
        "string — clinical action or finding",
        "string — plausible distractor requiring real knowledge to rule out",
        "string — another plausible distractor",
        "string — lower-priority option students might choose out of uncertainty"
      ],
      "correctAnswer": "string (EXACT match to one choice)",
      "explanation": "4-5 sentences. Explain the pathophysiology or clinical reasoning behind the correct answer. Reference the patient's specific findings. Explain why each distractor is wrong or lower priority. Include a teaching point about what this question tests.",
      "clinicalTip": "1-2 sentences: a clinical tip, memory aid, or NCLEX strategy specific to this question type"
    }
  ]
}

CRITICAL: correctAnswer must be an EXACT character-for-character match with one of the 4 choices. NCLEX-style distractors should require real clinical knowledge to eliminate — not obviously wrong.
`.trim();
}
