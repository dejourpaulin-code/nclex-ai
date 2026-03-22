import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "nodejs";

type LiveAnalysisPrompt = {
  promptType: string;
  promptText: string;
  promptContext: string;
};

type ProfessorEmphasis = {
  detected: boolean;
  headline: string;
  emphasizedPoint: string;
  whyLexiFlaggedIt: string;
  studentAction: string;
  confidence: number;
};

type TopicShift = {
  shiftDetected: boolean;
  previousTopic: string;
  currentTopic: string;
  confidence: number;
  reason: string;
  examRelevance: string;
};

type ExamNugget = {
  label: string;
  whyItMatters: string;
  studentUse: string;
  confidence: number;
};

type AnalyzerEvent = {
  event_type: string;
  label: string;
  description: string;
  confidence: number;
};

type LiveAnalysisResponse = {
  heading?: string;
  cleanedTranscript?: string;
  summary: string;
  keyPoints: string[];
  bestQuestion: string;
  safeAnswer: string;
  sharperFollowUp: string;
  classContribution: string;
  topicShift: TopicShift;
  examNuggets: ExamNugget[];
  professorEmphasis: ProfessorEmphasis;
  prompts: LiveAnalysisPrompt[];
  events: AnalyzerEvent[];
};

function extractJsonObject(text: string) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response.");
  }

  return cleaned.slice(start, end + 1);
}

function clampConfidence(value: unknown, fallback = 65) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

function normalizePrompt(raw: unknown): LiveAnalysisPrompt | null {
  if (!raw || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;
  const promptType = asString(obj.promptType, "question_to_ask");
  const promptText = asString(obj.promptText);
  const promptContext = asString(obj.promptContext);

  if (!promptText) return null;

  return {
    promptType,
    promptText,
    promptContext,
  };
}

function normalizeExamNugget(raw: unknown): ExamNugget | null {
  if (!raw || typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;
  const label = asString(obj.label, "Exam Nugget");
  const whyItMatters = asString(obj.whyItMatters);
  const studentUse = asString(obj.studentUse);
  const confidence = clampConfidence(obj.confidence, 75);

  if (!whyItMatters && !studentUse) return null;

  return {
    label,
    whyItMatters: whyItMatters || "This part of the lecture sounds testable.",
    studentUse: studentUse || "Review this as a likely exam concept.",
    confidence,
  };
}

function normalizeTopicShift(raw: unknown): TopicShift {
  if (!raw || typeof raw !== "object") {
    return {
      shiftDetected: false,
      previousTopic: "",
      currentTopic: "",
      confidence: 0,
      reason: "",
      examRelevance: "",
    };
  }

  const obj = raw as Record<string, unknown>;

  return {
    shiftDetected: Boolean(obj.shiftDetected),
    previousTopic: asString(obj.previousTopic),
    currentTopic: asString(obj.currentTopic),
    confidence: clampConfidence(obj.confidence, 0),
    reason: asString(obj.reason),
    examRelevance: asString(obj.examRelevance),
  };
}

function normalizeProfessorEmphasis(raw: unknown): ProfessorEmphasis {
  if (!raw || typeof raw !== "object") {
    return {
      detected: false,
      headline: "",
      emphasizedPoint: "",
      whyLexiFlaggedIt: "",
      studentAction: "",
      confidence: 0,
    };
  }

  const obj = raw as Record<string, unknown>;

  return {
    detected: Boolean(obj.detected),
    headline: asString(obj.headline, "This sounds important"),
    emphasizedPoint: asString(obj.emphasizedPoint),
    whyLexiFlaggedIt: asString(obj.whyLexiFlaggedIt),
    studentAction: asString(obj.studentAction),
    confidence: clampConfidence(obj.confidence, 0),
  };
}

function buildEvents(
  topicShift: TopicShift,
  professorEmphasis: ProfessorEmphasis,
  examNuggets: ExamNugget[],
  rawEvents: unknown
): AnalyzerEvent[] {
  const normalized: AnalyzerEvent[] = [];

  if (Array.isArray(rawEvents)) {
    for (const item of rawEvents) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;

      const event_type = asString(obj.event_type);
      const label = asString(obj.label);
      const description = asString(obj.description);
      const confidence = clampConfidence(obj.confidence, 70);

      if (!event_type || !description) continue;

      normalized.push({
        event_type,
        label: label || event_type,
        description,
        confidence,
      });
    }
  }

  if (topicShift.shiftDetected) {
    normalized.push({
      event_type: "topic_shift",
      label: "Topic Shift",
      description:
        topicShift.reason ||
        `Lecture appears to move from ${topicShift.previousTopic || "one concept"} to ${
          topicShift.currentTopic || "another concept"
        }.`,
      confidence: clampConfidence(topicShift.confidence, 75),
    });
  }

  if (professorEmphasis.detected) {
    normalized.push({
      event_type: "professor_emphasis",
      label: "Professor Emphasis",
      description:
        professorEmphasis.whyLexiFlaggedIt ||
        professorEmphasis.emphasizedPoint ||
        "Professor seems to be stressing this concept.",
      confidence: clampConfidence(professorEmphasis.confidence, 80),
    });
  }

  for (const nugget of examNuggets) {
    normalized.push({
      event_type: "exam_nugget",
      label: nugget.label || "Exam Nugget",
      description:
        nugget.whyItMatters || nugget.studentUse || "This sounds like testable lecture material.",
      confidence: clampConfidence(nugget.confidence, 75),
    });
  }

  return normalized;
}

function buildFallbackAnalysis(transcriptText: string): LiveAnalysisResponse {
  const fallbackSummary =
    transcriptText.slice(0, 220).trim() || "Live lecture is being analyzed.";

  return {
    heading: "Live lecture segment",
    cleanedTranscript: transcriptText,
    summary: fallbackSummary,
    keyPoints: [fallbackSummary],
    bestQuestion: "Can you clarify the main takeaway from this section?",
    safeAnswer:
      "It sounds like the main point is how this concept applies clinically and what we should recognize for exams.",
    sharperFollowUp:
      "How would you expect us to apply this in a patient scenario or exam question?",
    classContribution:
      "This seems important because it connects the concept to clinical judgment and patient safety.",
    topicShift: {
      shiftDetected: false,
      previousTopic: "",
      currentTopic: "",
      confidence: 0,
      reason: "",
      examRelevance: "",
    },
    examNuggets: [],
    professorEmphasis: {
      detected: false,
      headline: "",
      emphasizedPoint: "",
      whyLexiFlaggedIt: "",
      studentAction: "",
      confidence: 0,
    },
    prompts: [
      {
        promptType: "question_to_ask",
        promptText: "Can you clarify the biggest takeaway from this section?",
        promptContext: "Useful when the lecture feels dense or fast.",
      },
    ],
    events: [],
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const transcriptText = asString(body.transcriptText || body.transcript);
    const chunkIndex =
      typeof body.chunkIndex === "number" ? body.chunkIndex : Number(body.chunkIndex || 0);
    const startedAtSeconds =
      typeof body.startedAtSeconds === "number"
        ? body.startedAtSeconds
        : Number(body.startedAtSeconds || 0);
    const endedAtSeconds =
      typeof body.endedAtSeconds === "number"
        ? body.endedAtSeconds
        : Number(body.endedAtSeconds || 0);

    // supports both { title } and { sessionTitle }
    const title = asString(body.sessionTitle || body.title, "Live nursing lecture");

    if (!transcriptText) {
      return NextResponse.json({ error: "Missing transcriptText." }, { status: 400 });
    }

    const trimmedTranscript = transcriptText.trim().slice(-12000);

    const prompt = `
You are Lexi, a real-time nursing lecture companion helping a student DURING class.

Analyze the transcript window below and return valid JSON only.

Your goals:
- summarize what is being taught right now
- lightly clean obvious transcript roughness into readable sentence form
- identify likely testable points
- detect whether the lecture shifted topics
- detect professor emphasis
- give the student one natural question to ask
- give the student one safe answer if cold-called
- give the student one stronger follow-up
- give the student one natural class contribution
- produce practical key points
- produce live prompts that feel natural and usable

Lecture title:
${title}

Chunk timing:
- chunkIndex: ${Number.isFinite(chunkIndex) ? chunkIndex : 0}
- startedAtSeconds: ${Number.isFinite(startedAtSeconds) ? startedAtSeconds : 0}
- endedAtSeconds: ${Number.isFinite(endedAtSeconds) ? endedAtSeconds : 0}

Transcript:
${trimmedTranscript}

Return JSON in exactly this shape:
{
  "heading": "string",
  "cleanedTranscript": "string",
  "summary": "string",
  "keyPoints": ["string"],
  "bestQuestion": "string",
  "safeAnswer": "string",
  "sharperFollowUp": "string",
  "classContribution": "string",
  "topicShift": {
    "shiftDetected": true,
    "previousTopic": "string",
    "currentTopic": "string",
    "confidence": 0,
    "reason": "string",
    "examRelevance": "string"
  },
  "examNuggets": [
    {
      "label": "string",
      "whyItMatters": "string",
      "studentUse": "string",
      "confidence": 0
    }
  ],
  "professorEmphasis": {
    "detected": true,
    "headline": "string",
    "emphasizedPoint": "string",
    "whyLexiFlaggedIt": "string",
    "studentAction": "string",
    "confidence": 0
  },
  "prompts": [
    {
      "promptType": "question_to_ask",
      "promptText": "string",
      "promptContext": "string"
    },
    {
      "promptType": "clarify_this",
      "promptText": "string",
      "promptContext": "string"
    },
    {
      "promptType": "class_contribution",
      "promptText": "string",
      "promptContext": "string"
    },
    {
      "promptType": "nclex_angle",
      "promptText": "string",
      "promptContext": "string"
    }
  ],
  "events": [
    {
      "event_type": "string",
      "label": "string",
      "description": "string",
      "confidence": 0
    }
  ]
}

Rules:
- Return JSON only, no markdown.
- Make everything sound natural, not robotic.
- Keep it practical for a real nursing student.
- cleanedTranscript should fix obvious broken phrasing and punctuation, but should stay faithful to the transcript.
- Only mark shiftDetected true if the lecture genuinely moves into a different concept or subtopic.
- Only mark professorEmphasis.detected true if there is a real emphasis signal.
- Confidence values must be 0-100.
- Prefer clear, concise, clinically useful language.
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const raw = response.output_text || "";
    let parsed: Record<string, unknown>;

    try {
      parsed = JSON.parse(extractJsonObject(raw));
    } catch (jsonError) {
      console.error("LIVE ANALYZE JSON PARSE ERROR:", jsonError);
      console.error("RAW MODEL OUTPUT:", raw);

      const fallback = buildFallbackAnalysis(trimmedTranscript);
      return NextResponse.json(fallback);
    }

    const summary =
      asString(parsed.summary) ||
      trimmedTranscript.slice(0, 220) ||
      "Live lecture is being analyzed.";

    const keyPoints = asStringArray(parsed.keyPoints);

    const examNuggets = Array.isArray(parsed.examNuggets)
      ? (parsed.examNuggets.map(normalizeExamNugget).filter(Boolean) as ExamNugget[])
      : [];

    const prompts = Array.isArray(parsed.prompts)
      ? (parsed.prompts.map(normalizePrompt).filter(Boolean) as LiveAnalysisPrompt[])
      : [];

    const topicShift = normalizeTopicShift(parsed.topicShift);
    const professorEmphasis = normalizeProfessorEmphasis(parsed.professorEmphasis);

    const normalized: LiveAnalysisResponse = {
      heading: asString(
        parsed.heading,
        `Lecture chunk ${Number.isFinite(chunkIndex) ? chunkIndex + 1 : 1}`
      ),
      cleanedTranscript: asString(parsed.cleanedTranscript, trimmedTranscript),
      summary,
      keyPoints: keyPoints.length > 0 ? keyPoints : [summary],
      bestQuestion:
        asString(parsed.bestQuestion) || "Can you clarify the main takeaway from this section?",
      safeAnswer:
        asString(parsed.safeAnswer) ||
        "It sounds like the main point is how this concept applies clinically and what we should recognize for exams.",
      sharperFollowUp:
        asString(parsed.sharperFollowUp) ||
        "How would you expect us to apply this in a patient scenario or exam question?",
      classContribution:
        asString(parsed.classContribution) ||
        "This seems important because it connects the concept to clinical judgment and patient safety.",
      topicShift,
      examNuggets,
      professorEmphasis,
      prompts,
      events: buildEvents(topicShift, professorEmphasis, examNuggets, parsed.events),
    };

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("LIVE ANALYZE ROUTE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to analyze live lecture transcript." },
      { status: 500 }
    );
  }
}