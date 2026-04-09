import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AVAILABLE_TOPICS = [
  "Cardiovascular - Heart Failure",
  "Cardiovascular - MI & ACS",
  "Cardiovascular - Dysrhythmias & EKG",
  "Cardiovascular - Hypertension",
  "Cardiovascular - DVT & PE",
  "Cardiovascular - Peripheral Vascular Disease",
  "Cardiovascular - Shock",
  "Cardiovascular - Cardiac Medications",
  "Cardiovascular - IV Fluids & Hemodynamics",
  "Respiratory - Pneumonia",
  "Respiratory - COPD",
  "Respiratory - Asthma",
  "Respiratory - Pulmonary Embolism",
  "Respiratory - ARDS & Respiratory Failure",
  "Respiratory - Pneumothorax & Chest Tubes",
  "Respiratory - Oxygen Therapy & ABGs",
  "Respiratory - Mechanical Ventilation",
  "Respiratory - TB",
  "Pharmacology - Antibiotics",
  "Pharmacology - Cardiac Medications",
  "Pharmacology - Anticoagulants",
  "Pharmacology - Diuretics",
  "Pharmacology - Insulin & Diabetes Medications",
  "Pharmacology - Psychiatric Medications",
  "Pharmacology - Opioids & Pain Management",
  "Pharmacology - High Alert Medications",
  "Pharmacology - Dosage Calculations",
  "Pharmacology - Drug Interactions & Safety",
  "Pharmacology - IV Push & Titration",
  "Fundamentals - Infection Control & Precautions",
  "Fundamentals - Wound Care & Sterile Technique",
  "Fundamentals - Catheter & Tube Care",
  "Fundamentals - Vital Signs & Assessment",
  "Fundamentals - Prioritization & ABCs",
  "Fundamentals - Delegation & Supervision",
  "Fundamentals - Documentation & SBAR",
  "Fundamentals - Patient Safety & Fall Prevention",
  "Fundamentals - Patient Rights & Ethics",
  "Fundamentals - Pain Assessment & Management",
  "Med-Surg - Diabetes & Endocrine",
  "Med-Surg - Renal Failure & Dialysis",
  "Med-Surg - Liver & GI Disorders",
  "Med-Surg - Neurological Disorders",
  "Med-Surg - Stroke & TBI",
  "Med-Surg - Musculoskeletal & Orthopedic",
  "Med-Surg - Cancer & Oncology Nursing",
  "Med-Surg - Hematology & Blood Disorders",
  "Med-Surg - Electrolyte Imbalances",
  "Med-Surg - Acid-Base Disorders",
  "Med-Surg - Sepsis & SIRS",
  "Med-Surg - Pre & Post-Op Care",
  "Med-Surg - Burns & Wound Management",
  "Med-Surg - Autoimmune & Immune Disorders",
  "Maternal-Newborn - Prenatal Care & Antepartum",
  "Maternal-Newborn - Antepartum Complications",
  "Maternal-Newborn - Labor & Delivery",
  "Maternal-Newborn - Intrapartum Complications",
  "Maternal-Newborn - Postpartum Care",
  "Maternal-Newborn - Postpartum Complications",
  "Maternal-Newborn - Newborn Assessment & Care",
  "Maternal-Newborn - Newborn Complications",
  "Maternal-Newborn - High-Risk Pregnancy",
  "Pediatrics - Growth & Development",
  "Pediatrics - Immunizations",
  "Pediatrics - Respiratory Disorders in Children",
  "Pediatrics - Cardiac Defects in Children",
  "Pediatrics - Neurological Disorders in Children",
  "Pediatrics - GI Disorders in Children",
  "Pediatrics - Hematologic Disorders in Children",
  "Pediatrics - Endocrine Disorders in Children",
  "Pediatrics - Child Abuse & Safety",
  "Pediatrics - Pediatric Pain & Medication Safety",
  "Psychiatric - Schizophrenia & Psychosis",
  "Psychiatric - Bipolar Disorder",
  "Psychiatric - Depression & Suicide Risk",
  "Psychiatric - Anxiety & Trauma Disorders",
  "Psychiatric - Personality Disorders",
  "Psychiatric - Substance Use & Withdrawal",
  "Psychiatric - Eating Disorders",
  "Psychiatric - Therapeutic Communication",
  "Psychiatric - Crisis Intervention & Safety",
  "Psychiatric - Psychiatric Medications",
  "Leadership - Prioritization & Triage",
  "Leadership - Delegation & Scope of Practice",
  "Leadership - Quality Improvement & Safety",
  "Leadership - Legal & Ethical Issues",
  "Leadership - Disaster & Emergency Preparedness",
] as const;

const SUPPORTED_QUESTION_TYPES = [
  "Multiple Choice",
  "Priority",
  "Delegation",
  "Pharmacology",
  "Select All That Apply",
] as const;

type AnswerLetter = "A" | "B" | "C" | "D";

type SupportedQuestionType = (typeof SUPPORTED_QUESTION_TYPES)[number];

type RetryQuestion = {
  topic?: string;
  questionType?: SupportedQuestionType;
  question: string;
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer?: AnswerLetter;
  correctAnswers?: AnswerLetter[];
  rationale: string;
};

type QuestionResponse = {
  topic: string;
  questionType: SupportedQuestionType;
  question: string;
  choices: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer?: AnswerLetter;
  correctAnswers?: AnswerLetter[];
  rationale: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAnswerLetter(value: unknown): value is AnswerLetter {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function normalizeTopic(rawTopic: unknown, fallbackTopic = "Fundamentals"): string {
  if (!isNonEmptyString(rawTopic)) return fallbackTopic;
  return rawTopic.trim();
}

function normalizeQuestionType(value: unknown): SupportedQuestionType {
  if (
    value === "Multiple Choice" ||
    value === "Priority" ||
    value === "Delegation" ||
    value === "Pharmacology" ||
    value === "Select All That Apply"
  ) {
    return value;
  }

  return "Multiple Choice";
}

function normalizeCorrectAnswer(value: unknown): AnswerLetter | undefined {
  if (typeof value === "string") {
    const upper = value.trim().toUpperCase();
    if (upper === "A" || upper === "B" || upper === "C" || upper === "D") {
      return upper;
    }
  }

  return undefined;
}

function normalizeCorrectAnswers(value: unknown): AnswerLetter[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim().toUpperCase() : ""))
    .filter((item): item is AnswerLetter => isAnswerLetter(item));

  const unique = normalized.filter((item, index, arr) => arr.indexOf(item) === index);

  if (unique.length < 2) return undefined;

  return [...unique].sort();
}

function normalizeQuestion(
  raw: unknown,
  fallbackTopic: string,
  requestedQuestionType: SupportedQuestionType
): QuestionResponse | null {
  if (!raw || typeof raw !== "object") return null;

  const item = raw as {
    topic?: unknown;
    questionType?: unknown;
    question?: unknown;
    choices?: {
      A?: unknown;
      B?: unknown;
      C?: unknown;
      D?: unknown;
    };
    correctAnswer?: unknown;
    correctAnswers?: unknown;
    rationale?: unknown;
  };

  const question = isNonEmptyString(item.question) ? item.question.trim() : "";
  const rationale = isNonEmptyString(item.rationale) ? item.rationale.trim() : "";

  const choices = {
    A: isNonEmptyString(item.choices?.A) ? item.choices.A.trim() : "",
    B: isNonEmptyString(item.choices?.B) ? item.choices.B.trim() : "",
    C: isNonEmptyString(item.choices?.C) ? item.choices.C.trim() : "",
    D: isNonEmptyString(item.choices?.D) ? item.choices.D.trim() : "",
  };

  const hasAllChoices = !!choices.A && !!choices.B && !!choices.C && !!choices.D;

  if (!question || !rationale || !hasAllChoices) {
    return null;
  }

  const normalizedType =
    requestedQuestionType === "Select All That Apply"
      ? "Select All That Apply"
      : normalizeQuestionType(item.questionType ?? requestedQuestionType);

  if (normalizedType === "Select All That Apply") {
    const correctAnswers = normalizeCorrectAnswers(item.correctAnswers);

    if (!correctAnswers) return null;

    return {
      topic: normalizeTopic(item.topic, fallbackTopic),
      questionType: normalizedType,
      question,
      choices,
      correctAnswers,
      rationale,
    };
  }

  const correctAnswer = normalizeCorrectAnswer(item.correctAnswer);

  if (!correctAnswer) return null;

  return {
    topic: normalizeTopic(item.topic, fallbackTopic),
    questionType: normalizedType,
    question,
    choices,
    correctAnswer,
    rationale,
  };
}

function sanitizeWeakTopics(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is string => isNonEmptyString(item))
    .map((item) => item.trim())
    .filter((item, index, arr) => arr.indexOf(item) === index);
}

function sanitizeRetryQuestions(raw: unknown): RetryQuestion[] {
  if (!Array.isArray(raw)) return [];

  return raw.filter((item): item is RetryQuestion => {
    if (!item || typeof item !== "object") return false;

    const candidate = item as RetryQuestion;

    const hasChoices =
      !!candidate.choices &&
      isNonEmptyString(candidate.choices.A) &&
      isNonEmptyString(candidate.choices.B) &&
      isNonEmptyString(candidate.choices.C) &&
      isNonEmptyString(candidate.choices.D);

    const hasSingleCorrect =
      typeof candidate.correctAnswer === "string" &&
      isAnswerLetter(candidate.correctAnswer);

    const hasMultiCorrect =
      Array.isArray(candidate.correctAnswers) &&
      candidate.correctAnswers.length >= 2 &&
      candidate.correctAnswers.every((answer) => isAnswerLetter(answer));

    return (
      isNonEmptyString(candidate.question) &&
      hasChoices &&
      isNonEmptyString(candidate.rationale) &&
      (hasSingleCorrect || hasMultiCorrect)
    );
  });
}

function buildQuestionTypeInstruction(questionType: SupportedQuestionType): string {
  if (questionType === "Multiple Choice") {
    return `
- Use standard single-best-answer NCLEX multiple-choice format.
- Every question must have exactly 4 answer choices.
- Only 1 answer may be correct.
- Return "questionType": "Multiple Choice".
- Return "correctAnswer" only.
- Do not write simple definition recall items only; make them clinically applied.
    `.trim();
  }

  if (questionType === "Priority") {
    return `
- Every question must ask for the nurse's priority action, priority patient, best first response, or what should be done first.
- Use ABCs, safety, acute vs chronic, unstable vs stable, and least restrictive principles when appropriate.
- Do not drift into generic multiple-choice knowledge recall.
- Every question must have exactly 4 answer choices.
- Only 1 answer may be correct.
- Return "questionType": "Priority".
- Return "correctAnswer" only.
    `.trim();
  }

  if (questionType === "Delegation") {
    return `
- Every question must focus on delegation, assignment, supervision, or which task is appropriate for RN, LPN/LVN, or UAP.
- Every scenario must be delegation-specific.
- Do not drift into generic med-surg questions.
- Every question must have exactly 4 answer choices.
- Only 1 answer may be correct.
- Return "questionType": "Delegation".
- Return "correctAnswer" only.
    `.trim();
  }

  if (questionType === "Pharmacology") {
    return `
- Every question must center on a medication decision.
- Focus on side effects, contraindications, adverse effects, monitoring, administration, interactions, or patient teaching.
- Do not drift into generic nursing questions that merely mention a drug.
- Every question must have exactly 4 answer choices.
- Only 1 answer may be correct.
- Return "questionType": "Pharmacology".
- Return "correctAnswer" only.
    `.trim();
  }

  return `
- Every question must be Select All That Apply.
- Every question must have exactly 4 answer choices.
- Each question must have 2 to 4 correct answers.
- Never return only 1 correct answer.
- Return "questionType": "Select All That Apply".
- Return "correctAnswers" as an array like ["A", "C"].
- Do NOT return "correctAnswer" for SATA questions.
    `.trim();
}

function buildRetryPrompt(
  retryQuestions: RetryQuestion[],
  count: number,
  difficulty: string,
  questionType: SupportedQuestionType
) {
  const questionTypeInstruction = buildQuestionTypeInstruction(questionType);

  return `
You are an expert NCLEX-RN question writer.

A student previously missed the following questions. Use them only as concept references:
${JSON.stringify(retryQuestions, null, 2)}

Your job:
Generate ${count} NEW original NCLEX-style nursing questions.

Rules:
- Test the SAME underlying concepts as the missed questions.
- Do NOT copy the original wording.
- Do NOT repeat the same scenario.
- Use fresh patient setups and clinical details.
- Make the new questions slightly harder, but still fair and teachable.
- Difficulty: ${difficulty}
- Question Type: ${questionType}
${questionTypeInstruction}
- Include a concise rationale for each question.
- Keep them clinically realistic, NCLEX-style, and educational.
- Every object must include a "topic" field.
- Every object must include a "questionType" field.
- Return EXACTLY ${count} questions.
- Return only data that matches the required schema.
  `.trim();
}

function buildStandardPrompt(
  topic: string,
  customTopic: string,
  customTopicDetails: string,
  difficulty: string,
  questionType: SupportedQuestionType,
  count: number,
  weakTopics: string[]
) {
  const finalFocus = customTopic || topic;
  const questionTypeInstruction = buildQuestionTypeInstruction(questionType);

  let topicInstruction = "";

  if (topic === "Use Weak Areas Only" && !customTopic) {
    const chosenWeakTopics = weakTopics.length > 0 ? weakTopics : [...AVAILABLE_TOPICS];

    topicInstruction = `
- Use ONLY these weak-area topics:
  ${chosenWeakTopics.join(", ")}
- Create a mixed quiz using these weak-area topics.
- Spread the questions across multiple weak topics when possible.
- Include the topic used for each question in each question object as "topic".
    `.trim();
  } else if (topic === "Random Topic" && !customTopic) {
    topicInstruction = `
- Choose ONE random topic from this list:
  ${AVAILABLE_TOPICS.join(", ")}
- Use that one chosen topic consistently for all questions in this set.
- Include the chosen topic in each question object as "topic".
    `.trim();
  } else if (topic === "All Topics" && !customTopic) {
    topicInstruction = `
- Use a balanced mix of topics from this list:
  ${AVAILABLE_TOPICS.join(", ")}
- Spread the questions across multiple topics, not just one.
- Include the topic used for each question in each question object as "topic".
    `.trim();
  } else {
    topicInstruction = `
- Primary topic focus: ${finalFocus}
- All generated questions should be about this topic or subtopic.
- Include "topic": "${finalFocus}" in each question object unless a tighter subtopic label makes more sense.
    `.trim();
  }

  const customFocusInstruction =
    customTopic || customTopicDetails
      ? `
- Narrow the quiz around this custom focus: ${customTopic || "Not specified"}
- Additional requested detail: ${customTopicDetails || "None provided"}
- If a broader topic is selected, treat this custom focus as the priority subtopic.
- Keep the questions clinically accurate, nursing-specific, and aligned with the requested detail.
        `.trim()
      : "";

  return `
You are an expert NCLEX-RN question writer.

Generate ${count} original NCLEX-style nursing questions.

Requirements:
${topicInstruction}
${customFocusInstruction ? `${customFocusInstruction}\n` : ""}- Difficulty: ${difficulty}
- Question Type: ${questionType}
${questionTypeInstruction}
- Use realistic nursing scenarios.
- Include a concise rationale for each question.
- Keep them clinically realistic and educational.
- Make each question meaningfully different from the others.
- Avoid repeating the same stem pattern over and over.
- Every question object must include a "topic" field.
- Every question object must include a "questionType" field.
- Return EXACTLY ${count} questions.
- Return only data that matches the required schema.
  `.trim();
}

function getQuestionSetSchema(questionType: SupportedQuestionType) {
  const questionTypeEnum = [...SUPPORTED_QUESTION_TYPES];

  const commonProperties = {
    topic: { type: "string" },
    questionType: {
      type: "string",
      enum: questionTypeEnum,
    },
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
    rationale: { type: "string" },
  } as const;

  if (questionType === "Select All That Apply") {
    return {
      name: "nclex_question_set_sata",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          questions: {
            type: "array",
            minItems: 1,
            maxItems: 50,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                ...commonProperties,
                correctAnswers: {
                  type: "array",
                  minItems: 2,
                  maxItems: 4,
                  items: {
                    type: "string",
                    enum: ["A", "B", "C", "D"],
                  },
                },
              },
              required: [
                "topic",
                "questionType",
                "question",
                "choices",
                "correctAnswers",
                "rationale",
              ],
            },
          },
        },
        required: ["questions"],
      },
    } as const;
  }

  return {
    name: "nclex_question_set_single",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        questions: {
          type: "array",
          minItems: 1,
          maxItems: 50,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              ...commonProperties,
              correctAnswer: {
                type: "string",
                enum: ["A", "B", "C", "D"],
              },
            },
            required: [
              "topic",
              "questionType",
              "question",
              "choices",
              "correctAnswer",
              "rationale",
            ],
          },
        },
      },
      required: ["questions"],
    },
  } as const;
}

async function generateQuestionsOnce(prompt: string, questionType: SupportedQuestionType) {
  const schema = getQuestionSetSchema(questionType);

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
    text: {
      format: {
        type: "json_schema",
        name: schema.name,
        strict: schema.strict,
        schema: schema.schema,
      },
    },
  });

  const rawText = response.output_text || "";

  if (!rawText.trim()) {
    throw new Error("Model returned no text.");
  }

  const parsed = JSON.parse(rawText);

  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.questions)) {
    throw new Error("Model did not return a valid structured question payload.");
  }

  return {
    rawText,
    parsed: parsed.questions as unknown[],
  };
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function rebalanceSingleAnswerQuestion(question: QuestionResponse): QuestionResponse {
  if (!question.correctAnswer) return question;

  const originalChoices = [
    { letter: "A" as const, text: question.choices.A },
    { letter: "B" as const, text: question.choices.B },
    { letter: "C" as const, text: question.choices.C },
    { letter: "D" as const, text: question.choices.D },
  ];

  const correctChoiceText = question.choices[question.correctAnswer];
  const shuffled = shuffleArray(originalChoices);

  const remappedChoices = {
    A: shuffled[0].text,
    B: shuffled[1].text,
    C: shuffled[2].text,
    D: shuffled[3].text,
  };

  const newCorrectAnswer: AnswerLetter =
    shuffled[0].text === correctChoiceText
      ? "A"
      : shuffled[1].text === correctChoiceText
      ? "B"
      : shuffled[2].text === correctChoiceText
      ? "C"
      : "D";

  return {
    ...question,
    choices: remappedChoices,
    correctAnswer: newCorrectAnswer,
  };
}

function rebalanceSataQuestion(question: QuestionResponse): QuestionResponse {
  if (!question.correctAnswers || question.correctAnswers.length === 0) return question;

  const originalChoices = [
    { letter: "A" as const, text: question.choices.A },
    { letter: "B" as const, text: question.choices.B },
    { letter: "C" as const, text: question.choices.C },
    { letter: "D" as const, text: question.choices.D },
  ];

  const correctChoiceTexts = question.correctAnswers.map((letter) => question.choices[letter]);
  const shuffled = shuffleArray(originalChoices);

  const remappedChoices = {
    A: shuffled[0].text,
    B: shuffled[1].text,
    C: shuffled[2].text,
    D: shuffled[3].text,
  };

  const newCorrectAnswers = shuffled
    .filter((choice) => correctChoiceTexts.includes(choice.text))
    .map((choice) => choice.letter)
    .sort();

  return {
    ...question,
    choices: remappedChoices,
    correctAnswers: newCorrectAnswers,
  };
}

function rebalanceQuestionAnswers(question: QuestionResponse): QuestionResponse {
  if (question.questionType === "Select All That Apply") {
    return rebalanceSataQuestion(question);
  }

  return rebalanceSingleAnswerQuestion(question);
}

function dedupeQuestions(questions: QuestionResponse[]): QuestionResponse[] {
  const seen = new Set<string>();

  return questions.filter((question) => {
    const key = `${question.questionType}::${question.topic}::${question.question
      .trim()
      .toLowerCase()}`;

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

    const topic = isNonEmptyString(body?.topic) ? body.topic.trim() : "Fundamentals";
    const customTopic = isNonEmptyString(body?.customTopic) ? body.customTopic.trim() : "";
    const customTopicDetails = isNonEmptyString(body?.customTopicDetails)
      ? body.customTopicDetails.trim()
      : "";
    const difficulty = isNonEmptyString(body?.difficulty) ? body.difficulty.trim() : "Medium";
    const questionType = normalizeQuestionType(body?.questionType);

    const requestedCount = Number(body?.questionCount);
    const questionCount = Number.isFinite(requestedCount)
      ? Math.max(1, Math.min(Math.round(requestedCount), 50))
      : 1;

    const weakTopics = sanitizeWeakTopics(body?.weakTopics);
    const retryQuestions = sanitizeRetryQuestions(body?.retryQuestions);

    const finalTopic =
      customTopic ||
      (topic === "Random Topic" || topic === "All Topics" || topic === "Use Weak Areas Only"
        ? "Fundamentals"
        : topic);

    const prompt =
      retryQuestions.length > 0
        ? buildRetryPrompt(retryQuestions, questionCount, difficulty, questionType)
        : buildStandardPrompt(
            topic,
            customTopic,
            customTopicDetails,
            difficulty,
            questionType,
            questionCount,
            weakTopics
          );

    const fallbackTopic =
      customTopic ||
      (retryQuestions[0]?.topic && retryQuestions[0].topic.trim()) ||
      finalTopic ||
      "Fundamentals";

    let finalRawText = "";
    let normalizedQuestions: QuestionResponse[] = [];

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { rawText, parsed } = await generateQuestionsOnce(prompt, questionType);
      finalRawText = rawText;

      normalizedQuestions = dedupeQuestions(
        parsed
          .map((item: unknown) => normalizeQuestion(item, fallbackTopic, questionType))
          .filter((item): item is QuestionResponse => item !== null)
      );

      if (normalizedQuestions.length >= questionCount) {
        break;
      }
    }

    if (normalizedQuestions.length === 0) {
      return NextResponse.json(
        {
          error: "Model returned invalid question objects.",
          raw: finalRawText,
        },
        { status: 500 }
      );
    }

    const finalQuestions = normalizedQuestions
      .slice(0, questionCount)
      .map(rebalanceQuestionAnswers);

    return NextResponse.json(finalQuestions);
  } catch (error) {
    console.error("generate-question route error:", error);

    return NextResponse.json(
      { error: "Failed to generate AI questions." },
      { status: 500 }
    );
  }
}