import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const NOTE_FORMATS: Record<string, string> = {
  DAR: "DAR format: Data (objective and subjective findings), Action (nursing interventions taken), Response (patient response to interventions).",
  SOAP: "SOAP format: Subjective (patient reports), Objective (measurable findings), Assessment (clinical judgment), Plan (next steps).",
  narrative: "Narrative nursing note: chronological, full sentences, describes the clinical event from start to finish.",
  SBAR: "SBAR format for handoff or physician communication: Situation, Background, Assessment, Recommendation.",
};

export async function POST(req: NextRequest) {
  try {
    const { noteType = "DAR", difficulty = "mixed" } = await req.json();
    const format = NOTE_FORMATS[noteType] ?? NOTE_FORMATS.DAR;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: buildPrompt(noteType, format, difficulty) }],
      response_format: { type: "json_object" },
      temperature: 0.75,
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json(data);
  } catch (error) {
    console.error("Charting scenario error:", error);
    return NextResponse.json({ error: "Failed to generate scenario." }, { status: 500 });
  }
}

function buildPrompt(noteType: string, format: string, difficulty: string): string {
  const diffGuide =
    difficulty === "easy"
      ? "Short, simple scenario. One or two clinical events. Straightforward documentation needs."
      : difficulty === "hard"
      ? "Complex scenario with multiple events, abnormal findings, interventions, and a safety-critical element that must be documented (allergy reaction, fall, missed med, etc.)."
      : "Moderate complexity — one clear clinical event with a few findings and interventions to document.";

  return `
You are an expert clinical documentation instructor. Generate a patient scenario for a nursing student to practice writing a ${noteType} note.

Note format the student will write: ${format}
Difficulty: ${difficulty}
Guidance: ${diffGuide}

Return ONLY valid JSON:
{
  "patientContext": {
    "name": "string (first name only)",
    "age": number,
    "sex": "male or female",
    "room": "string (e.g., '214B')",
    "diagnosis": "string",
    "allergies": "string",
    "vitals": {
      "bp": "string",
      "hr": "string",
      "rr": "string",
      "spo2": "string",
      "temp": "string",
      "pain": "string"
    },
    "currentMeds": ["array of 3-4 relevant medications"],
    "assessment": "3-5 sentences of what the nurse observed and assessed this shift — include physical exam findings, patient statements, and 1-3 abnormal findings that are clinically significant",
    "interventions": "2-4 sentences of specific nursing actions taken — medications given with time, position changes, education provided, physician notified, procedures done",
    "patientResponse": "1-3 sentences of how the patient responded to interventions — improvement, no change, or worsening"
  },
  "documentationContext": "1 sentence: what event or situation prompted this note (e.g., 'End-of-shift nursing note', 'New onset chest pain at 1430', 'Patient found on floor at 0630', 'Medication reaction reported at 1015')",
  "keyDocumentationPoints": ["array of 5-7 specific clinical items that a complete ${noteType} note MUST include for this scenario — these will be used as the grading rubric. Be specific: not just 'vital signs' but 'BP 88/54 documented with physician notification'"]
}
`.trim();
}
