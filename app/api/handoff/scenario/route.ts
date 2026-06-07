import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode: "give" | "receive" = body.mode ?? "give";
    const difficulty: string = body.difficulty ?? "intermediate";

    const prompt =
      mode === "give"
        ? buildGiveScenarioPrompt(difficulty)
        : buildReceiveScenarioPrompt(difficulty);

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

function buildGiveScenarioPrompt(difficulty: string): string {
  return `
You are generating a realistic nursing patient chart for a clinical handoff simulation exercise for nursing students.

Generate a JSON object for a patient chart that a student will use to practice giving nurse-to-nurse SBAR handoff.

Difficulty: ${difficulty}
- beginner: straightforward diagnosis, stable vitals, 1-2 safety items, easy to organize
- intermediate: some instability, multiple pending items, 1 critical safety alert buried in the chart
- advanced: complex multi-system, unstable trends, multiple critical items, prioritization required

Return ONLY valid JSON with this exact structure:
{
  "difficulty": "${difficulty}",
  "setting": "string (e.g. Med-Surg, ICU, Step-Down, ED)",
  "context": "string (e.g. End of 12-hour day shift, 7pm handoff to night nurse)",
  "patient": {
    "name": "First Last Initial (e.g. Maria G.)",
    "age": number,
    "sex": "male or female",
    "room": "string (e.g. 412A)",
    "code": "Full Code or DNR/DNI",
    "allergies": "string or None known",
    "admittingDiagnosis": "string",
    "daysInHospital": number
  },
  "vitals": {
    "BP": "string (e.g. 148/92 mmHg)",
    "HR": "string (e.g. 98 bpm)",
    "RR": "string (e.g. 22 breaths/min)",
    "SpO2": "string (e.g. 91% on 2L NC)",
    "Temp": "string (e.g. 37.8°C / 100.0°F)",
    "Pain": "string (e.g. 3/10 chest tightness)"
  },
  "currentMeds": ["array of 3-6 medication strings with dose and route"],
  "recentEvents": "2-3 sentence paragraph describing what happened this shift — clinical events, interventions, patient response. Include at least one intervention and its outcome.",
  "pendingItems": ["array of 2-4 pending orders, labs, or consults"],
  "criticalAlert": "string — ONE critical safety finding the incoming nurse MUST know (allergy conflict with a pending order, recent vital deterioration trend, DNR/code status conflict, fall that occurred, missed medication, critical lab result). Make it specific and clinically important.",
  "safetyNotes": "string — fall risk score, isolation precautions, restraints, IV access status, etc"
}

Make it clinically realistic, varied in diagnosis (use different conditions: cardiac, respiratory, renal, neuro, post-op, etc), and educationally rich. The criticalAlert must be something that, if omitted in handoff, would create a genuine patient safety risk.
  `.trim();
}

function buildReceiveScenarioPrompt(difficulty: string): string {
  return `
You are generating a realistic nurse-to-nurse handoff report for a clinical simulation exercise where nursing students practice RECEIVING report.

Generate a handoff report that sounds natural (like a real nurse speaking at end of shift) but is intentionally imperfect — it has buried important info, some filler, unclear prioritization — so students have to work to identify what matters.

Difficulty: ${difficulty}
- beginner: clear case, mild disorganization, 1-2 things to catch, obvious follow-up questions
- intermediate: moderate complexity, some safety info mentioned briefly in passing, some unnecessary filler, 2-3 things to catch
- advanced: complex or deteriorating patient, safety items buried, poor organization, multiple things to catch, many follow-up questions needed

Return ONLY valid JSON:
{
  "difficulty": "${difficulty}",
  "setting": "string (e.g. Med-Surg, ICU, Step-Down)",
  "context": "string (e.g. 7am shift change, night nurse giving report to day nurse)",
  "patientSummary": "One sentence: who is this patient and what are they here for",
  "reportText": "string — the full spoken-style handoff (4-8 paragraphs, natural informal speech, some run-ons and tangents, NOT perfectly organized SBAR — sounds like a tired nurse at shift change)",
  "answerKey": {
    "criticalFindings": ["array of 2-4 the most important safety or clinical items that are buried in the report — things the student must flag"],
    "shouldHavePrioritized": ["array of 3-4 items the incoming nurse must act on or monitor first this shift"],
    "essentialFollowUpQuestions": ["array of 3-5 questions the incoming nurse should ask after receiving this report"],
    "unnecessaryInfo": ["array of 2-3 filler items from the report that are low clinical value for the incoming nurse"]
  }
}

The reportText must sound like a real nurse talking — rushed, informal, with tangents about personal things or unrelated details mixed in. Do not make it perfectly structured. Include the critical findings but bury them (e.g., mention an allergy issue in passing, or slip in a worsening lab value at the end of a sentence about something else).
  `.trim();
}
