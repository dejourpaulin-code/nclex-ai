import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import pdfParse from "pdf-parse";

export const runtime = "nodejs";
export const maxDuration = 60;

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STUDY_BUCKET = "study-uploads";

type AnswerLetter = "A" | "B" | "C" | "D";

type SupportedQuestionType =
  | "Multiple Choice"
  | "Priority"
  | "Delegation"
  | "Pharmacology"
  | "Select All That Apply";

type QuestionResponse = {
  topic: string;
  questionType: SupportedQuestionType;
  question: string;
  choices: { A: string; B: string; C: string; D: string };
  correctAnswer?: AnswerLetter;
  correctAnswers?: AnswerLetter[];
  rationale: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAnswerLetter(value: unknown): value is AnswerLetter {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function normalizeQuestionType(value: unknown): SupportedQuestionType {
  if (
    value === "Multiple Choice" ||
    value === "Priority" ||
    value === "Delegation" ||
    value === "Pharmacology" ||
    value === "Select All That Apply"
  ) {
    return value;
  }
  return "Multiple Choice";
}

function normalizeCorrectAnswer(value: unknown): AnswerLetter | undefined {
  if (typeof value === "string") {
    const upper = value.trim().toUpperCase();
    if (upper === "A" || upper === "B" || upper === "C" || upper === "D") {
      return upper as AnswerLetter;
    }
  }
  return undefined;
}

function normalizeCorrectAnswers(value: unknown): AnswerLetter[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim().toUpperCase() : ""))
    .filter((item): item is AnswerLetter => isAnswerLetter(item));
  const unique = normalized.filter((item, index, arr) => arr.indexOf(item) === index);
  if (unique.length < 2) return undefined;
  return [...unique].sort();
}

function normalizeQuestion(
  raw: unknown,
  requestedQuestionType: SupportedQuestionType
): QuestionResponse | null {
  if (!raw || typeof raw !== "object") return null;

  const item = raw as {
    topic?: unknown;
    questionType?: unknown;
    question?: unknown;
    choices?: { A?: unknown; B?: unknown; C?: unknown; D?: unknown };
    correctAnswer?: unknown;
    correctAnswers?: unknown;
    rationale?: unknown;
  };

  const question = isNonEmptyString(item.question) ? item.question.trim() : "";
  const rationale = isNonEmptyString(item.rationale) ? item.rationale.trim() : "";
  const topic = isNonEmptyString(item.topic) ? item.topic.trim() : "Study Guide";

  const choices = {
    A: isNonEmptyString(item.choices?.A) ? String(item.choices.A).trim() : "",
    B: isNonEmptyString(item.choices?.B) ? String(item.choices.B).trim() : "",
    C: isNonEmptyString(item.choices?.C) ? String(item.choices.C).trim() : "",
    D: isNonEmptyString(item.choices?.D) ? String(item.choices.D).trim() : "",
  };

  if (!question || !rationale || !choices.A || !choices.B || !choices.C || !choices.D) {
    return null;
  }

  if (requestedQuestionType === "Select All That Apply") {
    const correctAnswers = normalizeCorrectAnswers(item.correctAnswers);
    if (!correctAnswers) return null;
    return { topic, questionType: "Select All That Apply", question, choices, correctAnswers, rationale };
  }

  const correctAnswer = normalizeCorrectAnswer(item.correctAnswer);
  if (!correctAnswer) return null;

  return {
    topic,
    questionType: normalizeQuestionType(item.questionType ?? requestedQuestionType),
    question,
    choices,
    correctAnswer,
    rationale,
  };
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function rebalanceQuestion(question: QuestionResponse): QuestionResponse {
  const originalChoices = [
    { letter: "A" as AnswerLetter, text: question.choices.A },
    { letter: "B" as AnswerLetter, text: question.choices.B },
    { letter: "C" as AnswerLetter, text: question.choices.C },
    { letter: "D" as AnswerLetter, text: question.choices.D },
  ];

  const shuffled = shuffleArray(originalChoices);
  const remappedChoices = { A: shuffled[0].text, B: shuffled[1].text, C: shuffled[2].text, D: shuffled[3].text };

  if (question.questionType === "Select All That Apply" && question.correctAnswers) {
    const correctTexts = question.correctAnswers.map((l) => question.choices[l]);
    const newCorrectAnswers = (["A", "B", "C", "D"] as AnswerLetter[])
      .filter((_, i) => correctTexts.includes(shuffled[i].text))
      .sort();
    return { ...question, choices: remappedChoices, correctAnswers: newCorrectAnswers };
  }

  if (question.correctAnswer) {
    const correctText = question.choices[question.correctAnswer];
    const newCorrectAnswer: AnswerLetter =
      shuffled[0].text === correctText ? "A"
      : shuffled[1].text === correctText ? "B"
      : shuffled[2].text === correctText ? "C"
      : "D";
    return { ...question, choices: remappedChoices, correctAnswer: newCorrectAnswer };
  }

  return question;
}

function getSchema(questionType: SupportedQuestionType) {
  const commonProperties = {
    topic: { type: "string" },
    questionType: { type: "string", enum: ["Multiple Choice", "Priority", "Delegation", "Pharmacology", "Select All That Apply"] },
    question: { type: "string" },
    choices: {
      type: "object",
      additionalProperties: false,
      properties: { A: { type: "string" }, B: { type: "string" }, C: { type: "string" }, D: { type: "string" } },
      required: ["A", "B", "C", "D"],
    },
    rationale: { type: "string" },
  } as const;

  if (questionType === "Select All That Apply") {
    return {
      name: "study_guide_questions_sata",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          questions: {
            type: "array",
            minItems: 1,
            maxItems: 50,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                ...commonProperties,
                correctAnswers: { type: "array", minItems: 2, maxItems: 4, items: { type: "string", enum: ["A", "B", "C", "D"] } },
              },
              required: ["topic", "questionType", "question", "choices", "correctAnswers", "rationale"],
            },
          },
        },
        required: ["questions"],
      },
    } as const;
  }

  return {
    name: "study_guide_questions_single",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        questions: {
          type: "array",
          minItems: 1,
          maxItems: 50,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              ...commonProperties,
              correctAnswer: { type: "string", enum: ["A", "B", "C", "D"] },
            },
            required: ["topic", "questionType", "question", "choices", "correctAnswer", "rationale"],
          },
        },
      },
      required: ["questions"],
    },
  } as const;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const filePath = typeof body.filePath === "string" ? body.filePath : null;
    const fileType = typeof body.fileType === "string" ? body.fileType : "application/pdf";
    const questionCount = Math.max(1, Math.min(50, Number(body.questionCount ?? 10)));
    const difficulty = typeof body.difficulty === "string" ? body.difficulty : "Medium";
    const questionType = normalizeQuestionType(body.questionType);

    if (!filePath) {
      return NextResponse.json({ error: "No file path provided." }, { status: 400 });
    }

    // Download file from Supabase storage server-side (no Vercel payload limit)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(STUDY_BUCKET)
      .download(filePath);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: "Failed to retrieve file from storage." },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Extract text
    let studyGuideText = "";

    if (fileType === "application/pdf") {
      const parsed = await pdfParse(buffer);
      studyGuideText = parsed.text?.trim() ?? "";
    } else {
      // Image — use GPT-4.1 vision to extract text
      const base64 = buffer.toString("base64");
      const visionRes = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${fileType};base64,${base64}`, detail: "high" },
              },
              {
                type: "text",
                text: "Extract all the text content from this study guide image. Return the raw text exactly as it appears, preserving headings, bullet points, and structure. Do not add commentary.",
              },
            ],
          },
        ],
        max_tokens: 4000,
      });
      studyGuideText = visionRes.choices[0]?.message?.content?.trim() ?? "";
    }

    if (!studyGuideText || studyGuideText.length < 50) {
      return NextResponse.json(
        { error: "Could not extract enough text from the file. Make sure the document has readable content." },
        { status: 400 }
      );
    }

    // Truncate to safe token range (~12000 chars)
    const truncatedText = studyGuideText.slice(0, 12000);

    const questionTypeInstructions: Record<SupportedQuestionType, string> = {
      "Multiple Choice": "Generate standard single-best-answer NCLEX-style questions. Only 1 correct answer. Return correctAnswer only.",
      "Priority": "Every question must ask for the nurse's priority action or first response. Only 1 correct answer. Return correctAnswer only.",
      "Delegation": "Every question must focus on delegation or task assignment. Only 1 correct answer. Return correctAnswer only.",
      "Pharmacology": "Every question must center on a medication decision from the study guide. Only 1 correct answer. Return correctAnswer only.",
      "Select All That Apply": "Every question must be Select All That Apply with 2-4 correct answers. Return correctAnswers as an array like [\"A\", \"C\"]. Do NOT return correctAnswer.",
    };

    const prompt = `You are an expert NCLEX-RN question writer.

A nursing student has uploaded the following study guide from their class:

--- STUDY GUIDE START ---
${truncatedText}
--- STUDY GUIDE END ---

Your job:
Generate ${questionCount} original NCLEX-style exam questions based DIRECTLY on the content in this study guide.

Rules:
- Every question must be grounded in specific content from the study guide above.
- Questions should mirror what a professor would actually put on an exam based on this material.
- Do not add outside knowledge that is not in the study guide.
- Use realistic nursing scenarios and clinical applications of the concepts covered.
- Difficulty: ${difficulty}
- Question type: ${questionType}
- ${questionTypeInstructions[questionType]}
- Include a clear rationale for each question that references the study guide content.
- Set "topic" to the closest subject area from the study guide (e.g. "Cardiac", "Pharmacology", "Fundamentals", etc.).
- Set "questionType" to "${questionType}".
- Return EXACTLY ${questionCount} questions.
- Return only data that matches the required schema.`;

    const schema = getSchema(questionType);

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: schema.name,
          strict: schema.strict,
          schema: schema.schema,
        },
      },
    });

    const rawText = response.output_text ?? "";
    if (!rawText.trim()) {
      return NextResponse.json({ error: "Model returned no output." }, { status: 500 });
    }

    const parsed = JSON.parse(rawText);
    if (!parsed?.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json({ error: "Invalid response format from model." }, { status: 500 });
    }

    const normalizedQuestions = parsed.questions
      .map((item: unknown) => normalizeQuestion(item, questionType))
      .filter((q: QuestionResponse | null): q is QuestionResponse => q !== null)
      .slice(0, questionCount)
      .map(rebalanceQuestion);

    if (normalizedQuestions.length === 0) {
      return NextResponse.json({ error: "Could not generate valid questions from this file." }, { status: 500 });
    }

    // Clean up the uploaded file from storage after use
    await supabase.storage.from(STUDY_BUCKET).remove([filePath]);

    return NextResponse.json(normalizedQuestions);
  } catch (error) {
    console.error("generate-from-study-guide error:", error);
    return NextResponse.json({ error: "Failed to generate questions from study guide." }, { status: 500 });
  }
}
