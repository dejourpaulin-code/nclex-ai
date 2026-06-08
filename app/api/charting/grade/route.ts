import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { noteType, patientContext, documentationContext, keyDocumentationPoints, studentNote } = await req.json();

    if (!studentNote?.trim()) {
      return NextResponse.json({ error: "No note provided." }, { status: 400 });
    }
    if (studentNote.trim().length < 20) {
      return NextResponse.json({ error: "Note is too short to grade." }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: buildPrompt(noteType, patientContext, documentationContext, keyDocumentationPoints, studentNote),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.25,
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json(data);
  } catch (error) {
    console.error("Charting grade error:", error);
    return NextResponse.json({ error: "Failed to grade note." }, { status: 500 });
  }
}

function buildPrompt(
  noteType: string,
  patientContext: Record<string, unknown>,
  documentationContext: string,
  keyDocumentationPoints: string[],
  studentNote: string
): string {
  return `
You are an expert clinical documentation instructor and nursing educator grading a student's ${noteType} nursing note.

Documentation context: ${documentationContext}
Patient info: ${JSON.stringify(patientContext, null, 2)}
Required documentation points: ${keyDocumentationPoints.join(" | ")}

STUDENT'S NOTE:
"""
${studentNote}
"""

Grade this note strictly but fairly. Return ONLY valid JSON:
{
  "overallScore": number (0-100),
  "overallGrade": "string (A/B/C/D/F)",
  "summary": "2-3 sentence overall assessment — lead with the biggest strength, then the biggest gap",
  "rubric": {
    "clarity": {
      "score": number (0-20),
      "feedback": "Is the note clear and easy for a nurse or physician to read quickly? Flag vague, confusing, or contradictory phrasing."
    },
    "objectivity": {
      "score": number (0-20),
      "feedback": "Does the note use objective clinical language? Flag subjective opinions, blame, judgment words, or non-clinical language. Example: 'patient was uncooperative' should be 'patient refused...' or 'patient verbalized...'."
    },
    "completeness": {
      "score": number (0-25),
      "feedback": "What required elements are present vs missing? Reference the specific key documentation points."
    },
    "organization": {
      "score": number (0-20),
      "feedback": "Is the note organized in proper ${noteType} format? Is it logical, chronological where applicable, and easy to scan?"
    },
    "legalSafety": {
      "score": number (0-15),
      "feedback": "Any legal documentation risks? Missing time references, vague clinical language that could cause liability, dangerous omissions, or content that should not be in a chart?"
    }
  },
  "strengths": ["array of 1-3 specific things the student did well — be specific, quote phrases from their note"],
  "improvements": ["array of 2-4 specific changes to make, with brief example of how to fix each"],
  "missedItems": ["array of key documentation points the student omitted — empty [] if none"],
  "sampleNote": "A complete, high-quality ${noteType} note for this exact scenario. Write it as a real nurse would document it — clinically precise, objective, organized in proper ${noteType} format, legally safe. This should serve as a learning model."
}

Grading scale: A=90-100 (complete, clear, legally safe), B=80-89 (minor gaps), C=70-79 (missing important elements), D=60-69 (major omissions or safety issues), F=<60 (incomplete or dangerous documentation).
`.trim();
}
