// AI 1: Health Trends Assistant.
// Explains the astronaut's own graphs in plain language. Never diagnoses.
import { getAiConfig } from './keys.js';
import { askGroq } from './groq.js';
import { ESCALATE_MESSAGE, cleanText, filterAnswer, mentionsRedFlagSymptom } from './safety.js';

const SYSTEM = `You are the Health Trends Assistant in Orbloom, a well-being app for astronauts on long missions.
You explain the astronaut's own health readings in simple, calm, plain language.

Rules you must always follow:
- You are not a doctor. Never diagnose. Never name a disease or condition the person "has".
- Show uncertainty. Say things like "this may", "it could", "based on a few readings". Never claim certainty.
- Mention how much data there is. With few readings, say the picture is rough.
- Give only general self-care ideas (rest, hydration, sleep routine, movement, reducing workload).
- Never give medication instructions or doses.
- If any reading is red, or the person describes worrying symptoms, tell them to contact the flight surgeon.
- Never tell anyone to ignore symptoms.
- Green = stable, yellow = needs attention, red = potentially concerning. These are demo ranges.
- Keep answers under 150 words. Use short paragraphs or a short list with "-" bullets.
- Write plain text only: no markdown, no bold, no headings, no tables.
- Do not add a disclaimer; the app shows one.`;

export async function healthAssistant(req, res) {
  const question = cleanText(req.body?.question, 500);
  const summary = (Array.isArray(req.body?.summary) ? req.body.summary : []).slice(0, 10).map((m) => ({
    measurement: cleanText(m?.label, 40),
    latest: cleanText(m?.latest, 40),
    average_last_7: cleanText(m?.average7, 20),
    direction: cleanText(m?.direction, 20),
    status: cleanText(m?.status, 10),
    number_of_readings: Number(m?.count) || 0,
  }));

  if (mentionsRedFlagSymptom(question)) {
    return res.json({ answer: ESCALATE_MESSAGE, source: 'safety' });
  }

  const { apiKey, model, problem } = getAiConfig();
  if (problem === 'missing') return res.json({ fallback: true, reason: 'no-key' });
  if (problem === 'example') return res.json({ fallback: true, reason: 'example-key' });

  try {
    const text = await askGroq({
      apiKey,
      model,
      system: SYSTEM,
      user: `My recent readings:\n${JSON.stringify(summary, null, 1)}\n\nMy question: ${question || 'Please explain my graphs.'}`,
    });
    res.json({ answer: filterAnswer(text), source: 'ai' });
  } catch (err) {
    console.warn('AI 1 failed, using fallback:', err.message);
    res.json({ fallback: true, reason: err.code === 'bad-key' ? 'bad-key' : /rate limit/i.test(err.message) ? 'ai-busy' : 'ai-error' });
  }
}
