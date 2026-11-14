import express from 'express';
import { getAiConfig } from './keys.js';

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

const PORT = Number(process.env.PORT) || 3001;
// 127.0.0.1 = only reachable from this computer.
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Orbloom server running on http://localhost:${PORT}`);
});
