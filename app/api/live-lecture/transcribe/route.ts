import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function resolveFfmpegPath() {
  const staticPath =
    typeof ffmpegStatic === "string" && ffmpegStatic.trim().length > 0
      ? ffmpegStatic
      : "";

  if (staticPath && fs.existsSync(staticPath)) {
    return staticPath;
  }

  return "ffmpeg";
}

const resolvedFfmpegPath = resolveFfmpegPath();
ffmpeg.setFfmpegPath(resolvedFfmpegPath);

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

  return "bin";
}

function cleanTranscriptText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\buh\b/gi, "uh")
    .replace(/\bum\b/gi, "um")
    .trim();
}

function convertToWav(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec("pcm_s16le")
      .audioFrequency(16000)
      .audioChannels(1)
      .format("wav")
      .on("start", (commandLine) => {
        console.log("FFMPEG START:", commandLine);
      })
      .on("end", () => {
        console.log("FFMPEG END");
        resolve();
      })
      .on("error", (err, stdout, stderr) => {
        console.error("FFMPEG ERROR:", err);
        console.error("FFMPEG STDOUT:", stdout);
        console.error("FFMPEG STDERR:", stderr);
        reject(
          new Error(
            `FFmpeg conversion failed: ${err.message}\nSTDERR: ${stderr || "none"}`
          )
        );
      })
      .save(outputPath);
  });
}

async function transcribeFile(
  inputPath: string,
  recentContext = "",
  sessionTitle = ""
) {
  return openai.audio.transcriptions.create({
    file: fs.createReadStream(inputPath),
    model: "gpt-4o-transcribe",
    prompt: [
      "This is a live nursing lecture transcript.",
      sessionTitle ? `Lecture title: ${sessionTitle}.` : "",
      recentContext
        ? `Recent transcript context for continuity: ${recentContext.slice(-800)}`
        : "",
      "Prefer clear clinical wording, proper sentence continuity, medication names, nursing terminology, anatomy, physiology, and classroom lecture phrasing.",
      "Keep transcription faithful, but resolve obvious sentence breaks when possible.",
    ]
      .filter(Boolean)
      .join(" "),
  });
}

export async function POST(req: NextRequest) {
  let tempDir = "";
  let inputPath = "";
  let outputPath = "";

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
    outputPath = path.join(tempDir, "output.wav");

    const bytes = Buffer.from(await audio.arrayBuffer());
    fs.writeFileSync(inputPath, bytes);

    const inputStats = fs.statSync(inputPath);

    console.log("LIVE TRANSCRIBE INPUT:", {
      name: audio.name,
      type: audio.type,
      size: audio.size,
      savedPath: inputPath,
      savedSize: inputStats.size,
      ffmpegPath: resolvedFfmpegPath,
    });

    if (inputStats.size < 1000) {
      return NextResponse.json(
        {
          error: "Audio chunk too small or corrupted before conversion.",
          debug: {
            fileName: audio.name,
            mimeType: audio.type,
            inputExt,
            inputSize: inputStats.size,
            ffmpegPath: resolvedFfmpegPath,
          },
        },
        { status: 400 }
      );
    }

    try {
      const direct = await transcribeFile(inputPath, recentContext, sessionTitle);
      const cleanedText = cleanTranscriptText(direct.text || "");

      console.log("DIRECT TRANSCRIPTION SUCCESS:", {
        textLength: cleanedText.length,
        preview: cleanedText.slice(0, 120),
      });

      return NextResponse.json({
        text: cleanedText,
        debug: {
          mode: "direct",
          fileName: audio.name,
          mimeType: audio.type,
          inputExt,
          inputSize: inputStats.size,
          ffmpegPath: resolvedFfmpegPath,
        },
      });
    } catch (directError) {
      console.warn("DIRECT TRANSCRIPTION FAILED, falling back to FFmpeg:", directError);
    }

    await convertToWav(inputPath, outputPath);

    if (!fs.existsSync(outputPath)) {
      return NextResponse.json(
        {
          error: "WAV conversion failed. Output file was not created.",
          debug: {
            fileName: audio.name,
            mimeType: audio.type,
            inputExt,
            inputSize: inputStats.size,
            ffmpegPath: resolvedFfmpegPath,
          },
        },
        { status: 500 }
      );
    }

    const outputStats = fs.statSync(outputPath);

    console.log("LIVE TRANSCRIBE OUTPUT:", {
      outputPath,
      outputSize: outputStats.size,
    });

    if (outputStats.size < 1000) {
      return NextResponse.json(
        {
          error: "Converted WAV file is too small or empty.",
          debug: {
            fileName: audio.name,
            mimeType: audio.type,
            inputExt,
            inputSize: inputStats.size,
            outputSize: outputStats.size,
            ffmpegPath: resolvedFfmpegPath,
          },
        },
        { status: 500 }
      );
    }

    const wavTranscription = await transcribeFile(outputPath, recentContext, sessionTitle);
    const cleanedText = cleanTranscriptText(wavTranscription.text || "");

    console.log("WAV TRANSCRIPTION SUCCESS:", {
      textLength: cleanedText.length,
      preview: cleanedText.slice(0, 120),
    });

    return NextResponse.json({
      text: cleanedText,
      debug: {
        mode: "ffmpeg-wav",
        fileName: audio.name,
        mimeType: audio.type,
        inputExt,
        inputSize: inputStats.size,
        outputSize: outputStats.size,
        ffmpegPath: resolvedFfmpegPath,
      },
    });
  } catch (error) {
    console.error("TRANSCRIBE ROUTE ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Server transcription error.";

    return NextResponse.json(
      {
        error: message,
        debug: {
          ffmpegPath: resolvedFfmpegPath,
        },
      },
      { status: 500 }
    );
  } finally {
    try {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch {}

    try {
      if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch {}

    try {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  }
}