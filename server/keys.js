// ---------------------------------------------------------------
// WHERE THE AI KEYS GO
// Keys live ONLY in .env files in the project root folder.
// They are never written in code and never sent to the browser.
//
//   Health assistant + doctors' AI summary:  .env.health  ->  GROQ_API_KEY=your-key-here
//   (older setups: .env.medication or .env also work)
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

// The Groq key for the Health assistant (and the doctors' AI summary).
// It is read from .env.health first, then .env.medication or .env (older setups), on every request.
export function getAiConfig() {
  const files = [readEnvFile('.env.health'), readEnvFile('.env.medication'), readEnvFile('.env')];
  const keys = files.map((f) => (f.GROQ_API_KEY || '').trim()).filter(Boolean);
  // Prefer a real key over one that is still the example text.
  const apiKey = keys.find((k) => keyProblem(k) !== 'example') || keys[0] || '';
  const model = (files.map((f) => f.GROQ_MODEL).find((m) => m && m.trim()) || DEFAULT_MODEL).trim();
  return { apiKey, model, problem: keyProblem(apiKey) };
}

// Explains what is wrong with the key, if anything (shown in the app so it is easy to fix).
export function keyProblem(apiKey) {
  if (!apiKey) return 'missing';
  if (/your-groq-key-here|your_key|^gsk_your/i.test(apiKey)) return 'example';
  if (refusedKeys.has(apiKey)) return 'refused';
  return null;
}

// Keys that Groq turned down (wrong or deleted). Remembered until the server restarts.
export const refusedKeys = new Set();
