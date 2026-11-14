// Loads medicines.json and finds the medicines that match a question.
// (Same logic as client/src/lib/medSearch.js.)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../client/src/data/medicines.json');

// Read on every request so edits to the list show up without a restart.
export function loadMedicines() {
  return JSON.parse(readFileSync(FILE, 'utf8'));
}

const STOP = new Set(['what', 'which', 'with', 'have', 'there', 'can', 'take', 'the', 'for', 'and', 'medicine', 'medicines', 'medication', 'tablet', 'tablets', 'pill', 'pills', 'help', 'does', 'about', 'any', 'good', 'use', 'used', 'you', 'our', 'onboard', 'board', 'spacecraft', 'list', 'feel', 'feeling', 'got', 'get', 'should', 'something']);

function words(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
}

export function searchMedicines(question, list) {
  const ws = words(question);
  if (!ws.length) return [];
  return list.filter((m) => {
    const names = [m.name, ...m.aliases].join(' ').toLowerCase();
    const uses = words(m.usedFor.join(' '));
    return ws.some((w) => names.includes(w) || uses.some((u) => u.length > 3 && (u.startsWith(w) || w.startsWith(u))));
  });
}
