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

  return "webm";
}

function cleanTranscriptText(text: string) {
  return text.replace(/\s+/g, " ").trim();
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

    if (inputStats.size < 1000) {
      return NextResponse.json(
        { error: "Audio chunk too small.", debug: { inputSize: inputStats.size } },
        { status: 400 }
      );
    }

    const prompt = [
      "This is a live nursing classroom lecture. Transcribe with accurate clinical spelling.",
      sessionTitle ? `Lecture title: ${sessionTitle}.` : "",
      recentContext ? `Recent context: ${recentContext.slice(-600)}` : "",
      "Clinical vocabulary: tachycardia, bradycardia, dysrhythmia, myocardial infarction, angina, atrial fibrillation, ventricular fibrillation, pulmonary embolism, heart failure, hypertension, hypotension, COPD, pneumonia, asthma, anaphylaxis, sepsis, DKA, hypoglycemia, hyperglycemia, hypothyroidism, hyperthyroidism, heparin, warfarin, metformin, insulin, digoxin, furosemide, lisinopril, metoprolol, atorvastatin, prednisone, albuterol, morphine, SpO2, CBC, BMP, ABG, SBAR, NPO, PRN, STAT, NCLEX.",
    ]
      .filter(Boolean)
      .join(" ");

    try {
      const result = await openai.audio.transcriptions.create({
        file: fs.createReadStream(inputPath),
        model: "whisper-1",
        prompt,
      });
      return NextResponse.json({ text: cleanTranscriptText(result.text || "") });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 429) {
        // Rate limited — return empty text so the chunk is silently skipped
        console.warn("TRANSCRIBE: OpenAI 429 rate limit, skipping chunk");
        return NextResponse.json({ text: "", skipped: true });
      }
      throw err;
    }
  } catch (error) {
    console.error("TRANSCRIBE ROUTE ERROR:", error);
    const message = error instanceof Error ? error.message : "Server transcription error.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    try { if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
    try { if (tempDir && fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}
