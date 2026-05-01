// Vercel Edge Function — Gemini proxy for the Practice-tab conversation
// simulator.
//
// Why proxied (vs calling Gemini from the client):
//   - Keeps GEMINI_API_KEY server-side; the client can't leak it.
//   - One place to swap providers later (Anthropic Claude, OpenAI) without
//     touching call sites.
//   - We can soak rate-limit backoff and friendly errors here.
//
// Free tier (gemini-2.5-flash): 10 RPM, 250 RPD. The client also enforces a
// daily cap (default 200) to leave headroom.

import { getScenarioById, type Scenario } from '../src/data/scenarios';

export const config = { runtime: 'edge' };

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface WireHistoryItem {
  role: 'user' | 'assistant';
  text: string;
}

interface WireVocabItem {
  korean: string;
  english: string;
}

interface RequestBody {
  scenarioId: string;
  history: WireHistoryItem[];
  userMessage: string;
  userVocab: WireVocabItem[];
  hintRequest?: boolean;
}

interface GeminiResponseShape {
  response_korean: string;
  response_english: string;
  user_correction: {
    original: string;
    corrected: string;
    explanation_in_english: string;
  } | null;
  scenario_should_end: boolean;
  new_vocab_introduced: WireVocabItem[];
}

// Schema enforced server-side via Gemini's responseSchema. JSON.parse on the
// returned text is reliable because Gemini guarantees the shape.
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    response_korean: { type: 'string' },
    response_english: { type: 'string' },
    user_correction: {
      type: 'object',
      nullable: true,
      properties: {
        original: { type: 'string' },
        corrected: { type: 'string' },
        explanation_in_english: { type: 'string' },
      },
      required: ['original', 'corrected', 'explanation_in_english'],
    },
    scenario_should_end: { type: 'boolean' },
    new_vocab_introduced: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          korean: { type: 'string' },
          english: { type: 'string' },
        },
        required: ['korean', 'english'],
      },
    },
  },
  required: [
    'response_korean',
    'response_english',
    'scenario_should_end',
    'new_vocab_introduced',
  ],
};

function buildSystemPrompt(
  scenario: Scenario,
  userVocab: WireVocabItem[],
  hintRequest: boolean,
): string {
  const vocabList = userVocab.length
    ? userVocab.map((v) => `${v.korean} (${v.english})`).join(', ')
    : '(empty)';

  return [
    `You are a Korean conversation partner for an English-speaking absolute beginner Korean learner (TOPIK 1 level — knows the Hangul alphabet and around fifty vocab words).`,
    ``,
    `You are playing the role of: ${scenario.partnerRole}.`,
    ``,
    `Scenario: ${scenario.description}`,
    `What the learner is trying to do: ${scenario.englishContext}`,
    ``,
    `The learner's known vocabulary: ${vocabList}.`,
    ``,
    `Rules — follow STRICTLY:`,
    `1. Respond in Korean with ONE OR TWO short, natural sentences. Never more.`,
    `2. Use ONLY TOPIK 1 (absolute beginner) grammar and vocabulary. Avoid: complex tenses, indirect speech, advanced particles like 으면서 / 더라도 / 았더니.`,
    `3. Prefer the learner's known vocab when possible.`,
    `4. If you must use a word the learner doesn't know yet, include it in new_vocab_introduced (korean + english).`,
    `5. Stay in character — you ARE the ${scenario.partnerRole}, not a teacher. Don't break the fourth wall.`,
    `6. If the learner makes a clear grammar or vocab mistake (not just a typo), set user_correction with original (their text), corrected (the correction in Korean), and explanation_in_english (1-2 sentences). For minor or no mistakes, set user_correction to null.`,
    `7. End the scenario naturally after 8-15 exchanges by setting scenario_should_end to true at a natural conversational close.`,
    `8. ALWAYS provide response_english as a natural English translation of response_korean.`,
    hintRequest
      ? `9. THE LEARNER ASKED FOR A HINT. Instead of staying in character this turn, give a gentle nudge in English (in response_english) toward what they could say next, without giving the answer outright. Set response_korean to an empty string. Set user_correction to null. Set new_vocab_introduced to an empty array. Set scenario_should_end to false.`
      : ``,
  ]
    .filter((s) => s !== '')
    .join('\n');
}

function buildContents(
  history: WireHistoryItem[],
  userMessage: string,
): Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> {
  // Map our 'user' / 'assistant' roles to Gemini's 'user' / 'model'.
  const out = history.map((m) => ({
    role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
    parts: [{ text: m.text }] as [{ text: string }],
  }));
  out.push({ role: 'user', parts: [{ text: userMessage }] });
  return out;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  contents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }>,
): Promise<Response> {
  return fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.7,
      },
    }),
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      {
        error: 'GEMINI_API_KEY is not set on the server',
        setupHint:
          'Get a free key at https://aistudio.google.com/apikey, then set it as GEMINI_API_KEY in Vercel project settings.',
      },
      503,
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.scenarioId || typeof body.scenarioId !== 'string') {
    return jsonResponse({ error: 'Missing scenarioId' }, 400);
  }
  if (typeof body.userMessage !== 'string') {
    return jsonResponse({ error: 'Missing userMessage' }, 400);
  }
  const scenario = getScenarioById(body.scenarioId);
  if (!scenario) {
    return jsonResponse({ error: `Unknown scenarioId: ${body.scenarioId}` }, 400);
  }

  const systemPrompt = buildSystemPrompt(
    scenario,
    body.userVocab ?? [],
    !!body.hintRequest,
  );
  const contents = buildContents(body.history ?? [], body.userMessage);

  // First attempt + one retry on 5xx with a short backoff. 429 surfaces a
  // friendly "slow down" message immediately rather than retrying.
  let upstream = await callGemini(apiKey, systemPrompt, contents);
  if (upstream.status >= 500 && upstream.status < 600) {
    await new Promise((r) => setTimeout(r, 600));
    upstream = await callGemini(apiKey, systemPrompt, contents);
  }

  if (upstream.status === 429) {
    return jsonResponse(
      {
        error: 'rate_limited',
        message: 'Slow down a sec — the AI needs a breath. Try again in a moment.',
      },
      429,
    );
  }
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    return jsonResponse(
      { error: `Upstream returned ${upstream.status}`, detail: detail.slice(0, 500) },
      502,
    );
  }

  let payload: {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  try {
    payload = await upstream.json();
  } catch {
    return jsonResponse({ error: 'Upstream returned non-JSON' }, 502);
  }

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return jsonResponse(
      { error: 'No text in Gemini response', payload },
      502,
    );
  }

  let parsed: GeminiResponseShape;
  try {
    parsed = JSON.parse(text) as GeminiResponseShape;
  } catch {
    // responseSchema should prevent this, but handle gracefully.
    return jsonResponse(
      { error: 'Gemini returned malformed JSON despite schema', text: text.slice(0, 500) },
      502,
    );
  }

  return jsonResponse(parsed, 200);
}
