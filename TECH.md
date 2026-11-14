# Orbloom: Technical Architecture

## 1. Tech stack (what is built)
| Layer | Technology |
|---|---|
| App (astronaut, doctor, crew garden) | React 19 + Vite web app, installable as a PWA (works offline after the first visit) |
| Local database | IndexedDB through Dexie (`client/src/lib/db.js`) |
| Local encryption | AES-256-GCM (browser WebCrypto), non-extractable device key (`client/src/lib/secure.js`) |
| Backend | Supabase project "Orbloom" (no server of our own). Client library `@supabase/supabase-js` (`client/src/lib/supabase.js`) |
| Online database | Supabase PostgreSQL: `profiles`, `records` (all shareable health records), `family_messages`; privacy rules with Row Level Security (`supabase/migrations/`) |
| Authentication | Supabase Auth: email + password sign up, sign in, password reset (PKCE link). Role and crew id live in `profiles`, set by a database trigger; flight surgeons need an invite code (bcrypt hash in a private table). Offline sign-in with PBKDF2 verifiers saved on the device after an online sign-in (`client/src/lib/auth.js`) |
| Sync | Every 30 s and right after changes: upsert of this device's unsent shareable records, then "what changed since seq N"; alert reviews through the `review_alert` database function (`client/src/lib/sync.js`) |
| Family messages | Queued on the device, sent to `family_messages` when the ground link is open; a database trigger adds the demo reply, visible after 20 s |
| AI | Supabase Edge Function `orbloom-ai` (Deno) calling Groq, model `openai/gpt-oss-120b` with automatic backups (see section 5) |
| Hosting | GitHub Pages, built and published by `.github/workflows/deploy-pages.yml`; installable on phones (PWA) |
| Graphs | Recharts; interactive crew garden drawn on an HTML canvas |
| Notifications | Browser notifications for new messages (opt-in in Settings) |
| Security | Supabase Auth (hashed passwords, signed tokens), Row Level Security, demo and real accounts kept apart, encrypted private data on the device, doctor access log, AI key only as a Supabase secret |

## 2. System structure
Astronaut Personal App → Local Encrypted Database → Supabase (Auth, PostgreSQL with Row Level Security, Edge Function for the AI) → Doctor Dashboard / Shared Crew Garden.

The astronaut app works fully offline. Data syncs to Supabase only during an available secure communication window (HTTPS).

### Privacy rules in the database (Row Level Security)
| Who | Can read | Can write |
|---|---|---|
| Astronaut | own readings, alertness tests, alerts, shared notes, messages; everyone's garden status (same world) | own readings, tests, alerts (never the review), shared notes, messages from themselves, own garden status |
| Flight surgeon | all shareable records of astronauts in the same world | notes, messages from themselves, access-log entries; alert reviews only through `review_alert` |
| Signed out | nothing | nothing |

"World": demo accounts (public demo passwords) and real accounts never see each other's data.
Names on doctor notes and messages, the doctor's email in the access log, and record owners are filled in by the
database, not by the device. Unknown fields are dropped.

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
The Groq key is the Supabase Edge Function secret `GROQ_API_KEY`, never written in code or sent to the browser.

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
- The app says why the AI is not live (no key, example text, key refused, offline sign-in, no ground link) instead of silently answering offline.
- The Edge Function checks the Supabase sign-in and the role (astronauts: assistant; flight surgeons: summary).

## 6. Security
- AES encryption for sensitive local data and messages.
- HTTPS for all sync. Sync only on a secure connection.
- Role-based access control (astronaut, doctor, crew), enforced by Row Level Security in Supabase.
- Flight surgeon sign-up needs an invite code (checked in the database, stored as a bcrypt hash).
- Audit log for every doctor access.
- `.env` and keys in `.gitignore`. The Supabase publishable key in the app is public by design.
