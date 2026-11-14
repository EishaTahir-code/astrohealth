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
const DIAGNOSIS =
  /\byou (definitely |clearly |probably |likely )?(have|are suffering from|are diagnosed with)\b|\b(my|the) diagnosis is\b|\byou are (hypertensive|diabetic|sick with)\b/i

// Specific doses (e.g. "500 mg", "2 tablets"). The medicine list in this demo has no doses,
// so any dose in an answer would be made up.
const DOSE = /\b\d+(\.\d+)?\s?(mg|milligrams?|mcg|g|ml|millilit(er|re)s?|tablets?|pills?|capsules?|drops?)\b/i

export function filterAnswer(text, { medication = false } = {}) {
  if (DIAGNOSIS.test(text)) {
    return 'I can’t give a diagnosis. Your readings may be worth discussing with the flight surgeon, who can look at the full picture.'
  }
  if (medication && DOSE.test(text)) {
    return 'I can’t give specific doses. Please follow the dose on the approved spacecraft list or ask the flight surgeon.'
  }
  return text
}

export function cleanText(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}
