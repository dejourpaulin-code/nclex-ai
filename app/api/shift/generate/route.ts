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
    console.error("Shift generate error:", error);
    return NextResponse.json({ error: "Failed to generate scenario." }, { status: 500 });
  }
}

function buildPrompt(difficulty: string): string {
  const diffGuide =
    difficulty === "easy"
      ? "One patient is clearly most critical with an obvious ABC threat. The other three are stable. Priority order should be clear to a student who understands ABCs."
      : difficulty === "hard"
      ? "Two or three patients have urgent competing needs. At least one has a subtle but dangerous finding. Delegation requires nuanced scope of practice knowledge. A new admission adds pressure mid-scenario."
      : "One clearly critical patient, one borderline that requires clinical reasoning to recognize, two stable patients. Some delegation nuance.";

  return `
You are an expert NCLEX-RN educator. Generate a shift prioritization scenario with exactly 4 patients for a med-surg or step-down unit.

Difficulty: ${difficulty}
Guidance: ${diffGuide}

Delegation scope of practice:
- RN: Unstable patients, initial assessment, IV push medications, medications requiring clinical judgment, patient teaching, care planning, physician communication, complex procedures
- LPN/LVN: Stable patients with predictable outcomes, routine scheduled medications, routine assessments on familiar patients, wound care (stable), Foley insertion
- CNA/PCT: ADLs (bathing, feeding, ambulation with supervision), basic vital signs on stable patients, I&O monitoring, comfort measures, transport

Return ONLY valid JSON:
{
  "shiftContext": "1 sentence: unit type, time of day, staffing context (e.g., 'Day shift start, med-surg unit, you are the RN assigned to these 4 patients with one LPN and one CNA')",
  "patients": [
    {
      "id": "A",
      "room": "string (e.g., '301')",
      "name": "string (first name only)",
      "age": number,
      "sex": "male or female",
      "diagnosis": "string",
      "report": "2-3 sentences of what the night nurse told you at handoff — situation, key vitals, what's happening right now, anything that needs attention",
      "acuityLevel": "string (one of: CRITICAL, HIGH, MODERATE, STABLE)",
      "acuityReason": "string — 1 sentence: the specific clinical finding that determines this patient's acuity"
    }
  ],
  "questions": [
    {
      "questionType": "priority_order",
      "question": "You are starting your shift. In what order would you see these 4 patients? Rank them from FIRST to LAST.",
      "correctOrder": ["string", "string", "string", "string"],
      "explanation": "4-5 sentences. Explain why the first patient is most urgent (cite specific ABC/safety concern). Explain the reasoning for the middle two (why one is before the other). Explain why the last patient can wait. Reference each patient by name and their specific clinical situation."
    },
    {
      "questionType": "lpn_delegation",
      "question": "You receive a new admission from the ED. Which of these patients can you most safely hand off to the LPN while you complete the admission?",
      "correctAnswer": "string (patient ID letter: A, B, C, or D)",
      "explanation": "3-4 sentences. Explain why this patient meets LPN delegation criteria (stable, predictable, no current acute changes). Explain why each other patient should remain under RN care."
    },
    {
      "questionType": "cna_task",
      "question": "Which task is appropriate to delegate to the CNA?",
      "choices": [
        "string — CNA-appropriate task referencing a specific patient/room",
        "string — RN-only task (assessment or clinical judgment required)",
        "string — RN-only task (medication administration or unstable patient)",
        "string — LPN task (would be scope for LPN but not CNA)"
      ],
      "correctAnswer": "string (EXACT match to one choice)",
      "explanation": "3-4 sentences. State the scope of practice principle. Explain why the correct choice is within CNA scope. Explain why each other task exceeds CNA scope."
    }
  ]
}

IMPORTANT:
- In choices for the CNA task question, replace generic references with actual room numbers and patient names from the 4 patients you generated.
- correctAnswer must EXACTLY match one of the choices character-for-character.
- The acuityLevel of patients should make the priority order logical and teachable.
`.trim();
}
