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
    console.error("Priority generate error:", error);
    return NextResponse.json({ error: "Failed to generate scenario." }, { status: 500 });
  }
}

function buildPrompt(difficulty: string): string {
  const diffGuide =
    difficulty === "easy"
      ? "One patient with a clear ABC concern. Correct answers are identifiable with basic clinical knowledge. Distractors are clearly lower priority."
      : difficulty === "hard"
      ? "Complex multi-problem patient. Include delegation, competing priorities, and a subtle but dangerous finding students often miss. Distractors are clinically plausible enough that students may choose them without strong reasoning."
      : "Mix of ABCs, Maslow, and delegation reasoning. One question should have a non-obvious correct answer.";

  return `
You are an expert NCLEX-RN educator. Generate a realistic clinical scenario with exactly 4 prioritization questions testing NCLEX-style clinical judgment.

Difficulty: ${difficulty}
Guidance: ${diffGuide}

NCLEX Prioritization Frameworks:
- ABCs: Airway > Breathing > Circulation — acute physiological threats come first
- Maslow: physiological needs > safety > psychosocial — survival before comfort
- Unstable vs stable: actual problems > potential problems; new/changing symptoms > chronic
- Delegation hierarchy: RN keeps unstable patients, assessment, IV push, teaching, complex judgment. LPN handles stable patients, routine meds, familiar procedures. CNA handles ADLs, basic vitals on stable patients.

Include exactly these 4 question types (one each):
1. First action / immediate priority (framework: ABCs)
2. Most concerning assessment finding (framework: Pattern Recognition)
3. Physician notification — what warrants calling the MD right now (framework: Safety)
4. Delegation or lowest-priority task — what can safely be delegated or wait (framework: Delegation)

Return ONLY valid JSON:
{
  "scenario": "3-4 sentence patient presentation. Include: patient name, age, diagnosis, presenting complaint right now, relevant vitals or labs, and 1-2 abnormal findings. Use varied clinical settings: post-op, CHF exacerbation, DKA, COPD, stroke, OB, pediatric, sepsis, psychiatric, etc.",
  "questions": [
    {
      "question": "string — NCLEX-style question stem. Start with 'The nurse is caring for this patient.' and end with a clear question.",
      "questionType": "string (one of: first_action, concerning_finding, notify_md, delegate_or_wait)",
      "framework": "string (one of: ABCs, Maslow, Safety, Delegation)",
      "choices": [
        "string — nursing action (e.g., 'Administer prescribed supplemental oxygen')",
        "string — plausible distractor — important but not the priority",
        "string — another plausible distractor",
        "string — lowest-priority action students might still choose"
      ],
      "correctAnswer": "string (must EXACTLY match one of the 4 choices)",
      "explanation": "4-5 sentences. Lead with the NCLEX principle. Explain why the correct answer is priority using the framework. Explain why each distractor is wrong or lower priority. Reference specific values from the scenario."
    }
  ]
}

CRITICAL: correctAnswer must be an EXACT character-for-character match with one of the choices. Make choices sound like real nursing actions.
`.trim();
}
