// Sign-in on the server: scrambled (hashed) passwords, signed login tokens, and role checks.
//
// - Passwords are never stored. Each account keeps a random "salt" and an scrypt hash.
// - After a correct password the server returns a token signed with a secret key (a JWT, HS256).
//   The token says who you are and your role, and runs out after 12 hours.
// - Every protected route checks the token and the role (astronaut or doctor).
//
// DEMO ACCOUNTS: all passwords are "demo1234". A real mission would load accounts from a database.
import crypto from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './store.js';

export const ACCOUNTS = [
  { email: 'maya.chen@orbloom.demo', name: 'Maya Chen', role: 'astronaut', crewId: 'a1', salt: '1d0afa11601662ed4309bec43cb3c252', hash: '25687b33026bd2b0d69c3467807f4ed050522b79dec1fc9d12044f9063e32ecf' },
  { email: 'leo.okafor@orbloom.demo', name: 'Leo Okafor', role: 'astronaut', crewId: 'a2', salt: '0a52d330fbd21ef0d36d785cceccbdb5', hash: '090f7d499da324cca2dcfa995f17221a68f444f0a3893990322d625cd216b706' },
  { email: 'sara.lindqvist@orbloom.demo', name: 'Sara Lindqvist', role: 'astronaut', crewId: 'a3', salt: '3e678e560e8c73deaaf07fbcd2afb1fa', hash: '784920b36020a2558e38089c592385ef614e1161c7fe00f5c3892d104b38608e' },
  { email: 'arjun.mehta@orbloom.demo', name: 'Arjun Mehta', role: 'astronaut', crewId: 'a4', salt: '7a83e5327c0ec778004310e9b377dc2a', hash: '8bdd71707f618466752108ab7233771f6f02a1f9a4d88aad901cead31ba8682b' },
  { email: 'hana.sato@orbloom.demo', name: 'Hana Sato', role: 'astronaut', crewId: 'a5', salt: 'f2fdd5b55b1ab2c7ab692c7004b62708', hash: 'c9ebbbf0c49efba82bd486093253585609934d7ce0cf82585909875015b161c2' },
  { email: 'tomas.alvarez@orbloom.demo', name: 'Tomás Alvarez', role: 'astronaut', crewId: 'a6', salt: 'fa15fdddc7e4e166464793a52b1a2552', hash: 'dbabe9c8dcee0157365ac865549e09f7436018902e26722e8cf69c715ccdc224' },
  { email: 'amara.nwosu@orbloom.demo', name: 'Amara Nwosu', role: 'astronaut', crewId: 'a7', salt: 'b3dd25da9138937be0950069fcfcdc62', hash: '3770095b60d7cff73673eb728b0b9da04637b64ffa1412df09a2442f673bf1ed' },
  { email: 'elena.petrova@orbloom.demo', name: 'Elena Petrova', role: 'astronaut', crewId: 'a8', salt: 'd39daa31d9864c8a6ab7fc98107fd857', hash: '256bb531c3cbc1d3a5973b260acd16337911f11a5c1618f57d05fc357d0788fa' },
  { email: 'dr.rivera@orbloom.demo', name: 'Dr. Ana Rivera', role: 'doctor', salt: '6d7ff961b76e7eb0635cd64fc0e7cdfe', hash: '104daf9e5a2328ccfaebb705348a0142bb5b94e17f3c1ac484dd7dc7bb491816' },
  { email: 'dr.patel@orbloom.demo', name: 'Dr. Dev Patel', role: 'doctor', salt: '09301331b05691f3585b7bff115b9a26', hash: '1cf141c88c3e490c05374a534f0c2278bf8d5bb9cc770812771cc99f83818527' },
];

export const CREW_IDS = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'];
const TOKEN_HOURS = 12;

// The signing secret: AUTH_SECRET in .env if set, otherwise a random one saved in server/data/.
function loadSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const file = path.join(DATA_DIR, 'auth-secret.key');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  const secret = crypto.randomBytes(32).toString('hex');
  writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}
const SECRET = loadSecret();

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

export function signToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.email, name: user.name, role: user.role, crewId: user.crewId ?? null, iat: now, exp: now + TOKEN_HOURS * 3600 })}`;
  return `${body}.${sign(body)}`;
}

export function verifyToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const expected = sign(`${parts[0]}.${parts[1]}`);
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (!payload.exp || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

function checkPassword(account, password) {
  const hash = crypto.scryptSync(String(password), account.salt, 32);
  return crypto.timingSafeEqual(hash, Buffer.from(account.hash, 'hex'));
}

// Slows down password guessing: at most 8 tries per email per 5 minutes.
const attempts = new Map();
function tooManyTries(email) {
  const now = Date.now();
  const list = (attempts.get(email) ?? []).filter((t) => now - t < 5 * 60 * 1000);
  attempts.set(email, list);
  return list.length >= 8;
}

export function loginHandler(req, res) {
  const email = String(req.body?.email ?? '').trim().toLowerCase().slice(0, 200);
  const password = String(req.body?.password ?? '').slice(0, 200);
  if (tooManyTries(email)) return res.status(429).json({ error: 'Too many tries. Wait a few minutes and try again.' });
  const account = ACCOUNTS.find((a) => a.email === email);
  if (!account || !checkPassword(account, password)) {
    attempts.get(email)?.push(Date.now());
    return res.status(401).json({ error: 'That email and password do not match an account. Check both and try again.' });
  }
  const user = { email: account.email, name: account.name, role: account.role, crewId: account.crewId ?? null };
  res.json({ token: signToken(user), user });
}

// Route guard. Example: app.get('/x', requireRole('doctor'), handler)
export function requireRole(...roles) {
  return (req, res, next) => {
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    const user = verifyToken(token);
    if (!user) return res.status(401).json({ error: 'Please sign in again.' });
    if (roles.length && !roles.includes(user.role)) return res.status(403).json({ error: 'Your account cannot do that.' });
    req.user = user;
    next();
  };
}
