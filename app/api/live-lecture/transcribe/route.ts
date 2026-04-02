import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getInputExtension(type: string, originalName?: string) {
  const lowerName = (originalName || "").toLowerCase();
  const lowerType = (type || "").toLowerCase();

  if (lowerName.includes(".")) {
    return (lowerName.split(".").pop() || "webm").toLowerCase();
  }

  if (lowerType.includes("webm")) return "webm";
  if (lowerType.includes("ogg")) return "ogg";
  if (lowerType.includes("wav")) return "wav";
  if (lowerType.includes("mpeg") || lowerType.includes("mp3")) return "mp3";
  if (lowerType.includes("aac")) return "aac";
  if (lowerType.includes("x-m4a") || lowerType.includes("m4a")) return "m4a";
  if (lowerType.includes("mp4")) return "mp4";

  // Default to webm — most browser MediaRecorder output
  return "webm";
}

function cleanTranscriptText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\buh\b/gi, "uh")
    .replace(/\bum\b/gi, "um")
    .trim();
}

async function transcribeWithModel(
  filePath: string,
  model: "gpt-4o-transcribe" | "whisper-1",
  recentContext: string,
  sessionTitle: string
) {
  const prompt = [
    "This is a live nursing lecture transcript.",
    sessionTitle ? `Lecture title: ${sessionTitle}.` : "",
    recentContext
      ? `Recent transcript context for continuity: ${recentContext.slice(-800)}`
      : "",
    "Prefer clear clinical wording, proper sentence continuity, medication names, nursing terminology, anatomy, physiology, and classroom lecture phrasing.",
    "Keep transcription faithful, but resolve obvious sentence breaks when possible.",
  ]
    .filter(Boolean)
    .join(" ");

  return openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model,
    prompt,
  });
}

export async function POST(req: NextRequest) {
  let tempDir = "";
  let inputPath = "";

  try {
    const formData = await req.formData();
    const audio = formData.get("audio");
    const recentContext = String(formData.get("recentContext") || "");
    const sessionTitle = String(formData.get("sessionTitle") || "");

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
    }

    if (audio.size === 0) {
      return NextResponse.json({ error: "Audio file is empty." }, { status: 400 });
    }

    const inputExt = getInputExtension(audio.type || "", audio.name);

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lexi-live-"));
    inputPath = path.join(tempDir, `input.${inputExt}`);

    const bytes = Buffer.from(await audio.arrayBuffer());
    fs.writeFileSync(inputPath, bytes);

    const inputStats = fs.statSync(inputPath);

    console.log("LIVE TRANSCRIBE INPUT:", {
      name: audio.name,
      type: audio.type,
      size: audio.size,
      savedPath: inputPath,
      savedSize: inputStats.size,
    });

    if (inputStats.size < 1000) {
      return NextResponse.json(
        {
          error: "Audio chunk too small or corrupted.",
          debug: { fileName: audio.name, mimeType: audio.type, inputExt, inputSize: inputStats.size },
        },
        { status: 400 }
      );
    }

    // Try gpt-4o-transcribe first
    try {
      const result = await transcribeWithModel(inputPath, "gpt-4o-transcribe", recentContext, sessionTitle);
      const cleanedText = cleanTranscriptText(result.text || "");

      console.log("TRANSCRIPTION SUCCESS (gpt-4o-transcribe):", {
        textLength: cleanedText.length,
        preview: cleanedText.slice(0, 120),
      });

      return NextResponse.json({
        text: cleanedText,
        debug: { model: "gpt-4o-transcribe", fileName: audio.name, mimeType: audio.type, inputExt, inputSize: inputStats.size },
      });
    } catch (primaryError) {
      console.warn("gpt-4o-transcribe failed, falling back to whisper-1:", primaryError);
    }

    // Fallback to whisper-1
    const fallbackResult = await transcribeWithModel(inputPath, "whisper-1", recentContext, sessionTitle);
    const cleanedText = cleanTranscriptText(fallbackResult.text || "");

    console.log("TRANSCRIPTION SUCCESS (whisper-1 fallback):", {
      textLength: cleanedText.length,
      preview: cleanedText.slice(0, 120),
    });

    return NextResponse.json({
      text: cleanedText,
      debug: { model: "whisper-1", fileName: audio.name, mimeType: audio.type, inputExt, inputSize: inputStats.size },
    });
  } catch (error) {
    console.error("TRANSCRIBE ROUTE ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Server transcription error.";

    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    try {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch {}

    try {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  }
}
