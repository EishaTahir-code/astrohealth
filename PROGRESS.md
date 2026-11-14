# Orbloom: progress

Working demo of the astronaut health app described in PRD.md. All 8 demo steps are built, tested, and merged into `main`.
Each step also has its own branch on GitHub (`step/1-setup` … `step/8-doctor`), so you can go back to any step.

## Latest update (14 Nov 2026): flower-garden redesign + AI fix

Branch: `claude/great-davinci-gccflf`. Every feature and rule from steps 1-8 still works. Only the look, the page order and the AI connection changed.

**New page order**
- The app now opens on a **sign-in page**. Choose *Astronaut* or *Flight surgeon*, sign in, and you land on your dashboard.
- Astronaut demo account: **maya.chen@orbloom.demo** / **demo1234** (new). Doctor: **dr.rivera@orbloom.demo** / **demo1234** (same as before).
- The "Fill in the demo account" link fills the email and password for you.
- The crew garden still needs no login ("Visit the crew garden without signing in"), as the PRD asks.
- If you open a page for the other role (for example the doctor page while signed in as Maya), the sign-in page explains why.
- New **Today** page for the astronaut: garden bed, today's check-in, health status of each measurement, alertness score, and shortcuts to both assistants. It only reuses the existing rules (garden score, red flags, alertness decline).

**New look (based on `Magical Reagent Garden.jpg`)**
- Colours taken from the garden image: hedge greens, the stone path, the wooden bed walls, and lavender, periwinkle, marigold and poppy flowers. All colours are tokens at the top of `client/src/index.css`.
- A "night garden" dark mode that switches on with the computer's dark setting.
- Sign-in page: a drawn top-down walled garden (`components/GardenPlan.jsx`) that blooms outward from the centre once when the page opens.
- Flower beds are now drawn from above, like the beds in the image (`components/FlowerBed.jsx`). Empty = seeds only, wilting = dry plants, blooming = full of flowers.
- Sidebar in hedge green with a small flower icon for each section (`components/Icons.jsx`). On phones it becomes a top bar with a sideways-scrolling menu.
- The health assistant is lavender, the medication assistant periwinkle. The alertness game shows a bud that opens into a flower when it is time to tap. There is no animation on the signal itself, so reaction times stay accurate.
- Fonts: Fraunces for headings, Atkinson Hyperlegible Next for text (designed to be easy to read). The font files are stored in the app (`client/src/assets/fonts/`, free OFL licence), so they work offline.
- Colour contrast checked: all text/background pairs pass WCAG AA in light and dark mode. Status pills still use a shape plus words, never colour alone.

**AI fix (both tabs)**
- Problem found: Groq has **removed the model `llama-3.3-70b-versatile`** that the app used. Every question failed with "model not found", so both tabs always showed offline answers, even with a key.
- Fix: the default model is now `openai/gpt-oss-120b` (`server/keys.js`). If a model is ever removed again, the server automatically tries the next one in `BACKUP_MODELS` and prints a warning once.
- If your `.env.health` or `.env.medication` has a `GROQ_MODEL=` line with the old model name, you can delete that line. The app now switches models by itself anyway.
- Both assistants are told to answer in plain text (the chat shows text, not markdown), and the server removes leftover `**` symbols.
- Safety filter fix: the old filter blocked any answer containing "you have", so normal answers like "you have 14 readings" were replaced by the "I can't give a diagnosis" message. It now blocks only real diagnosis wording (for example "you have hypertension" or "this indicates diabetes"). Doses are still blocked in medication answers.

**How it was tested**
- Both AI tabs were tested **live with a real Groq key**, through the real screens in a browser (Playwright):
  - Health assistant: "Explain my graphs", "How is my sleep?", "Write a summary for my doctor" gave real AI answers. "I have chest pain" skipped the AI and showed the flight-surgeon message.
  - Medication assistant: "Do we have aspirin?" gave "I don't have that medicine on the spacecraft list…", "Tell me about meclizine" answered from the list, and a dose question returned only the list's dose text.
  - With no key, both routes still fall back to the offline answers.
- Clicked through every screen in a browser: sign in (right, wrong, and wrong-role passwords), Today, check-in save, health readings (including the input check), both assistants, the full 5-round alertness game, crew garden, doctor crew list and profile, the access log entry, sign out, the garden without login, and staying signed in after a reload. No errors in the browser console.
- Checked: the doctor's screens never show the astronaut's private note.
- Phone size (iPhone 13): no sideways scrolling on any page.
- `npm run lint` passes with no warnings. `npm run build` passes (only the old large-file note).
- Note: the key you put in `.env.health` / `.env.medication` on your computer is not on GitHub (correct, the files are ignored), so the cloud test used the same Groq service through a secure credential instead. Your files on your computer should work the same way.

## How to run the app

You need Node.js (already installed on this computer).

```bash
# first time only: download the packages for the server and the app
npm run setup

# every time: start the server and the app together
npm run dev
```

Then open **http://localhost:5173** in your browser. The first screen is the sign-in page. Stop with `Ctrl + C`.

- The app runs on port 5173 (Vite). The backend runs on port 3001. The app forwards every `/api/...` request to the backend.
- The demo crew data (3 made-up astronauts) is added the first time the app opens. To start fresh, open the browser's developer tools → Application → IndexedDB → delete `orbloom`, then reload.
- Astronaut login: **maya.chen@orbloom.demo** / **demo1234**
- Doctor login: **dr.rivera@orbloom.demo** / **demo1234**

## How to add the AI key later

1. Get a free API key at https://console.groq.com (API Keys → Create).
2. Open **`.env.health`** in the project folder and paste it after the `=`:
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```
   This turns on **AI 1, the Health assistant**.
3. Do the same in **`.env.medication`** to turn on **AI 2, the Medication assistant**. You can use the same key in both files.
4. No restart needed: the server reads the files on every question. The status in the sidebar (top bar on phones) changes to "AI connected".

Rules:
- Never put the key in any other file, and never start its name with `VITE_` (Vite would copy it into the browser).
- `.env`, `.env.health` and `.env.medication` are in `.gitignore`. They have never been committed.
- Optional: add `GROQ_MODEL=some-model-name` to change the Groq model (default `openai/gpt-oss-120b`; the old default `llama-3.3-70b-versatile` was removed by Groq).
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
- Clicked through every screen in a real browser on 14 Nov 2026 (see "Latest update" above).

## What is missing (not built yet)

- **Real login and security:** the astronaut and doctor accounts are fake and checked in the browser. No JWT, no password hashing, no role-based access on the server. Only Maya has an astronaut account.
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
- **Groq model name:** the old default model (`llama-3.3-70b-versatile`) was removed by Groq, so both AIs always fell back to offline answers. Fixed on 14 Nov 2026 (new default plus automatic backup models).

## Project layout

```
client/                 React app (Vite)
  src/pages/            one file per screen (SignIn, Today, CheckIn, Health, assistants, Reaction, Garden, Doctor)
  src/components/       reusable pieces (Shell = sidebar layout, GardenPlan, FlowerBed, Icons, charts, chat)
  src/lib/              rules and helpers (auth, connection status, garden, health, alertness, safety, offline answers, database)
  src/assets/fonts/     the two fonts, stored in the app so they work offline
  src/data/             crew list, check-in questions, medicines.json (SAMPLE)
server/                 Express backend: keys, Groq call, the two AI routes, safety filter
scripts/dev.js          starts server + app together
.env.health / .env.medication   your keys (never committed)
```
