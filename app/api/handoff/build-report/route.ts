import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.physicalAssessment?.trim() && !body.diagnosis?.trim()) {
      return NextResponse.json({ error: "Please provide at least a diagnosis or physical assessment." }, { status: 400 });
    }

    const prompt = buildPrompt(body);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.35,
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json(data);
  } catch (error) {
    console.error("Build report error:", error);
    return NextResponse.json({ error: "Failed to generate report." }, { status: 500 });
  }
}

function buildPrompt(d: Record<string, string>): string {
  const vitals = [
    d.bp ? `BP ${d.bp}` : null,
    d.hr ? `HR ${d.hr}` : null,
    d.rr ? `RR ${d.rr}` : null,
    d.spo2 ? `SpO2 ${d.spo2}` : null,
    d.temp ? `Temp ${d.temp}` : null,
    d.pain ? `Pain ${d.pain}` : null,
  ].filter(Boolean).join(", ");

  return `
You are Brianna, an experienced charge nurse who is expert at clinical documentation and handoff communication. A nursing student has given you their raw patient data and physical assessment findings. Your job is to transform this raw data into a polished, clinically complete, naturally spoken SBAR handoff report.

RAW PATIENT DATA:
Patient: ${d.patientName || "Unknown patient"}, ${d.age || "—"}-year-old ${d.sex || "patient"}
Room: ${d.room || "—"}
Admitting Diagnosis: ${d.diagnosis || "Not specified"}
Code Status: ${d.codeStatus || "Full Code"}
Allergies: ${d.allergies || "None known"}

Vital Signs: ${vitals || "Not provided"}

Physical Assessment:
${d.physicalAssessment || "Not provided"}

Current Medications:
${d.currentMeds || "Not provided"}

Events / Changes This Shift:
${d.shiftEvents || "Nothing notable documented"}

Pending Items:
${d.pendingItems || "None"}

Safety Notes:
${d.safetyNotes || "None"}

Transform this into a complete handoff report. Return ONLY valid JSON:
{
  "spokenReport": "A complete, natural-sounding SBAR handoff report spoken as Brianna would deliver it verbally at shift change. Should sound like an experienced nurse talking — contractions, slight informality, clinically precise. 6-12 sentences. Lead with patient ID + room + situation. Prioritize abnormal findings and safety items. Include code status and allergies if relevant. End with what the incoming nurse should watch for or do next.",
  "structuredSbar": {
    "situation": "1-2 sentences: patient ID, room, and the current clinical situation",
    "background": "2-3 sentences: reason for admission, relevant history, current meds",
    "assessment": "2-4 sentences: your clinical assessment based on the vitals and physical exam findings — interpret them, don't just list them",
    "recommendation": "1-3 sentences: what the incoming nurse needs to prioritize, monitor, or do"
  },
  "prioritizationNotes": "1-2 sentences: what clinical findings drove the structure and priority order of this report — why certain things were said first",
  "safetyHighlights": ["array of 1-4 items the incoming nurse absolutely cannot miss: critical vitals, allergy conflicts, code status, pending urgent items, safety risks"]
}

Rules:
- NEVER fabricate clinical details not in the provided data
- If vitals are abnormal, call them out explicitly and interpret them (don't just list numbers)
- If allergies are not NKDA, they belong in the report
- If code status is DNR, it belongs early in the report
- Make the spokenReport sound natural and spoken — not like bullet points read aloud
- The Assessment section must reflect clinical thinking, not just transcription
  `.trim();
}
