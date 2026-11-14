// Local search of medicines.json. Works fully offline, no AI needed.
// (The server has a copy of this logic in server/med-search.js.)
import data from '../data/medicines.json'
import { ESCALATE_MESSAGE, mentionsRedFlagSymptom } from './safety'

export const MEDICINES = data.medicines
export const MED_NOTICE = data.notice

const STOP = new Set(['what', 'which', 'with', 'have', 'there', 'can', 'take', 'the', 'for', 'and', 'medicine', 'medicines', 'medication', 'tablet', 'tablets', 'pill', 'pills', 'help', 'does', 'about', 'any', 'good', 'use', 'used', 'you', 'our', 'onboard', 'board', 'spacecraft', 'list', 'feel', 'feeling', 'got', 'get', 'should', 'something'])

function words(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w))
}

export function searchMedicines(question, list = MEDICINES) {
  const ws = words(question)
  if (!ws.length) return []
  return list.filter((m) => {
    const names = [m.name, ...m.aliases].join(' ').toLowerCase()
    const uses = words(m.usedFor.join(' '))
    return ws.some((w) => names.includes(w) || uses.some((u) => u.length > 3 && (u.startsWith(w) || w.startsWith(u))))
  })
}

export const NOT_ON_LIST =
  "I don't have that medicine on the spacecraft list. Please contact the flight surgeon."

export function describe(m) {
  return `${m.name}\nUsed for: ${m.usedFor.join(', ')}.\nDose: ${m.dosage}\nWarnings: ${m.warnings.join(' ')}`
}

export function answerOffline(question) {
  if (mentionsRedFlagSymptom(question)) return ESCALATE_MESSAGE
  const found = searchMedicines(question)
  if (!found.length) {
    return `${NOT_ON_LIST}\n\nMedicines on the list: ${MEDICINES.map((m) => m.name).join(', ')}.`
  }
  return `From the spacecraft list (${MED_NOTICE}):\n\n${found.map(describe).join('\n\n')}`
}
