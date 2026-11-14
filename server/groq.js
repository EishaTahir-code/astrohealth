// Sends one question to the Groq API and returns the text answer.
// Throws an error if anything goes wrong, so the caller can fall back
// to the offline answer.
//
// Groq sometimes retires models (the old default "llama-3.3-70b-versatile"
// was removed). If the chosen model no longer exists, we try the next model
// in BACKUP_MODELS and remember the one that worked.
import { BACKUP_MODELS, refusedKeys } from './keys.js';

const URL = 'https://api.groq.com/openai/v1/chat/completions';

// Remembers which model worked last, so we don't retry a dead model every time.
const working = new Map();

export async function askGroq({ apiKey, model, system, user }) {
  const tried = [];
  const start = working.get(model) || model;
  const candidates = [start, model, ...BACKUP_MODELS].filter((m, i, all) => m && all.indexOf(m) === i);

  for (const candidate of candidates) {
    tried.push(candidate);
    let result = await callModel({ apiKey, model: candidate, system, user });
    // Free Groq accounts have a per-minute limit. If Groq asks us to wait a few seconds, wait once and retry.
    if (result.retryAfter != null && result.retryAfter <= 10) {
      await new Promise((r) => setTimeout(r, (result.retryAfter + 0.5) * 1000));
      result = await callModel({ apiKey, model: candidate, system, user });
    }
    if (result.retryAfter != null) throw new Error('Groq is busy (rate limit). Try again in a minute.');
    if (result.modelMissing) continue;
    if (candidate !== model) {
      if (!working.has(model)) console.warn(`Groq model "${model}" is not available. Using "${candidate}" instead.`);
      working.set(model, candidate);
    }
    return result.text;
  }
  throw new Error(`None of these Groq models are available: ${tried.join(', ')}. Set GROQ_MODEL in your .env file.`);
}

async function callModel({ apiKey, model, system, user }) {
  // The gpt-oss models "think" before answering. Keep that short and hidden,
  // and leave room for it in max_tokens.
  const reasoning = model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low', include_reasoning: false } : {};

  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 700,
      ...reasoning,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const code = body?.error?.code;
    if (res.status === 404 || code === 'model_not_found' || code === 'model_decommissioned') {
      return { modelMissing: true };
    }
    if (res.status === 401 || res.status === 403) {
      // Groq does not accept this key (mistyped, deleted, or still the example text).
      refusedKeys.add(apiKey);
      const err = new Error('Groq refused the API key');
      err.code = 'bad-key';
      throw err;
    }
    if (res.status === 429) {
      const wait = Number(res.headers.get('retry-after')) || Number(/try again in ([\d.]+)s/.exec(body?.error?.message ?? '')?.[1]) || 5;
      return { retryAfter: wait };
    }
    throw new Error(`Groq returned status ${res.status}${body?.error?.message ? `: ${body.error.message}` : ''}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Groq returned an empty answer');
  return { text: plainText(text) };
}

// The chat bubbles show plain text, so remove markdown symbols the model may add.
function plainText(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[*•]\s+/gm, '- ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
