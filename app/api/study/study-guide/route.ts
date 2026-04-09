import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 120;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STUDY_BUCKET = "study-uploads";

const studyGuideSchema = {
  name: "study_pdf_guide",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      lectureTitle: { type: "string" },
      sessionOverview: { type: "string" },
      majorTopics: { type: "array", items: { type: "string" } },
      conceptBreakdowns: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            concept: { type: "string" },
            explanation: { type: "string" },
            clinicalApplication: { type: "string" },
            whyItMatters: { type: "string" },
            memoryHook: { type: "string" },
          },
          required: ["concept", "explanation", "clinicalApplication", "whyItMatters", "memoryHook"],
        },
      },
      professorEmphasisNarrative: { type: "string" },
      examNuggets: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            point: { type: "string" },
            whyTestable: { type: "string" },
          },
          required: ["point", "whyTestable"],
        },
      },
      practiceQuestions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            question: { type: "string" },
            choices: {
              type: "object",
              additionalProperties: false,
              properties: {
                A: { type: "string" },
                B: { type: "string" },
                C: { type: "string" },
                D: { type: "string" },
              },
              required: ["A", "B", "C", "D"],
            },
            correctAnswer: { type: "string" },
            rationale: { type: "string" },
          },
          required: ["question", "choices", "correctAnswer", "rationale"],
        },
      },
      studyPlan: { type: "array", items: { type: "string" } },
      quickReferenceNotes: { type: "array", items: { type: "string" } },
    },
    required: [
      "lectureTitle",
      "sessionOverview",
      "majorTopics",
      "conceptBreakdowns",
      "professorEmphasisNarrative",
      "examNuggets",
      "practiceQuestions",
      "studyPlan",
      "quickReferenceNotes",
    ],
  },
} as const;

async function extractPdfText(blob: Blob): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const result = await pdfParse(buffer);
  return String(result?.text || "")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const filePath = String(body?.filePath || "").trim();
    const userId = String(body?.userId || "").trim();

    if (!filePath || !userId) {
      return NextResponse.json({ error: "filePath and userId are required." }, { status: 400 });
    }

    // Download the PDF from Supabase storage
    const { data: blob, error: downloadError } = await supabase.storage
      .from(STUDY_BUCKET)
      .download(filePath);

    if (downloadError || !blob) {
      return NextResponse.json({ error: "Could not retrieve the uploaded file." }, { status: 400 });
    }

    // Extract text using pdf-parse (same approach as the study route)
    let pdfText = "";
    try {
      pdfText = (await extractPdfText(blob)).slice(0, 45000);
    } catch {
      return NextResponse.json(
        { error: "The PDF could not be read. Make sure it is a text-based PDF and not a scanned image." },
        { status: 500 }
      );
    }

    if (!pdfText.trim()) {
      return NextResponse.json(
        { error: "This PDF did not return readable text. It may be image-only or empty." },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: {
        type: "json_schema",
        json_schema: studyGuideSchema,
      },
      messages: [
        {
          role: "system",
          content: `You are Lexi, an elite nursing study guide author. Build a complete, exam-ready study guide from an uploaded nursing class PDF. This is not a summary — it is a full guide a student can use to prepare for the exact exam their professor will write.

Your guide must:
- Explain every major concept with clinical application
- Identify what the material emphasizes and why it will appear on the test
- Include 5 realistic NCLEX-style practice questions from the content
- Include memory hooks (mnemonics, analogies) for hard concepts
- Be comprehensive enough that a student does not need to reread their notes`,
        },
        {
          role: "user",
          content: `Build a full study guide from this nursing class material.

PDF Content:
"""
${pdfText}
"""

Instructions:
- lectureTitle: Infer a clear title from the content.
- sessionOverview: 3-5 sentences summarizing what was covered and what students need for the exam.
- majorTopics: 5-10 distinct topics covered.
- conceptBreakdowns: For each major concept — explanation, clinical application, why it matters on NCLEX, memory hook. Aim for 6-10.
- professorEmphasisNarrative: 2-3 paragraphs on what the material flagged as important and what that means for the exam.
- examNuggets: 6-10 specific testable facts, thresholds, or clinical decision points from the material.
- practiceQuestions: Exactly 5 NCLEX-style questions with 4 choices, 1 correct answer (A/B/C/D), and a rationale each.
- studyPlan: 5-7 specific study actions for the next 3 days.
- quickReferenceNotes: 8-12 facts to memorize cold before the exam.`,
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content?.trim() || "";
    if (!rawContent) {
      return NextResponse.json({ error: "Model returned no content." }, { status: 500 });
    }

    const parsed = JSON.parse(rawContent);
    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to generate study guide.";
    console.error("study/study-guide error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
