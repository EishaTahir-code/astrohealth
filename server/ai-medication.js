// AI 2: Medication Assistant.
// Answers ONLY from medicines.json (the spacecraft medicine list).
import { getAiConfig } from './keys.js';
import { askGroq } from './groq.js';
import { loadMedicines, searchMedicines } from './med-search.js';
import { ESCALATE_MESSAGE, cleanText, filterAnswer, mentionsRedFlagSymptom } from './safety.js';

const NOT_ON_LIST = "I don't have that medicine on the spacecraft list. Please contact the flight surgeon.";

function systemPrompt(medicines, notice) {
  return `You are the Medication Assistant in Orbloom, an app for astronauts.
You answer questions ONLY about the medicines in the spacecraft list below. The list is the only truth.

Rules you must always follow:
- Use only the information in the list: name, what it is used for, dose text and warnings, exactly as given.
- If the medicine asked about is not in the list, reply exactly: "${NOT_ON_LIST}"
- Never invent medicines, uses, doses or warnings. Never give a number for a dose. If asked about doses, repeat the list's dose text.
- Never go beyond approved protocols. Never diagnose.
- If the person describes worrying symptoms, tell them to contact the flight surgeon.
- Say the list is: "${notice}".
- Keep answers under 120 words, plain and calm. Write plain text only: no markdown, no bold, no headings, no tables. Do not add a disclaimer; the app shows one.

SPACECRAFT MEDICINE LIST (JSON):
${JSON.stringify(medicines, null, 1)}`;
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
    // Send only the relevant medicines when we can find them; otherwise the whole (small) list.
    const relevant = searchMedicines(question, data.medicines);
    const text = await askGroq({
      apiKey,
      model,
      system: systemPrompt(relevant.length ? relevant : data.medicines, data.notice),
      user: question,
    });
    res.json({ answer: filterAnswer(text, { medication: true }), source: 'ai' });
  } catch (err) {
    console.warn('AI 2 failed, using fallback:', err.message);
    res.json({ fallback: true, reason: 'ai-error' });
  }
}
