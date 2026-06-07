import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, scenario, studentResponse } = body;

    if (!mode || !scenario || !studentResponse?.trim()) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const prompt =
      mode === "give"
        ? buildGiveGradingPrompt(scenario, studentResponse)
        : buildReceiveGradingPrompt(scenario, studentResponse);

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
    return NextResponse.json({ error: "Failed to grade response." }, { status: 500 });
  }
}

function buildGiveGradingPrompt(scenario: unknown, studentResponse: string): string {
  return `
You are an expert clinical nursing educator grading a nursing student's nurse-to-nurse SBAR handoff report.

PATIENT CHART (the scenario the student was given):
${JSON.stringify(scenario, null, 2)}

STUDENT'S HANDOFF REPORT (what they submitted):
"${studentResponse}"

Grade the student's report on 5 dimensions. Be honest, specific, and educational. Reference actual content from their report. Return ONLY valid JSON:

{
  "overallScore": number (0-100, calculated as sum of dimension scores),
  "grade": "A, B, C, D, or F",
  "dimensions": {
    "keyFacts": {
      "score": number (0-25),
      "max": 25,
      "feedback": "2-3 sentence specific feedback: what key facts they included vs missed (patient ID, diagnosis, vitals, meds, recent events, pending items)"
    },
    "organization": {
      "score": number (0-20),
      "max": 20,
      "feedback": "2-3 sentence feedback on SBAR structure, logical flow, whether the incoming nurse can follow it easily"
    },
    "safetyCritical": {
      "score": number (0-25),
      "max": 25,
      "feedback": "2-3 sentence feedback specifically on whether they mentioned the criticalAlert and safetyNotes. If they missed the critical alert, say so directly and why it matters."
    },
    "conciseness": {
      "score": number (0-15),
      "max": 15,
      "feedback": "1-2 sentence feedback: did they ramble, include low-value info, or was it appropriately focused?"
    },
    "clinicalUsability": {
      "score": number (0-15),
      "max": 15,
      "feedback": "1-2 sentence feedback: could the incoming nurse take over care with this report? What would leave them unprepared?"
    }
  },
  "criticalMisses": ["array of 1-4 most important things omitted from their report — lead with patient safety items"],
  "strengths": ["array of 1-3 things they did well, be specific"],
  "coachingNote": "2-3 sentence clinical coaching message — write it like a preceptor talking to a student. Focus on what matters most to improve and why it matters at the bedside.",
  "modelReportSnippet": "A brief 2-4 sentence example showing how the critical safety section should have sounded. Just that section, not the entire report."
}

Grading guidance:
- Missing the criticalAlert is a major deduction (safetyCritical score ≤ 10/25)
- If the report is completely disorganized but has the key facts, organization gets a low score but keyFacts gets appropriate credit
- If they got everything right, give them an A — don't penalize for stylistic differences
- Grade letter: 90-100=A, 80-89=B, 70-79=C, 60-69=D, below 60=F
  `.trim();
}

function buildReceiveGradingPrompt(scenario: unknown, studentResponse: string): string {
  return `
You are an expert clinical nursing educator grading a nursing student's "receiving report" exercise.

The student read a nurse handoff report and wrote notes about what matters and what follow-up questions they would ask.

FULL SCENARIO (includes the report text and the answer key):
${JSON.stringify(scenario, null, 2)}

STUDENT'S NOTES (what they wrote):
"${studentResponse}"

Grade on 4 dimensions. Be specific, reference what they wrote vs the answerKey. Return ONLY valid JSON:

{
  "overallScore": number (0-100),
  "grade": "A, B, C, D, or F",
  "dimensions": {
    "criticalCapture": {
      "score": number (0-30),
      "max": 30,
      "feedback": "2-3 sentence feedback: which critical findings from answerKey.criticalFindings did they capture? What did they miss? Be specific."
    },
    "prioritization": {
      "score": number (0-25),
      "max": 25,
      "feedback": "2-3 sentence feedback: did they correctly identify what to do first? Compare their priorities to answerKey.shouldHavePrioritized."
    },
    "followUpQuestions": {
      "score": number (0-25),
      "max": 25,
      "feedback": "2-3 sentence feedback: what good follow-up questions did they ask? What essential questions from answerKey.essentialFollowUpQuestions did they miss?"
    },
    "signalToNoise": {
      "score": number (0-20),
      "max": 20,
      "feedback": "1-2 sentence feedback: did they filter out the filler (answerKey.unnecessaryInfo) and focus on high-value info? Or did they write down everything?"
    }
  },
  "criticalMisses": ["array of important items from the report they failed to catch — prioritize patient safety items"],
  "correctlyCaptured": ["array of specific things they got right — be encouraging but accurate"],
  "followUpQuestionsShouldHaveAsked": ["array of the key questions from answerKey.essentialFollowUpQuestions they didn't ask"],
  "coachingNote": "2-3 sentences written like a preceptor coaching a student — what a confident nurse does when receiving report, and what this student should practice.",
  "modelPriorities": ["array of top 3-4 things the incoming nurse should do first based on this report"]
}

Grading guidance:
- Failing to catch any criticalFindings from the answerKey = major deduction in criticalCapture
- Writing everything down without prioritizing = lower signalToNoise score
- Grade letter: 90-100=A, 80-89=B, 70-79=C, 60-69=D, below 60=F
  `.trim();
}
