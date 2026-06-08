import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type ABGValues = { pH: number; PaCO2: number; HCO3: number; PaO2: number; SaO2: number };

type ABGQuestion = {
  scenario: string;
  values: ABGValues;
  correctAnswer: string;
  choices: string[];
  explanation: string;
  clinicalPearl: string;
};

// Server-side validation: ensures values actually match the stated interpretation
function validateABG(v: ABGValues, answer: string): boolean {
  const { pH, PaCO2, HCO3 } = v;
  const acidic = pH < 7.35;
  const alkalotic = pH > 7.45;
  const normalPH = !acidic && !alkalotic;
  const co2High = PaCO2 > 45;
  const co2Low = PaCO2 < 35;
  const co2Normal = !co2High && !co2Low;
  const hco3High = HCO3 > 26;
  const hco3Low = HCO3 < 22;
  const hco3Normal = !hco3High && !hco3Low;

  const a = answer.toLowerCase();

  if (a.includes("respiratory acidosis")) {
    if (!co2High) return false;
    if (a.includes("uncompensated")) return acidic && hco3Normal;
    if (a.includes("partially")) return acidic && hco3High;
    if (a.includes("fully")) return normalPH && co2High && hco3High;
  }
  if (a.includes("respiratory alkalosis")) {
    if (!co2Low) return false;
    if (a.includes("uncompensated")) return alkalotic && hco3Normal;
    if (a.includes("partially")) return alkalotic && hco3Low;
    if (a.includes("fully")) return normalPH && co2Low && hco3Low;
  }
  if (a.includes("metabolic acidosis")) {
    if (!hco3Low) return false;
    if (a.includes("uncompensated")) return acidic && co2Normal;
    if (a.includes("partially")) return acidic && co2Low;
    if (a.includes("fully")) return normalPH && hco3Low && co2Low;
  }
  if (a.includes("metabolic alkalosis")) {
    if (!hco3High) return false;
    if (a.includes("uncompensated")) return alkalotic && co2Normal;
    if (a.includes("partially")) return alkalotic && co2High;
    if (a.includes("fully")) return normalPH && hco3High && co2High;
  }
  if (a.includes("normal")) {
    return normalPH && co2Normal && hco3Normal;
  }
  return false;
}

function shuffleChoices(choices: string[]): string[] {
  return [...choices].sort(() => Math.random() - 0.5);
}

function buildPrompt(difficulty: string, count: number): string {
  const difficultyGuide =
    difficulty === "easy"
      ? "Generate ONLY uncompensated disorders (pH clearly acidic or alkalotic, compensating value within normal range). Keep scenarios straightforward. No mixed disorders."
      : difficulty === "hard"
      ? "Generate a mix: some partially compensated, some fully compensated (pH normalized), 1-2 mixed disorders. Scenarios can be complex multi-system patients."
      : "Generate a mix: uncompensated, partially compensated, and 1 fully compensated. Include both respiratory and metabolic disorders.";

  return `
You are an expert NCLEX-RN educator generating ABG (Arterial Blood Gas) interpretation practice questions for nursing students.

Generate ${count} unique ABG questions. Each must be clinically accurate — the values MUST match the stated interpretation.

Normal ranges (MEMORIZE THESE):
- pH: 7.35–7.45 (acidic if < 7.35, alkalotic if > 7.45)
- PaCO2: 35–45 mmHg (respiratory component — high = acidosis, low = alkalosis)
- HCO3⁻: 22–26 mEq/L (metabolic component — low = acidosis, high = alkalosis)
- PaO2: 80–100 mmHg
- SaO2: 95–100%

Compensation rules:
- Resp Acidosis → kidneys RETAIN HCO3 (HCO3 rises above 26)
  - Uncompensated: pH < 7.35, CO2 > 45, HCO3 22-26 (normal)
  - Partially compensated: pH < 7.35, CO2 > 45, HCO3 > 26 (rising but pH still acidic)
  - Fully compensated: pH 7.35-7.45, CO2 > 45, HCO3 > 26 (pH normalized)
- Resp Alkalosis → kidneys EXCRETE HCO3 (HCO3 falls below 22)
  - Uncompensated: pH > 7.45, CO2 < 35, HCO3 22-26 (normal)
  - Partially compensated: pH > 7.45, CO2 < 35, HCO3 < 22 (falling but pH still alkalotic)
  - Fully compensated: pH 7.35-7.45, CO2 < 35, HCO3 < 22 (pH normalized)
- Metabolic Acidosis → lungs BLOW OFF CO2 (CO2 falls below 35)
  - Uncompensated: pH < 7.35, HCO3 < 22, CO2 35-45 (normal)
  - Partially compensated: pH < 7.35, HCO3 < 22, CO2 < 35 (falling but pH still acidic)
  - Fully compensated: pH 7.35-7.45, HCO3 < 22, CO2 < 35 (pH normalized)
- Metabolic Alkalosis → lungs RETAIN CO2 (CO2 rises above 45)
  - Uncompensated: pH > 7.45, HCO3 > 26, CO2 35-45 (normal)
  - Partially compensated: pH > 7.45, HCO3 > 26, CO2 > 45 (rising but pH still alkalotic)
  - Fully compensated: pH 7.35-7.45, HCO3 > 26, CO2 > 45 (pH normalized)

Difficulty: ${difficulty}
${difficultyGuide}

Correct answer labels to use (use EXACTLY these strings):
- "Respiratory Acidosis — Uncompensated"
- "Respiratory Acidosis — Partially Compensated"
- "Respiratory Acidosis — Fully Compensated"
- "Respiratory Alkalosis — Uncompensated"
- "Respiratory Alkalosis — Partially Compensated"
- "Respiratory Alkalosis — Fully Compensated"
- "Metabolic Acidosis — Uncompensated"
- "Metabolic Acidosis — Partially Compensated"
- "Metabolic Acidosis — Fully Compensated"
- "Metabolic Alkalosis — Uncompensated"
- "Metabolic Alkalosis — Partially Compensated"
- "Metabolic Alkalosis — Fully Compensated"
- "Normal ABG"

Return ONLY valid JSON:
{
  "questions": [
    {
      "scenario": "string — 1-2 sentence clinical scenario with patient age, presentation, and relevant history. Make scenarios varied: COPD, asthma, anxiety attack, DKA, renal failure, vomiting, NG suction, post-op, ARDS, PE, opioid OD, sepsis, etc.",
      "values": {
        "pH": number (2 decimal places),
        "PaCO2": number (integer or 1 decimal),
        "HCO3": number (integer or 1 decimal),
        "PaO2": number (integer),
        "SaO2": number (integer, percent without %)
      },
      "correctAnswer": "string (use EXACTLY one of the labels above)",
      "choices": ["array of EXACTLY 4 strings — correctAnswer + 3 plausible distractors from the list above. Do NOT repeat the same answer twice."],
      "explanation": "3-5 sentences: walk through the interpretation step by step — pH direction, which component is responsible, compensation status, and why. Reference the actual numbers.",
      "clinicalPearl": "1-2 sentences: a clinical tip about this ABG pattern — what causes it, how to treat, or what to watch for at the bedside"
    }
  ]
}

CRITICAL: Double-check EVERY question before outputting. The values you write MUST match the correctAnswer. pH < 7.35 = acidic. pH > 7.45 = alkalotic. If the answer says Uncompensated, the compensating value MUST be normal.
  `.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { difficulty = "mixed", count = 6 } = await req.json();

    const prompt = buildPrompt(difficulty, Math.min(count, 8));

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.75,
    });

    const raw = JSON.parse(response.choices[0].message.content || "{}");
    const questions: ABGQuestion[] = Array.isArray(raw.questions) ? raw.questions : [];

    // Validate and filter — only return questions with clinically accurate values
    const valid = questions
      .filter((q): q is ABGQuestion => {
        if (!q?.values || !q.correctAnswer || !Array.isArray(q.choices) || q.choices.length !== 4) return false;
        if (!q.scenario || !q.explanation) return false;
        return validateABG(q.values, q.correctAnswer);
      })
      .map((q) => ({
        ...q,
        choices: shuffleChoices(q.choices),
      }));

    if (valid.length === 0) {
      return NextResponse.json({ error: "Failed to generate valid questions. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ questions: valid });
  } catch (error) {
    console.error("ABG generate error:", error);
    return NextResponse.json({ error: "Failed to generate questions." }, { status: 500 });
  }
}
