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
      temperature: 0.7,
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json(data);
  } catch (error) {
    console.error("Med pass generate error:", error);
    return NextResponse.json({ error: "Failed to generate scenario." }, { status: 500 });
  }
}

function buildPrompt(difficulty: string): string {
  const diffGuide =
    difficulty === "easy"
      ? "3-4 medications. Most are safe to give. One clear HOLD based on a vital sign parameter. Use common medications students encounter frequently (metoprolol, lisinopril, furosemide, insulin, aspirin)."
      : difficulty === "hard"
      ? "5-6 medications. Include: at least one allergy conflict or contraindication, one drug interaction concern, two vital sign hold parameters, and one that requires MD notification. Include less familiar meds like anticoagulants, digoxin, electrolyte replacement."
      : "4-5 medications. One safe GIVE, one clear HOLD (vital sign parameter), one ASSESS FIRST (need more information), one MD notification needed. Use a realistic med-surg or step-down patient.";

  return `
You are an expert NCLEX-RN pharmacology educator. Generate a realistic medication administration scenario.

Difficulty: ${difficulty}
Guidance: ${diffGuide}

Decision definitions:
- GIVE: Safe to administer exactly as ordered
- HOLD: Do NOT administer — a specific parameter is met (vital sign threshold, allergy, lab value, etc.)
- ASSESS FIRST: Need to gather more information before administering (check specific vital, ask patient question, review most recent lab)
- NOTIFY MD: The current situation requires physician contact before proceeding — the order may need to be changed or a new order is needed

Return ONLY valid JSON:
{
  "patient": {
    "name": "string (first name only)",
    "age": number,
    "sex": "male or female",
    "room": "string",
    "diagnosis": "string",
    "allergies": "string (list specific allergies with reaction type, or NKDA)",
    "vitals": {
      "bp": "string",
      "hr": "string",
      "rr": "string",
      "spo2": "string",
      "temp": "string"
    },
    "relevantLabs": "string (comma-separated key labs e.g., 'K+ 2.9 mEq/L, Creatinine 2.8 mg/dL, INR 4.2, Blood glucose 48 mg/dL')",
    "clinicalNotes": "2 sentences of relevant context — what's happened this shift, current symptoms, recent events"
  },
  "medications": [
    {
      "name": "string (e.g., 'Metoprolol tartrate 25mg PO')",
      "scheduledTime": "string (e.g., '0900')",
      "indication": "string (one phrase: what this drug treats/does for this patient)",
      "correctDecision": "string (EXACTLY one of: 'GIVE', 'HOLD', 'ASSESS FIRST', 'NOTIFY MD')",
      "holdParameter": "string or null — REQUIRED if HOLD or NOTIFY MD: the exact parameter that triggered this (e.g., 'HR 44 bpm — order states hold for HR < 60'). Null if GIVE or ASSESS FIRST.",
      "reason": "2-3 sentences explaining the correct decision. Reference the patient's specific vitals/labs/allergies. If HOLD or NOTIFY, state the safety risk clearly. If GIVE, confirm why it is safe.",
      "adverseEffect": "string — the single most important adverse effect to monitor after giving this medication",
      "patientEducation": "string — one specific teaching point for this medication relevant to this patient"
    }
  ],
  "clinicalContext": "1 sentence describing this med pass context (e.g., 'Morning med pass on a cardiac step-down unit', '0600 medications for a post-op day 1 patient', 'Evening meds for a newly admitted renal patient')"
}

IMPORTANT: Every HOLD must reference a specific current vital sign or lab value from the patient you generated. Do not create a hold parameter that isn't reflected in the vitals/labs above.
`.trim();
}
