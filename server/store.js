// A tiny database for the demo server: one JSON file in server/data/ (never committed).
// Every saved record gets a growing number ("seq"), so devices can ask for "everything new since X".
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'data');
mkdirSync(DATA_DIR, { recursive: true });
const FILE = path.join(DATA_DIR, 'db.json');

function load() {
  if (!existsSync(FILE)) return { seq: 0, tables: {} };
  try {
    return JSON.parse(readFileSync(FILE, 'utf8'));
  } catch {
    console.warn('server/data/db.json could not be read. Starting with an empty store.');
    return { seq: 0, tables: {} };
  }
}

const db = load();
let dirty = false;

function flush() {
  if (!dirty) return;
  dirty = false;
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(db));
  renameSync(tmp, FILE); // write-then-rename, so a crash never leaves half a file
}

// Writes once at the end of the current request (many records in one sync = one write).
function save() {
  if (!dirty) setImmediate(flush);
  dirty = true;
}

// Save anything waiting when the server is stopped (Ctrl + C).
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    flush();
    process.exit(0);
  });
}
process.on('exit', flush);

// Adds or replaces a record (matched by uid). Returns the saved record.
export function upsert(table, record) {
  db.tables[table] ??= {};
  const saved = { ...db.tables[table][record.uid], ...record, _seq: ++db.seq, _savedAt: Date.now() };
  db.tables[table][record.uid] = saved;
  save();
  return saved;
}

export function get(table, uid) {
  return db.tables[table]?.[uid] ?? null;
}

// Records in a table changed after "since", optionally filtered.
export function changedSince(table, since = 0, keep = () => true) {
  return Object.values(db.tables[table] ?? {}).filter((r) => r._seq > since && keep(r));
}

export function currentSeq() {
  return db.seq;
}
