import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode: "give" | "receive" | "isbar" = body.mode ?? "give";
    const difficulty: string = body.difficulty ?? "intermediate";

    const prompt =
      mode === "give"
        ? buildGivePrompt(difficulty)
        : mode === "receive"
        ? buildReceivePrompt(difficulty)
        : buildIsbarPrompt(difficulty);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.85,
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json(data);
  } catch (error) {
    console.error("Handoff scenario error:", error);
    return NextResponse.json({ error: "Failed to generate scenario." }, { status: 500 });
  }
}

function buildGivePrompt(difficulty: string): string {
  return `
Generate a realistic nursing patient chart for a Give Report simulation. A nursing student will read this chart and then speak their SBAR handoff to a charge nurse.

Difficulty: ${difficulty}
- beginner: stable patient, simple diagnosis, 1 safety item
- intermediate: some instability this shift, multiple pending items, 1 critical safety alert
- advanced: complex multi-system, unstable trends, multiple critical items

Return ONLY valid JSON:
{
  "difficulty": "${difficulty}",
  "setting": "string (e.g. Med-Surg, Step-Down, ICU, ED)",
  "context": "string (e.g. End of 12-hour day shift, 7pm to 7am handoff)",
  "patient": {
    "name": "First Last Initial (e.g. Maria G.)",
    "age": number,
    "sex": "male or female",
    "room": "string",
    "code": "Full Code or DNR/DNI",
    "allergies": "string or None known",
    "admittingDiagnosis": "string",
    "daysInHospital": number
  },
  "vitals": {
    "BP": "string",
    "HR": "string",
    "RR": "string",
    "SpO2": "string",
    "Temp": "string",
    "Pain": "string"
  },
  "currentMeds": ["3-6 meds with dose and route"],
  "recentEvents": "2-3 sentence paragraph of what happened this shift including at least one intervention and outcome",
  "pendingItems": ["2-4 pending orders, labs, or consults"],
  "criticalAlert": "ONE specific critical safety finding the student must include in report — something that creates a real patient risk if omitted",
  "safetyNotes": "fall risk, isolation, IV access, restraints, etc",
  "nurseGreeting": "A short, natural, casual line from the incoming charge nurse to open the handoff (e.g. 'Hey, I'm Brianna — your night relief. Ready for report on 412 whenever you are.' Keep it under 20 words and make it sound real.)"
}

Use varied diagnoses across sessions (cardiac, respiratory, neuro, post-op, renal, etc). Make criticalAlert genuinely patient-safety critical.
  `.trim();
}

function buildReceivePrompt(difficulty: string): string {
  return `
Generate a realistic nurse-to-nurse SBAR-style handoff that a student will LISTEN TO and then respond to. The report should sound like a real nurse speaking at end of shift — not perfectly structured, slightly rushed, with some natural tangents.

Difficulty: ${difficulty}
- beginner: clear case, minor disorganization, 1-2 things to catch
- intermediate: moderate complexity, 1-2 safety items mentioned briefly in passing, some filler
- advanced: complex or changing patient, multiple safety items buried in casual speech, poor organization

Return ONLY valid JSON:
{
  "difficulty": "${difficulty}",
  "setting": "string",
  "context": "string (e.g. Night nurse giving 7am report to day nurse)",
  "patientSummary": "One sentence: who is the patient and why are they here",
  "reportText": "string — the full spoken handoff (4-8 paragraphs, natural informal speech, run-on sentences allowed, sounds like a tired nurse — NOT a perfect SBAR template). Must contain at least 1-2 safety-critical pieces of information buried in casual speech.",
  "answerKey": {
    "criticalFindings": ["2-4 most important safety or clinical items buried in the report"],
    "shouldHavePrioritized": ["3-4 items the day nurse should act on first"],
    "essentialFollowUpQuestions": ["3-5 questions a good nurse would ask after receiving this report"],
    "unnecessaryInfo": ["2-3 things the night nurse said that are low clinical value"]
  }
}

The reportText should NOT be written like an SBAR template. Write it like someone actually talking — "So, room 408, she came in two days ago for..." with tangents, incomplete sentences, and critical info mixed with filler.
  `.trim();
}

function buildIsbarPrompt(difficulty: string): string {
  return `
Generate a patient scenario for an ISBAR-to-physician simulation. A nursing student will read the chart, then call and speak their ISBAR to an attending physician.

ISBAR = Identification, Situation, Background, Assessment, Recommendation

Difficulty: ${difficulty}
- beginner: clear clinical concern, obvious recommendation (e.g. new fever, hypotension response needed)
- intermediate: moderately urgent situation requiring clinical judgment (e.g. new dysrhythmia, worsening SpO2)
- advanced: complex or time-sensitive situation, multiple factors to synthesize, physician will ask probing questions

Return ONLY valid JSON:
{
  "difficulty": "${difficulty}",
  "setting": "string (e.g. Med-Surg, Step-Down, ICU)",
  "context": "During your shift, a change in this patient requires you to call the attending physician",
  "patient": {
    "name": "First Last Initial",
    "age": number,
    "sex": "male or female",
    "room": "string",
    "code": "Full Code or DNR/DNI",
    "allergies": "string",
    "admittingDiagnosis": "string"
  },
  "situation": "string — what just happened or changed that requires the call (be specific with vitals or symptoms)",
  "background": "string — relevant history, reason for admission, recent events, current meds",
  "currentVitals": {
    "BP": "string",
    "HR": "string",
    "RR": "string",
    "SpO2": "string",
    "Temp": "string"
  },
  "recentLabs": ["2-4 relevant lab values with units and reference ranges"],
  "relevantMeds": ["3-5 current meds relevant to the situation"],
  "nursingActionsTaken": "string — what the nurse has already done before calling",
  "expectedRecommendation": "string — the clinically appropriate recommendation the student should make to the physician",
  "doctorName": "Dr. [Last Name] (e.g. Dr. Okafor)",
  "doctorGreeting": "string — how the doctor answers the phone (e.g. 'Dr. Okafor speaking.' — keep it under 8 words, realistic)"
}

Use varied urgent but manageable clinical situations: new chest pain, SpO2 decline, rate/rhythm change, hypotension, acute mental status change, sepsis signs, post-op bleeding, etc.
  `.trim();
}
