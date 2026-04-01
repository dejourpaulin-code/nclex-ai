import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STUDY_BUCKET = "study-uploads";

type ChatRole = "user" | "assistant";

type StoredAsset = {
  path: string;
  name: string;
  type: string;
};

function buildStudyTitle(
  question: string,
  fileName?: string | null,
  imageName?: string | null
) {
  if (question.trim()) return question.slice(0, 80);
  if (fileName) return `Study: ${fileName}`.slice(0, 80);
  if (imageName) return `Image Study: ${imageName}`.slice(0, 80);
  return "Lexi Study Session";
}

function cleanLexiText(text: string) {
  return text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^\s*[-•]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildSystemPrompt(mode: "pdf" | "image" | "text") {
  if (mode === "pdf") {
    return `
You are Lexi, a strong nursing study assistant.

Your job is to turn uploaded nursing PDFs into genuinely useful study help.

Rules:
- Respond in plain text only.
- Do not use markdown.
- Do not use hashtags.
- Do not use asterisks.
- Do not make the output tiny or generic.
- Be detailed, high-yield, and practical.
- Pull out the real main ideas from the PDF.
- Focus on what a nursing student actually needs to know.
- If the material sounds testable, say why.
- If there are processes, break them down clearly.
- If there are confusing concepts, simplify them.
- If the user asks for a study guide, make it comprehensive.

Preferred response structure in plain text:
Main idea
Core concepts
High-yield details
What is most testable
Clinical meaning
Memory help
Quick review checklist

Keep it readable, organized, and detailed.
`.trim();
  }

  if (mode === "image") {
    return `
You are Lexi, a nursing tutor.

Rules:
- Respond in plain text only.
- No markdown.
- No hashtags.
- No asterisks.
- Be clear, practical, and easy to study from.
`.trim();
  }

  return `
You are Lexi, a nursing tutor.

Rules:
- Respond in plain text only.
- No markdown.
- No hashtags.
- No asterisks.
- Be clear, practical, and useful.
`.trim();
}

async function downloadStoredAsset(path: string) {
  const { data, error } = await supabase.storage.from(STUDY_BUCKET).download(path);

  if (error || !data) {
    throw new Error(error?.message || "Failed to download uploaded file.");
  }

  return data;
}

async function blobToBuffer(blob: Blob) {
  const bytes = await blob.arrayBuffer();
  return Buffer.from(bytes);
}

async function blobToBase64(blob: Blob) {
  const buffer = await blobToBuffer(blob);
  return buffer.toString("base64");
}

async function extractPdfTextFromBlob(blob: Blob) {
  const buffer = await blobToBuffer(blob);

  try {
    const pdfParseModule: any = await import("pdf-parse");
    const pdfParse = pdfParseModule?.default || pdfParseModule;
    const result = await pdfParse(buffer);

    return String(result?.text || "")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } catch (error) {
    console.error("PDF EXTRACT ERROR:", error);
    throw error;
  }
}

async function getConversationMessages(conversationId: string) {
  const { data } = await supabase
    .from("lexi_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return (data || []).map((msg) => ({
    role: msg.role as ChatRole,
    content: msg.content as string,
  }));
}

async function ensureConversation({
  userId,
  conversationId,
  title,
}: {
  userId: string;
  conversationId?: string | null;
  title: string;
}) {
  if (conversationId) {
    return conversationId;
  }

  const { data, error } = await supabase
    .from("lexi_conversations")
    .insert({
      user_id: userId,
      title,
      source: "study",
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error("Failed to create conversation.");
  }

  return data.id;
}

async function saveMessage(
  conversationId: string,
  role: ChatRole,
  content: string
) {
  if (!content.trim()) return;

  await supabase.from("lexi_messages").insert({
    conversation_id: conversationId,
    role,
    content,
  });
}

function historyToChatMessages(history: { role: ChatRole; content: string }[]) {
  return history.map((msg) => ({
    role: msg.role,
    content: msg.content,
  })) as Array<{ role: "user" | "assistant"; content: string }>;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const question = String(formData.get("question") || "").trim();
    const userId = String(formData.get("userId") || "").trim() || null;
    const incomingConversationId =
      String(formData.get("conversationId") || "").trim() || null;

    const filePath = String(formData.get("filePath") || "").trim() || null;
    const fileName = String(formData.get("fileName") || "").trim() || null;
    const fileType = String(formData.get("fileType") || "").trim() || "application/pdf";

    const imagePath = String(formData.get("imagePath") || "").trim() || null;
    const imageName = String(formData.get("imageName") || "").trim() || null;
    const imageType = String(formData.get("imageType") || "").trim() || "image/png";

    if (!filePath && !imagePath && !question) {
      return NextResponse.json({ error: "No input provided." }, { status: 400 });
    }

    const title = buildStudyTitle(question, fileName, imageName);

    let conversationId: string | null = incomingConversationId;

    if (userId) {
      conversationId = await ensureConversation({
        userId,
        conversationId,
        title,
      });
    }

    let history: { role: ChatRole; content: string }[] = [];

    if (conversationId) {
      history = await getConversationMessages(conversationId);
    }

    if (conversationId) {
      const userMessageSummary =
        question ||
        (fileName ? `Uploaded PDF: ${fileName}` : null) ||
        (imageName ? `Uploaded image: ${imageName}` : null) ||
        "Study request";

      await saveMessage(conversationId, "user", userMessageSummary);
    }

    if (imagePath) {
      const imageBlob = await downloadStoredAsset(imagePath);
      const base64 = await blobToBase64(imageBlob);

      const completion = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: buildSystemPrompt("image"),
          },
          ...historyToChatMessages(history),
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  question ||
                  "Explain this image in a way that is easy to study from.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${imageType};base64,${base64}`,
                },
              },
            ],
          } as any,
        ] as any,
      });

      const reply = cleanLexiText(
        completion.choices[0]?.message?.content || "No response."
      );

      if (conversationId) {
        await saveMessage(conversationId, "assistant", reply);
      }

      return NextResponse.json({ reply, conversationId });
    }

    if (filePath) {
      if (!fileType.toLowerCase().includes("pdf") && !String(fileName || "").toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          { error: "Only PDF files are supported in the PDF upload box." },
          { status: 400 }
        );
      }

      let extractedPdfText = "";

      try {
        const pdfBlob = await downloadStoredAsset(filePath);
        extractedPdfText = (await extractPdfTextFromBlob(pdfBlob)).slice(0, 45000);
      } catch {
        return NextResponse.json(
          {
            error:
              "The PDF could not be read. Make sure the PDF is text-based and not just an image scan.",
          },
          { status: 500 }
        );
      }

      if (!extractedPdfText.trim()) {
        return NextResponse.json(
          {
            error:
              "This PDF did not return readable text. It may be image-only or empty.",
          },
          { status: 400 }
        );
      }

      const effectiveQuestion =
        question ||
        "Create a comprehensive nursing study guide from this PDF. Pull out the main ideas, high-yield facts, testable concepts, detailed explanations, and what I actually need to know.";

      const completion = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: buildSystemPrompt("pdf"),
          },
          ...historyToChatMessages(history),
          {
            role: "user",
            content: `
Student request:
${effectiveQuestion}

PDF content:
${extractedPdfText}
`.trim(),
          },
        ],
      });

      const reply = cleanLexiText(
        completion.choices[0]?.message?.content || "No response."
      );

      if (conversationId) {
        await saveMessage(conversationId, "assistant", reply);
      }

      return NextResponse.json({ reply, conversationId });
    }

    if (question) {
      const completion = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: buildSystemPrompt("text"),
          },
          ...historyToChatMessages(history),
          {
            role: "user",
            content: question,
          },
        ],
      });

      const reply = cleanLexiText(
        completion.choices[0]?.message?.content || "No response."
      );

      if (conversationId) {
        await saveMessage(conversationId, "assistant", reply);
      }

      return NextResponse.json({ reply, conversationId });
    }

    return NextResponse.json({ error: "No input provided." }, { status: 400 });
  } catch (err) {
    console.error("STUDY ROUTE ERROR:", err);
    return NextResponse.json(
      { error: "Failed to process request." },
      { status: 500 }
    );
  }
}