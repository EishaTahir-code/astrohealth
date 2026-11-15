// Orbloom AI, running as a Supabase Edge Function (it replaced the local server's /api/ai routes).
//
//   GET                                -> { ok, ai: { health, problem } }   (is a Groq key set?)
//   POST { which: 'health', ... }      -> Health Trends Assistant (astronauts)
//   POST { which: 'doctor-summary', ...} -> short summary for the flight surgeon (doctors)
//
// The Groq key is the Edge Function secret GROQ_API_KEY (set in the Supabase dashboard).
// It never reaches the browser. If the key is missing or the AI fails, the answer is
// { fallback: true, reason } and the app shows its offline answer instead.
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// ---------------------------------------------------------------- key
const DEFAULT_MODEL = 'openai/gpt-oss-120b'
const BACKUP_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b']
let refused = '' // a key Groq turned down (until the function restarts)

// The key's secret name should be GROQ_API_KEY. A Groq key saved under another name (for example
// "orbloom") also works: Groq keys always start with "gsk_".
function findKey() {
  const named = (Deno.env.get('GROQ_API_KEY') ?? '').trim()
  if (named) return named
  for (const value of Object.values(Deno.env.toObject())) {
    if (/^gsk_/.test(value.trim())) return value.trim()
  }
  return ''
}

function aiConfig() {
  const apiKey = findKey()
  const model = (Deno.env.get('GROQ_MODEL') ?? '').trim() || DEFAULT_MODEL
  let problem: string | null = null
  if (!apiKey) problem = 'missing'
  else if (/your-groq-key-here|your_key|^gsk_your/i.test(apiKey)) problem = 'example'
  else if (apiKey === refused) problem = 'refused'
  return { apiKey, model, problem }
}

// ---------------------------------------------------------------- safety (PRD section 9)
const RED_FLAG_SYMPTOMS =
  /chest pain|chest tight|can'?t breathe|cannot breathe|trouble breathing|difficulty breathing|short(ness)? of breath|faint|passed out|unconscious|seizure|severe headache|worst headache|confus|slurred|numb|paraly|vision loss|can'?t see|heavy bleeding|bleeding a lot|suicid|self[- ]harm|kill myself|overdose/i

const ESCALATE_MESSAGE =
  'This could be serious. Please contact the flight surgeon or follow your emergency protocol now. ' +
  'Tell a crewmate how you feel. I cannot assess this safely.'

const CONDITIONS =
  '(?:hypertension|hypotension|high blood pressure|low blood pressure|diabetes|prediabetes|an? infection|infection|' +
  'heart disease|a heart condition|an? arrhythmia|arrhythmia|tachycardia|bradycardia|a fever|fever|covid|the flu|flu|' +
  'insomnia|sleep apnea|apnea|depression|anxiety|an? anxiety disorder|anemia|anaemia|cancer|' +
  'an? (?:disease|disorder|syndrome|illness|medical condition|condition)|(?:a |an )?\\w+ (?:disease|disorder|syndrome))'
const DIAGNOSIS = new RegExp(
  [
    `\\byou(?:'ve| have)? (?:definitely |clearly |probably |likely |may |might |could )?(?:have|have got|are developing|are suffering from|(?:have )?been diagnosed with) ${CONDITIONS}\\b`,
    `\\b(?:indicates?|signals?|means|confirms?|shows?) (?:that )?(?:you (?:have|are developing) )?(?:developing |early |the onset of )?${CONDITIONS}\\b`,
    '\\b(?:my|the|your) diagnosis is\\b',
    '\\byou are (?:hypertensive|diabetic|depressed|sick with)\\b',
  ].join('|'),
  'i',
)
function filterAnswer(text: string) {
  if (DIAGNOSIS.test(text)) {
    return 'I can’t give a diagnosis. Your readings may be worth discussing with the flight surgeon, who can look at the full picture.'
  }
  return text
}

const cleanText = (value: unknown, max: number) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)

// ---------------------------------------------------------------- Groq
const working = new Map<string, string>()

async function askGroq(apiKey: string, model: string, system: string, user: string) {
  const start = working.get(model) || model
  const candidates = [start, model, ...BACKUP_MODELS].filter((m, i, all) => m && all.indexOf(m) === i)
  for (const candidate of candidates) {
    let result = await callModel(apiKey, candidate, system, user)
    if (result.retryAfter != null && result.retryAfter <= 10) {
      await new Promise((r) => setTimeout(r, (result.retryAfter! + 0.5) * 1000))
      result = await callModel(apiKey, candidate, system, user)
    }
    if (result.retryAfter != null) throw Object.assign(new Error('rate limit'), { code: 'busy' })
    if (result.modelMissing) continue
    if (candidate !== model) working.set(model, candidate)
    return result.text!
  }
  throw new Error('No Groq model available')
}

async function callModel(apiKey: string, model: string, system: string, user: string): Promise<{ text?: string; retryAfter?: number; modelMissing?: boolean }> {
  const reasoning = model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low', include_reasoning: false } : {}
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
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
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const code = body?.error?.code
    if (res.status === 404 || code === 'model_not_found' || code === 'model_decommissioned') return { modelMissing: true }
    if (res.status === 401 || res.status === 403) {
      refused = apiKey
      throw Object.assign(new Error('Groq refused the API key'), { code: 'bad-key' })
    }
    if (res.status === 429) {
      const wait = Number(res.headers.get('retry-after')) || Number(/try again in ([\d.]+)s/.exec(body?.error?.message ?? '')?.[1]) || 5
      return { retryAfter: wait }
    }
    throw new Error(`Groq returned status ${res.status}`)
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Groq returned an empty answer')
  return { text: plainText(text) }
}

function plainText(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[*•]\s+/gm, '- ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ---------------------------------------------------------------- prompts
const HEALTH_SYSTEM = `You are the Health Trends Assistant in Orbloom, a well-being app for astronauts on long missions.
You explain the astronaut's own health readings in simple, calm, plain language.

Rules you must always follow:
- You are not a doctor. Never diagnose. Never name a disease or condition the person "has".
- Show uncertainty. Say things like "this may", "it could", "based on a few readings". Never claim certainty.
- Mention how much data there is. With few readings, say the picture is rough.
- Give only general self-care ideas (rest, hydration, sleep routine, movement, reducing workload).
- Never give medication instructions or doses.
- If any reading is red, or the person describes worrying symptoms, tell them to contact the flight surgeon.
- Never tell anyone to ignore symptoms.
- Green = stable, yellow = needs attention, red = potentially concerning. These are general reference ranges, not mission limits.
- Keep answers under 150 words. Use short paragraphs or a short list with "-" bullets.
- Write plain text only: no markdown, no bold, no headings, no tables.
- Do not add a disclaimer; the app shows one.`

const DOCTOR_SYSTEM = `You write short summaries for a flight surgeon reviewing one astronaut in Orbloom, an astronaut health app.
You get the astronaut's recent readings, alertness test results, red-flag alerts and check-in count.

Rules:
- Summarise trends and what changed. Lead with anything red or worsening.
- Never diagnose and never name a condition the astronaut "has". Say "may", "could", "worth reviewing".
- Mention how much data there is and how certain the picture is.
- Suggest what to review or ask, not treatment. No medication advice or doses.
- At most 120 words. Plain text, short "-" bullet points, no markdown, no headings, no bold.`

// deno-lint-ignore no-explicit-any
const summaryOf = (list: any) =>
  (Array.isArray(list) ? list : []).slice(0, 10).map((m) => ({
    measurement: cleanText(m?.label, 40),
    latest: cleanText(m?.latest, 40),
    average_last_7: cleanText(m?.average7, 20),
    direction: cleanText(m?.direction, 20),
    status: cleanText(m?.status, 10),
    number_of_readings: Number(m?.count) || 0,
  }))

// ---------------------------------------------------------------- handler
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method === 'GET') {
    const { problem } = aiConfig()
    return json({ ok: true, app: 'orbloom', ai: { health: !problem, problem } })
  }
  if (req.method !== 'POST') return json({ error: 'Not found' }, 404)

  // Who is asking? The sign-in token is checked with Supabase Auth, the role comes from the profile.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) return json({ fallback: true, reason: 'no-session' }, 401)
  const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', userData.user.id).maybeSingle()
  if (!profile) return json({ fallback: true, reason: 'no-session' }, 401)

  const body = await req.json().catch(() => ({}))
  const which = body?.which

  if (which === 'health') {
    if (profile.role !== 'astronaut') return json({ error: 'Your account cannot do that.' }, 403)
    const question = cleanText(body.question, 500)
    if (RED_FLAG_SYMPTOMS.test(question)) return json({ answer: ESCALATE_MESSAGE, source: 'safety' })
    return answer(HEALTH_SYSTEM, `My recent readings:\n${JSON.stringify(summaryOf(body.summary), null, 1)}\n\nMy question: ${question || 'Please explain my graphs.'}`)
  }

  if (which === 'doctor-summary') {
    if (profile.role !== 'doctor') return json({ error: 'Your account cannot do that.' }, 403)
    const payload = {
      astronaut: cleanText(body.name, 60),
      readings: summaryOf(body.summary),
      alertness: cleanText(body.alertness, 200),
      red_flags: (Array.isArray(body.flags) ? body.flags : []).slice(0, 10).map((f: unknown) => cleanText(f, 200)),
      checkins_last_7_days: Number(body.checkins) || 0,
    }
    return answer(DOCTOR_SYSTEM, JSON.stringify(payload, null, 1))
  }

  return json({ error: 'Unknown request' }, 400)
})

async function answer(system: string, user: string) {
  const { apiKey, model, problem } = aiConfig()
  if (problem === 'missing') return json({ fallback: true, reason: 'no-key' })
  if (problem === 'example') return json({ fallback: true, reason: 'example-key' })
  if (problem === 'refused') return json({ fallback: true, reason: 'bad-key' })
  try {
    const text = await askGroq(apiKey, model, system, user)
    return json({ answer: filterAnswer(text), source: 'ai' })
  } catch (err) {
    // deno-lint-ignore no-explicit-any
    const code = (err as any)?.code
    console.warn('AI failed, using fallback:', (err as Error).message)
    return json({ fallback: true, reason: code === 'bad-key' ? 'bad-key' : code === 'busy' ? 'ai-busy' : 'ai-error' })
  }
}
