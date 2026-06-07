import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type ConvMessage = { role: "nurse" | "doctor" | "student"; text: string };

export async function POST(req: NextRequest) {
  try {
    const { mode, scenario, history, studentMessage } = await req.json();

    if (!mode || !scenario || !studentMessage?.trim()) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(mode, scenario);
    const messages = buildMessages(history ?? [], studentMessage, systemPrompt);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 180,
    });

    const raw = response.choices[0].message.content || "";
    const isComplete =
      raw.includes("[END]") ||
      (history ?? []).filter((m: ConvMessage) => m.role === "student").length >= 2;

    const text = raw.replace("[END]", "").trim();

    return NextResponse.json({ response: text, isComplete });
  } catch (error) {
    console.error("Handoff chat error:", error);
    return NextResponse.json({ error: "Failed to generate response." }, { status: 500 });
  }
}

function buildSystemPrompt(mode: string, scenario: unknown): string {
  const ctx = JSON.stringify(scenario, null, 2);

  if (mode === "give") {
    return `
You are a charge nurse receiving end-of-shift handoff from a nursing student. Patient scenario:
${ctx}

Rules:
- Respond naturally, like a real nurse at shift change — casual but professional
- After their SBAR, ask 1 specific follow-up question about something they missed or something important (especially the criticalAlert)
- Keep each response to 2-4 sentences max
- After their answer to your follow-up (or if they gave a very complete report), end the handoff naturally and append [END] to close the conversation
- Do NOT ask more than 2 follow-up questions total
- Example closing: "Okay, sounds good. I'll go check on them now. Thanks for the solid report. [END]"
    `.trim();
  }

  if (mode === "receive") {
    return `
You are the nurse who just gave handoff. The student received your report and may have follow-up questions.
The report you gave was based on this scenario:
${ctx}

Rules:
- Answer the student's follow-up questions accurately and briefly (1-3 sentences)
- If they ask something clearly covered in the report, gently point it out: "I mentioned that — the [X] was [Y]"
- After 1-2 exchanges, wrap up and append [END]
- Example: "Good catch on that one. Let me know if anything else comes up. [END]"
    `.trim();
  }

  // isbar — doctor mode
  return `
You are a busy attending physician who just received a call from a nursing student. Patient situation:
${ctx}

Rules:
- You just answered the phone — start with a brief acknowledgment of what they said so far
- Ask 1 clarifying question that a real physician would ask (vitals, what changed, what nursing has already done, what you want ordered)
- Keep responses short: 2-4 sentences, physician-style
- If the student's ISBAR is incomplete, probe for what's missing before giving orders
- After their response to your question (or if their ISBAR was solid), give realistic physician orders or a plan and append [END]
- Example closing: "Okay, go ahead and get a stat EKG and hold the next metoprolol dose. I'll be there within the hour. [END]"
    `.trim();
}

function buildMessages(
  history: ConvMessage[],
  studentMessage: string,
  systemPrompt: string
): { role: "system" | "user" | "assistant"; content: string }[] {
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of history) {
    messages.push({
      role: msg.role === "student" ? "user" : "assistant",
      content: msg.text,
    });
  }

  messages.push({ role: "user", content: studentMessage });
  return messages;
}
