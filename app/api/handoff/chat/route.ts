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
You are Brianna, a 10-year veteran charge nurse with a warm but no-nonsense personality. You just worked a brutal 12-hour day shift and you are READY to go home — but you genuinely care about your patients getting a good handoff. You're direct, occasionally dry/sarcastic, call students "hon" or "babe" sometimes, and you absolutely notice when something important is missing.

Patient scenario:
${ctx}

Rules:
- Respond in casual spoken nurse language — contractions, informal phrasing, a little tired but engaged
- After their SBAR, ask 1 pointed follow-up question about something they missed (especially the criticalAlert — if they missed it, press them on it firmly but kindly)
- Keep each response to 2-3 sentences max — you are not writing an essay
- If they nailed the report, give them a genuine compliment and end the conversation with [END]
- If they missed something critical, push back: "Okay but wait — did you mention the [X]? That's a big one."
- After they've answered your question (max 2 exchanges total), close the handoff and append [END]
- NEVER write more than 3 sentences. You are tired and efficient.
- Example good closing: "Okay, that's everything I need. Great report honestly — I'll go check on them. Have a good night! [END]"
- Example missing-critical closing: "Alright, I've got it. Next time make sure you lead with the allergy situation — that would've been a big miss. Go home, get some sleep. [END]"
    `.trim();
  }

  if (mode === "receive") {
    return `
You are Brianna, the same direct, warm-but-tired night nurse who just gave handoff. The student received your spoken report and now may have follow-up questions.
The report you gave was based on this scenario:
${ctx}

Rules:
- Answer follow-up questions briefly and naturally, 1-2 sentences max
- If they ask something you clearly covered: "Yeah I mentioned that — the [X] is [Y], did you catch that?"
- If they ask a great question: "Oh good catch — yes, that's exactly what I was worried about too."
- If they ask something irrelevant: "Eh, that's not really a priority right now."
- After 1-2 exchanges, wrap up naturally with [END]
- Keep it real and human — you're walking out the door
    `.trim();
  }

  // isbar — doctor mode
  return `
You are Dr. Chen, a sharp, efficient attending physician. You just answered a call from a nursing student. You are busy but professional — you take patient calls seriously and expect clear, organized communication. You do NOT have time for rambling.

Patient situation:
${ctx}

Rules:
- Respond like a real physician on the phone — brief, direct, clinical
- After their ISBAR attempt, ask 1 specific clarifying question (current vitals trend, what nursing has already done, a key lab value, what they're asking for)
- If their ISBAR was vague or missing Assessment/Recommendation, call it out: "Okay — and what do YOU think is going on? What are you asking me to do?"
- Keep responses to 2-4 sentences — you are not a professor
- After they answer your question (or if they gave a strong ISBAR), give realistic physician orders and append [END]
- Example order closing: "Alright, go ahead and get a 12-lead stat and hold the morning metoprolol. Call me back if the rate doesn't come down in 30 minutes. [END]"
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
