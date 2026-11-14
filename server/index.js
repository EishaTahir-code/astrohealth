import express from 'express';
import { getAiConfig } from './keys.js';
import { loginHandler, requireRole } from './auth.js';
import { healthAssistant } from './ai-health.js';
import { medicationAssistant } from './ai-medication.js';
import { doctorSummary } from './ai-doctor.js';
import { syncHandler } from './sync.js';
import { inboxHandler, sendHandler } from './family.js';

const app = express();
app.use(express.json({ limit: '3mb' })); // room for a few family photos

// Tells the app whether each AI has a key. It never sends the key itself. No sign-in needed.
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    time: Date.now(),
    ai: {
      health: Boolean(getAiConfig('health').apiKey),
      medication: Boolean(getAiConfig('medication').apiKey),
    },
  });
});

// Sign in: returns a signed token for the app to send with every request.
app.post('/api/auth/login', loginHandler);

// AI 1: Health Trends Assistant (astronauts) and its summary for doctors
app.post('/api/ai/health', requireRole('astronaut'), healthAssistant);
app.post('/api/ai/doctor-summary', requireRole('doctor'), doctorSummary);

// AI 2: Medication Assistant (astronauts)
app.post('/api/ai/medication', requireRole('astronaut'), medicationAssistant);

// Sync of shareable records (rules in sync.js)
app.post('/api/sync', requireRole('astronaut', 'doctor'), syncHandler);

// Family messages (astronauts only)
app.post('/api/family/send', requireRole('astronaut'), sendHandler);
app.get('/api/family/inbox', requireRole('astronaut'), inboxHandler);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = Number(process.env.PORT) || 3001;
// 127.0.0.1 = only reachable from this computer.
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Orbloom server running on http://localhost:${PORT}`);
});
