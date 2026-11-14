// ---------------------------------------------------------------
// WHERE THE AI KEYS GO
// Keys live ONLY in .env files in the project root folder.
// They are never written in code and never sent to the browser.
//
//   AI 1 (Health Trends Assistant):  .env.health      ->  GROQ_API_KEY=your-key-here
//   AI 2 (Medication Assistant):     .env.medication  ->  GROQ_API_KEY=your-key-here
//   Backup for both:                 .env             ->  GROQ_API_KEY=your-key-here
//
// The files are read on every request, so after adding a key you do
// not need to restart anything. If a key is empty, the app uses its
// offline fallback answers instead.
// ---------------------------------------------------------------
import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Groq retired "llama-3.3-70b-versatile", so the default is now gpt-oss-120b.
// If a model disappears, server/groq.js tries the BACKUP_MODELS in order.
const DEFAULT_MODEL = 'openai/gpt-oss-120b';
export const BACKUP_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

function readEnvFile(name) {
  const file = path.join(ROOT, name);
  if (!existsSync(file)) return {};
  try {
    return parseEnv(readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

// which: 'health' (AI 1) or 'medication' (AI 2)
export function getAiConfig(which) {
  const own = readEnvFile(which === 'medication' ? '.env.medication' : '.env.health');
  const shared = readEnvFile('.env');
  return {
    apiKey: (own.GROQ_API_KEY || shared.GROQ_API_KEY || '').trim(),
    model: (own.GROQ_MODEL || shared.GROQ_MODEL || DEFAULT_MODEL).trim(),
  };
}
