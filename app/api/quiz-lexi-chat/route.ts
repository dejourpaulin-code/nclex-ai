import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type AnswerLetter = "A" | "B" | "C" | "D";

type ChoiceMap = {
  A?: string;
  B?: string;
  C?: string;
  D?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeAnswerLetter(value: unknown): AnswerLetter | "" {
  if (typeof value !== "string") return "";

  const upper = value.trim().toUpperCase();

  return upper === "A" || upper === "B" || upper === "C" || upper === "D" ? upper : "";
}

function normalizeChoiceMap(value: unknown): Record<AnswerLetter, string> {
  const choices = (value && typeof value === "object" ? value : {}) as ChoiceMap;

  return {
    A: isNonEmptyString(choices.A) ? choices.A.trim() : "",
    B: isNonEmptyString(choices.B) ? choices.B.trim() : "",
    C: isNonEmptyString(choices.C) ? choices.C.trim() : "",
    D: isNonEmptyString(choices.D) ? choices.D.trim() : "",
  };
}

function cleanPlainText(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing on the server." },
        { status: 500 }
      );
    }

    const body = await req.json();

    const question = isNonEmptyString(body?.question) ? body.question.trim() : "";
    const userMessage = isNonEmptyString(body?.userMessage) ? body.userMessage.trim() : "";
    const correctAnswer = normalizeAnswerLetter(body?.correctAnswer);
    const selectedAnswer = normalizeAnswerLetter(body?.selectedAnswer);
    const rationale = isNonEmptyString(body?.rationale) ? body.rationale.trim() : "";
    const choices = normalizeChoiceMap(body?.choices);

    if (!question || !userMessage) {
      return NextResponse.json(
        { error: "question and userMessage are required." },
        { status: 400 }
      );
    }

    const selectedChoiceText = selectedAnswer ? choices[selectedAnswer] || "No choice text found." : "";
    const correctChoiceText = correctAnswer ? choices[correctAnswer] || "No choice text found." : "";

    const prompt = `
You are Lexi, a nursing school and NCLEX quiz coach.

A student is reviewing a question they just answered on a quiz.

Question:
${question}

Choices:
A. ${choices.A || "Not provided"}
B. ${choices.B || "Not provided"}
C. ${choices.C || "Not provided"}
D. ${choices.D || "Not provided"}

Student selected:
${selectedAnswer || "No answer selected"}${selectedAnswer ? `. ${selectedChoiceText}` : ""}

Correct answer:
${correctAnswer || "Unknown"}${correctAnswer ? `. ${correctChoiceText}` : ""}

Official rationale:
${rationale || "No rationale provided."}

Student asks:
${userMessage}

Instructions:
- Explain like a strong nursing tutor.
- Be clear, practical, and NCLEX-focused.
- Explain why the correct answer is right.
- If the student got it wrong, explain why their choice was not the best answer.
- If the student selected no answer, still teach them how to reason through it.
- Keep it supportive, not robotic.
- Prefer short paragraphs.
- Keep the response concise but genuinely helpful.
- Do not use markdown.
- Do not use hashtags.
- Do not use asterisks.
- Do not bold anything.
- Do not make bullet lists unless absolutely necessary.
- Return plain text only.
`.trim();

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const rawReply =
      typeof response.output_text === "string" ? response.output_text : "";

    const cleanedReply = cleanPlainText(rawReply);

    return NextResponse.json({
      reply: cleanedReply || "Lexi could not generate a response right now.",
    });
  } catch (error) {
    console.error("quiz-lexi-chat route error:", error);

    return NextResponse.json(
      { error: "Failed to chat with Lexi." },
      { status: 500 }
    );
  }
}