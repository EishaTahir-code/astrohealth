// Family message relay: the "ground link" that carries messages between the spacecraft and home.
//
// - Astronauts send queued messages here when a communication window opens.
// - Family replies wait here until the astronaut's device collects them.
// - DEMO: there is no real family app yet, so each family member answers with a pre-written reply
//   about 20 seconds after a message arrives. Replies are marked demo: true.
import crypto from 'node:crypto';
import { changedSince, upsert } from './store.js';

export const FAMILY = {
  a1: [
    { id: 'lin', name: 'Mum (Lin)' },
    { id: 'jun', name: 'Jun' },
    { id: 'ava', name: 'Ava' },
  ],
  a2: [
    { id: 'ngozi', name: 'Ngozi' },
    { id: 'tobi', name: 'Dad (Tobi)' },
  ],
  a3: [
    { id: 'erik', name: 'Erik' },
    { id: 'mormor', name: 'Mormor (Grandma)' },
  ],
  a4: [{ id: 'priya', name: 'Priya' }, { id: 'kabir', name: 'Kabir' }],
  a5: [{ id: 'yuki', name: 'Yuki' }, { id: 'okaasan', name: 'Mum' }],
  a6: [{ id: 'lucia', name: 'Lucía' }, { id: 'mateo', name: 'Mateo' }],
  a7: [{ id: 'chidi', name: 'Chidi' }, { id: 'adaeze', name: 'Adaeze' }],
  a8: [{ id: 'ivan', name: 'Ivan' }, { id: 'sofia', name: 'Sofia' }],
};

const REPLIES = [
  'Got your message, it made my whole day. We are all thinking of you up there.',
  'Thank you for writing! Everything is fine at home. Sleep well and look out of the window for us.',
  'So lovely to hear from you. Take care of yourself, and tell us when you see the sunrise again.',
  'We read your message together at dinner. Proud of you, always.',
];

const MAX_PHOTO = 600_000; // characters of image data (about 450 KB)

export function sendHandler(req, res) {
  const user = req.user;
  const contacts = FAMILY[user.crewId] ?? [];
  const list = Array.isArray(req.body?.messages) ? req.body.messages.slice(0, 50) : [];
  const sent = [];
  for (const m of list) {
    const to = contacts.find((c) => c.id === m?.to);
    if (!to || typeof m.uid !== 'string' || typeof m.text !== 'string') continue;
    const photo = typeof m.photo === 'string' && m.photo.startsWith('data:image/') && m.photo.length <= MAX_PHOTO ? m.photo : null;
    upsert('familyOut', { uid: m.uid, userId: user.crewId, to: to.id, text: m.text.slice(0, 2000), photo, createdAt: Number(m.createdAt) || Date.now() });
    sent.push(m.uid);
    // Demo family reply. It is stored now and delivered about 20 seconds later
    // (kept in the store, so a server restart does not lose it).
    upsert('familyPending', {
      uid: crypto.randomUUID(),
      userId: user.crewId,
      from: to.id,
      fromName: to.name,
      text: REPLIES[Math.floor(Math.random() * REPLIES.length)],
      replyTo: m.uid,
      dueAt: Date.now() + 20_000,
      delivered: false,
    });
  }
  res.json({ sent, sentAt: Date.now() });
}

// Moves due demo replies into the inbox.
function deliverDue(userId) {
  const now = Date.now();
  for (const p of changedSince('familyPending', 0, (r) => r.userId === userId && !r.delivered && r.dueAt <= now)) {
    upsert('familyPending', { uid: p.uid, delivered: true });
    upsert('familyIn', { uid: p.uid, userId, from: p.from, fromName: p.fromName, text: p.text, createdAt: p.dueAt, demo: true, replyTo: p.replyTo });
  }
}

export function inboxHandler(req, res) {
  deliverDue(req.user.crewId);
  const since = Number(req.query.since) || 0;
  const rows = changedSince('familyIn', since, (r) => r.userId === req.user.crewId);
  const seq = rows.reduce((max, r) => Math.max(max, r._seq), since);
  res.json({ messages: rows.map(({ _seq: _q, _savedAt: _s, ...r }) => r), seq, contacts: FAMILY[req.user.crewId] ?? [] });
}
