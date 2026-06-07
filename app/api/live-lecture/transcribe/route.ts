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
  return text
    .replace(/\s+/g, " ")
    .replace(/\buh\b/gi, "uh")
    .replace(/\bum\b/gi, "um")
    .trim();
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function transcribeWithRetry(filePath: string, recentContext: string, sessionTitle: string) {
  const prompt = [
    "This is a live nursing classroom lecture. Transcribe with accurate clinical spelling.",
    sessionTitle ? `Lecture title: ${sessionTitle}.` : "",
    recentContext ? `Recent context: ${recentContext.slice(-600)}` : "",
    "Clinical vocabulary: tachycardia, bradycardia, dysrhythmia, arrhythmia, myocardial infarction, angina, atrial fibrillation, ventricular fibrillation, pulmonary embolism, deep vein thrombosis, heart failure, hypertension, hypotension, COPD, pneumonia, asthma, pneumothorax, anaphylaxis, sepsis, DKA, diabetic ketoacidosis, hypoglycemia, hyperglycemia, hypothyroidism, hyperthyroidism, heparin, warfarin, metformin, insulin, digoxin, furosemide, lisinopril, metoprolol, atorvastatin, prednisone, albuterol, morphine, IV bolus, nasogastric tube, Foley catheter, tracheostomy, intubation, SpO2, CBC, BMP, ABG, creatinine, potassium, sodium, SBAR, NPO, PRN, STAT, NCLEX, priority, assessment, intervention.",
    "Keep transcription faithful to speech. Correct obvious phonetic substitutions using clinical context.",
  ]
    .filter(Boolean)
    .join(" ");

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
        prompt,
      });
      return result.text || "";
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 429 && attempt < maxAttempts) {
        // Rate limited — wait with exponential backoff then retry
        await sleep(attempt * 2000);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Transcription failed after retries.");
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
        { error: "Audio chunk too small or corrupted.", debug: { inputSize: inputStats.size } },
        { status: 400 }
      );
    }

    const text = await transcribeWithRetry(inputPath, recentContext, sessionTitle);
    const cleanedText = cleanTranscriptText(text);

    return NextResponse.json({
      text: cleanedText,
      debug: { model: "whisper-1", inputExt, inputSize: inputStats.size },
    });
  } catch (error) {
    console.error("TRANSCRIBE ROUTE ERROR:", error);
    const message = error instanceof Error ? error.message : "Server transcription error.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    try { if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
    try { if (tempDir && fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}
