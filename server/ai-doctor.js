// AI 1, doctor view: a short clinical summary of one astronaut's shareable data for the flight surgeon.
// Uses the same Groq key as the Health assistant (.env.health). Never diagnoses.
import { getAiConfig } from './keys.js';
import { askGroq } from './groq.js';
import { cleanText, filterAnswer } from './safety.js';

const SYSTEM = `You write short summaries for a flight surgeon reviewing one astronaut in Orbloom, an astronaut health app.
You get the astronaut's recent readings, alertness test results, red-flag alerts and check-in count.

Rules:
- Summarise trends and what changed. Lead with anything red or worsening.
- Never diagnose and never name a condition the astronaut "has". Say "may", "could", "worth reviewing".
- Mention how much data there is and how certain the picture is.
- Suggest what to review or ask, not treatment. No medication advice or doses.
- At most 120 words. Plain text, short "-" bullet points, no markdown, no headings, no bold.`;

export async function doctorSummary(req, res) {
  const body = req.body ?? {};
  const payload = {
    astronaut: cleanText(body.name, 60),
    readings: (Array.isArray(body.summary) ? body.summary : []).slice(0, 10).map((m) => ({
      measurement: cleanText(m?.label, 40),
      latest: cleanText(m?.latest, 40),
      average_last_7: cleanText(m?.average7, 20),
      direction: cleanText(m?.direction, 20),
      status: cleanText(m?.status, 10),
      readings: Number(m?.count) || 0,
    })),
    alertness: cleanText(body.alertness, 200),
    red_flags: (Array.isArray(body.flags) ? body.flags : []).slice(0, 10).map((f) => cleanText(f, 200)),
    checkins_last_7_days: Number(body.checkins) || 0,
  };

  const { apiKey, model, problem } = getAiConfig();
  if (problem === 'missing') return res.json({ fallback: true, reason: 'no-key' });
  if (problem === 'example') return res.json({ fallback: true, reason: 'example-key' });
  try {
    const text = await askGroq({ apiKey, model, system: SYSTEM, user: JSON.stringify(payload, null, 1) });
    res.json({ answer: filterAnswer(text), source: 'ai' });
  } catch (err) {
    console.warn('Doctor summary failed, using fallback:', err.message);
    res.json({ fallback: true, reason: err.code === 'bad-key' ? 'bad-key' : /rate limit/i.test(err.message) ? 'ai-busy' : 'ai-error' });
  }
}
