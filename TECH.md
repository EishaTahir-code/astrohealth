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

## 5. The two AIs

Two separate AIs, each in its own tab. Each is one small function. API keys are read from `.env` only, never written in code.

| | AI 1: Health Trends Assistant | AI 2: Medication Assistant |
|---|---|---|
| Tab | AI Assistant (health graphs) | Medication tab |
| Job | Explain graphs, answer health questions, write doctor-ready summaries | Answer questions about medicines available in the spacecraft |
| Knowledge | The astronaut's own readings and baselines | `medicines.json`, built from the ISS medical kit list (NASA 3.001) in this project |
| API | Groq (`GROQ_API_KEY` in `.env.health`) | Groq with its own instructions (`GROQ_API_KEY` in `.env.medication`) |
| Offline fallback | Pre-written plain-language explanations per status (green/yellow/red) | Local search of `medicines.json`, no AI needed |

### AI 2 rules (medicine list)
- Load `medicines.json` into the AI's instructions. For each medicine: name, what it is used for, dosage and warnings **as given by the approved source**.
- Answer ONLY from this list. If a medicine is not on the list, say "I don't have that medicine on the spacecraft list" and suggest contacting the doctor.
- Never invent medicines or doses. Never go beyond approved protocols.
- If the list gets large, send only the relevant medicines per question.
- Always show the disclaimer: information only, not medical advice.
- Red-flag symptoms: tell the astronaut to contact the doctor / flight surgeon.

### Both AIs
- No diagnosis, show uncertainty, recommend escalation for red flags, respect privacy (only the astronaut's own shared data), safe offline fallback.
- Safety filter on every response before it is shown.

## 6. Security
- AES encryption for sensitive local data and messages.
- HTTPS for all sync. Sync only on a secure connection.
- Role-based access control (astronaut, doctor, crew).
- Audit log for every doctor access.
- `.env` and keys in `.gitignore`.
