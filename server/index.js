import express from 'express';
import { getAiConfig } from './keys.js';
import { healthAssistant } from './ai-health.js';
import { medicationAssistant } from './ai-medication.js';

const app = express();
app.use(express.json({ limit: '50kb' }));

// Tells the app whether each AI has a key. It never sends the key itself.
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    ai: {
      health: Boolean(getAiConfig('health').apiKey),
      medication: Boolean(getAiConfig('medication').apiKey),
    },
  });
});

// AI 1: Health Trends Assistant
app.post('/api/ai/health', healthAssistant);

// AI 2: Medication Assistant
app.post('/api/ai/medication', medicationAssistant);

const PORT =Number(process.env.PORT) || 3001;
// 127.0.0.1 = only reachable from this computer.
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Orbloom server running on http://localhost:${PORT}`);
});
