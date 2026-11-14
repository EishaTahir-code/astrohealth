// Sends one question to the Groq API and returns the text answer.
// Throws an error if anything goes wrong, so the caller can fall back
// to the offline answer.
export async function askGroq({ apiKey, model, system, user }) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 500,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Groq returned status ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Groq returned an empty answer');
  return text;
}
