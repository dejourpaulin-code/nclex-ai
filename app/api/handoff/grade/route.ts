import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type ConvMessage = { role: "nurse" | "doctor" | "student"; text: string };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, scenario, conversationHistory } = body;

    if (!mode || !scenario || !Array.isArray(conversationHistory) || conversationHistory.length === 0) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const prompt =
      mode === "give"
        ? buildGiveGradingPrompt(scenario, conversationHistory)
        : mode === "receive"
        ? buildReceiveGradingPrompt(scenario, conversationHistory)
        : buildIsbarGradingPrompt(scenario, conversationHistory);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json(data);
  } catch (error) {
    console.error("Handoff grade error:", error);
    return NextResponse.json({ error: "Failed to grade." }, { status: 500 });
  }
}

function formatHistory(history: ConvMessage[]): string {
  return history
    .map((m) => `[${m.role.toUpperCase()}]: ${m.text}`)
    .join("\n\n");
}

function buildGiveGradingPrompt(scenario: unknown, history: ConvMessage[]): string {
  return `
You are an expert clinical nursing educator grading a student's nurse-to-nurse handoff interaction.

PATIENT CHART:
${JSON.stringify(scenario, null, 2)}

FULL CONVERSATION (what was actually said):
${formatHistory(history)}

Grade the student's performance across the full interaction. Return ONLY valid JSON:
{
  "overallScore": number (0-100),
  "grade": "A, B, C, D, or F",
  "dimensions": {
    "keyFacts": {
      "score": number (0-25),
      "max": 25,
      "feedback": "2-3 sentences: which key facts did they include vs miss across all their turns (patient ID, diagnosis, vitals, meds, recent events, pending items)"
    },
    "organization": {
      "score": number (0-20),
      "max": 20,
      "feedback": "2-3 sentences: SBAR structure, logical flow — could the nurse follow their report?"
    },
    "safetyCritical": {
      "score": number (0-25),
      "max": 25,
      "feedback": "2-3 sentences: did they mention the criticalAlert and safety notes? If missed, say it directly and why it matters."
    },
    "responseToQuestions": {
      "score": number (0-15),
      "max": 15,
      "feedback": "1-2 sentences: how well did they answer the nurse's follow-up questions? Confident, complete, correct?"
    },
    "clinicalTone": {
      "score": number (0-15),
      "max": 15,
      "feedback": "1-2 sentences: did they sound like a prepared nurse or a panicked student? Confident, organized, professional?"
    }
  },
  "criticalMisses": ["array of 1-4 most important omissions — lead with safety items"],
  "strengths": ["array of 1-3 specific things they did well"],
  "coachingNote": "2-3 sentences written like a clinical preceptor. What to improve and why it matters at the bedside.",
  "modelSnippet": "2-4 sentences showing how the critical safety section should have sounded in their report"
}

Grading: 90-100=A, 80-89=B, 70-79=C, 60-69=D, <60=F. Missing the criticalAlert = safetyCritical ≤ 10/25.
  `.trim();
}

function buildReceiveGradingPrompt(scenario: unknown, history: ConvMessage[]): string {
  return `
You are an expert clinical nursing educator grading a student who received a nurse-to-nurse handoff and then interacted with the nurse.

SCENARIO (includes the answerKey):
${JSON.stringify(scenario, null, 2)}

FULL CONVERSATION:
${formatHistory(history)}

Grade the student's interaction. Return ONLY valid JSON:
{
  "overallScore": number (0-100),
  "grade": "A, B, C, D, or F",
  "dimensions": {
    "criticalCapture": {
      "score": number (0-30),
      "max": 30,
      "feedback": "2-3 sentences: which critical findings did they demonstrate they caught? What did they miss from answerKey.criticalFindings?"
    },
    "followUpQuestions": {
      "score": number (0-30),
      "max": 30,
      "feedback": "2-3 sentences: what questions did they ask the nurse? Were they the right questions? Compare to answerKey.essentialFollowUpQuestions."
    },
    "prioritization": {
      "score": number (0-25),
      "max": 25,
      "feedback": "2-3 sentences: did their questions and responses reflect the right clinical priorities? Compare to answerKey.shouldHavePrioritized."
    },
    "signalToNoise": {
      "score": number (0-15),
      "max": 15,
      "feedback": "1-2 sentences: did they focus on high-value info or get distracted by answerKey.unnecessaryInfo?"
    }
  },
  "criticalMisses": ["items from answerKey.criticalFindings they showed no awareness of"],
  "correctlyCaptured": ["specific things they demonstrated they understood from the report"],
  "questionsShouldHaveAsked": ["important follow-up questions from answerKey they never asked"],
  "coachingNote": "2-3 sentences: what a confident nurse does when receiving report, and what this student should practice.",
  "modelPriorities": ["top 3-4 things the incoming nurse should do first for this patient"]
}

Grading: 90-100=A, 80-89=B, 70-79=C, 60-69=D, <60=F.
  `.trim();
}

function buildIsbarGradingPrompt(scenario: unknown, history: ConvMessage[]): string {
  return `
You are an expert clinical nursing educator grading a nursing student's ISBAR physician call.

PATIENT SCENARIO:
${JSON.stringify(scenario, null, 2)}

FULL CONVERSATION:
${formatHistory(history)}

Grade the student's ISBAR call and interaction with the physician. Return ONLY valid JSON:
{
  "overallScore": number (0-100),
  "grade": "A, B, C, D, or F",
  "dimensions": {
    "identification": {
      "score": number (0-15),
      "max": 15,
      "feedback": "1-2 sentences: did they identify themselves (name, unit), the patient, and room number?"
    },
    "situation": {
      "score": number (0-20),
      "max": 20,
      "feedback": "2 sentences: did they clearly state what is happening RIGHT NOW — the urgent finding, with specific data?"
    },
    "background": {
      "score": number (0-15),
      "max": 15,
      "feedback": "1-2 sentences: did they give relevant history, admission reason, meds, and recent context without overloading the physician?"
    },
    "assessment": {
      "score": number (0-20),
      "max": 20,
      "feedback": "2 sentences: did they give their clinical assessment — what they THINK is happening? This is the nurse's judgment, not just data."
    },
    "recommendation": {
      "score": number (0-20),
      "max": 20,
      "feedback": "2 sentences: did they make a clear recommendation — what they need from the physician? Compare to scenario.expectedRecommendation."
    },
    "responseToPhysician": {
      "score": number (0-10),
      "max": 10,
      "feedback": "1-2 sentences: how confidently and accurately did they respond to the physician's questions?"
    }
  },
  "criticalMisses": ["array of most important missing ISBAR elements — especially missing assessment or recommendation"],
  "strengths": ["array of 1-3 specific things they did well"],
  "coachingNote": "2-3 sentences written like a clinical preceptor. What separates a confident ISBAR from a shaky one.",
  "modelIsbarSnippet": "A 4-6 sentence example showing how the Situation + Assessment + Recommendation should have sounded for this specific patient"
}

Grading: 90-100=A, 80-89=B, 70-79=C, 60-69=D, <60=F. No assessment or recommendation = major deduction.
  `.trim();
}
