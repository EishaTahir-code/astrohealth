# Orbloom: Technical Architecture

## 1. Tech stack (what is built)
| Layer | Technology |
|---|---|
| App (astronaut, doctor, crew garden) | React 19 + Vite web app, installable as a PWA (works offline after the first visit) |
| Local database | IndexedDB through Dexie (`client/src/lib/db.js`) |
| Local encryption | AES-256-GCM (browser WebCrypto), non-extractable device key (`client/src/lib/secure.js`) |
| Backend | Node.js + Express (`server/`) |
| Server database | One JSON file in `server/data/` (demo). PostgreSQL is the next step for a real mission |
| Authentication | scrypt password hashes + signed JWT (HS256), role checks on every route; offline sign-in with PBKDF2 verifiers (`server/auth.js`, `client/src/lib/auth.js`) |
| Sync | HTTP sync every 30 s and after changes, only shareable tables, field allowlists and per-role rules (`server/sync.js`, `client/src/lib/sync.js`) |
| Family messages | Queued on the device, relayed by the server when the ground link is open (`server/family.js`) |
| AI | Groq, model `openai/gpt-oss-120b` with automatic backups (see section 5) |
| Graphs | Recharts; interactive crew garden drawn on an HTML canvas |
| Notifications | Browser notifications for new messages (opt-in in Settings) |
| Security | Hashed passwords, signed tokens, role-based access, encrypted private data, doctor access log, keys only in `.env` files |

## 2. System structure
Astronaut Personal App → Local Encrypted Database → Backend API → Doctor Dashboard / Shared Crew Garden.

The astronaut app works fully offline. Data syncs to the backend only during an available secure communication window.

## 3. Application structure

**Shared crew garden (no login):** Crew Garden Overview → Astronaut Flower Beds → Garden Status → Crew Support Alerts.

**Astronaut personal app:** Login → Home → Today's Readiness → Health Graphs → AI Assistant → Reaction Game → Family Messages → Greenhouse Reset. Extra sections: Health, Mental Health, Family, Greenhouse, Settings.

**Doctor dashboard:** Login → Crew Member List → Astronaut Profile → Health Graphs → Sleep Trends → Alertness Trends → Red-Flag Alerts → AI Summary → Doctor Notes → Alerts.

## 4. Data models
- **User:** id, name, role, email, password_hash, created_at
- **HealthReading:** id, user_id, type, value, unit, recorded_at, status, synced
- **DailyCheckIn:** id, user_id, mood, stress, energy, sleep_quality, workload, loneliness, notes, created_at, synced
- **ReactionTest:** id, user_id, reaction_time_ms, accuracy, consistency, alertness_score, created_at, synced
- **FamilyMessage:** id, user_id, direction, content, attachment_url, created_at, sent_at, status, synced
- **GreenhousePlant:** id, user_id, plant_type, growth_stage, water_level, light_level, health_status, started_at, harvest_date, created_at
- **Garden:** id, user_id, growth_score, health_score, wellbeing_score, visual_state, last_updated
- **DoctorAlert:** id, user_id, alert_type, severity, message, created_at, reviewed, reviewed_by

## 5. The AI

One AI, the **Health assistant**, on the Health page (decision of 14 Nov 2026: the Medication AI was removed;
the Medication tab is now the searchable medical kit list, which needs no AI and works offline).
API keys are read from `.env.health` only (older `.env.medication` / `.env` also work), never written in code.

| | Health assistant | Doctors' AI summary |
|---|---|---|
| Where | Health page (and any yellow/red status: "Ask the assistant what this means") | Doctor profile, Overview tab |
| Job | Explain the astronaut's readings in plain words, self-care ideas, doctor-ready summary | Short summary of one astronaut's shareable data for the flight surgeon |
| Knowledge | A summary of the astronaut's own readings (never notes or check-ins) | Readings summary, alertness, red flags, number of check-in days |
| API | Groq, `openai/gpt-oss-120b` with automatic backup models | Same key and model |
| Offline fallback | Pre-written answers that follow the question (which measurement, normal range, causes, tips) | Pre-written summary from the same data |

### Medical kit list (no AI)
- `medicines.json`, built from the ISS medical kit list (NASA 3.001) in this project: 95 medicines with strength, route, side effects, comments, pack and location.
- Search by medicine or symptom; crew self-care pack or the whole kit; "flight surgeon only" items are marked.
- Always shows: information only, check with the flight surgeon before taking anything.

### Rules for the AI
- No diagnosis, show uncertainty, recommend escalation for red flags, respect privacy (only the astronaut's own shared data), safe offline fallback.
- Red-flag symptoms skip the AI and go straight to "contact the flight surgeon".
- Safety filter on every response before it is shown.
- The app says why the AI is not live (no key, example text, key refused, offline sign-in, older server) instead of silently answering offline.

## 6. Security
- AES encryption for sensitive local data and messages.
- HTTPS for all sync. Sync only on a secure connection.
- Role-based access control (astronaut, doctor, crew).
- Audit log for every doctor access.
- `.env` and keys in `.gitignore`.
