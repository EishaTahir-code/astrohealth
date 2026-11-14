# OrbitGarden: Technical Architecture

## 1. Tech stack
| Layer | Technology |
|---|---|
| Mobile app | React Native or Flutter |
| Web dashboard | React or Next.js |
| Local database | SQLite, Realm, or IndexedDB |
| Backend | Node.js + Express or FastAPI |
| Main database | PostgreSQL |
| Authentication | JWT + OAuth2 |
| Real-time sync | WebSocket or Firebase-style sync |
| Offline storage | Local encrypted database |
| AI | On-device lightweight model + cloud model fallback (see section 5) |
| Graphs | Recharts, Chart.js, or D3.js |
| Notifications | Local notifications + push when online |
| Security | AES encryption, HTTPS, role-based access control |

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
| Knowledge | The astronaut's own readings and baselines | `medicines.json`, the approved spacecraft medicine list |
| API | Groq (`GROQ_API_KEY`) | [choose: Groq with a different system prompt, or another provider, e.g. `GEMINI_API_KEY`] |
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
