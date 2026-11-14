# Orbloom: progress

Working demo of the astronaut health app described in PRD.md. All 8 demo steps are built, tested, and merged into `main`.
Each step also has its own branch on GitHub (`step/1-setup` … `step/8-doctor`), so you can go back to any step.

## How to run the app

You need Node.js (already installed on this computer).

```bash
# first time only: download the packages for the server and the app
npm run setup

# every time: start the server and the app together
npm run dev
```

Then open **http://localhost:5173** in your browser. Stop with `Ctrl + C`.

- The app runs on port 5173 (Vite). The backend runs on port 3001. The app forwards every `/api/...` request to the backend.
- The demo crew data (3 made-up astronauts) is added the first time the app opens. To start fresh, open the browser's developer tools → Application → IndexedDB → delete `orbloom`, then reload.
- Doctor login: **dr.rivera@orbloom.demo** / **demo1234**

## How to add the AI key later

1. Get a free API key at https://console.groq.com (API Keys → Create).
2. Open **`.env.health`** in the project folder and paste it after the `=`:
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```
   This turns on **AI 1, the Health assistant**.
3. Do the same in **`.env.medication`** to turn on **AI 2, the Medication assistant**. You can use the same key in both files.
4. No restart needed: the server reads the files on every question. The top bar changes to "AI connected".

Rules:
- Never put the key in any other file, and never start its name with `VITE_` (Vite would copy it into the browser).
- `.env`, `.env.health` and `.env.medication` are in `.gitignore`. They have never been committed.
- Optional: add `GROQ_MODEL=some-model-name` to change the Groq model (default `llama-3.3-70b-versatile`).
- Where the key is read: `server/keys.js` (comment at the top).

Without a key, or if Groq fails, both assistants still work with offline answers, and each answer says so.

## What is done

| Step | What works |
|---|---|
| 0. Secrets check | `.gitignore` ignores `.env`, `.env.health`, `.env.medication`. Checked that no key file was ever committed. |
| 1. Setup | React + Vite app in `client/`, small Express backend in `server/`, IndexedDB storage (Dexie), page switching, online/offline and AI status in the top bar. One command (`npm run dev`) starts both. |
| 2. Daily check-in | Mood, stress, energy, sleep, workload (1-5) plus a private note. One per day (saving again updates it). Last 7 shown. Saved on the device. |
| 3. Crew garden | Scoring rules in `client/src/lib/garden.js` (check-ins and good sleep grow it; poor sleep, high stress and missed check-ins wilt it). Garden page with no login, one SVG flower bed per astronaut, colour + shape + text status. Your bed (Maya) starts empty. A gentle support message with the person's name shows for wilting beds, with no health details. |
| 4. Health | Form for blood pressure, heart rate, temperature, sleep, blood sugar (with input checks). Recharts trend graph per measurement with the "stable" band shaded. Green/yellow/red status. Red-flag detection: latest reading red = red flag; 3 non-green in a row = needs attention. |
| 5. AI 1 Health assistant | Backend route `/api/ai/health` → Groq. Safety rules in the AI instructions (no diagnosis, show uncertainty, escalate red flags, no doses). Server-side filter replaces diagnosis-like answers. Red-flag symptoms (e.g. chest pain) skip the AI and go straight to "contact the flight surgeon". Disclaimer and a confidence level on every answer. Offline answers: pre-written explanations per measurement and per green/yellow/red. Only a summary of your own readings is sent, never notes or check-ins. |
| 6. AI 2 Medication assistant | `client/src/data/medicines.json` with 5 entries marked **"SAMPLE, replace with the approved spacecraft list"** (no doses on purpose). Backend route `/api/ai/medication` sends only matching medicines to Groq. Server filter blocks any answer containing a dose. Offline: local search of the list. Unknown medicine → "I don't have that medicine on the spacecraft list. Please contact the flight surgeon." |
| 7. Alertness game | 5-round reaction test (tap or space bar), early taps and misses count as errors. Saves reaction time, accuracy, consistency and an alertness score. Alertness graph. Decline detection vs your usual level (20% drop = yellow, 35% = red) with advice and escalation. |
| 8. Doctor dashboard | Fake login, crew list with overall status, click a name for health graphs, alertness and red-flag alerts. Never loads check-ins, moods, notes or messages. Every profile view is written to an access log (IndexedDB `auditLog`). |

### Tested
- Health status rules, red-flag detection, garden scoring inputs, reaction scoring, decline detection and medicine search were tested with small scripts. All gave the expected results.
- The server was tested with no key: both AI routes return the offline signal. Red-flag symptoms return the escalation message. The safety filter blocks diagnoses and doses.
- `npm run lint` and `npm run build` pass with no warnings, except the build note about large file size (below).
- Started the full app with `npm run dev` and checked that every page loads and the proxy reaches the server.
- **Not tested:** clicking through the screens in a real browser. No browser tool was connected. Please click through each tab once and tell me if anything looks wrong.

## What is missing (not built yet)

- **Real login and security:** doctor accounts are fake and checked in the browser. No astronaut login. No JWT, no password hashing, no role-based access on the server.
- **Encryption:** data in IndexedDB is not encrypted yet (PRD asks for AES).
- **Sync:** nothing syncs between devices. The doctor dashboard and garden read the same device's data. Records carry a `synced` flag ready for later.
- **Doctor features:** AI summaries for doctors, doctor notes, doctor-to-astronaut messages, reviewing alerts.
- **Crew alerts:** support alerts are shown in the garden only (not sent to crewmates' apps). No pause/mute control yet.
- **Real medicine list:** `medicines.json` is SAMPLE data. Replace it with the approved list (same format). Both the server and the offline search read the same file.
- **Not started:** family messages (Phase 5), Greenhouse Reset (Phase 6), garden animations, emergency escalation flow, installable PWA / offline caching of the app files, emergency signals, notifications.
- **Docs:** TECH.md still lists the original stack options. The app name in PRD.md/TECH.md is still "OrbitGarden" (renaming to Orbloom was approved but not done yet).

## Problems hit along the way

- **Network drops during `npm install` (twice):** `ECONNRESET`. Fixed by retrying.
- **GitHub unreachable after step 6** ("Could not resolve host: github.com"). Step 6 was committed and merged locally, then pushed once the connection returned. GitHub `main` was checked and matches local.
- **Build warning:** the app's main file is over 500 KB because of the Recharts library. Harmless for a demo. It can be split later.
- **Groq model name:** the default model (`llama-3.3-70b-versatile`) could not be tested without a key. If Groq rejects it, the app falls back to offline answers. Set `GROQ_MODEL` to a current model from the Groq console.

## Project layout

```
client/                 React app (Vite)
  src/pages/            one file per screen
  src/components/       reusable pieces (charts, flower bed, chat)
  src/lib/              rules and helpers (garden, health, alertness, safety, offline answers, database)
  src/data/             crew list, check-in questions, medicines.json (SAMPLE)
server/                 Express backend: keys, Groq call, the two AI routes, safety filter
scripts/dev.js          starts server + app together
.env.health / .env.medication   your keys (never committed)
```
