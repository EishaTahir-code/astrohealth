// Loads medicines.json (the ISS medical kit list) and finds the medicines that match a question.
// (Same logic as client/src/lib/medSearch.js, so offline answers match the AI's.)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../client/src/data/medicines.json');

// Read on every request so edits to the list show up without a restart.
export function loadMedicines() {
  return JSON.parse(readFileSync(FILE, 'utf8'));
}

const STOP = new Set('what which with have having there can could take taking the for and medicine medicines medication medications tablet tablets pill pills help does about any good best use used you your our onboard board spacecraft station list feel feeling got get should something tell need kit pack where how many much would will give this that from into are was were really very bad some have when been anything other also just like dose doses'.split(' '));

export function words(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
}

// Returns matching medicines, best match first.
export function searchMedicines(question, list) {
  const q = String(question || '').toLowerCase();
  const ws = words(q);
  if (!ws.length) return [];
  const scored = list.map((m) => {
    let score = 0;
    const names = [m.name, ...m.aliases].join(' ').toLowerCase();
    if (ws.some((w) => w.length > 3 && names.includes(w))) score += 10;
    for (const use of m.usedFor) {
      const u = use.toLowerCase();
      if (q.includes(u)) score += 5;
      const uw = words(u);
      if (ws.some((w) => uw.some((x) => x.length > 3 && (x.startsWith(w) || w.startsWith(x))))) score += 2;
    }
    if (score && m.access === 'crew') score += 1;
    return { m, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((s) => s.m);
}
