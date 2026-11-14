// Safety rules applied on the server (PRD section 9).

// Symptoms that should always go to the doctor, never to the AI.
const RED_FLAG_SYMPTOMS =
  /chest pain|chest tight|can'?t breathe|cannot breathe|trouble breathing|difficulty breathing|short(ness)? of breath|faint|passed out|unconscious|seizure|severe headache|worst headache|confus|slurred|numb|paraly|vision loss|can'?t see|heavy bleeding|bleeding a lot|suicid|self[- ]harm|kill myself|overdose/i

export const ESCALATE_MESSAGE =
  'This could be serious. Please contact the flight surgeon or follow your emergency protocol now. ' +
  'Tell a crewmate how you feel. I cannot assess this safely.'

export function mentionsRedFlagSymptom(text) {
  return RED_FLAG_SYMPTOMS.test(text || '')
}

// Phrases that sound like a diagnosis. If the AI uses them, we replace the answer.
// Only matches "you have" + a condition name, so normal sentences such as
// "you have 14 readings" or "you have been sleeping less" are not blocked.
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

// Specific doses (e.g. "500 mg", "2 tablets").
const DOSE = /\b\d+(\.\d+)?\s?(mg|milligrams?|mcg|micrograms?|g|gm|grams?|ml|mL|millilit(er|re)s?|units?|tablets?|pills?|capsules?|drops?|puffs?|sprays?)\b/gi

const squash = (t) => String(t || '').toLowerCase().replace(/\s+/g, '')

// A dose in an answer is allowed only if the same text is on the approved medicine list
// for the medicines we gave the AI (allowedDoseText). Anything else would be made up.
function hasInventedDose(text, allowedDoseText) {
  const allowed = new Set((String(allowedDoseText).match(DOSE) ?? []).map(squash))
  const doses = String(text).match(DOSE) ?? []
  return doses.some((d) => !allowed.has(squash(d)))
}

export function filterAnswer(text, { medication = false, allowedDoseText = '' } = {}) {
  if (DIAGNOSIS.test(text)) {
    return 'I can’t give a diagnosis. Your readings may be worth discussing with the flight surgeon, who can look at the full picture.'
  }
  if (medication && hasInventedDose(text, allowedDoseText)) {
    return 'I can’t give doses that are not on the approved list. Please check the medical kit list or ask the flight surgeon.'
  }
  return text
}

export function cleanText(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}
