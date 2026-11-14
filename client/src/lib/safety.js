// Safety rules used in the browser too, so they still apply when offline.

const RED_FLAG_SYMPTOMS =
  /chest pain|chest tight|can'?t breathe|cannot breathe|trouble breathing|difficulty breathing|short(ness)? of breath|faint|passed out|unconscious|seizure|severe headache|worst headache|confus|slurred|numb|paraly|vision loss|can'?t see|heavy bleeding|bleeding a lot|suicid|self[- ]harm|kill myself|overdose/i

export const ESCALATE_MESSAGE =
  'This could be serious. Please contact the flight surgeon or follow your emergency protocol now. ' +
  'Tell a crewmate how you feel. I cannot assess this safely.'

export function mentionsRedFlagSymptom(text) {
  return RED_FLAG_SYMPTOMS.test(text || '')
}

export const DISCLAIMER =
  'Information only, not medical advice. This assistant cannot diagnose and does not replace the flight surgeon or professional medical care.'
