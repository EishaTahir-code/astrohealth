// AI 2: Medication Assistant.
// Answers ONLY from medicines.json (the ISS medical kit list).
import { getAiConfig } from './keys.js';
import { askGroq } from './groq.js';
import { loadMedicines, searchMedicines } from './med-search.js';
import { ESCALATE_MESSAGE, cleanText, filterAnswer, mentionsRedFlagSymptom } from './safety.js';

const NOT_ON_LIST = "I don't have that medicine on the spacecraft list. Please contact the flight surgeon.";

function systemPrompt(details, catalog, notice) {
  return `You are the Medication Assistant in Orbloom, an app for astronauts.
You answer questions ONLY about the medicines in the spacecraft medical kit list below. The list is the only truth.

Rules you must always follow:
- Use only the information in the list: name, what it is used for, strength, route, side effects, comments, pack and location.
- If the medicine asked about is not in the list, reply exactly: "${NOT_ON_LIST}"
- Never invent medicines, uses, doses or warnings. You may repeat the strength and the comments exactly as written in the list.
  Never work out, change or suggest an amount to take beyond that text.
- If "access" is "flight surgeon", say the medicine is used only when the flight surgeon directs it.
- Always suggest checking with the flight surgeon before taking anything.
- Never go beyond approved protocols. Never diagnose.
- If the person describes worrying symptoms, tell them to contact the flight surgeon.
- Mention where it is stored (pack and location) when it helps.
- Keep answers under 130 words, plain and calm. Write plain text only: no markdown, no bold, no headings, no tables.
- Do not add a disclaimer; the app shows one.
- The list is: "${notice}".
${details.length ? `\nMATCHING MEDICINES (full details, JSON):\n${JSON.stringify(details, null, 1)}` : ''}
\nALL MEDICINE NAMES ON THE LIST:\n${catalog}`;
}

export async function medicationAssistant(req, res) {
  const question = cleanText(req.body?.question, 500);
  if (!question) return res.status(400).json({ error: 'Please type a question.' });

  if (mentionsRedFlagSymptom(question)) {
    return res.json({ answer: ESCALATE_MESSAGE, source: 'safety' });
  }

  const { apiKey, model } = getAiConfig('medication');
  if (!apiKey) return res.json({ fallback: true, reason: 'no-key' });

  try {
    const data = loadMedicines();
    // Full details only for the medicines that match; the rest as a short list of names,
    // so the AI can say what is (and is not) on board without a huge prompt.
    const details = searchMedicines(question, data.medicines)
      .slice(0, 4)
      .map(({ aliases: _a, category: _c, ...m }) => m);
    const catalog = [...new Set(data.medicines.map((m) => m.name))].join('; ');
    const text = await askGroq({
      apiKey,
      model,
      system: systemPrompt(details, catalog, data.notice),
      user: question,
    });
    // Doses are allowed only if they are copied from the matching medicines' own text.
    const allowed = details.map((m) => `${m.strength} ${m.unit} ${m.comments}`).join(' ');
    res.json({ answer: filterAnswer(text, { medication: true, allowedDoseText: allowed }), source: 'ai' });
  } catch (err) {
    console.warn('AI 2 failed, using fallback:', err.message);
    res.json({ fallback: true, reason: /rate limit/i.test(err.message) ? 'ai-busy' : 'ai-error' });
  }
}
